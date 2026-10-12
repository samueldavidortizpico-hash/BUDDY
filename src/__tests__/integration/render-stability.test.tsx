import { act, fireEvent, render } from '@testing-library/react-native';

import Preview from '@/app/(caregiver)/preview';
import ElderHome from '@/app/elder';
import { ElderScreen } from '@/features/elder/screen';
import { db, useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { doseActions } from '@/state/care';
import { useRecords } from '@/state/data';
import { RenderProviders, seedMedication, seedRenderData, testUser } from '@/testing/render-fixtures';
import { ThemeOverride, useAppearanceStore } from '@/theme/provider';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
  useIsFocused: () => true,
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

let elderId: string;
beforeEach(async () => {
  elderId = (await seedRenderData()).id;
});

it('renders ElderHome with no seen draft and keeps dose synchronization idempotent', () => {
  seedMedication(elderId);
  db.setHandoff({ userId: testUser.id, elderId, failedPins: 0, lockedUntil: null });
  const sync = jest.spyOn(doseActions, 'sync');
  try {
    const screen = render(<ElderHome />, { wrapper: RenderProviders });
    expect(screen.getByText(/Rosa/)).toBeTruthy();
    screen.rerender(<ElderHome />);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(db.list('doses', testUser.id, elderId)).toHaveLength(1);
  } finally { sync.mockRestore(); }
});

it('preview cannot confirm medication but the elder screen retains the legitimate action', () => {
  const medication = seedMedication(elderId);
  doseActions.sync(elderId, new Date());
  const before = useDb.getState();
  const preview = render(<ElderScreen elderId={elderId} preview />, { wrapper: RenderProviders });
  const confirm = preview.getByRole('button', { name: strings.elder.taken });
  expect(confirm).toBeDisabled();
  fireEvent.press(confirm);
  expect(useDb.getState()).toBe(before);
  preview.unmount();
  const elder = render(<ElderScreen elderId={elderId} />, { wrapper: RenderProviders });
  fireEvent.press(elder.getByRole('button', { name: strings.elder.taken }));
  expect(db.list('doses', testUser.id, elderId)[0].status).toBe('taken');
  expect(db.get('medications', medication.id)?.unitsOnHand).toBe(29);
});

it('renders caregiver preview without changing the patient, including attempted actions', () => {
  const before = useDb.getState();
  const screen = render(<Preview />, { wrapper: RenderProviders });
  expect(screen.getByText(strings.routine.preview('Rosa'))).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: strings.elder.help }));
  expect(useDb.getState()).toBe(before);
});

it('renders theme changes and nested ThemeOverride without an update loop', () => {
  const screen = render(<ThemeOverride name="hcLight" textScale="large"><ElderScreen elderId={elderId} preview /></ThemeOverride>, { wrapper: RenderProviders });
  act(() => { useAppearanceStore.getState().set({ mode: 'dark' }); });
  screen.rerender(<ThemeOverride name="hcDark" textScale="normal"><ElderScreen elderId={elderId} preview /></ThemeOverride>);
  expect(screen.getByText(/Rosa/)).toBeTruthy();
});

it('keeps collection references stable across unrelated changes and updates on actual data changes', () => {
  const references: unknown[] = [];
  function Probe() {
    const records = useRecords('water', { elderId });
    references.push(records);
    return null;
  }
  const screen = render(<Probe />);
  const first = references[references.length - 1];
  act(() => db.setDraft(testUser.id, 'unrelated', true));
  screen.rerender(<Probe />);
  expect(references[references.length - 1]).toBe(first);
  act(() => db.insert('water', { date: '2026-10-11', at: '2026-10-11T12:00:00Z' }, { userId: testUser.id, elderId }));
  expect(references[references.length - 1]).not.toBe(first);
});
