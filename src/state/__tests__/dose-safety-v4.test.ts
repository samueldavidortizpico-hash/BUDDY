/** Datos ficticios [PRUEBA]. Regresiones V4 con la base local en memoria. */
import { planNotifications } from '@/domain/notifications';
import { dayStatus } from '@/domain/status';
import { db } from '@/infrastructure/local/db';
import { doseAmbiguity } from '@/domain/dose-safety';
import { doseActions, evaluateAlerts, medicationActions } from '@/state/care';
import { seedRenderData, testUser } from '@/testing/render-fixtures';
import { toISODate } from '@/utils/dates';

let elderId: string;
const today = '2026-10-23';
const at = (h: number, m = 0) => new Date(2026, 9, 23, h, m);
beforeEach(async () => {
  jest.useFakeTimers().setSystemTime(at(7));
  elderId = (await seedRenderData()).id;
});
afterEach(() => jest.useRealTimers());
function medication(times = ['08:00']) {
  return medicationActions.add({
    name: '[PRUEBA] Medicamento ficticio', activeIngredient: '', strength: '', form: 'tablet', doseAmount: 1, doseUnit: 'unit',
    schedule: { kind: 'times', times, days: [] }, startDate: today, endDate: null, instructions: '', purpose: '', description: '',
    unitsPerPackage: 30, unitsOnHand: 30, refillAlertDays: 3, photoUri: null, paused: false,
  }, elderId).med;
}
const doses = (id: string) => db.list('doses', testUser.id, elderId).filter(d => d.medicationId === id);
const alerts = () => db.list('alerts', testUser.id, elderId).filter(a => a.kind === 'dose_unconfirmed' && a.status === 'pending');
const plan = () => planNotifications({ now: new Date(), meds: db.list('medications', testUser.id, elderId), doses: db.list('doses', testUser.id, elderId), water: null, meals: [], appointments: [], lowStock: [], checkinTime: null });

it('F-01: confirmar 08:00 y editar a 09:00 no crea otra dosis hoy', () => {
  const med = medication();
  doseActions.confirm(doses(med.id)[0].id);
  medicationActions.update(med.id, { schedule: { kind: 'times', times: ['09:00'], days: [] } });
  expect(doses(med.id)).toHaveLength(1);
  expect(plan().some(n => n.key.includes(`${today}-09:00`))).toBe(false);
});
it('F-06: Tomé → No tomé devuelve existencias exactamente una vez', () => {
  const med = medication();
  const id = doses(med.id)[0].id;
  doseActions.confirm(id);
  doseActions.skip(id);
  doseActions.skip(id);
  expect(db.get('medications', med.id)!.unitsOnHand).toBe(30);
});
it('F-07: mover una toma cierra su alerta antigua', () => {
  const med = medication();
  jest.setSystemTime(at(8, 35));
  evaluateAlerts(elderId, new Date());
  expect(alerts()).toHaveLength(1);
  medicationActions.update(med.id, { schedule: { kind: 'times', times: ['09:00'], days: [] } });
  expect(alerts()).toHaveLength(0);
});
it('F-07: mover una toma pospuesta elimina la clave antigua y su segundo aviso', () => {
  const med = medication();
  doseActions.snooze(doses(med.id)[0].id);
  medicationActions.update(med.id, { schedule: { kind: 'times', times: ['09:00'], days: [] } });
  expect(doses(med.id)).toHaveLength(1);
  expect(plan().some(n => n.key.includes(`${today}-08:00`))).toBe(false);
});
it('F-07: eliminar medicamento cierra todas sus alertas pendientes', () => {
  const med = medication();
  jest.setSystemTime(at(8, 35));
  evaluateAlerts(elderId, new Date());
  medicationActions.remove(med.id);
  expect(alerts()).toHaveLength(0);
  expect(plan().some(n => n.key.includes(med.id))).toBe(false);
});
it('F-08: alerta de anteayer a las 23:50 Colombia no pertenece a ayer por su fecha UTC', () => {
  // Se ejecuta con TZ=America/Bogota; el ISO es el día siguiente al calendario local.
  const createdAt = new Date(2026, 9, 21, 23, 50).toISOString();
  const alert = db.insert('alerts', { kind: 'help_requested', title: '[PRUEBA]', detail: '[PRUEBA]', refId: null, status: 'pending', snoozedUntil: null }, { userId: testUser.id, elderId });
  const status = dayStatus({ now: at(0, 10), elderName: '[PRUEBA]', meds: [], doses: [], checkins: [], alerts: [{ ...alert, createdAt }], checkinTime: null, verification: { state: 'no_data' } });
  expect(toISODate(new Date(createdAt))).toBe('2026-10-21');
  expect(status.help).toBe(false);
});

// ── Escenarios adicionales de la Fase 1 (V4) ──
const open = (id: string) => doses(id).filter(d => !d.cancelledAt && (d.status === 'pending' || d.status === 'snoozed') && !d.safetyHold);
const times = (id: string) => doses(id).filter(d => !d.cancelledAt).map(d => `${d.time}:${d.status}`).sort();

it('R3 antes de la dosis: la toma pendiente se mueve a la nueva hora el mismo día, sin duplicar', () => {
  const med = medication();
  const id = doses(med.id)[0].id;
  medicationActions.update(med.id, { schedule: { kind: 'times', times: ['09:00'], days: [] } });
  expect(doses(med.id)).toHaveLength(1);
  expect(db.get('doses', id)!.time).toBe('09:00');
  expect(db.get('doses', id)!.safetyHold).toBeFalsy();
  expect(plan().some(n => n.key === `med-${med.id}-${today}-09:00`)).toBe(true);
  expect(plan().some(n => n.key.includes(`${today}-08:00`))).toBe(false);
});

it('R2 sin registros hoy: agregar una segunda hora la programa hoy', () => {
  const med = medication(['08:00']);
  medicationActions.update(med.id, { schedule: { kind: 'times', times: ['08:00', '20:00'], days: [] } });
  expect(times(med.id)).toEqual(['08:00:pending', '20:00:pending']);
});

it('R3 con un registro hoy: agregar una segunda hora rige desde mañana', () => {
  const med = medication(['08:00']);
  doseActions.confirm(doses(med.id)[0].id);
  medicationActions.update(med.id, { schedule: { kind: 'times', times: ['08:00', '20:00'], days: [] } });
  expect(times(med.id)).toEqual(['08:00:taken']);
  expect(doseAmbiguity(doses(med.id), med.id, today)).toBe(true);
});

it('R4 tres tomas: con la 1.ª tomada, cambiar las horas mueve solo las pendientes', () => {
  const med = medication(['08:00', '14:00', '20:00']);
  jest.setSystemTime(at(8, 5));
  const first = doses(med.id).find(d => d.time === '08:00')!;
  doseActions.confirm(first.id);
  medicationActions.update(med.id, { schedule: { kind: 'times', times: ['09:00', '15:00', '21:00'], days: [] } });
  expect(doses(med.id)).toHaveLength(3);
  expect(times(med.id)).toEqual(['08:00:taken', '15:00:pending', '21:00:pending']);
  expect(open(med.id)).toHaveLength(2);
});

it('R2 bajar y volver a subir la frecuencia sin registros no duplica ni pierde tomas', () => {
  const med = medication(['08:00', '14:00', '20:00']);
  medicationActions.update(med.id, { schedule: { kind: 'times', times: ['08:00'], days: [] } });
  expect(open(med.id)).toHaveLength(1);
  medicationActions.update(med.id, { schedule: { kind: 'times', times: ['08:00', '14:00', '20:00'], days: [] } });
  expect(times(med.id)).toEqual(['08:00:pending', '14:00:pending', '20:00:pending']);
  expect(doses(med.id)).toHaveLength(3);
});

it('R6 corrección accidental repetida: el inventario queda coherente y deja asientos', () => {
  const med = medication();
  const id = doses(med.id)[0].id;
  doseActions.confirm(id);
  doseActions.skip(id);
  doseActions.confirm(id);
  expect(db.get('medications', med.id)!.unitsOnHand).toBe(29);
  doseActions.skip(id);
  doseActions.skip(id);
  expect(db.get('medications', med.id)!.unitsOnHand).toBe(30);
  const moves = db.list('stock', testUser.id, elderId).filter(s => s.medicationId === med.id).map(s => s.units);
  expect(moves).toEqual([-1, 1, -1, 1]);
});

it('R1 cada confirmación y corrección agrega un evento con autor y hora, sin sobrescribir', () => {
  const med = medication();
  const id = doses(med.id)[0].id;
  doseActions.confirm(id);
  doseActions.skip(id);
  const history = db.get('doses', id)!.history!;
  expect(history.map(h => h.action)).toEqual(['created', 'confirm', 'skip']);
  expect(history.every(h => h.by && h.at)).toBe(true);
  expect(history[2]).toMatchObject({ role: 'caregiver', from: { status: 'taken' }, to: { status: 'skipped' } });
});

it('R7 medianoche: 23:50 pertenece a su día y 00:10 al siguiente', () => {
  const med = medication(['00:10', '23:50']);
  jest.setSystemTime(at(23, 55));
  doseActions.sync(elderId, new Date());
  const late = doses(med.id).find(d => d.time === '23:50')!;
  jest.setSystemTime(new Date(2026, 9, 24, 0, 5));
  doseActions.sync(elderId, new Date());
  doseActions.confirm(late.id);
  expect(db.get('doses', late.id)!.date).toBe(today);
  expect(doses(med.id).filter(d => d.date === '2026-10-24').map(d => d.time).sort()).toEqual(['00:10', '23:50']);
  expect(doses(med.id).filter(d => d.date === today)).toHaveLength(2);
});

it('R5 pausar cancela las pendientes de hoy y sus alertas', () => {
  const med = medication();
  jest.setSystemTime(at(8, 35));
  evaluateAlerts(elderId, new Date());
  medicationActions.pause(med.id, true);
  expect(open(med.id)).toHaveLength(0);
  expect(alerts()).toHaveLength(0);
  expect(plan().some(n => n.key.includes(med.id))).toBe(false);
});
