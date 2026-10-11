import { useMemo } from 'react';

import { useRepositoryValue } from '@/hooks/use-repository';
import { caregiverRepository as repo, profileRepository } from '@/repositories/in-memory';

import { useDayPlan } from '../medications/hooks';

import { alertCounts, buildAlerts, markAttended, setLocationSharing } from './use-cases';

export function useCaregiverAlerts(now: Date) {
  const base = useRepositoryValue(repo, repo.listAlerts);
  const overrides = useRepositoryValue(repo, repo.alertOverrides);
  const plan = useDayPlan(now);
  return useMemo(() => {
    const alerts = buildAlerts(base, overrides, plan);
    return { alerts, counts: alertCounts(alerts) };
  }, [base, overrides, plan]);
}

export const caregiverActions = {
  markAttended: (id: string) => markAttended(repo, id),
  revokeLocation: () => setLocationSharing(profileRepository, false, new Date()),
  shareLocation: () => setLocationSharing(profileRepository, true, new Date()),
};
