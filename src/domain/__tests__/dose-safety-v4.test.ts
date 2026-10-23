import { doseAmbiguity, withDoseSlots } from '../dose-safety';
import { planNotifications, type PlanInput } from '../notifications';
import { dayDoses, missingDoses } from '../schedule';
import { dayFacts, dayStatus, type StatusInput } from '../status';
import type { DoseEvent, Medication } from '../types';

const meta = { ownerUserId: 'test-owner', elderId: 'test-elder', createdBy: 'test-owner', createdAt: '2026-10-23T12:00:00Z', updatedAt: '2026-10-23T12:00:00Z', deletedAt: null, syncStatus: 'local' as const };
const date = '2026-10-23';
const medication = (times = ['09:00']): Medication => ({ ...meta, id: 'test-med', name: '[PRUEBA] Medicamento ficticio', activeIngredient: '', strength: '', form: 'tablet', doseAmount: 1, doseUnit: 'unit', schedule: { kind: 'times', times, days: [] }, startDate: '2026-10-01', endDate: null, instructions: '', purpose: '', description: '', unitsPerPackage: null, unitsOnHand: null, refillAlertDays: 3, photoUri: null, paused: false });
const dose = (over: Partial<DoseEvent> = {}): DoseEvent => ({ ...meta, id: 'test-dose', medicationId: 'test-med', date, time: '08:00', status: 'pending', respondedAt: null, snoozedTo: null, snoozeCount: 0, answeredBy: null, ...over });
const input = (over: Partial<PlanInput> = {}): PlanInput => ({ now: new Date(), meds: [medication()], water: null, meals: [], checkinTime: null, appointments: [], lowStock: [], ...over });
const todayKeys = (over: Partial<PlanInput>) => planNotifications(input(over)).filter((n) => n.key.startsWith(`med-test-med-${date}`)).map((n) => n.key);

beforeEach(() => jest.useFakeTimers().setSystemTime(new Date(2026, 9, 23, 7)));
afterEach(() => jest.useRealTimers());

describe('V4 identidad y seguridad de tomas', () => {
  it('no crea una segunda dosis al cambiar hora despues de registrar una toma antigua sin slot', () => {
    expect(missingDoses([medication()], [dose({ status: 'taken' })], date)).toEqual([]);
    expect(todayKeys({ doses: [dose({ status: 'taken' })] })).toEqual([]);
  });

  it('infiere posiciones antiguas por hora y preserva posiciones explicitas sin mutar entradas', () => {
    const old = [dose({ time: '20:00' }), dose({ time: '08:00' }), dose({ time: '12:00', slot: 1 })];
    expect(withDoseSlots(old).map((d) => d.slot)).toEqual([2, 0, 1]);
    expect(old[0].slot).toBeUndefined();
  });

  it('con tres tomas la primera registrada consume su posicion y solo faltan la segunda y tercera', () => {
    expect(missingDoses([medication(['09:00', '14:00', '21:00'])], [dose({ status: 'taken' })], date).map((d) => [d.slot, d.time])).toEqual([[1, '14:00'], [2, '21:00']]);
  });

  it('una cancelacion conserva la posicion y no recrea la toma', () => {
    const cancelled = dose({ cancelledAt: new Date().toISOString() });
    expect(missingDoses([medication()], [cancelled], date)).toEqual([]);
    expect(todayKeys({ doses: [cancelled] })).toEqual([]);
    expect(dayDoses([medication()], [cancelled], date, new Date())).toEqual([]);
  });

  it('limita hoy al cupo anterior y permite la frecuencia nueva manana', () => {
    const m = medication(['09:00', '14:00', '21:00']);
    const d = dose({ status: 'taken', dayLimit: 1 });
    expect(missingDoses([m], [d], date)).toEqual([]);
    expect(todayKeys({ meds: [m], doses: [d] })).toEqual([]);
    expect(missingDoses([m], [d], '2026-10-24')).toHaveLength(3);
  });

  it('un registro fuera del rango sigue consumiendo cupo', () => {
    const d = dose({ slot: 2, status: 'taken' });
    expect(missingDoses([medication()], [d], date)).toEqual([]);
    expect(todayKeys({ doses: [d] })).toEqual([]);
  });

  it('el plan respeta la hora persistida y conserva identidad al posponer', () => {
    expect(todayKeys({ doses: [dose()] })).toEqual([`med-test-med-${date}-08:00`, `med-test-med-${date}-08:00-r`]);
    const keys = todayKeys({ doses: [dose({ status: 'snoozed', snoozedTo: '08:10' })] });
    expect(keys).toEqual([`med-test-med-${date}-08:00`, `med-test-med-${date}-08:00-r`]);
    const plan = planNotifications(input({ doses: [dose({ status: 'snoozed', snoozedTo: '08:10' })] }));
    expect(new Date((plan[0].trigger as { date: string }).date).getMinutes()).toBe(10);
  });

  it('un medicamento borrado no genera tomas ni avisos', () => {
    const m = { ...medication(), deletedAt: new Date().toISOString() };
    expect(missingDoses([m], [], date)).toEqual([]);
    expect(planNotifications(input({ meds: [m], lowStock: [m] }))).toEqual([]);
  });

  it('bloquea posiciones duplicadas y pendientes ambiguas de los avisos y del dia', () => {
    const d = dose({ slot: 0, safetyHold: true });
    expect(doseAmbiguity([d], d.medicationId, date)).toBe(true);
    expect(todayKeys({ doses: [d] })).toEqual([]);
    expect(dayDoses([medication()], [d], date, new Date())).toEqual([]);
    expect(todayKeys({ doses: [dose({ slot: 0 }), dose({ id: 'duplicate', slot: 0 })] })).toEqual([]);
  });

  it('R8 indica correccion de respuesta y cambio tras registro sin bloquear otras posiciones', () => {
    const d = dose({ slot: 0, status: 'taken', history: [{ at: new Date().toISOString(), by: 'test-owner', action: 'schedule_changed', from: { status: 'taken', time: '08:00' }, to: { time: '09:00' } }] });
    expect(doseAmbiguity([d], d.medicationId, date)).toBe(true);
    expect(doseAmbiguity([d], d.medicationId, date, 1)).toBe(false);
    const corrected = dose({ history: [{ at: new Date().toISOString(), by: 'test-owner', action: 'skipped', from: { status: 'taken' }, to: { status: 'skipped' } }] });
    expect(doseAmbiguity([corrected], corrected.medicationId, date)).toBe(true);
    expect(doseAmbiguity([dose()], d.medicationId, date)).toBe(false);
  });

  it('el resumen omite cancelaciones y medicamentos borrados', () => {
    const statusInput: StatusInput = { now: new Date(), elderName: '[PRUEBA]', meds: [medication()], doses: [dose({ cancelledAt: new Date().toISOString() })], checkins: [], alerts: [], checkinTime: null, verification: { state: 'no_data' } };
    expect(dayFacts(statusInput).doses).toEqual({ taken: 0, total: 0 });
    expect(dayStatus(statusInput).level).toBe('no_data');
  });
});
