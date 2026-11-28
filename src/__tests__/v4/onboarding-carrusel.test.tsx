/**
 * Carrusel de la primera apertura (V4.4): progreso "Paso n de 4", "Omitir" solo antes del último paso y la misma
 * salida de siempre (recordar `introSeen` y volver a Bienvenido) con "Siguiente" en el paso 4 y con "Omitir".
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import Onboarding from '@/app/(auth)/onboarding';
import { strings } from '@/i18n';
import { useSession } from '@/state/session';
import { RenderProviders, seedRenderData } from '@/testing/render-fixtures';
import { useAppearanceStore } from '@/theme/provider';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false, replace: mockReplace }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  usePathname: () => '/onboarding',
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

const S = strings.onboarding;

beforeEach(async () => {
  mockReplace.mockClear();
  await seedRenderData();
  useSession.setState({ status: 'signedOut', user: null });
  useAppearanceStore.setState({ introSeen: false });
});

const ui = async () => await render(<RenderProviders><Onboarding /></RenderProviders>);

it('muestra el progreso del paso y "Omitir" mientras no es el último', async () => {
  await ui();
  expect(screen.getByLabelText('Paso 1 de 4')).toBeTruthy();
  expect(screen.getByRole('button', { name: S.skip })).toBeTruthy();
});

it('en el paso 4 no aparece "Omitir" y "Siguiente" recuerda la presentación y vuelve a Bienvenido', async () => {
  await ui();
  const next = () => fireEvent.press(screen.getByRole('button', { name: strings.common.next }));
  for (let k = 2; k <= 4; k++) {
    await next();
    expect(screen.getByText(`Paso ${k} de 4`)).toBeTruthy();
  }
  expect(screen.queryByRole('button', { name: S.skip })).toBeNull();
  expect(mockReplace).not.toHaveBeenCalled();
  await next();
  expect(useAppearanceStore.getState().introSeen).toBe(true);
  expect(mockReplace).toHaveBeenCalledWith('/');
});

it('"Omitir" recuerda la presentación y vuelve a Bienvenido', async () => {
  await ui();
  await fireEvent.press(screen.getByRole('button', { name: S.skip }));
  expect(useAppearanceStore.getState().introSeen).toBe(true);
  expect(mockReplace).toHaveBeenCalledWith('/');
});
