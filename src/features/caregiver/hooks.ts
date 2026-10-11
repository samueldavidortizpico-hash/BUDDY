import { useMemo } from 'react';

import { useRepositoryValue } from '@/hooks/use-repository';
import { caregiverRepository as repo, profileRepository } from '@/repositories/in-memory';
import { toISODate } from '@/utils/dates';

import { useDayPlan } from '../medications/hooks';
import { useSettings } from '../profile/hooks';
import { useSleepSummary } from '../sleep/hooks';
import { useVitals } from '../vitals/hooks';
import { useMoods, useSymptoms, useTodayMood, useWellnessDay } from '../wellbeing/hooks';

import { alertCounts, buildAlerts, markAttended, setLocationSharing, todayActivity } from './use-cases';

export { DEMO_CAREGIVER } from './demo-data';
export { ALERT_STATUS_LABEL, type ActivityItem } from './use-cases';

export function useCaregiverAlerts(now: Date) {
  const base = useRepositoryValue(repo, repo.listAlerts);
  const overrides = useRepositoryValue(repo, repo.alertOverrides);
  const plan = useDayPlan(now);
  return useMemo(() => {
    const alerts = buildAlerts(base, overrides, plan);
    return { alerts, counts: alertCounts(alerts) };
  }, [base, overrides, plan]);
}

/** Resumen del día de la persona acompañada (solo datos que ella registró y autorizó compartir). */
export function useCaregiverOverview(now: Date) {
  const plan = useDayPlan(now);
  const mood = useTodayMood(now);
  const sleep = useSleepSummary(now);
  const wellness = useWellnessDay(now);
  const moods = useMoods();
  const symptoms = useSymptoms();
  const vitals = useVitals();
  const { locationSharing } = useSettings();
  const { counts } = useCaregiverAlerts(now);
  const today = toISODate(now);

  const activity = useMemo(() => todayActivity({ plan, moods, symptoms, vitals }, today), [plan, moods, symptoms, vitals, today]);
  const symptomsToday = symptoms.filter((s) => s.date === today);

  return { plan, mood, sleep, wellness, symptomsToday, activity, lastActivity: activity[0] ?? null, locationSharing, counts };
}

export const caregiverActions = {
  markAttended: (id: string) => markAttended(repo, id),
  revokeLocation: () => setLocationSharing(profileRepository, false, new Date()),
  shareLocation: () => setLocationSharing(profileRepository, true, new Date()),
};
