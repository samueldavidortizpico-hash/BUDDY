/**
 * V3.0 · Hito 5: vista de un segundo y resumen diario. Reglas deterministas: acción necesaria, atención, todo bien y
 * "Aún no hay registros" (nunca "Todo bien" sin datos). El resumen solo usa registros reales.
 */
import { dailySummary, dayStatus, type StatusInput } from '@/domain/status';
import type { Alert, CheckinAnswer, DoseEvent, Medication } from '@/domain/types';

const meta = { ownerUserId: 'u', elderId: 'e', createdBy: 'u', createdAt: '2026-10-20T07:00:00.000Z', updatedAt: '', deletedAt: null, syncStatus: 'local' as const };
const NOW = new Date(2026, 9, 20, 12, 0);
const med = (over: Partial<Medication> = {}): Medication => ({
  ...meta, id: 'm1', name: 'Losartán', activeIngredient: '', strength: '', form: 'tablet', doseAmount: 1, doseUnit: 'unit',
  schedule: { kind: 'times', times: ['08:00', '20:00'], days: [] }, startDate: '2026-10-01', endDate: null, instructions: '',
  purpose: '', description: '', unitsPerPackage: 30, unitsOnHand: 30, refillAlertDays: 3, photoUri: null, paused: false, ...over,
});
const dose = (time: string, status: DoseEvent['status'] = 'pending', id = time): DoseEvent => ({ ...meta, id, medicationId: 'm1', date: '2026-10-20', time, status, respondedAt: null, snoozedTo: null, snoozeCount: 0, answeredBy: status === 'taken' ? 'elder' : null });
const checkin = (over: Partial<CheckinAnswer> = {}): CheckinAnswer => ({ ...meta, id: 'c', date: '2026-10-20', mood: null, sleep: null, unwell: null, ...over });
const alert = (kind: Alert['kind']): Alert => ({ ...meta, id: kind, kind, title: '', detail: '', refId: null, status: 'pending', snoozedUntil: null } as Alert);
const OK = { state: 'ok' as const, lastAt: new Date(2026, 9, 20, 11, 30).toISOString() };

const input = (over: Partial<StatusInput> = {}): StatusInput => ({
  now: NOW, elderName: 'Rosa', meds: [med()], doses: [dose('08:00', 'taken'), dose('20:00')], checkins: [checkin({ mood: 'good', sleep: 'regular', unwell: false })],
  alerts: [], checkinTime: '10:00', verification: OK, ...over,
});

describe('estado de un segundo', () => {
  it('todo bien: nada pendiente y con señal reciente', () => {
    const s = dayStatus(input());
    expect(s).toMatchObject({ level: 'ok', call: false, help: false });
    expect(s.reason).toBe('Hoy: 1 de 2 tomas, chequeo respondido. Nada pendiente.');
    expect(s.facts).toMatchObject({ doses: { taken: 1, total: 2 }, checkin: 'answered', stock: { level: 'ok' }, lastSignal: 'hoy a las 11:30 a. m.' });
  });

  it('sin señales de su celular: "Aún no hay registros", nunca "Todo bien"', () => {
    const s = dayStatus(input({ verification: { state: 'no_data' }, doses: [], checkins: [], checkinTime: null }));
    expect(s.level).toBe('no_data');
    expect(s.facts.lastSignal).toBeNull();
  });

  it('acción necesaria: pidió ayuda (único caso en rojo y con llamada)', () => {
    expect(dayStatus(input({ alerts: [alert('help_requested')] }))).toMatchObject({ level: 'action', help: true, call: true });
  });

  it('acción necesaria: respondió hoy que se siente mal', () => {
    expect(dayStatus(input({ checkins: [checkin({ unwell: true })] }))).toMatchObject({ level: 'action', help: false, call: true });
  });

  it('acción necesaria: existencias en 0', () => {
    expect(dayStatus(input({ meds: [med({ unitsOnHand: 0 })] }))).toMatchObject({ level: 'action', reason: 'Losartán: no quedan unidades registradas.' });
  });

  it('atención: toma sin confirmar (a T+30 por defecto)', () => {
    const s = dayStatus(input({ now: new Date(2026, 9, 20, 8, 30), doses: [dose('08:00')], checkins: [] }));
    expect(s).toMatchObject({ level: 'attention', call: true });
    expect(s.reason).toContain('sin confirmar');
  });

  it('atención: no puedo verificar', () => {
    const s = dayStatus(input({ verification: { state: 'cannot_verify', reason: 'silence', lastAt: OK.lastAt, text: 'Sin señal desde ayer a las 8 p. m.' } }));
    expect(s.level).toBe('attention');
    expect(s.reason).toBe('No puedo verificar: sin señal desde ayer a las 8 p. m.');
  });

  it('atención: existencias bajas y chequeo sin responder', () => {
    expect(dayStatus(input({ meds: [med({ unitsOnHand: 4 })] })).level).toBe('attention');
    const missed = dayStatus(input({ checkins: [] }));
    expect(missed).toMatchObject({ level: 'attention', reason: 'Rosa aún no responde el chequeo de hoy.' });
    expect(missed.facts.checkin).toBe('missed');
    // Antes de una hora después de la hora del chequeo, todavía no es "sin responder".
    expect(dayStatus(input({ checkins: [], now: new Date(2026, 9, 20, 10, 30) })).facts.checkin).toBe('pending');
  });

  it('la prioridad es fija: pedir ayuda gana a todo lo demás', () => {
    const s = dayStatus(input({ alerts: [alert('help_requested')], meds: [med({ unitsOnHand: 0 })], checkins: [], verification: { state: 'no_data' } }));
    expect(s.help).toBe(true);
  });

  it('una toma en pausa no cuenta', () => {
    expect(dayStatus(input({ meds: [med({ paused: true })], now: new Date(2026, 9, 20, 9), doses: [dose('08:00')] })).level).toBe('ok');
  });
});

describe('resumen diario de una línea', () => {
  it('con todo en orden', () => {
    expect(dailySummary(input({ doses: [dose('08:00', 'taken', 'a'), dose('12:00', 'taken', 'b')], checkins: [checkin({ mood: 'good', sleep: 'regular', unwell: false })] }))).toBe('Hoy todo en orden: 2 de 2 medicinas, ánimo bien, durmió regular');
  });

  it('con algo por revisar lo dice, sin inventar lo que no se registró', () => {
    expect(dailySummary(input({ checkins: [] }))).toBe('Hoy, con algo por revisar: 1 de 2 medicinas, sin chequeo');
  });

  it('sin registros reales no hay resumen', () => {
    expect(dailySummary(input({ meds: [], doses: [], checkins: [], checkinTime: null, verification: { state: 'no_data' } }))).toBeNull();
  });
});
