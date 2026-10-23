import { Platform } from 'react-native';

/** Prices and store product identifiers are centralized; set prices in App Store Connect / Play Console. */
export const PLUS_PRODUCTS = {
  monthly: 'buddy_plus_monthly',
  yearly: 'buddy_plus_yearly',
} as const;
/** One editable display/catalog source; actual prices are supplied by store offerings once configured. */
export const PLUS_OFFER = {
  trialLabel: 'Por definir',
  monthlyPriceLabel: 'Por definir',
  yearlyPriceLabel: 'Por definir',
} as const;

export type EntitlementPlan = 'free' | 'plus';
export type PlusFeature = 'extra_caregivers' | 'watch_health';
export const FREE_FEATURES = [
  'medications', 'reminders', 'escalated_alerts', 'stock', 'basic_automations',
  'ask_for_help', 'safety_alerts', 'one_administrator',
] as const;
export const PLUS_FEATURES: readonly PlusFeature[] = ['extra_caregivers', 'watch_health'];
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

export interface EntitlementProvider {
  getPlan(userId: string): Promise<EntitlementPlan>;
  setTestPlan?(userId: string, plan: EntitlementPlan): Promise<void>;
  restore?(): Promise<EntitlementPlan>;
}

/** RevenueCat adapter uses only public SDK keys. Expo Go Preview is suitable for UI, not real purchases. */
export const revenueCatProvider: EntitlementProvider = {
  async getPlan() {
    const Purchases = await getConfiguredPurchases();
    if (!Purchases) return 'free';
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active['buddy_plus'] ? 'plus' : 'free';
  },
  async restore() {
    const Purchases = await getConfiguredPurchases();
    if (!Purchases) return 'free';
    const info = await Purchases.restorePurchases();
    return info.entitlements.active['buddy_plus'] ? 'plus' : 'free';
  },
};

/** Application-level entitlement facade. Local overrides are supplied only by the development settings UI. */
export const EntitlementService = {
  async getPlan(userId: string, localOverride?: EntitlementPlan): Promise<EntitlementPlan> {
    if (localOverride !== undefined) return localOverride;
    return revenueCatProvider.getPlan(userId);
  },
  canUse(plan: EntitlementPlan, feature: PlusFeature): boolean {
    return featureAvailable(plan, feature);
  },
};

/** Deterministic local provider. The caller persists the override in the account's local draft. */
export function createLocalEntitlementProvider(storage: {
  read(userId: string): Promise<EntitlementPlan>;
  write(userId: string, plan: EntitlementPlan): Promise<void>;
}): EntitlementProvider {
  return { getPlan: storage.read, setTestPlan: storage.write };
}

export function featureAvailable(plan: EntitlementPlan, feature: PlusFeature): boolean {
  return plan === 'plus' && PLUS_FEATURES.includes(feature);
}

export function canUseFreeFeature(feature: string): boolean {
  return (FREE_FEATURES as readonly string[]).includes(feature);
}
