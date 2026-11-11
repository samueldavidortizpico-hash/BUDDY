/** Reproducciones de auditoría con datos sintéticos. PASS confirma el defecto descrito, no seguridad. */
import { renderHook } from '@testing-library/react-native';
import { db, useDb } from '@/infrastructure/local/db';
import { useRecord } from '@/state/data';
import { medicationActions, elderAnswers } from '@/state/care';
import { locationActions } from '@/state/location';
import { EntitlementService } from '@/domain/entitlements';
import { useSession } from '@/state/session';
import { seedRenderData, seedMedication, testUser } from '@/testing/render-fixtures';
import { createLocalAuthProvider } from '@/infrastructure/local/auth';
import { applyPlan } from '@/infrastructure/notifications';
import { sessionActions } from '@/state/session';
import { syncAccount } from '@/infrastructure/supabase/sync';
import { getSupabase } from '@/infrastructure/supabase/client';

jest.mock('@/infrastructure/supabase/client', () => ({ supabaseConfigured: true, getSupabase: jest.fn() }));

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

beforeEach(async () => { await seedRenderData(); });

it('AUDIT: caregiver B can read medication owned by A through useRecord', async () => {
  const elder = db.list('elders', testUser.id)[0];
  const med = seedMedication(elder.id);
  useSession.setState({ user: { id: 'audit-B', email: 'b@example.test', name: 'B', createdAt: '', role: 'caregiver' } });
  const ui = await renderHook(() => useRecord('medications', med.id));
  expect(ui.result.current?.ownerUserId).toBe(testUser.id);
  expect(ui.result.current?.name).toBe(med.name);
});

it('AUDIT: caregiver B changes stock of medication owned by A', () => {
  const elder = db.list('elders', testUser.id)[0];
  const med = seedMedication(elder.id);
  useSession.setState({ user: { id: 'audit-B', email: 'b@example.test', name: 'B', createdAt: '', role: 'caregiver' } });
  medicationActions.setStock(med.id, 99);
  expect(db.get('medications', med.id)?.unitsOnHand).toBe(99);
  expect(db.get('medications', med.id)?.ownerUserId).toBe(testUser.id);
});

it('AUDIT: elder session can modify routine through medicationActions', () => {
  const elder = db.list('elders', testUser.id)[0];
  const med = seedMedication(elder.id);
  useSession.setState({ user: { ...testUser, id: 'audit-elder', role: 'elder', ownerId: testUser.id, elderId: elder.id } });
  medicationActions.update(med.id, { name: 'Changed by elder' });
  expect(db.get('medications', med.id)?.name).toBe('Changed by elder');
});

it('AUDIT: caregiver can grant location consent by passing elder as parameter', () => {
  const elder = db.list('elders', testUser.id)[0];
  locationActions.decide(elder.id, true, 'elder');
  expect(useSession.getState().user?.id).toBe(testUser.id);
  expect(db.get('elders', elder.id)?.locationConsent).toBe('granted');
});

it('AUDIT: local family override is accepted without purchase validation', async () => {
  await expect(EntitlementService.getPlan(testUser.id, 'family')).resolves.toBe('family');
});

it('AUDIT: repeating affirmative water automation creates duplicate daily records', () => {
  const elder = db.list('elders', testUser.id)[0];
  const reminder = db.insert('reminders', { title: 'Water', time: '09:00', days: [], date: null, automation: { kind: 'water', enabled: true } }, { userId: testUser.id, elderId: elder.id });
  elderAnswers.automationResponse(reminder.id, 'Sí', elder.id);
  elderAnswers.automationResponse(reminder.id, 'Sí', elder.id);
  expect(db.list('water', testUser.id, elder.id)).toHaveLength(2);
  expect(Object.keys(useDb.getState().checkins)).toHaveLength(1);
});

it('AUDIT: managed credentials remain usable after deleting local owner account', async () => {
  const auth = createLocalAuthProvider();
  const owner = await auth.signUp({ name: 'Audit owner', email: 'owner-audit@example.test', password: 'AuditPassword123!' });
  await auth.createManagedAccount({ ownerId: owner.id, elderId: 'synthetic-elder', name: 'Audit elder', email: 'elder-audit@example.test', password: 'AuditPassword123!' });
  await auth.deleteAccount('AuditPassword123!');
  const linked = await auth.signIn({ email: 'elder-audit@example.test', password: 'AuditPassword123!' });
  expect(linked.ownerId).toBe(owner.id);
});

it('AUDIT: signOut does not cancel previously scheduled local reminders', async () => {
  const notices = require('expo-notifications');
  await applyPlan([{ key: 'audit-old-user-notice', title: 'Synthetic reminder', body: 'Synthetic', trigger: { type: 'daily', hour: 9, minute: 0 } }]);
  expect(notices.__scheduled.length).toBeGreaterThan(0);
  await sessionActions.signOut();
  expect(notices.__scheduled.length).toBeGreaterThan(0);
});

it('AUDIT: sync overwrites an edit made while upload is in flight', async () => {
  const elder = db.list('elders', testUser.id)[0];
  const med = seedMedication(elder.id);
  const remote = { from: (table: string) => ({
    upsert: async () => {
      if (table === 'medications') db.update('medications', med.id, { name: 'New edit during upload' });
      return { error: null };
    },
    select: () => ({ eq: () => ({ gt: async () => ({ data: [], error: null }) }) }),
  }) };
  (getSupabase as jest.Mock).mockReturnValue(remote);
  await syncAccount(testUser.id);
  expect(db.get('medications', med.id)?.name).toBe(med.name);
  expect(db.get('medications', med.id)?.syncStatus).toBe('synced');
});
