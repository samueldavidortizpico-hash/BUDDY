/**
 * V4 Fase 2: secuencia completa de un recordatorio con reloj simulado: aviso a la hora (T), segundo aviso (T+10),
 * "sin confirmar" (T+30) con alerta al administrador, y cancelación de todo al responder. Incluye el cambio de día.
 * Datos ficticios [PRUEBA].
 */
import { planNotifications } from '@/domain/notifications';
import { db } from '@/infrastructure/local/db';
import { doseActions, evaluateAlerts, medicationActions } from '@/state/care';
import { computeFeed } from '@/state/feed';
import { seedRenderData, testUser } from '@/testing/render-fixtures';

let elderId: string;
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  jest.setSystemTime(at(20, 7));
  elderId = (await seedRenderData()).id;
});
afterEach(() => jest.useRealTimers());

function medication(time: string) {
  return medicationActions.add({
    name: '[PRUEBA] Losartán', activeIngredient: '', strength: '', form: 'tablet', doseAmount: 1, doseUnit: 'unit',
    schedule: { kind: 'times', times: [time], days: [] }, startDate: '2026-10-01', endDate: null, instructions: '',
    purpose: '', description: '', unitsPerPackage: 30, unitsOnHand: 30, refillAlertDays: 3, photoUri: null, paused: false,
  }, elderId).med;
}
const doses = (medId: string) => db.list('doses', testUser.id, elderId).filter((d) => d.medicationId === medId);
const pendingAlerts = () => db.list('alerts', testUser.id, elderId).filter((a) => a.kind === 'dose_unconfirmed' && a.status === 'pending');
const keys = (medId: string) =>
  planNotifications({ now: new Date(), meds: db.list('medications', testUser.id, elderId), doses: db.list('doses', testUser.id, elderId), water: null, meals: [], appointments: [], lowStock: [], checkinTime: null, escalation: db.get('elders', elderId)!.screen })
    .map((n) => n.key)
    .filter((k) => k.startsWith(`med-${medId}-`));
const tick = (date: Date) => {
  jest.setSystemTime(date);
  doseActions.sync(elderId, date);
  evaluateAlerts(elderId, date);
};

it('aviso, segundo aviso, "sin confirmar" y cancelación al responder, en orden', () => {
  const med = medication('08:00');
  const T = `med-${med.id}-2026-10-20-08:00`;
  expect(keys(med.id).slice(0, 2)).toEqual([T, `${T}-r`]);
  tick(at(20, 8, 1));
  expect(keys(med.id)).toContain(`${T}-r`); // el aviso T ya salió; queda el segundo
  expect(keys(med.id)).not.toContain(T);
  tick(at(20, 8, 29));
  expect(pendingAlerts()).toHaveLength(0); // aún no es "sin confirmar"
  tick(at(20, 8, 30));
  expect(pendingAlerts()).toHaveLength(1);
  expect(computeFeed(new Date()).some((f) => f.key === `dose-${doses(med.id)[0].id}`)).toBe(true);
  tick(at(20, 8, 40));
  doseActions.confirm(doses(med.id)[0].id, 'elder');
  expect(pendingAlerts()).toHaveLength(0);
  expect(computeFeed(new Date()).some((f) => f.key.startsWith('dose-'))).toBe(false);
  expect(keys(med.id).some((k) => k.includes('2026-10-20'))).toBe(false);
  expect(db.get('medications', med.id)!.unitsOnHand).toBe(29);
});

it('posponer mueve el aviso y el "sin confirmar" a la nueva hora', () => {
  const med = medication('08:00');
  tick(at(20, 8, 5));
  doseActions.snooze(doses(med.id)[0].id, 'elder'); // 08:15
  tick(at(20, 8, 31));
  expect(pendingAlerts()).toHaveLength(0); // 08:15 + 30 = 08:45
  tick(at(20, 8, 45));
  expect(pendingAlerts()).toHaveLength(1);
});

it('cambio de día: una toma de las 23:50 sin respuesta avisa al administrador a las 00:20', () => {
  const med = medication('23:50');
  const T = `med-${med.id}-2026-10-20-23:50`;
  tick(at(20, 23, 45));
  expect(keys(med.id).slice(0, 2)).toEqual([T, `${T}-r`]); // el segundo aviso cae a las 00:00 del 21
  tick(at(21, 0, 19));
  expect(pendingAlerts()).toHaveLength(0);
  tick(at(21, 0, 20));
  expect(pendingAlerts()).toHaveLength(1);
  expect(pendingAlerts()[0].refId).toBe(doses(med.id).find((d) => d.date === '2026-10-20')!.id);
  // Responder cierra la alerta; la toma del 21 es otra y sigue pendiente para su hora.
  doseActions.confirm(pendingAlerts()[0].refId!, 'caregiver');
  expect(pendingAlerts()).toHaveLength(0);
  expect(doses(med.id).find((d) => d.date === '2026-10-21')?.status).toBe('pending');
});

it('cambio de día: lo que pasó a "sin confirmar" ayer no vuelve a avisar hoy', () => {
  const med = medication('20:00');
  tick(at(20, 20, 30));
  expect(pendingAlerts()).toHaveLength(1);
  db.update('alerts', pendingAlerts()[0].id, { status: 'attended' });
  tick(at(21, 7, 0));
  expect(pendingAlerts()).toHaveLength(0);
  expect(doses(med.id)).toHaveLength(2);
});
