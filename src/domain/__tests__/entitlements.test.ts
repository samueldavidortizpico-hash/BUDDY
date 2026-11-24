import type { Capabilities } from '@/config/capabilities';
import { FEATURES } from '@/config/features';
import { COMPARISON, FEATURE_PLAN, formatCOP, PLANS, RECOMMENDED_PLAN, yearlySavings, type PaidPlanId } from '@/config/plans';

import { benefitAvailable, canUseFreeFeature, EntitlementService, featureAvailable, FREE_FEATURES, highestPlan, planPurchasable, splitBenefits } from '../entitlements';

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

// V5.3 — auditoría de venta V-03 (spec commerce/plan-offering): solo se cobra lo que se entrega.
describe('oferta honesta', () => {
  const local: Capabilities = { server: false, watch: false, doctorReport: false };
  const withServer: Capabilities = { ...local, server: true };
  const own = (id: PaidPlanId, caps: Capabilities) => splitBenefits(PLANS[id], caps).included.filter((b) => !b.inherited).map((b) => b.text);

  it('con capacidades locales, Plus entrega chat, historial y sueño; Salud y Familiar nada propio', () => {
    expect(own('plus', local)).toEqual(['Chat con BUDDY: "Ponle losartán a las 6"', 'Ve cómo durmió tu mamá esta semana', 'Salud con gráficas e historial de semanas y meses']);
    expect(own('health', local)).toEqual([]);
    expect(own('family', local)).toEqual([]);
  });

  it('el reloj y el reporte para el médico no se cobran mientras no existan', () => {
    expect(FEATURES.watch).toBe(false);
    expect(FEATURES.doctorReport).toBe(false);
    expect(splitBenefits(PLANS.plus, local).soon.map((b) => b.requires)).toEqual(['watch', 'doctorReport']);
    expect(COMPARISON.filter((r) => !benefitAvailable(r.requires, local)).map((r) => r.label)).toEqual(expect.arrayContaining(['Reloj inteligente', 'Reporte para el médico']));
  });

  it('Plan con beneficios pendientes: Familiar y Salud no se pueden comprar sin servidor', () => {
    expect(planPurchasable(PLANS.family, local)).toBe(false);
    expect(planPurchasable(PLANS.health, local)).toBe(false);
  });

  it('Plan con parte disponible: Plus se puede comprar', () => {
    expect(planPurchasable(PLANS.plus, local)).toBe(true);
  });

  it('"Todo lo de Plus" no vuelve comprable a un plan', () => {
    expect(PLANS.health.benefits[0]).toMatchObject({ inherited: true });
    expect(planPurchasable({ ...PLANS.health, benefits: [PLANS.health.benefits[0]] }, withServer)).toBe(false);
  });

  it('con servidor, Salud y Familiar se vuelven comprables', () => {
    expect(planPurchasable(PLANS.health, withServer)).toBe(true);
    expect(planPurchasable(PLANS.family, withServer)).toBe(true);
  });

  it('el plan gratis nunca se "compra"', () => {
    expect(planPurchasable(PLANS.free, withServer)).toBe(false);
  });

  it('el plan recomendado está definido (la pantalla destaca el primero comprable si este no lo es)', () => {
    expect(PLANS[RECOMMENDED_PLAN]).toBeDefined();
  });
});

describe('seguridad siempre gratis, también con la suscripción vencida', () => {
  // Una suscripción vencida deja sin entitlements activos en la tienda: el plan vuelve a 'free'.
  it('con plan gratis siguen activos recordatorios, aviso escalonado, existencias, chequeo diario y pedir ayuda', () => {
    for (const f of ['reminders', 'escalated_alerts', 'stock', 'daily_checkin', 'ask_for_help', 'medications', 'safety_alerts']) {
      expect(canUseFreeFeature(f)).toBe(true);
    }
  });

  it('ninguna función de seguridad tiene plan mínimo', () => {
    for (const f of FREE_FEATURES) expect(Object.prototype.hasOwnProperty.call(FEATURE_PLAN, f)).toBe(false);
  });

  it('el plan gratis lista la seguridad como incluida, sin nada "Próximamente"', () => {
    const { included, soon } = splitBenefits(PLANS.free, { server: false, watch: false, doctorReport: false });
    expect(soon).toEqual([]);
    expect(included.map((b) => b.text)).toEqual(expect.arrayContaining(['Medicamentos, recordatorios y aviso escalonado', 'Pedir ayuda y alertas de seguridad']));
  });
});
