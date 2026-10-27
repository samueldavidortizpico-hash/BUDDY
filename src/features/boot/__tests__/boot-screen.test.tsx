/** V2.4 · Problema 11: portada con progreso REAL, aviso si tarda, reintento si falla y revelado al terminar. */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { RenderProviders } from '@/testing/render-fixtures';

import { BootScreen } from '../boot-screen';
import { STAGE_LABEL } from '../stages';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

const none = { appearance: true, fonts: false, data: false, session: false };
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
const ui = async (done: typeof none, onDone = jest.fn(), onRetry = jest.fn()) => await render(<RenderProviders><BootScreen done={done} onDone={onDone} onRetry={onRetry} /></RenderProviders>);

it('muestra BUDDY, el lema y la tarea real que se está haciendo, con su progreso', async () => {
  await ui(none);
  expect(screen.getByText('BUDDY')).toBeTruthy();
  expect(screen.getByText('Siempre contigo')).toBeTruthy();
  expect(screen.getByText(STAGE_LABEL.fonts)).toBeTruthy();
  expect(screen.getByRole('progressbar').props.accessibilityValue).toMatchObject({ now: 25 });
});

it('avisa si tarda y, si falla, ofrece reintentar', async () => {
  const onRetry = jest.fn();
  await ui(none, jest.fn(), onRetry);
  await act(() => { jest.advanceTimersByTime(4500); });
  expect(screen.getByText(/tardando un poco más/)).toBeTruthy();
  await act(() => { jest.advanceTimersByTime(12_000); });
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
  expect(onRetry).toHaveBeenCalled();
});

it('al terminar todas las tareas se desvanece y avisa que puede mostrarse la app', async () => {
  const onDone = jest.fn();
  await ui({ appearance: true, fonts: true, data: true, session: true }, onDone);
  await act(() => { jest.advanceTimersByTime(1500); });
  expect(onDone).toHaveBeenCalledTimes(1);
});
