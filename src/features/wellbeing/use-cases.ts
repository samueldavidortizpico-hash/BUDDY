/** Ánimo, síntomas, hidratación y hábitos. Sin interpretación clínica. */
import type { WellbeingRepository } from '@/repositories/contracts';
import type { ISODate, Intensity, MoodEntry, MoodKey, SymptomEntry } from '@/types/domain';
import { addDays, isValidClock, lastDays, parseISODate, toClock, toISODate } from '@/utils/dates';
import { createId } from '@/utils/id';

export const MOODS: { key: MoodKey; label: string; score: number }[] = [
  { key: 'excellent', label: 'Excelente', score: 100 },
  { key: 'good', label: 'Bien', score: 80 },
  { key: 'regular', label: 'Regular', score: 60 },
  { key: 'tired', label: 'Cansado', score: 45 },
  { key: 'sad', label: 'Triste', score: 35 },
  { key: 'bad', label: 'Mal', score: 25 },
];

export const moodLabel = (key: MoodKey) => MOODS.find((m) => m.key === key)?.label ?? '';
export const moodScore = (key: MoodKey) => MOODS.find((m) => m.key === key)?.score ?? 0;

export const SYMPTOMS = ['Dolor de cabeza', 'Mareo', 'Náuseas', 'Fatiga', 'Dolor muscular', 'Otro'] as const;
export const INTENSITY_LABELS: Record<Intensity, string> = { 1: 'Leve', 2: 'Moderado', 3: 'Fuerte' };

export const WATER_GOAL = 8;

export const HABITS = [
  { id: 'walk', name: 'Caminata suave', detail: '15 minutos' },
  { id: 'breathing', name: 'Respiración', detail: '3 minutos' },
  { id: 'food', name: 'Alimentación', detail: 'Fruta con el desayuno' },
] as const;
export type HabitId = (typeof HABITS)[number]['id'];

/** Metas diarias: 3 hábitos + hidratación completa + registrar el ánimo. */
export const DAILY_GOALS = HABITS.length + 2;

const NOTE_MAX = 500;

export function saveMood(repo: WellbeingRepository, mood: MoodKey, note: string, now: Date): MoodEntry {
  const entry: MoodEntry = {
    id: createId('mood'),
    date: toISODate(now),
    time: toClock(now),
    mood,
    note: note.trim().slice(0, NOTE_MAX),
    demo: false,
  };
  repo.addMood(entry);
  return entry;
}

export interface SymptomDraft {
  symptom: string;
  otherText: string;
  intensity: Intensity;
  date: ISODate;
  time: string;
  notes: string;
}

export function validateSymptom(d: SymptomDraft): Partial<Record<keyof SymptomDraft, string>> {
  const errors: Partial<Record<keyof SymptomDraft, string>> = {};
  if (!d.symptom) errors.symptom = 'Elige un síntoma.';
  if (d.symptom === 'Otro' && d.otherText.trim().length < 2) errors.otherText = 'Describe brevemente el síntoma.';
  if (!parseISODate(d.date)) errors.date = 'La fecha no es válida.';
  if (!isValidClock(d.time)) errors.time = 'La hora no es válida.';
  return errors;
}

export function saveSymptom(repo: WellbeingRepository, d: SymptomDraft) {
  const errors = validateSymptom(d);
  if (Object.keys(errors).length > 0) return { ok: false as const, errors };
  const entry: SymptomEntry = {
    id: createId('sym'),
    date: d.date,
    time: d.time,
    symptom: d.symptom === 'Otro' ? d.otherText.trim() : d.symptom,
    intensity: d.intensity,
    notes: d.notes.trim().slice(0, NOTE_MAX),
    demo: false,
  };
  repo.addSymptom(entry);
  return { ok: true as const, entry };
}

export function addWater(repo: WellbeingRepository, date: ISODate, delta: number): number {
  const next = Math.max(0, Math.min(WATER_GOAL, (repo.waterLog()[date] ?? 0) + delta));
  repo.setWater(date, next);
  return next;
}

export function toggleHabit(repo: WellbeingRepository, date: ISODate, id: HabitId): boolean {
  const done = repo.habitLog()[date] ?? [];
  const next = done.includes(id) ? done.filter((h) => h !== id) : [...done, id];
  repo.setHabits(date, next);
  return next.includes(id);
}

/** Último ánimo registrado de cada día (null si no hay). */
export function moodsByDay(moods: MoodEntry[], days: ISODate[]): (MoodEntry | null)[] {
  return days.map((day) => {
    const list = moods.filter((m) => m.date === day);
    return list.length ? list.reduce((a, b) => (a.time >= b.time ? a : b)) : null;
  });
}

export function weekMoods(moods: MoodEntry[], today: ISODate) {
  const days = lastDays(today, 7);
  return days.map((date, i) => ({ date, entry: moodsByDay(moods, days)[i] }));
}

export function goalsDone(habitsDone: string[], water: number, moodToday: boolean): number {
  return habitsDone.length + (water >= WATER_GOAL ? 1 : 0) + (moodToday ? 1 : 0);
}

/** Días seguidos (hasta hoy o ayer) con algún registro de ánimo o hábito. */
export function careStreak(moods: MoodEntry[], habits: Record<ISODate, string[]>, today: ISODate): number {
  const active = (d: ISODate) => moods.some((m) => m.date === d) || (habits[d]?.length ?? 0) > 0;
  let day = active(today) ? today : addDays(today, -1);
  let streak = 0;
  while (active(day) && streak < 365) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}
