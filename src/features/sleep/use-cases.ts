/** Registro manual de sueño y tendencias descriptivas simples. */
import type { SleepRepository } from '@/repositories/contracts';
import type { ClockTime, ISODate, SleepEntry, SleepQuality } from '@/types/domain';
import { clockToMinutes, isValidClock, lastDays } from '@/utils/dates';
import { createId } from '@/utils/id';

export const QUALITIES: { key: SleepQuality; label: string }[] = [
  { key: 'light', label: 'Ligera' },
  { key: 'good', label: 'Buena' },
  { key: 'deep', label: 'Profunda' },
];

export const qualityLabel = (q: SleepQuality) => QUALITIES.find((x) => x.key === q)?.label ?? '';

/** Minutos dormidos de `bedtime` a `wakeTime`, cruzando la medianoche si hace falta. */
export function sleepMinutes(bedtime: ClockTime, wakeTime: ClockTime): number {
  const diff = clockToMinutes(wakeTime) - clockToMinutes(bedtime);
  return diff > 0 ? diff : diff + 1440;
}

export interface SleepDraft {
  date: ISODate;
  bedtime: ClockTime;
  wakeTime: ClockTime;
  quality: SleepQuality;
  napMinutes: number;
}

export function saveSleep(repo: SleepRepository, d: SleepDraft) {
  if (!isValidClock(d.bedtime) || !isValidClock(d.wakeTime)) return { ok: false as const, error: 'Revisa las horas.' };
  if (d.bedtime === d.wakeTime) return { ok: false as const, error: 'La hora de dormir y de despertar no pueden ser iguales.' };
  const existing = repo.list().find((e) => e.date === d.date);
  const entry: SleepEntry = {
    id: existing?.id ?? createId('sleep'),
    ...d,
    napMinutes: Math.max(0, Math.min(240, d.napMinutes)),
    demo: false,
  };
  repo.upsert(entry);
  return { ok: true as const, entry };
}

export function sleepByDay(entries: SleepEntry[], days: ISODate[]): (SleepEntry | null)[] {
  return days.map((day) => entries.find((e) => e.date === day) ?? null);
}

/** Resumen descriptivo: duración, promedio de los días previos y diferencia. */
export function sleepSummary(entries: SleepEntry[], today: ISODate) {
  const days = lastDays(today, 7);
  const week = sleepByDay(entries, days);
  const minutes = week.map((e) => (e ? sleepMinutes(e.bedtime, e.wakeTime) : null));
  const known = minutes.filter((m): m is number => m !== null);
  const average = known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : null;
  const last = week[6];
  const lastMinutes = minutes[6];
  const previous = minutes.slice(0, 6).filter((m): m is number => m !== null);
  const previousAvg = previous.length ? previous.reduce((a, b) => a + b, 0) / previous.length : null;
  const delta = lastMinutes !== null && previousAvg !== null ? Math.round(lastMinutes - previousAvg) : null;
  return { days, week, minutes, average, last, lastMinutes, delta };
}
