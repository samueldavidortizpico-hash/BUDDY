import { useEffect, useState } from 'react';

import { FEATURES } from '@/config/features';
import { PLAN_ORDER, type Feature, type PlanId } from '@/config/plans';
import { EntitlementService, featureAvailable } from '@/domain/entitlements';
import { db, useDb } from '@/infrastructure/local/db';

import { useUserId } from './data';
import { currentUserId } from './session';

/** Borrador de la cuenta con el plan de prueba (solo desarrollo o compra simulada) y desde cuándo. */
const PLAN_KEY = 'buddyPlan';
const SINCE_KEY = 'buddyPlanSince';

function testPlanOf(drafts: Record<string, unknown> | undefined): PlanId | undefined {
  // SEC-05: fuera de desarrollo el plan de prueba no existe, aunque el borrador siga guardado.
  if (!FEATURES.devTools) return undefined;
  const p = drafts?.[PLAN_KEY];
  if (typeof p === 'string' && (PLAN_ORDER as string[]).includes(p)) return p as PlanId;
  // Compatibilidad con el interruptor anterior "BUDDY Plus de prueba".
  return drafts?.buddyPlusTest === true ? 'plus' : undefined;
}

/**
 * Plan del dueño de los datos: el adulto mayor y la enfermera ven las funciones del plan de su administrador. El plan de
 * prueba local manda sobre la tienda; sin él, RevenueCat (o gratis si no está configurado).
 */
export function useEntitlementPlan(): PlanId {
  const owner = useUserId() ?? '';
  const test = useDb((state) => testPlanOf(state.drafts[owner] as Record<string, unknown> | undefined));
  const [plan, setPlan] = useState<PlanId>(test ?? 'free');
  useEffect(() => {
    let active = true;
    void EntitlementService.getPlan(owner, test)
      .then((resolved) => { if (active) setPlan(resolved); })
      .catch(() => { if (active) setPlan(test ?? 'free'); });
    return () => { active = false; };
  }, [test, owner]);
  return plan;
}

export function useHasFeature(feature: Feature): boolean {
  return featureAvailable(useEntitlementPlan(), feature);
}

export function useIsPlus(): boolean {
  return useEntitlementPlan() !== 'free';
}

/** Fecha de renovación del plan de prueba (30 días desde que se activó); null en Gratis. */
export function useRenewalDate(): Date | null {
  const owner = useUserId() ?? '';
  const since = useDb((state) => (state.drafts[owner] as Record<string, unknown> | undefined)?.[SINCE_KEY]);
  if (typeof since !== 'string') return null;
  const d = new Date(since);
  d.setDate(d.getDate() + 30);
  return d;
}

export const planActions = {
  /** Plan de prueba en este teléfono: no compra ni cobra. */
  setTestPlan(plan: PlanId, owner = currentUserId()) {
    if (!FEATURES.devTools) return;
    db.setDraft(owner, PLAN_KEY, plan);
    db.setDraft(owner, SINCE_KEY, plan === 'free' ? null : new Date().toISOString());
    db.setDraft(owner, 'buddyPlusTest', null);
  },
};
