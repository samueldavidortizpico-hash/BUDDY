/**
 * V2.4 · Problemas 7 y 8: robot arrastrable (geometría pura) y burbujas visibles que no desaparecen solas, hasta 3 con
 * "+N", con acción, descartables y "ocultar por hoy". El arrastre real se comprueba en web (Playwright) y en dispositivo.
 * Datos ficticios de prueba.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { BuddyLauncher } from '@/features/feed/launcher';
import { db } from '@/infrastructure/local/db';
import { beat } from '@/state/care';
import { feedActions } from '@/state/feed';
import { strings } from '@/i18n';
import { bounds, bubbleSide, clampPos, snapX, useLauncherStore } from '@/state/launcher';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';
import { toISODate } from '@/utils/dates';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  usePathname: () => '/summary',
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

const F = strings.feed;
let elderId: string;
beforeEach(async () => {
  jest.useFakeTimers();
  useLauncherStore.setState({ positions: {}, magnet: true, hiddenOn: null, dismissed: {} });
  elderId = (await seedRenderData()).id;
});
afterEach(() => jest.useRealTimers());

const ui = () => render(<RenderProviders><BuddyLauncher /></RenderProviders>);
function lowStockMed(name: string) {
  return db.insert(
    'medications',
    {
      name, activeIngredient: '', strength: '', form: 'tablet', doseAmount: 1, doseUnit: 'unit', schedule: { kind: 'times', times: ['08:00', '20:00'], days: [] },
      startDate: toISODate(new Date()), endDate: null, instructions: '', purpose: '', description: '', unitsPerPackage: 30, unitsOnHand: 4, refillAlertDays: 3, photoUri: null, paused: false,
    },
    { userId: testUser.id, elderId },
  );
}

describe('geometría del robot arrastrable', () => {
  const b = bounds(390, 844, 72, 47, 120);
  it('no sale de la pantalla ni baja de su lugar sobre la barra', () => {
    expect(b).toEqual({ maxLeft: 390 - 72 - 16, maxUp: 844 - 47 - 120 - 72 - 8 });
    expect(clampPos({ x: -999, y: 50 }, b)).toEqual({ x: -b.maxLeft, y: 0 });
    expect(clampPos({ x: 20, y: -9999 }, b)).toEqual({ x: 0, y: -b.maxUp });
  });
  it('imán al borde más cercano (o se queda donde lo dejaron si el imán está apagado)', () => {
    expect(snapX(-100, 302, true)).toBe(0);
    expect(snapX(-200, 302, true)).toBe(-302);
    expect(snapX(-200, 302, false)).toBe(-200);
  });
  it('las burbujas se abren hacia el lado con espacio', () => {
    expect(bubbleSide({ x: 0, y: 0 }, b).align).toBe('right');
    expect(bubbleSide({ x: -b.maxLeft, y: 0 }, b).align).toBe('left');
    expect(bubbleSide({ x: 0, y: -b.maxUp }, b).below).toBe(true);
  });
});

describe('burbujas de novedades', () => {
  // V3.0 (decisión 113): si el estado del Inicio ya dice "Atención" o "Acción necesaria", ese es el mensaje y el robot no
  // lo repite en burbujas que tapan los datos de hoy; solo muestra el contador.
  it('con el estado en Atención (existencias bajas) no repite el aviso en burbujas, solo el contador', () => {
    for (const n of ['A', 'B']) lowStockMed(`[PRUEBA] ${n}`);
    ui();
    expect(screen.queryAllByTestId('launcher-bubble')).toHaveLength(0);
    expect(screen.getByLabelText(/^BUDDY, \d+ novedades$/)).toBeTruthy();
  });

  /** Día en orden (señal reciente) con novedades informativas: citas mañana y la sugerencia de actividad. */
  function calmDay(n: number) {
    beat(elderId, 'app_open');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    for (let i = 0; i < n; i++) db.insert('appointments', { title: `[PRUEBA] Cita ${i}`, date: toISODate(tomorrow), time: '10:00', place: '', city: '', reference: '', phone: '', notes: '', questions: [] }, { userId: testUser.id, elderId });
  }

  it('con el día en orden: se quedan hasta descartarlas (no 6 s), máximo 3 con "+N", cada una con acción', () => {
    calmDay(4);
    ui();
    act(() => { jest.advanceTimersByTime(20_000); });
    // Por defecto solo la más importante (no tapa la pantalla) y "+4"; al desplegar, 3 apiladas y "+2".
    expect(screen.getAllByTestId('launcher-bubble')).toHaveLength(1);
    fireEvent.press(screen.getByRole('button', { name: F.moreBubbles(4) })); // 4 citas + sugerencia de actividad
    const bubbles = screen.getAllByTestId('launcher-bubble');
    expect(bubbles).toHaveLength(3);
    expect(screen.getByText(`+2 · ${F.fewer}`)).toBeTruthy();
    expect(within(bubbles[0]).getByRole('button', { name: F.actions.open })).toBeTruthy();
    for (const bubble of bubbles.slice(1)) expect(within(bubble).getByRole('button', { name: new RegExp(F.openFeed) })).toBeTruthy();
  });

  it('"Registrar compra" (en la tarjeta del aviso de existencias) suma una caja', () => {
    const m = lowStockMed('[PRUEBA] Losartán');
    expect(feedActions.run({ type: 'purchase', medicationId: m.id }).done).toContain('sumé 1 caja');
    expect(db.get('medications', m.id)!.unitsOnHand).toBe(34);
  });

  it('descartar una burbuja la quita sin volver a aparecer', () => {
    calmDay(1);
    ui();
    const before = screen.getAllByTestId('launcher-bubble');
    fireEvent.press(within(before[0]).getByRole('button', { name: F.dismissBubble }));
    const after = screen.queryAllByTestId('launcher-bubble');
    expect(after.every((x) => x !== before[0])).toBe(true);
  });

  it('"Ocultar el robot por hoy" lo quita de todas las pestañas', async () => {
    ui();
    expect(screen.getByTestId('launcher-robot')).toBeTruthy();
    await act(async () => useLauncherStore.getState().hideToday());
    expect(useLauncherStore.getState().hiddenOn).toBe(toISODate(new Date()));
    expect(screen.queryByTestId('launcher-robot')).toBeNull();
    await act(async () => useLauncherStore.getState().reset());
    expect(screen.getByTestId('launcher-robot')).toBeTruthy();
  });
});
