/**
 * Métricas descriptivas (sin diagnósticos) a partir de registros reales. Si no hay datos, `count === 0`/`null`
 * y la interfaz muestra un estado vacío; nunca se inventan valores.
 */
import { addDays, lastDays } from '@/utils/dates';

import { displayStatus } from './schedule';
import type { ActivityLog, Answer3, CheckinAnswer, DoseEvent, ISODate, MealLog, WaterEntry } from './types';

export type Period = 'day' | 'week' | 'month';

export function periodDays(period: Period, today: ISODate): ISODate[] {
  return lastDays(today, period === 'day' ? 1 : period === 'week' ? 7 : 30);
}

export interface Adherence {
  taken: number;
  snoozed: number;
  skipped: number;
  unconfirmed: number;
  pending: number;
  total: number;
  /** taken / (total − pending), null si no hay tomas vencidas. */
  ratio: number | null;
}

export function adherence(doses: DoseEvent[], days: ISODate[], now: Date): Adherence {
  const set = new Set(days);
  const a: Adherence = { taken: 0, snoozed: 0, skipped: 0, unconfirmed: 0, pending: 0, total: 0, ratio: null };
  for (const d of doses) {
    if (!set.has(d.date)) continue;
    a.total++;
    const st = displayStatus(d, now);
    if (st === 'taken') a.taken++;
    else if (st === 'skipped') a.skipped++;
    else if (st === 'unconfirmed') a.unconfirmed++;
    else if (st === 'snoozed') a.snoozed++;
    else a.pending++;
  }
  const due = a.total - a.pending - a.snoozed;
  a.ratio = due > 0 ? a.taken / due : null;
  return a;
}

/** Vasos por día (en el orden de `days`). */
export function waterByDay(entries: WaterEntry[], days: ISODate[]): number[] {
  const count = new Map<ISODate, number>();
  for (const e of entries) count.set(e.date, (count.get(e.date) ?? 0) + 1);
  return days.map((d) => count.get(d) ?? 0);
}

export function mealsSummary(logs: MealLog[], days: ISODate[]) {
  const set = new Set(days);
  const inRange = logs.filter((l) => set.has(l.date));
  return { yes: inRange.filter((l) => l.answer === 'yes').length, no: inRange.filter((l) => l.answer === 'no').length, answered: inRange.length };
}

export function activitySummary(logs: ActivityLog[], days: ISODate[]) {
  const set = new Set(days);
  const inRange = logs.filter((l) => set.has(l.date));
  return { done: inRange.filter((l) => l.done).length, notDone: inRange.filter((l) => !l.done).length };
}

export function answersBy(checkins: CheckinAnswer[], days: ISODate[], field: 'mood' | 'sleep'): Record<Answer3, number> & { answered: number } {
  const set = new Set(days);
  const r = { good: 0, regular: 0, bad: 0, answered: 0 };
  for (const c of checkins) {
    const v = c[field];
    if (set.has(c.date) && v) {
      r[v]++;
      r.answered++;
    }
  }
  return r;
}

/** Tendencia descriptiva del ánimo: compara la semana con la anterior (sin interpretar clínicamente). */
export function moodTrend(checkins: CheckinAnswer[], today: ISODate): 'better' | 'same' | 'worse' | null {
  const score = (days: ISODate[]) => {
    const vals: number[] = checkins.filter((c) => days.includes(c.date) && c.mood).map((c) => (c.mood === 'good' ? 2 : c.mood === 'regular' ? 1 : 0));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const now = score(lastDays(today, 7));
  const before = score(lastDays(addDays(today, -7), 7));
  if (now === null || before === null) return null;
  return now - before > 0.3 ? 'better' : before - now > 0.3 ? 'worse' : 'same';
}
