/**
 * V2.4 · Problema 6: existencias en tiempo real con reloj simulado. Confirmar "tomé" descuenta EXACTAMENTE la dosis
 * (fracciones y ml), una sola vez; omitir o posponer no descuenta; corregir una confirmación devuelve las unidades;
 * comprar suma y reinicia el ciclo de avisos; ≤ 3 días = un solo aviso por medicamento; a 0 = aviso adicional.
 * Datos ficticios de prueba.
 */
import { render, screen } from '@testing-library/react-native';

import { ElderScreen } from '@/features/elder/screen';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { draftActions } from '@/state/assistant';
import { alertActions, doseActions, medicationActions } from '@/state/care';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';
import { toISODate } from '@/utils/dates';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

let elderId: string;
beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 12, 7, 0));
  elderId = (await seedRenderData()).id;
});
afterEach(() => jest.useRealTimers());

function med(over: Partial<Parameters<typeof db.insert<'medications'>>[1]> = {}) {
  const m = db.insert(
    'medications',
    {
      name: '[PRUEBA] Losartán', activeIngredient: '', strength: '50 mg', form: 'tablet', doseAmount: 1, doseUnit: 'unit',
      schedule: { kind: 'times', times: ['08:00', '20:00'], days: [] }, startDate: '2026-10-01', endDate: null, instructions: '', purpose: '',
      description: '', unitsPerPackage: 30, unitsOnHand: 30, refillAlertDays: 3, photoUri: null, paused: false, ...over,
    },
    { userId: testUser.id, elderId },
  );
  doseActions.sync(elderId, new Date());
  return m;
}
const units = (id: string) => db.get('medications', id)!.unitsOnHand;
const doseOf = (medId: string, time = '08:00') => db.list('doses', testUser.id, elderId).find((d) => d.medicationId === medId && d.time === time)!;
const stockAlerts = (medId: string) => db.list('alerts', testUser.id, elderId).filter((a) => (a.kind === 'stock_low' || a.kind === 'stock_out') && a.refId === medId);

it('confirmar "tomé" descuenta exactamente la dosis, también fracciones y ml', () => {
  const half = med({ doseAmount: 0.5 });
  doseActions.confirm(doseOf(half.id).id);
  expect(units(half.id)).toBe(29.5);
  const oneHalf = med({ name: '[PRUEBA] Metformina', doseAmount: 1.5 });
  doseActions.confirm(doseOf(oneHalf.id).id);
  expect(units(oneHalf.id)).toBe(28.5);
  const syrup = med({ name: '[PRUEBA] Jarabe', form: 'syrup', doseUnit: 'ml', doseAmount: 7.5, unitsOnHand: 120 });
  doseActions.confirm(doseOf(syrup.id).id);
  expect(units(syrup.id)).toBe(112.5);
});

it('confirmar dos veces la misma toma descuenta una sola vez (idempotente)', () => {
  const m = med();
  const d = doseOf(m.id);
  doseActions.confirm(d.id);
  doseActions.confirm(d.id);
  expect(units(m.id)).toBe(29);
});

it('omitir o posponer no descuenta', () => {
  const m = med();
  doseActions.skip(doseOf(m.id).id);
  doseActions.snooze(doseOf(m.id, '20:00').id);
  expect(units(m.id)).toBe(30);
});

it('corregir una confirmación devuelve las unidades (compensación)', () => {
  const m = med({ doseAmount: 0.5 });
  const d = doseOf(m.id);
  doseActions.confirm(d.id);
  doseActions.reset(d.id);
  expect(units(m.id)).toBe(30);
  doseActions.confirm(d.id);
  expect(units(m.id)).toBe(29.5);
});

it('≤ 3 días: un solo aviso por medicamento aunque se atienda sin comprar; la compra reinicia el ciclo; a 0, aviso adicional', () => {
  const m = med({ unitsOnHand: 8 }); // 2 al día → 4 días
  expect(stockAlerts(m.id)).toHaveLength(0);
  doseActions.confirm(doseOf(m.id).id); // 7 → 3 días
  expect(stockAlerts(m.id).map((a) => a.kind)).toEqual(['stock_low']);
  alertActions.attend(stockAlerts(m.id)[0].id); // el cuidador lo ve pero aún no compra
  doseActions.confirm(doseOf(m.id, '20:00').id); // 6 → 3 días
  expect(stockAlerts(m.id)).toHaveLength(1);
  medicationActions.registerPurchase(m.id, { packages: 1 }); // +30
  expect(units(m.id)).toBe(36);
  expect(stockAlerts(m.id).every((a) => a.status === 'attended')).toBe(true);
  medicationActions.setStock(m.id, 2); // corrección: 1 día
  expect(stockAlerts(m.id).filter((a) => a.status === 'pending').map((a) => a.kind)).toEqual(['stock_low']);
  medicationActions.setStock(m.id, 0);
  expect(stockAlerts(m.id).filter((a) => a.status === 'pending').map((a) => a.kind).sort()).toEqual(['stock_low', 'stock_out']);
});

it('un medicamento agregado por el chat avisa a los 3 días por defecto', () => {
  draftActions.start([
    { type: 'add_medication', name: 'Losartán', strength: null, doseAmount: 1, doseUnit: 'unit', form: 'tablet', times: ['08:00'], days: [], everyHours: null, from: null, unitsPerPackage: 30, unitsOnHand: 30, instructions: '', productDecided: true },
  ]);
  draftActions.confirm();
  expect(db.list('medications', testUser.id, elderId)[0].refillAlertDays).toBe(3);
});

it('al agregar un medicamento con pocas unidades se avisa de una vez, y el adulto mayor ve una tarjeta sencilla y honesta', async () => {
  medicationActions.add(
    {
      name: '[PRUEBA] Losartán', activeIngredient: '', strength: '50 mg', form: 'tablet', doseAmount: 1, doseUnit: 'unit',
      schedule: { kind: 'times', times: ['08:00', '20:00'], days: [] }, startDate: '2026-10-01', endDate: null, instructions: '', purpose: '',
      description: '', unitsPerPackage: 30, unitsOnHand: 4, refillAlertDays: 3, photoUri: null, paused: false,
    },
    elderId,
  );
  await render(<RenderProviders><ElderScreen elderId={elderId} /></RenderProviders>);
  expect(screen.getAllByText(/Se están acabando tus pastillas/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/Ya le avisé/)).toBeNull();
  expect(toISODate(new Date())).toBe('2026-10-12');
  expect(strings.elder.stockBody('Laura')).toBe('Cuéntale a Laura para comprar más.');
});
