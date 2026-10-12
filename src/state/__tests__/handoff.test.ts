import * as LocalAuth from '@/infrastructure/local/auth';
import { db, useDb } from '@/infrastructure/local/db';
import { seedRenderData, testUser } from '@/testing/render-fixtures';

import { handoffActions } from '../handoff';
import { useSession } from '../session';

let elderId: string;
beforeEach(async () => {
  elderId = (await seedRenderData()).id;
  await handoffActions.setPin('1234');
  handoffActions.start(elderId);
});

it('persists failed attempts, enforces lockout and resumes after expiry', async () => {
  jest.useFakeTimers();
  try {
    for (let attempt = 1; attempt < 5; attempt++) {
      expect(await handoffActions.unlock('9999')).toEqual({ result: 'wrong', left: 5 - attempt });
    }
    expect(await handoffActions.unlock('9999')).toEqual({ result: 'locked', seconds: 30 });
    await useDb.persist.rehydrate();
    expect(db.draftHandoff()?.failedPins).toBe(5);
    expect(await handoffActions.unlock('1234')).toEqual({ result: 'locked', seconds: 30 });
    jest.advanceTimersByTime(30_001);
    expect(await handoffActions.unlock('9999')).toEqual({ result: 'locked', seconds: 60 });
    jest.advanceTimersByTime(60_001);
    expect(await handoffActions.unlock('1234')).toEqual({ result: 'ok' });
    expect(db.draftHandoff()).toBeNull();
  } finally { jest.useRealTimers(); }
});

it.each(['', '123', '12345', '12a4'])('rejects malformed PIN input without unlocking (%s)', async (pin) => {
  expect(await handoffActions.unlock(pin)).toEqual({ result: 'wrong', left: 4 });
  expect(db.draftHandoff()).not.toBeNull();
});

it('rejects a concurrent attempt rather than sharing another PIN result', async () => {
  const first = handoffActions.unlock('9999');
  await expect(handoffActions.unlock('1234')).rejects.toThrow('en curso');
  expect(await first).toEqual({ result: 'wrong', left: 4 });
  expect(db.draftHandoff()?.failedPins).toBe(1);
});

it('does not mutate a new handoff after asynchronous validation of an old one', async () => {
  let finish!: (hash: string) => void;
  const hash = jest.spyOn(LocalAuth, 'hashSecret').mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  try {
    const verification = handoffActions.unlock('1234');
    db.setHandoff({ userId: testUser.id, elderId, failedPins: 2, lockedUntil: null });
    const replacement = db.draftHandoff();
    finish(db.list('accounts', testUser.id)[0].pinHash!);
    await expect(verification).rejects.toThrow('cambió');
    expect(db.draftHandoff()).toBe(replacement);
  } finally { hash.mockRestore(); }
});

it('does not unlock after the session changes during hashing', async () => {
  let finish!: (hash: string) => void;
  const pinHash = db.list('accounts', testUser.id)[0].pinHash!;
  const hash = jest.spyOn(LocalAuth, 'hashSecret').mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  try {
    const verification = handoffActions.unlock('1234');
    useSession.setState({ status: 'signedOut', user: null });
    finish(pinHash);
    await expect(verification).rejects.toThrow();
    expect(db.draftHandoff()).not.toBeNull();
  } finally { hash.mockRestore(); }
});

it('does not store a clear-text PIN and rejects handoff without complete credentials', () => {
  const acc = db.list('accounts', testUser.id)[0];
  expect(acc.pinHash).not.toBe('1234');
  expect(acc.pinSalt).toMatch(/^[a-f0-9]{32}$/);
  db.update('accounts', acc.id, { pinSalt: null });
  expect(handoffActions.hasPin()).toBe(false);
  expect(() => handoffActions.start(elderId)).toThrow('PIN válidos');
});
