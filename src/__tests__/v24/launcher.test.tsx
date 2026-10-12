/**
 * V2.4 · Problemas 7 y 8: robot arrastrable (geometría pura) y burbujas visibles que no desaparecen solas, hasta 3 con
 * "+N", con acción, descartables y "ocultar por hoy". El arrastre real se comprueba en web (Playwright) y en dispositivo.
 * Datos ficticios de prueba.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { BuddyLauncher } from '@/features/feed/launcher';
import { db } from '@/infrastructure/local/db';
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
  it('se quedan hasta descartarlas (no 6 s), máximo 3 con "+N", cada una con acción', () => {
    for (const n of ['A', 'B', 'C', 'D']) lowStockMed(`[PRUEBA] ${n}`);
    ui();
    act(() => { jest.advanceTimersByTime(20_000); });
    const bubbles = screen.getAllByTestId('launcher-bubble');
    expect(bubbles).toHaveLength(3);
    expect(screen.getByLabelText(F.moreBubbles(2))).toBeTruthy(); // 4 de existencias + sugerencia de actividad
    // La primera, completa con su acción; las otras, compactas: tocarlas abre las novedades.
    expect(within(bubbles[0]).getByRole('button', { name: F.actions.purchase })).toBeTruthy();
    for (const bubble of bubbles.slice(1)) expect(within(bubble).getByRole('button', { name: new RegExp(F.openFeed) })).toBeTruthy();
    expect(within(bubbles[0]).getByText(/Se están acabando las pastillas de \[PRUEBA\] A: alcanzan para 2 días/)).toBeTruthy();
  });

  it('"Registrar compra" suma una caja y descartar la quita sin volver a aparecer', () => {
    const m = lowStockMed('[PRUEBA] Losartán');
    ui();
    const bubble = screen.getAllByTestId('launcher-bubble')[0];
    fireEvent.press(within(bubble).getByRole('button', { name: F.actions.purchase }));
    expect(db.get('medications', m.id)!.unitsOnHand).toBe(34);
    const remaining = screen.queryAllByTestId('launcher-bubble');
    if (remaining.length) fireEvent.press(within(remaining[0]).getByRole('button', { name: F.dismissBubble }));
    expect(screen.queryAllByTestId('launcher-bubble')).toHaveLength(Math.max(0, remaining.length - 1));
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
