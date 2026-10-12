/**
 * Reproducción del problema 1 (ronda v2.2): al pedirle a BUDDY un medicamento, la tarjeta de confirmación queda
 * arriba en el historial y BUDDY sigue preguntando opcionales; el medicamento no llega a la rutina.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import Buddy from '@/app/(caregiver)/(tabs)/buddy';
import { db } from '@/infrastructure/local/db';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

let elderId: string;
beforeEach(async () => {
  jest.useFakeTimers();
  elderId = (await seedRenderData()).id;
});
afterEach(() => jest.useRealTimers());

const send = async (text: string) => {
  fireEvent.changeText(screen.getByLabelText('Escríbele a BUDDY…'), text);
  fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));
  await act(async () => { jest.advanceTimersByTime(1500); });
};

it('pide un medicamento, completa lo obligatorio y lo agrega desde la tarjeta fija junto al compositor', async () => {
  render(<RenderProviders><Buddy /></RenderProviders>);
  await send('Ponle losartán a las 6 de la tarde');
  await send('No está en la lista'); // V2.4: paso Presentación → registrar a mano
  await send('1 tableta');
  // La tarjeta fija está fuera de la lista de mensajes, siempre visible sobre el compositor.
  const pinned = screen.getByTestId('draft-pinned');
  expect(within(screen.getByTestId('chat-list')).queryByTestId('draft-pinned')).toBeNull();
  // Con lo obligatorio completo BUDDY deja de preguntar: la tarjeta fija muestra el resumen y la confirmación activa
  // (V2.4: la confirmación vive en la tarjeta, que nunca queda enterrada en el historial).
  expect(within(pinned).queryByText(/¿Cuánto toma/)).toBeNull();
  expect(within(pinned).getByRole('button', { name: 'Confirmar y agregar' }).props.accessibilityState?.disabled).toBeFalsy();
  fireEvent.press(within(pinned).getByRole('button', { name: 'Confirmar y agregar' }));
  await act(async () => { jest.advanceTimersByTime(1500); });
  const meds = db.list('medications', testUser.id, elderId);
  expect(meds.map((m) => m.name)).toEqual(['Losartán']);
  expect(screen.getByText(/Listo, agregué Losartán a las 6:00 p\. ?m\./)).toBeTruthy();
});
