import type { DoseEvent, Medication } from '@/types/domain';

import {
  buildDayPlan,
  displayStatus,
  missingDoses,
  scheduledTimes,
  snoozeTarget,
  UNCONFIRMED_AFTER_MIN,
} from '../schedule';

const med = (over: Partial<Medication> = {}): Medication => ({
  id: 'm1',
  name: 'Medicamento de prueba',
  strengthValue: '5',
  strengthUnit: 'mg',
  form: 'Tableta',
  doseAmount: '1',
  frequency: 'daily',
  times: ['20:00', '08:00'],
  instructions: '',
  startDate: '2026-03-01',
  endDate: null,
  color: 'coral',
  createdAt: '2026-03-01T00:00:00.000Z',
  demo: false,
  ...over,
});

const dose = (over: Partial<DoseEvent> = {}): DoseEvent => ({
  id: 'd1',
  medicationId: 'm1',
  date: '2026-03-29',
  time: '08:00',
  status: 'pending',
  confirmedByUser: false,
  respondedAt: null,
  snoozedTo: null,
  demo: false,
  ...over,
});

describe('scheduledTimes', () => {
  it('devuelve las horas ordenadas y sin duplicados', () => {
    expect(scheduledTimes(med({ times: ['20:00', '08:00', '08:00'] }), '2026-03-29')).toEqual(['08:00', '20:00']);
  });

  it('no programa tomas antes de la fecha de inicio', () => {
    expect(scheduledTimes(med({ startDate: '2026-04-01' }), '2026-03-31')).toEqual([]);
  });

  it('no programa tomas después de la fecha de fin del tratamiento', () => {
    expect(scheduledTimes(med({ endDate: '2026-03-28' }), '2026-03-29')).toEqual([]);
    expect(scheduledTimes(med({ endDate: '2026-03-29' }), '2026-03-29')).toEqual(['08:00', '20:00']);
  });

  it('"solo si lo necesito" no programa tomas', () => {
    expect(scheduledTimes(med({ frequency: 'as_needed' }), '2026-03-29')).toEqual([]);
  });

  it('días alternos: programa un día sí y otro no desde el inicio', () => {
    const m = med({ frequency: 'alternate', startDate: '2026-02-27' });
    expect(scheduledTimes(m, '2026-02-27')).toHaveLength(2);
    expect(scheduledTimes(m, '2026-02-28')).toEqual([]);
    expect(scheduledTimes(m, '2026-03-01')).toHaveLength(2); // cruza fin de mes
  });

  it('maneja el 29 de febrero y el cambio de año', () => {
    expect(scheduledTimes(med({ startDate: '2028-02-28' }), '2028-02-29')).toHaveLength(2);
    expect(scheduledTimes(med({ startDate: '2026-12-31' }), '2027-01-01')).toHaveLength(2);
  });
});

describe('missingDoses', () => {
  it('crea solo las tomas que faltan y no duplica', () => {
    const existing = [dose({ time: '08:00' })];
    const created = missingDoses([med()], existing, '2026-03-29');
    expect(created.map((d) => d.time)).toEqual(['20:00']);
    expect(created[0]).toMatchObject({ status: 'pending', confirmedByUser: false });
    expect(missingDoses([med()], [...existing, ...created], '2026-03-29')).toEqual([]);
  });
});

describe('displayStatus', () => {
  const at = (h: number, m: number) => new Date(2026, 2, 29, h, m);

  it('una toma sin respuesta pasa a "sin confirmar" tras el margen, nunca a omitida', () => {
    expect(displayStatus(dose(), at(8, UNCONFIRMED_AFTER_MIN))).toBe('pending');
    expect(displayStatus(dose(), at(9, 1))).toBe('unconfirmed');
  });

  it('las respuestas del usuario se respetan', () => {
    expect(displayStatus(dose({ status: 'taken' }), at(23, 0))).toBe('taken');
    expect(displayStatus(dose({ status: 'skipped' }), at(23, 0))).toBe('skipped');
  });

  it('una toma pospuesta cuenta desde la nueva hora', () => {
    const snoozed = dose({ status: 'snoozed', snoozedTo: '08:10' });
    expect(displayStatus(snoozed, at(9, 5))).toBe('snoozed');
    expect(displayStatus(snoozed, at(9, 11))).toBe('unconfirmed');
  });
});

describe('snoozeTarget', () => {
  it('pospone 10 minutos', () => {
    expect(snoozeTarget(new Date(2026, 2, 29, 14, 55))).toBe('15:05');
  });

  it('no cruza la medianoche', () => {
    expect(snoozeTarget(new Date(2026, 2, 29, 23, 55))).toBe('23:59');
  });
});

describe('buildDayPlan', () => {
  it('calcula progreso declarado y próxima toma', () => {
    const doses = [
      dose({ id: 'a', time: '08:00', status: 'taken', confirmedByUser: true }),
      dose({ id: 'b', time: '20:00' }),
    ];
    const plan = buildDayPlan([med()], doses, '2026-03-29', new Date(2026, 2, 29, 12, 0));
    expect(plan).toMatchObject({ taken: 1, total: 2, unconfirmed: 0 });
    expect(plan.next?.dose.id).toBe('b');
  });

  it('prefiere la próxima toma futura sobre una sin confirmar', () => {
    const doses = [dose({ id: 'a', time: '08:00' }), dose({ id: 'b', time: '20:00' })];
    const plan = buildDayPlan([med()], doses, '2026-03-29', new Date(2026, 2, 29, 12, 0));
    expect(plan.unconfirmed).toBe(1);
    expect(plan.next?.dose.id).toBe('b');
  });

  it('lista vacía: sin próxima toma', () => {
    expect(buildDayPlan([], [], '2026-03-29', new Date(2026, 2, 29))).toMatchObject({ total: 0, next: null });
  });
});
