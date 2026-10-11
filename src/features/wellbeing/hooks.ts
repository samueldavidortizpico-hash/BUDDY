import { useMemo } from 'react';

import { useRepositoryValue } from '@/hooks/use-repository';
import { wellbeingRepository as repo } from '@/repositories/in-memory';
import type { MoodKey } from '@/types/domain';
import { toISODate } from '@/utils/dates';

import {
  addWater,
  careStreak,
  goalsDone,
  saveMood,
  saveSymptom,
  toggleHabit,
  weekMoods,
  type HabitId,
  type SymptomDraft,
} from './use-cases';

export { HABITS, INTENSITY_LABELS, MOODS, SYMPTOMS, WATER_GOAL, DAILY_GOALS, moodLabel, type HabitId, type SymptomDraft } from './use-cases';

export function useMoods() {
  return useRepositoryValue(repo, repo.listMoods);
}

export function useSymptoms() {
  return useRepositoryValue(repo, repo.listSymptoms);
}

export function useWeekMoods(now: Date) {
  const moods = useMoods();
  const today = toISODate(now);
  return useMemo(() => weekMoods(moods, today), [moods, today]);
}

export function useTodayMood(now: Date) {
  const moods = useMoods();
  const today = toISODate(now);
  return useMemo(() => moods.filter((m) => m.date === today).at(-1) ?? null, [moods, today]);
}

export function useWellnessDay(now: Date) {
  const today = toISODate(now);
  const water = useRepositoryValue(repo, repo.waterLog);
  const habits = useRepositoryValue(repo, repo.habitLog);
  const moods = useMoods();
  return useMemo(() => {
    const done = habits[today] ?? [];
    const glasses = water[today] ?? 0;
    const moodToday = moods.some((m) => m.date === today);
    return {
      today,
      glasses,
      habitsDone: done,
      goals: goalsDone(done, glasses, moodToday),
      streak: careStreak(moods, habits, today),
    };
  }, [water, habits, moods, today]);
}

export function useTodaySymptoms(now: Date) {
  const symptoms = useSymptoms();
  const today = toISODate(now);
  return useMemo(() => symptoms.filter((s) => s.date === today), [symptoms, today]);
}

export const wellbeingActions = {
  saveMood: (mood: MoodKey, note: string) => saveMood(repo, mood, note, new Date()),
  saveSymptom: (draft: SymptomDraft) => saveSymptom(repo, draft),
  addWater: (delta = 1) => addWater(repo, toISODate(new Date()), delta),
  toggleHabit: (id: HabitId) => toggleHabit(repo, toISODate(new Date()), id),
};
