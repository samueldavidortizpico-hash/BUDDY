import { useEffect, useMemo } from 'react';

import { useRepositoryValue } from '@/hooks/use-repository';
import { medicationRepository as repo } from '@/repositories/in-memory';
import { toISODate } from '@/utils/dates';

import { buildDayPlan, type DayPlan } from './schedule';
import {
  addMedication,
  confirmDose,
  skipDose,
  snoozeDose,
  syncDoses,
  type MedicationDraft,
} from './use-cases';

export function useMedications() {
  return useRepositoryValue(repo, repo.listMedications);
}

export function useDoses() {
  return useRepositoryValue(repo, repo.listDoses);
}

export function useDayPlan(now: Date): DayPlan {
  const meds = useMedications();
  const doses = useDoses();
  return useMemo(() => buildDayPlan(meds, doses, toISODate(now), now), [meds, doses, now]);
}

export function useMedication(id: string | undefined) {
  const meds = useMedications();
  const doses = useDoses();
  return useMemo(() => {
    const medication = meds.find((m) => m.id === id) ?? null;
    const history = doses
      .filter((d) => d.medicationId === id)
      .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
    return { medication, history };
  }, [meds, doses, id]);
}

/** Crea las tomas del día al abrir la app o al cambiar de fecha. */
export function useSyncTodayDoses(now: Date) {
  const today = toISODate(now);
  const count = useMedications().length;
  useEffect(() => {
    syncDoses(repo, new Date());
  }, [today, count]);
}

export const medicationActions = {
  add: (draft: MedicationDraft) => addMedication(repo, draft, new Date()),
  confirm: (doseId: string) => confirmDose(repo, doseId, new Date()),
  snooze: (doseId: string) => snoozeDose(repo, doseId, new Date()),
  skip: (doseId: string) => skipDose(repo, doseId, new Date()),
};
