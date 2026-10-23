/**
 * V2.4 · Problema 9: ubicación con consentimiento. El administrador solo solicita; el adulto mayor acepta, rechaza o
 * revoca; sin datos reales no se muestra ninguna ubicación; revocar borra (de verdad) lo guardado; minimización.
 * La ubicación simulada es FICTICIA (jest.setup.ts).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import LocationScreen from '@/app/(caregiver)/(tabs)/location';
import { KEEP_FIXES, STALE_MIN, locationView } from '@/domain/location';
import { ElderScreen } from '@/features/elder/screen';
import { ElderLocation } from '@/features/elder/location';
import { db, useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { locationActions } from '@/state/location';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  usePathname: () => '/location',
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

const L = strings.location;
let elderId: string;
beforeEach(async () => {
  elderId = (await seedRenderData()).id;
});
const fixes = () => db.list('locations', testUser.id, elderId);
const ui = (node: React.ReactNode) => render(<RenderProviders>{node}</RenderProviders>);

describe('estado de la ubicación (puro)', () => {
  const fix = (at: string) => ({ id: at, lat: 4.6, lng: -74.08, accuracy: 20, at, ownerUserId: 'u', elderId: 'e', createdBy: 'u', createdAt: at, updatedAt: at, deletedAt: null, syncStatus: 'pending' as const });
  const now = new Date('2026-10-12T15:00:00Z');
  it('sin consentimiento no hay ubicación, aunque existan datos', () => {
    expect(locationView({ locationConsent: 'revoked' }, [fix('2026-10-12T14:59:00Z')], now)).toEqual({ kind: 'not_shared', reason: 'revoked' });
    expect(locationView({}, [], now)).toEqual({ kind: 'not_shared', reason: 'none' });
  });
  it(`con consentimiento: la más reciente, y desactualizada después de ${STALE_MIN} min`, () => {
    const v = locationView({ locationConsent: 'granted' }, [fix('2026-10-12T14:00:00Z'), fix('2026-10-12T14:50:00Z')], now);
    expect(v).toMatchObject({ kind: 'located', minutesAgo: 10, stale: false, last: { at: '2026-10-12T14:50:00Z' } });
    expect(locationView({ locationConsent: 'granted' }, [fix('2026-10-12T14:00:00Z')], now)).toMatchObject({ stale: true });
    expect(locationView({ locationConsent: 'granted' }, [], now)).toEqual({ kind: 'waiting' });
  });
});

describe('consentimiento (matriz can)', () => {
  it('solo el adulto mayor decide; sin consentimiento no se registra nada', () => {
    expect(locationActions.record(elderId, { lat: 1, lng: 1, accuracy: null }, 'elder')).toBeNull();
    locationActions.request(elderId);
    expect(db.get('elders', elderId)!.locationConsent).toBe('requested');
    expect(locationActions.decide(elderId, true, 'caregiver')).toBeNull();
    expect(db.get('elders', elderId)!.locationConsent).toBe('requested');
    locationActions.decide(elderId, true, 'elder');
    expect(locationActions.record(elderId, { lat: 1, lng: 1, accuracy: null }, 'caregiver')).toBeNull();
    expect(locationActions.record(elderId, { lat: 1, lng: 1, accuracy: null }, 'elder')).not.toBeNull();
  });

  it(`conserva solo las últimas ${KEEP_FIXES} y revocar las borra de verdad (no quedan con deletedAt)`, () => {
    locationActions.request(elderId);
    locationActions.decide(elderId, true, 'elder');
    // Una ubicación cada 10 minutos (dos en el mismo minuto se descartan como duplicadas).
    jest.useFakeTimers();
    for (let i = 0; i < KEEP_FIXES + 5; i++) {
      jest.setSystemTime(new Date(2026, 9, 12, 8, i * 10));
      locationActions.record(elderId, { lat: i, lng: i, accuracy: 10 }, 'elder');
    }
    jest.useRealTimers();
    expect(fixes()).toHaveLength(KEEP_FIXES);
    expect(fixes().some((f) => f.lat === 0)).toBe(false); // se descartaron las más viejas
    locationActions.revoke(elderId, 'elder');
    expect(Object.keys(useDb.getState().locations)).toHaveLength(0);
    expect(db.get('elders', elderId)!.locationConsent).toBe('revoked');
  });
});

describe('pantallas', () => {
  it('flujo completo: solicitar → el adulto mayor acepta → el mapa aparece → revoca', async () => {
    const c = ui(<LocationScreen />);
    expect(screen.getByText(L.notShared)).toBeTruthy();
    expect(screen.queryByTestId('map')).toBeNull(); // nunca un mapa sin ubicación real
    fireEvent.press(screen.getByRole('button', { name: L.request }));
    expect(screen.getByText(L.requested('Rosa'))).toBeTruthy();
    c.unmount();

    const e = ui(<ElderScreen elderId={elderId} />);
    expect(screen.queryByText(L.elderAsk('Laura'))).toBeNull();
    expect(screen.queryByRole('button', { name: L.stop })).toBeNull();
    e.unmount();
    const permissionRoute = ui(<ElderLocation elder={db.get('elders', elderId)!} caregiver="Laura" preview={false} />);
    expect(screen.getByText(L.elderAsk('Laura'))).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: L.accept }));
    });
    expect(fixes()).toHaveLength(1);
    permissionRoute.rerender(<RenderProviders><ElderLocation elder={db.get('elders', elderId)!} caregiver="Laura" preview={false} /></RenderProviders>);
    expect(screen.getByText(L.sharing('Laura'))).toBeTruthy();
    permissionRoute.unmount();

    const c2 = ui(<LocationScreen />);
    expect(screen.getByTestId('map')).toBeTruthy();
    expect(screen.getByText(/Última ubicación:/)).toBeTruthy();
    expect(screen.getByText(L.accuracy(25))).toBeTruthy();
    expect(screen.getByText(/Mapa: Apple Maps/)).toBeTruthy();
    c2.unmount();

    const stop = ui(<ElderLocation elder={db.get('elders', elderId)!} caregiver="Laura" preview={false} />);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, actions) => (actions as { onPress?: () => void }[] | undefined)?.slice(-1)[0]?.onPress?.());
    fireEvent.press(screen.getByRole('button', { name: L.stop }));
    alert.mockRestore();
    stop.unmount();
    expect(fixes()).toHaveLength(0);
    expect(db.get('elders', elderId)!.locationConsent).toBe('revoked');
  });
});
