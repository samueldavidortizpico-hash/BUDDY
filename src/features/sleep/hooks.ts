import { useMemo } from 'react';

import { useRepositoryValue } from '@/hooks/use-repository';
import { sleepRepository as repo } from '@/repositories/in-memory';
import { toISODate } from '@/utils/dates';

import { saveSleep, sleepSummary, type SleepDraft } from './use-cases';

export function useSleepEntries() {
  return useRepositoryValue(repo, repo.list);
}

export function useSleepSummary(now: Date) {
  const entries = useSleepEntries();
  const today = toISODate(now);
  return useMemo(() => sleepSummary(entries, today), [entries, today]);
}

export const sleepActions = {
  save: (draft: SleepDraft) => saveSleep(repo, draft),
};
