/** Reportes descriptivos por periodo. No calcula índices clínicos ni puntajes de salud. */
import type { DoseEvent, ISODate, MoodEntry, SleepEntry, SymptomEntry, VitalEntry } from '@/types/domain';
import { addDays, dayInitial, formatClock, lastDays, toISODate } from '@/utils/dates';

import { adherenceByDay } from '../medications/schedule';
import { sleepByDay, sleepMinutes } from '../sleep/use-cases';
import { moodLabel, moodsByDay, moodScore } from '../wellbeing/use-cases';

export type Period = 'day' | 'week' | 'month';
export const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Día' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
];
const LENGTH: Record<Period, number> = { day: 1, week: 7, month: 28 };
const NAMES: Record<Period, string> = { day: 'DE HOY', week: 'SEMANAL', month: 'MENSUAL' };

export interface ReportData {
  doses: DoseEvent[];
  moods: MoodEntry[];
  sleep: SleepEntry[];
  vitals: VitalEntry[];
  symptoms: SymptomEntry[];
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const nonNull = <T,>(xs: (T | null)[]) => xs.filter((x): x is T => x !== null);

function avgSleep(sleep: SleepEntry[], days: ISODate[]) {
  return avg(nonNull(sleepByDay(sleep, days)).map((e) => sleepMinutes(e.bedtime, e.wakeTime)));
}

export function buildReport(period: Period, data: ReportData, today: ISODate) {
  const n = LENGTH[period];
  const days = lastDays(today, n);
  const prevDays = lastDays(addDays(today, -n), n);
  const inPeriod = (iso: string) => days.includes(toISODate(new Date(iso)));

  const daily = adherenceByDay(data.doses, days);
  const known = nonNull(daily);
  const adherence = known.length ? Math.round((avg(known) ?? 0) * 100) : null;

  let bars: { label: string; value: number | null }[];
  if (period === 'day') {
    bars = data.doses
      .filter((d) => d.date === today)
      .sort((a, b) => (a.time < b.time ? -1 : 1))
      .map((d) => ({ label: formatClock(d.time).replace(' ', ' '), value: d.status === 'taken' ? 1 : 0 }));
  } else if (period === 'week') {
    bars = days.map((d, i) => ({ label: dayInitial(d), value: daily[i] }));
  } else {
    bars = [0, 1, 2, 3].map((w) => ({ label: `S${w + 1}`, value: avg(nonNull(daily.slice(w * 7, w * 7 + 7))) }));
  }

  const moods = nonNull(moodsByDay(data.moods, days));
  const counts = new Map<string, number>();
  moods.forEach((m) => counts.set(m.mood, (counts.get(m.mood) ?? 0) + 1));
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const sleepAvg = avgSleep(data.sleep, days);
  const sleepPrev = avgSleep(data.sleep, prevDays);
  const vitalsCount = data.vitals.filter((v) => inPeriod(v.recordedAt)).length;
  const symptomsCount = data.symptoms.filter((s) => days.includes(s.date)).length;

  const title =
    adherence === null
      ? 'Aún sin datos suficientes'
      : adherence >= 90
        ? 'Un periodo constante'
        : adherence >= 70
          ? 'Vas por buen camino'
          : 'Algunas tomas quedaron sin confirmar';

  return {
    name: NAMES[period],
    title,
    text: `Confirmaste ${adherence ?? 0}% de tus tomas, registraste tu ánimo ${moods.length} ${moods.length === 1 ? 'vez' : 'veces'} y ${vitalsCount} ${vitalsCount === 1 ? 'dato' : 'datos'} de salud.`,
    adherence,
    bars,
    moodSpark: moods.map((m) => moodScore(m.mood)),
    dominantMood: dominant ? moodLabel(dominant as MoodEntry['mood']) : null,
    sleepAvg: sleepAvg === null ? null : Math.round(sleepAvg),
    sleepDelta: sleepAvg !== null && sleepPrev !== null ? Math.round(sleepAvg - sleepPrev) : null,
    vitalsCount,
    symptomsCount,
  };
}

export type Report = ReturnType<typeof buildReport>;
