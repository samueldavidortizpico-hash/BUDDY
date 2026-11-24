import { Platform } from 'react-native';

import { CAPABILITIES, type Capabilities, type Capability } from '@/config/capabilities';
import { FEATURES } from '@/config/features';
import { ENTITLEMENT_IDS, FEATURE_PLAN, PLAN_ORDER, PRODUCT_IDS, type Benefit, type BillingPeriod, type Feature, type PaidPlanId, type PlanId, type PlanInfo } from '@/config/plans';

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

// ── Solo se cobra lo que se entrega (V5.3, auditoría de venta V-03) ──

/** ¿Existe el beneficio en esta compilación? Sin `requires`, ya existe. */
export function benefitAvailable(requires: Capability | undefined, caps: Capabilities = CAPABILITIES): boolean {
  return !requires || caps[requires];
}

/** Separa lo que el plan entrega hoy ("Incluido") de lo que todavía no existe ("Próximamente"). */
export function splitBenefits(plan: PlanInfo, caps: Capabilities = CAPABILITIES): { included: Benefit[]; soon: Benefit[] } {
  return {
    included: plan.benefits.filter((b) => benefitAvailable(b.requires, caps)),
    soon: plan.benefits.filter((b) => !benefitAvailable(b.requires, caps)),
  };
}

/**
 * ¿Se puede comprar? Solo un plan de pago con al menos UN beneficio propio disponible ("Todo lo de Plus" no cuenta:
 * nadie paga Salud por lo que ya trae Plus).
 */
export function planPurchasable(plan: PlanInfo, caps: Capabilities = CAPABILITIES): boolean {
  if (plan.monthly === 0) return false;
  return plan.benefits.some((b) => !b.inherited && benefitAvailable(b.requires, caps));
}

/** El plan mayor entre los activos (para RevenueCat, que puede tener varios entitlements). */
export function highestPlan(plans: PlanId[]): PlanId {
  return plans.reduce<PlanId>((best, p) => (PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(best) ? p : best), 'free');
}

let configuredPublicKey: string | null = null;
let configuredUser: string | null = null;

/**
 * `userId`: la cuenta de BUDDY dueña del plan. Las compras quedan asociadas a ella (SEC-05): en un teléfono con varias
 * cuentas, una no hereda la suscripción de otra. SIN PROBAR contra las tiendas (docs/PAGOS.md).
 */
async function getConfiguredPurchases(userId?: string) {
  const key = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : Platform.OS === 'android' ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY : undefined;
  if (!key) return null;
  const { default: Purchases, LOG_LEVEL } = await import('react-native-purchases');
  if (configuredPublicKey !== key) {
    Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure(userId ? { apiKey: key, appUserID: userId } : { apiKey: key });
    configuredPublicKey = key;
    configuredUser = userId ?? null;
  } else if (userId && configuredUser !== userId) {
    await Purchases.logIn(userId);
    configuredUser = userId;
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
  async getPlan(userId) {
    const Purchases = await getConfiguredPurchases(userId || undefined);
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

/**
 * Fachada. El plan de prueba local manda sobre la tienda SOLO donde existen las herramientas de desarrollo
 * (`FEATURES.devTools`: desarrollo o exportación de capturas). En una compilación de tienda el borrador se ignora
 * aunque siga guardado o alguien lo escriba en el almacenamiento: el plan lo decide la compra (SEC-05).
 */
export const EntitlementService = {
  async getPlan(userId: string, localOverride?: PlanId, allowOverride: boolean = FEATURES.devTools): Promise<PlanId> {
    if (allowOverride && localOverride !== undefined) return localOverride;
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
