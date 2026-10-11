import { useMemo } from 'react';

import { useRepositoryValue } from '@/hooks/use-repository';
import { medicationRepository, sleepRepository, vitalsRepository, wellbeingRepository } from '@/repositories/in-memory';
import { toISODate } from '@/utils/dates';

import { buildReport, type Period } from './use-cases';

export function useReport(period: Period, now: Date) {
  const doses = useRepositoryValue(medicationRepository, medicationRepository.listDoses);
  const moods = useRepositoryValue(wellbeingRepository, wellbeingRepository.listMoods);
  const symptoms = useRepositoryValue(wellbeingRepository, wellbeingRepository.listSymptoms);
  const sleep = useRepositoryValue(sleepRepository, sleepRepository.list);
  const vitals = useRepositoryValue(vitalsRepository, vitalsRepository.list);
  const today = toISODate(now);
  return useMemo(
    () => buildReport(period, { doses, moods, sleep, vitals, symptoms }, today),
    [period, doses, moods, sleep, vitals, symptoms, today],
  );
}
