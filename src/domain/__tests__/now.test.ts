import { elderNow, type ElderInput } from '../now';
import type { DoseItem } from '../schedule';
import type { Alert, Medication } from '../types';

const meta = { ownerUserId: 'u', elderId: 'e', createdBy: 'u', createdAt: '', updatedAt: '2026-10-11T10:00:00.000Z', deletedAt: null, syncStatus: 'pending' as const };
const at = (h: number, m = 0) => new Date(2026, 9, 11, h, m);

function dose(time: string, status: DoseItem['status'] = 'pending'): DoseItem {
  return {
    dose: { ...meta, id: `d${time}`, medicationId: 'm', date: '2026-10-11', time, status: status === 'unconfirmed' ? 'pending' : status, respondedAt: null, snoozedTo: null, snoozeCount: 0, answeredBy: null },
    medication: { ...meta, id: 'm', name: 'Losartán' } as Medication,
    status,
  };
}

const base = (over: Partial<ElderInput> = {}): ElderInput => ({
  now: at(10),
  doses: [],
  stockAlerts: [],
  seenAlerts: [],
  checkinTime: null,
  checkin: null,
  meals: [],
  mealLogs: [],
  activities: [],
  activityLogs: [],
  water: null,
  glassesToday: 0,
  reminders: [],
  seenReminders: [],
  ...over,
});

describe('elderNow', () => {
  it('sin nada programado, el día está completo', () => {
    expect(elderNow(base()).now.kind).toBe('done');
  });

  it('el aviso de existencias sin leer va primero; leído, ya no aparece', () => {
    const alert = { ...meta, id: 'a1', kind: 'stock_low' } as Alert;
    expect(elderNow(base({ stockAlerts: [alert], doses: [dose('10:30')] })).now.kind).toBe('stock');
    expect(elderNow(base({ stockAlerts: [alert], seenAlerts: ['a1'], doses: [dose('10:30')] })).now.kind).toBe('dose');
  });

  it('medicamento en menos de una hora o sin confirmar; uno lejano queda para más tarde', () => {
    expect(elderNow(base({ doses: [dose('10:45')] })).now.kind).toBe('dose');
    const r = elderNow(base({ doses: [dose('20:00')] }));
    expect(r.now.kind).toBe('done');
    expect(r.later).toEqual([{ time: '20:00', label: 'Losartán', kind: 'dose' }]);
  });

  it('chequeo de 3 preguntas, una por vez', () => {
    expect(elderNow(base({ checkinTime: '09:00' })).now).toEqual({ kind: 'checkin', step: 'mood' });
    const c = { ...meta, id: 'c', date: '2026-10-11', mood: 'good' as const, sleep: null, unwell: null };
    expect(elderNow(base({ checkinTime: '09:00', checkin: c })).now).toEqual({ kind: 'checkin', step: 'sleep' });
  });

  it('pregunta por la comida tras su hora y deja de preguntar al confirmarla', () => {
    const meal = { ...meta, id: 'b', kind: 'breakfast' as const, time: '08:00' };
    expect(elderNow(base({ meals: [meal] })).now.kind).toBe('meal');
    expect(elderNow(base({ meals: [meal], mealLogs: [{ ...meta, id: 'l', mealId: 'b', date: '2026-10-11', answer: 'yes' }] })).now.kind).toBe('done');
  });

  it('agua: pide un vaso si va por detrás de las horas programadas', () => {
    const water = { ...meta, id: 'w', glasses: 8, times: ['08:00', '09:30', '11:00'] };
    expect(elderNow(base({ water, glassesToday: 1 })).now).toEqual({ kind: 'water', glasses: 1, goal: 8 });
    expect(elderNow(base({ water, glassesToday: 2 })).now.kind).toBe('done');
  });
});
