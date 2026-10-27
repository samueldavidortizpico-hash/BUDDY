import { Platform } from 'react-native';

import { ENTITLEMENT_IDS, FEATURE_PLAN, PLAN_ORDER, PRODUCT_IDS, type BillingPeriod, type Feature, type PaidPlanId, type PlanId } from '@/config/plans';

export type { Feature, PlanId } from '@/config/plans';
/** Compatibilidad: el plan del usuario. */
export type EntitlementPlan = PlanId;

/** Siempre gratis: nunca se bloquea una función de seguridad. */
export const FREE_FEATURES = [
  'medications', 'reminders', 'escalated_alerts', 'stock', 'basic_automations', 'daily_checkin',
  'ask_for_help', 'safety_alerts', 'one_administrator',
] as const;

/** ¿El plan incluye la función? Cada plan incluye lo del anterior. */
export function featureAvailable(plan: PlanId, feature: Feature): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(FEATURE_PLAN[feature]);
}

export function canUseFreeFeature(feature: string): boolean {
  return (FREE_FEATURES as readonly string[]).includes(feature);
}

/** El plan mayor entre los activos (para RevenueCat, que puede tener varios entitlements). */
export function highestPlan(plans: PlanId[]): PlanId {
  return plans.reduce<PlanId>((best, p) => (PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(best) ? p : best), 'free');
}

let configuredPublicKey: string | null = null;

async function getConfiguredPurchases() {
  const key = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : Platform.OS === 'android' ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY : undefined;
  if (!key) return null;
  const { default: Purchases, LOG_LEVEL } = await import('react-native-purchases');
  if (configuredPublicKey !== key) {
    Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: key });
    configuredPublicKey = key;
  }
  return Purchases;
}

export function hasRevenueCatPublicKey(): boolean {
  return Platform.OS === 'ios'
    ? !!process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : Platform.OS === 'android' && !!process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
}

export type PurchaseResult = { ok: true; plan: PlanId } | { ok: false; reason: 'not_configured' | 'not_found' | 'cancelled' | 'error' };

export interface EntitlementProvider {
  getPlan(userId: string): Promise<PlanId>;
  setTestPlan?(userId: string, plan: PlanId): Promise<void>;
  restore?(): Promise<PlanId>;
  purchase?(plan: PaidPlanId, period: BillingPeriod): Promise<PurchaseResult>;
}

type CustomerInfo = { entitlements: { active: Record<string, unknown> } };
const planFromInfo = (info: CustomerInfo): PlanId =>
  highestPlan((Object.keys(ENTITLEMENT_IDS) as PaidPlanId[]).filter((p) => info.entitlements.active[ENTITLEMENT_IDS[p]]));

/**
 * Adaptador de RevenueCat (solo claves públicas de SDK). En Expo Go funciona su Preview (interfaz, sin compras); las
 * compras reales exigen un build instalable y productos creados en las tiendas (docs/PAGOS.md). Sin claves: gratis.
 */
export const revenueCatProvider: EntitlementProvider = {
  async getPlan() {
    const Purchases = await getConfiguredPurchases();
    if (!Purchases) return 'free';
    return planFromInfo(await Purchases.getCustomerInfo());
  },
  async restore() {
    const Purchases = await getConfiguredPurchases();
    if (!Purchases) return 'free';
    return planFromInfo(await Purchases.restorePurchases());
  },
  async purchase(plan, period) {
    const Purchases = await getConfiguredPurchases();
    if (!Purchases) return { ok: false, reason: 'not_configured' };
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages.find((p) => p.product.identifier === PRODUCT_IDS[plan][period]);
      if (!pkg) return { ok: false, reason: 'not_found' };
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return { ok: true, plan: planFromInfo(customerInfo) };
    } catch (e) {
      return { ok: false, reason: (e as { userCancelled?: boolean }).userCancelled ? 'cancelled' : 'error' };
    }
  },
};

/** Fachada: el plan de prueba local (solo desarrollo) manda sobre la tienda. */
export const EntitlementService = {
  async getPlan(userId: string, localOverride?: PlanId): Promise<PlanId> {
    if (localOverride !== undefined) return localOverride;
    return revenueCatProvider.getPlan(userId);
  },
  canUse: featureAvailable,
};

/** Proveedor local determinista: quien lo llama guarda el plan de prueba en el borrador de la cuenta. */
export function createLocalEntitlementProvider(storage: {
  read(userId: string): Promise<PlanId>;
  write(userId: string, plan: PlanId): Promise<void>;
}): EntitlementProvider {
  return { getPlan: storage.read, setTestPlan: storage.write };
}
