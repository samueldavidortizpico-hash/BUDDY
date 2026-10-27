/** Vida del robot: toque, doble toque, caricia, sueño en reposo, bolita de novedades y "reducir movimiento". */
import { act, fireEvent, render } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { RenderProviders } from '@/testing/render-fixtures';

import { BuddyRobot } from '../index';

// RNTL 14 ya no ofrece UNSAFE_getByType: se registran las propiedades que recibe el robot vectorial (mood).
const mockVectorProps = jest.fn();
jest.mock('../vector', () => {
  const actual = jest.requireActual('../vector');
  return { ...actual, BuddyRobotVector: (props: Record<string, unknown>) => { mockVectorProps(props); return actual.BuddyRobotVector(props); } };
});
jest.mock('expo-router', () => ({ useIsFocused: () => true }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

beforeEach(() => { jest.useFakeTimers(); mockVectorProps.mockClear(); });
afterEach(() => jest.useRealTimers());

const mood = (_r?: unknown) => mockVectorProps.mock.lastCall?.[0].mood;
const setup = (props: Partial<React.ComponentProps<typeof BuddyRobot>> = {}) =>
  render(<RenderProviders><BuddyRobot size={120} accessibilityLabel="BUDDY" onPress={() => undefined} {...props} /></RenderProviders>);

it('al tocarlo pone ojos felices y luego vuelve al estado normal', async () => {
  const r = await setup();
  await fireEvent.press(r.getByRole('button', { name: 'BUDDY' }));
  expect(mood(r)).toBe('happy');
  await act(() => { jest.advanceTimersByTime(1200); });
  expect(mood(r)).toBe('idle');
});

it('con doble toque guiña el ojo', async () => {
  const r = await setup();
  const btn = r.getByRole('button', { name: 'BUDDY' });
  await fireEvent.press(btn);
  await fireEvent.press(btn);
  expect(mood(r)).toBe('wink');
});

it('al acariciarlo (mantener 600 ms) pone ojos de corazón y los conserva unos 2 s tras soltar', async () => {
  const r = await setup();
  const btn = r.getByRole('button', { name: 'BUDDY' });
  await fireEvent(btn, 'longPress');
  expect(mood(r)).toBe('love');
  await fireEvent(btn, 'pressOut');
  await act(() => { jest.advanceTimersByTime(1500); });
  expect(mood(r)).toBe('love');
  await act(() => { jest.advanceTimersByTime(700); });
  expect(mood(r)).toBe('idle');
});

it('tras 20 s sin tocarlo bosteza y se duerme; al tocarlo despierta', async () => {
  const r = await setup();
  await act(() => { jest.advanceTimersByTime(20_100); });
  expect(mood(r)).toBe('surprised');
  await act(() => { jest.advanceTimersByTime(1300); });
  expect(mood(r)).toBe('sleep');
  await fireEvent.press(r.getByRole('button', { name: 'BUDDY' }));
  expect(mood(r)).toBe('happy');
});

it('muestra la bolita roja con el número de novedades', async () => {
  const r = await setup({ badge: 3 });
  expect(r.getByText('3')).toBeTruthy();
  expect((await setup({ badge: 12 })).getByText('9+')).toBeTruthy();
});

it('con "reducir movimiento" no se duerme solo ni inicia bucles', async () => {
  const reduce = jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
  const repeat = jest.spyOn(Reanimated, 'withRepeat');
  try {
    const r = await setup({ mood: 'love' });
    await act(() => { jest.advanceTimersByTime(25_000); });
    expect(mood(r)).toBe('love');
    expect(repeat).not.toHaveBeenCalled();
  } finally {
    repeat.mockRestore();
    reduce.mockRestore();
  }
});
