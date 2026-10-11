/** DATOS FICTICIOS DE DEMOSTRACIÓN — ánimo, síntomas, agua y hábitos de una usuaria inventada. */
import type { ISODate, MoodEntry, MoodKey, SymptomEntry } from '@/types/domain';
import { addDays, toISODate } from '@/utils/dates';

export function createDemoMoods(now: Date): MoodEntry[] {
  const today = toISODate(now);
  const pattern: MoodKey[] = ['good', 'excellent', 'regular', 'tired', 'good'];
  return pattern.map((mood, i) => ({
    id: `demo-mood-${i}`,
    date: addDays(today, i - 5),
    time: '09:00',
    mood,
    note: '',
    demo: true,
  }));
}

export function createDemoSymptoms(now: Date): SymptomEntry[] {
  return [
    {
      id: 'demo-sym-0',
      date: addDays(toISODate(now), -1),
      time: '12:35',
      symptom: 'Dolor de cabeza',
      intensity: 1,
      notes: '',
      demo: true,
    },
  ];
}

export function createDemoWater(now: Date): Record<ISODate, number> {
  const today = toISODate(now);
  return { [addDays(today, -2)]: 8, [addDays(today, -1)]: 6, [today]: 5 };
}

export function createDemoHabits(now: Date): Record<ISODate, string[]> {
  const today = toISODate(now);
  return { [addDays(today, -2)]: ['walk', 'breathing'], [addDays(today, -1)]: ['walk', 'food'], [today]: ['breathing'] };
}
