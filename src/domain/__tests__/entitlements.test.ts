import { canUseFreeFeature, EntitlementService, featureAvailable, FREE_FEATURES } from '../entitlements';

jest.mock('react-native-purchases', () => ({ __esModule: true, default: {}, LOG_LEVEL: { WARN: 3 } }));

describe('planes BUDDY', () => {
  it('mantiene gratuitas todas las funciones de seguridad', () => {
    expect(FREE_FEATURES).toEqual(expect.arrayContaining(['medications', 'escalated_alerts', 'safety_alerts', 'ask_for_help', 'basic_automations', 'one_administrator']));
    expect(canUseFreeFeature('safety_alerts')).toBe(true);
  });
  it('reserva solo cuidadores adicionales y reloj para Plus', () => {
    expect(featureAvailable('free', 'watch_health')).toBe(false);
    expect(featureAvailable('plus', 'watch_health')).toBe(true);
    expect(featureAvailable('free', 'extra_caregivers')).toBe(false);
  });
  it('prioriza la activación local de prueba sobre el proveedor de tienda', async () => {
    await expect(EntitlementService.getPlan('account-1', 'plus')).resolves.toBe('plus');
    await expect(EntitlementService.getPlan('account-1', 'free')).resolves.toBe('free');
  });
});
