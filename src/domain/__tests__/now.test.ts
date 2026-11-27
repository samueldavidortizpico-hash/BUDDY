import { elderNow, type ElderInput } from '../now';
import type { DoseItem } from '../schedule';
import type { Alert, Medication, Reminder } from '../types';

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

  it('agua: pide un vaso si no tomó ninguno desde la última hora programada', () => {
    const water = { ...meta, id: 'w', glasses: 8, times: ['08:00', '09:30', '11:00'] };
    expect(elderNow(base({ water, glassesToday: 1, lastGlassAt: at(8, 15).toISOString() })).now).toEqual({ kind: 'water', glasses: 1, goal: 8 });
    expect(elderNow(base({ water, glassesToday: 2, lastGlassAt: at(9, 40).toISOString() })).now.kind).toBe('done');
  });

  // V3.0 (reporte del dueño): a última hora el aviso exigía registrar TODOS los vasos atrasados (hasta 8) para irse.
  // Un vaso responde el aviso vigente; el siguiente aparece a la siguiente hora programada.
  it('agua: un solo vaso cierra el aviso aunque vaya atrasado frente a la meta', () => {
    const water = { ...meta, id: 'w', glasses: 8, times: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '19:00', '20:00'] };
    const late = at(20, 30);
    expect(elderNow(base({ now: late, water, glassesToday: 0 })).now.kind).toBe('water');
    expect(elderNow(base({ now: late, water, glassesToday: 1, lastGlassAt: at(20, 20).toISOString() })).now.kind).toBe('done');
    // Un vaso de antes de la última hora no responde el aviso de las 8:00 p. m.
    expect(elderNow(base({ now: late, water, glassesToday: 1, lastGlassAt: at(19, 10).toISOString() })).now.kind).toBe('water');
    // Meta cumplida: no se pide más.
    expect(elderNow(base({ now: late, water, glassesToday: 8, lastGlassAt: at(12, 0).toISOString() })).now.kind).toBe('done');
  });

  it('al adulto mayor no le aparecen automatizaciones apagadas ni las que son solo para el cuidador', () => {
    const rem = (id: string, automation?: Reminder['automation']) => ({ ...meta, id, title: id, time: '09:30', days: [], date: null, automation }) as Reminder;
    const kinds = (reminders: Reminder[]) => elderNow(base({ reminders })).now;
    expect(kinds([rem('agua', { kind: 'water', enabled: true })])).toMatchObject({ kind: 'reminder' });
    expect(kinds([rem('agua-off', { kind: 'water', enabled: false })]).kind).toBe('done');
    expect(kinds([rem('avisar', { kind: 'medication_alert', enabled: true, medicationId: 'm' })]).kind).toBe('done');
    expect(kinds([rem('simple')])).toMatchObject({ kind: 'reminder' });
  });
});
