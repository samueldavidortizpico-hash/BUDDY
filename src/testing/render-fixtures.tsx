import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '@/components/feedback';
import { db, useDb } from '@/infrastructure/local/db';
import { elderActions } from '@/state/actions';
import { ensureAccount, useSession } from '@/state/session';
import { DEFAULT_APPEARANCE, ThemeProvider, useAppearanceStore } from '@/theme/provider';
import { toISODate } from '@/utils/dates';

export const testUser = { id: 'render-user', name: 'Laura', email: 'render@example.test', createdAt: '' };

export async function seedRenderData() {
  await useDb.persist.rehydrate();
  await useAppearanceStore.persist.rehydrate();
  useDb.setState(useDb.getInitialState(), true);
  useAppearanceStore.setState(DEFAULT_APPEARANCE);
  useSession.setState({ status: 'signedIn', user: testUser });
  ensureAccount(testUser);
  const elder = elderActions.create({ firstName: 'Rosa', lastName: '', gender: 'female', birthDate: null, age: 80, weightKg: null, heightCm: null, relation: 'mother', relationOther: '' });
  elderActions.update(elder.id, { setupDone: true });
  return db.get('elders', elder.id)!;
}

export function RenderProviders({ children }: { children: ReactNode }) {
  // Igual que src/app/_layout.tsx: RNGH 3 exige un GestureHandlerRootView sobre todo GestureDetector.
  return <GestureHandlerRootView style={{ flex: 1 }}><ThemeProvider><ToastProvider>{children}</ToastProvider></ThemeProvider></GestureHandlerRootView>;
}

export function seedMedication(elderId: string) {
  return db.insert('medications', {
    name: 'Medicamento de prueba', activeIngredient: '', strength: '', form: 'tablet',
    doseAmount: 1, doseUnit: 'unit', schedule: { kind: 'times', times: ['00:00'], days: [] },
    startDate: toISODate(new Date()), endDate: null, instructions: '', purpose: '', description: '',
    unitsPerPackage: 30, unitsOnHand: 30, refillAlertDays: 3, photoUri: null, paused: false,
  }, { userId: testUser.id, elderId });
}
