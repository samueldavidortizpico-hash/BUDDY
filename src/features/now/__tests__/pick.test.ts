import type { DoseItem } from '@/features/medications/schedule';
import type { DisplayDoseStatus, Medication } from '@/types/domain';

import { pickNow } from '../pick';

const dose = (id: string, time: string, status: DisplayDoseStatus = 'pending'): DoseItem => ({
  dose: { id, medicationId: 'm', date: '2026-10-11', time, status: status === 'unconfirmed' ? 'pending' : status, confirmedByUser: false, respondedAt: null, snoozedTo: null, demo: true },
  medication: { id: 'm', name: 'Metformina' } as Medication,
  status,
});

const base = { nowMinutes: 10 * 60, glasses: 3, goal: 8, moodDone: false };

describe('pickNow', () => {
  it('prioriza la toma que toca en menos de una hora', () => {
    const d = dose('a', '10:30');
    const r = pickNow({ ...base, open: [d], next: d });
    expect(r.now).toEqual({ kind: 'medication', item: d });
    expect(r.later.map((l) => l.kind)).toEqual(['water', 'checkin']);
  });

  it('una toma sin confirmar va primero aunque sea antigua', () => {
    const d = dose('a', '08:00', 'unconfirmed');
    expect(pickNow({ ...base, open: [d], next: d }).now.kind).toBe('medication');
  });

  it('si la toma es lejana, muestra el agua y deja la toma para más tarde', () => {
    const d = dose('a', '20:00');
    const r = pickNow({ ...base, open: [d], next: d });
    expect(r.now.kind).toBe('water');
    expect(r.later).toEqual([{ kind: 'medication', item: d }, { kind: 'checkin' }]);
  });

  it('con agua y ánimo hechos, muestra la próxima toma lejana', () => {
    const d = dose('a', '20:00');
    expect(pickNow({ ...base, glasses: 8, moodDone: true, open: [d], next: d }).now.kind).toBe('medication');
  });

  it('sin nada pendiente, el día está completo', () => {
    expect(pickNow({ ...base, glasses: 8, moodDone: true, open: [], next: null })).toEqual({ now: { kind: 'done' }, later: [] });
  });
});
