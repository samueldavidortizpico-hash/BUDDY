import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import Unlock from '@/app/elder/unlock';
import Routine from '@/app/(caregiver)/(tabs)/routine';
import { PinPad } from '@/components/pin-pad';
import { db, useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { handoffActions } from '@/state/handoff';
import { useSession } from '@/state/session';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false, replace: mockReplace }),
  useIsFocused: () => true,
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

let elderId: string;
beforeEach(async () => {
  elderId = (await seedRenderData()).id;
  await handoffActions.setPin('1234');
  handoffActions.start(elderId);
  mockReplace.mockClear();
});

function enter(screen: ReturnType<typeof render>, pin: string) {
  for (const digit of pin) fireEvent.press(screen.getByRole('button', { name: strings.pin.digit(digit) }));
}

it('correct PIN clears handoff, preserves authentication and navigates once', async () => {
  const screen = render(<Unlock />, { wrapper: RenderProviders });
  enter(screen, '1234');
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/summary'));
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(useDb.getState().handoff).toBeNull();
  expect(useSession.getState().user?.id).toBe(testUser.id);
});

it('wrong PIN shows a controlled error and stays in elder mode', async () => {
  const screen = render(<Unlock />, { wrapper: RenderProviders });
  enter(screen, '0000');
  expect(await screen.findByText(strings.pin.wrong(4))).toBeTruthy();
  expect(db.draftHandoff()?.failedPins).toBe(1);
  expect(mockReplace).not.toHaveBeenCalled();
});

it('does not submit twice while the fourth digit is still displayed', async () => {
  let finish!: () => void;
  const onComplete = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const screen = render(<PinPad onComplete={onComplete} />, { wrapper: RenderProviders });
  enter(screen, '1234');
  fireEvent.press(screen.getByRole('button', { name: strings.pin.digit('5') }));
  expect(onComplete).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); });
  expect(screen.getByLabelText('0 de 4')).toBeTruthy();
});

it('announces disabled PIN keys while validation is pending', () => {
  const screen = render(<PinPad onComplete={jest.fn()} disabled />, { wrapper: RenderProviders });
  expect(screen.getByRole('button', { name: strings.pin.digit('1') })).toBeDisabled();
});

it('fails closed when persisted PIN credentials are missing', async () => {
  const account = db.list('accounts', testUser.id)[0];
  db.update('accounts', account.id, { pinHash: null });
  const screen = render(<Unlock />, { wrapper: RenderProviders });
  enter(screen, '1234');
  await waitFor(() => expect(screen.getByRole('button', { name: strings.pin.digit('1') })).not.toBeDisabled());
  expect(mockReplace).not.toHaveBeenCalled();
  expect(db.draftHandoff()).not.toBeNull();
  expect(screen.getByText(strings.pin.unavailable)).toBeTruthy();
});

it.each(['false', 'exception'])('does not hand off when PIN creation fails (%s)', async (failure) => {
  db.setHandoff(null);
  const account = db.list('accounts', testUser.id)[0];
  db.update('accounts', account.id, { pinHash: null, pinSalt: null });
  const save = jest.spyOn(handoffActions, 'setPin');
  if (failure === 'false') save.mockResolvedValueOnce(false);
  else save.mockRejectedValueOnce(new Error('Controlled storage failure'));
  try {
    const screen = render(<Routine />, { wrapper: RenderProviders });
    fireEvent.press(screen.getByRole('button', { name: strings.routine.handoff('Rosa') }));
    enter(screen, '1234');
    await screen.findByText(strings.pin.confirm);
    enter(screen, '1234');
    expect(await screen.findByText(strings.pin.saveError)).toBeTruthy();
    expect(db.draftHandoff()).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  } finally { save.mockRestore(); }
});

it('controls verification exceptions and re-enables the keyboard for retry', async () => {
  const unlock = jest.spyOn(handoffActions, 'unlock').mockRejectedValueOnce(new Error('Controlled verification failure'));
  try {
    const screen = render(<Unlock />, { wrapper: RenderProviders });
    enter(screen, '1234');
    expect(await screen.findByText(strings.pin.unavailable)).toBeTruthy();
    expect(screen.getByRole('button', { name: strings.pin.digit('1') })).not.toBeDisabled();
    expect(db.draftHandoff()).not.toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  } finally { unlock.mockRestore(); }
});
