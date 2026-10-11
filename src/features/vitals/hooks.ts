import { useMemo } from 'react';

import { useRepositoryValue } from '@/hooks/use-repository';
import { vitalsRepository as repo } from '@/repositories/in-memory';
import { toISODate } from '@/utils/dates';

import { addVital, countOn, describeTrend, entriesOf, latest, sparkValues, VITAL_TYPES, type VitalDraft } from './use-cases';

export function useVitals() {
  return useRepositoryValue(repo, repo.list);
}

export function useVitalCards(now: Date) {
  const entries = useVitals();
  const today = toISODate(now);
  return useMemo(() => {
    const cards = VITAL_TYPES.map((type) => {
      const list = entriesOf(entries, type);
      return { type, last: list.at(-1) ?? null, trend: describeTrend(list), spark: sparkValues(list), count: list.length };
    });
    return { cards, todayCount: countOn(entries, today), last: latest(entries), total: entries.length };
  }, [entries, today]);
}

export const vitalActions = {
  add: (draft: VitalDraft) => addVital(repo, draft, new Date()),
};
