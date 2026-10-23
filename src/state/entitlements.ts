import { useEffect, useState } from 'react';

import type { EntitlementPlan } from '@/domain/entitlements';
import { EntitlementService } from '@/domain/entitlements';
import { useDb } from '@/infrastructure/local/db';

import { useUserId } from './data';

/** Entitlement compartido; el override local solo existe durante desarrollo. */
export function useEntitlementPlan(): EntitlementPlan {
  const userId = useUserId() ?? '';
  const testPlus = useDb((state) => state.drafts[userId]?.buddyPlusTest === true);
  const [plan, setPlan] = useState<EntitlementPlan>(testPlus ? 'plus' : 'free');
  useEffect(() => {
    let active = true;
    void EntitlementService.getPlan(userId, testPlus ? 'plus' : undefined)
      .then((resolved) => { if (active) setPlan(resolved); })
      .catch(() => { if (active) setPlan(testPlus ? 'plus' : 'free'); });
    return () => { active = false; };
  }, [testPlus, userId]);
  return plan;
}

export function useIsPlus(): boolean { return useEntitlementPlan() === 'plus'; }
