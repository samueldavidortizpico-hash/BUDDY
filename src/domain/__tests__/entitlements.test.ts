import { FEATURE_PLAN, formatCOP, PLANS, RECOMMENDED_PLAN, yearlySavings } from '@/config/plans';

import { canUseFreeFeature, EntitlementService, featureAvailable, FREE_FEATURES, highestPlan } from '../entitlements';

jest.mock('react-native-purchases', () => ({ __esModule: true, default: {}, LOG_LEVEL: { WARN: 3 } }));

describe('planes BUDDY (V4.3)', () => {
  it('mantiene gratuitas todas las funciones de seguridad', () => {
    expect(FREE_FEATURES).toEqual(expect.arrayContaining(['medications', 'reminders', 'escalated_alerts', 'stock', 'daily_checkin', 'ask_for_help', 'safety_alerts']));
    expect(canUseFreeFeature('safety_alerts')).toBe(true);
    // Ninguna función de seguridad aparece como función de pago.
    for (const safety of FREE_FEATURES) expect(Object.keys(FEATURE_PLAN)).not.toContain(safety);
  });

  it('cada plan incluye lo del anterior', () => {
    expect(featureAvailable('free', 'chat')).toBe(false);
    expect(featureAvailable('plus', 'chat')).toBe(true);
    expect(featureAvailable('plus', 'nurse_role')).toBe(false);
    expect(featureAvailable('health', 'nurse_role')).toBe(true);
    expect(featureAvailable('health', 'chat')).toBe(true);
    expect(featureAvailable('health', 'family_members')).toBe(false);
    expect(featureAvailable('family', 'family_members')).toBe(true);
    expect(featureAvailable('family', 'watch')).toBe(true);
  });

  it('el plan mayor manda cuando hay varios activos', () => {
    expect(highestPlan(['plus', 'family', 'health'])).toBe('family');
    expect(highestPlan([])).toBe('free');
  });

  it('precios mensuales en pesos y anuales por definir, sin ahorro inventado', () => {
    expect([PLANS.plus.monthly, PLANS.health.monthly, PLANS.family.monthly]).toEqual([7000, 11000, 13000]);
    expect(formatCOP(13000)).toBe('$13.000');
    expect(yearlySavings(PLANS.family)).toBeNull();
    expect(yearlySavings({ ...PLANS.family, yearly: 130000 })).toBe(26000);
    expect(yearlySavings({ ...PLANS.family, yearly: 200000 })).toBeNull();
    expect(RECOMMENDED_PLAN).toBe('family');
  });

  it('prioriza el plan de prueba local sobre el proveedor de tienda', async () => {
    await expect(EntitlementService.getPlan('account-1', 'health')).resolves.toBe('health');
    await expect(EntitlementService.getPlan('account-1', 'free')).resolves.toBe('free');
  });
});
