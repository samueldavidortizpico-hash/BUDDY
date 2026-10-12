/** Vida del robot: toque, doble toque, caricia, sueño en reposo, bolita de novedades y "reducir movimiento". */
import { act, fireEvent, render } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { RenderProviders } from '@/testing/render-fixtures';

import { BuddyRobot } from '../index';
import { BuddyRobotVector } from '../vector';

jest.mock('expo-router', () => ({ useIsFocused: () => true }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const mood = (r: ReturnType<typeof render>) => r.UNSAFE_getByType(BuddyRobotVector).props.mood;
const setup = (props: Partial<React.ComponentProps<typeof BuddyRobot>> = {}) =>
  render(<RenderProviders><BuddyRobot size={120} accessibilityLabel="BUDDY" onPress={() => undefined} {...props} /></RenderProviders>);

it('al tocarlo pone ojos felices y luego vuelve al estado normal', () => {
  const r = setup();
  fireEvent.press(r.getByRole('button', { name: 'BUDDY' }));
  expect(mood(r)).toBe('happy');
  act(() => { jest.advanceTimersByTime(1200); });
  expect(mood(r)).toBe('idle');
});

it('con doble toque guiña el ojo', () => {
  const r = setup();
  const btn = r.getByRole('button', { name: 'BUDDY' });
  fireEvent.press(btn);
  fireEvent.press(btn);
  expect(mood(r)).toBe('wink');
});

it('al acariciarlo (mantener 600 ms) pone ojos de corazón y los conserva unos 2 s tras soltar', () => {
  const r = setup();
  const btn = r.getByRole('button', { name: 'BUDDY' });
  fireEvent(btn, 'longPress');
  expect(mood(r)).toBe('love');
  fireEvent(btn, 'pressOut');
  act(() => { jest.advanceTimersByTime(1500); });
  expect(mood(r)).toBe('love');
  act(() => { jest.advanceTimersByTime(700); });
  expect(mood(r)).toBe('idle');
});

it('tras 20 s sin tocarlo bosteza y se duerme; al tocarlo despierta', () => {
  const r = setup();
  act(() => { jest.advanceTimersByTime(20_100); });
  expect(mood(r)).toBe('surprised');
  act(() => { jest.advanceTimersByTime(1300); });
  expect(mood(r)).toBe('sleep');
  fireEvent.press(r.getByRole('button', { name: 'BUDDY' }));
  expect(mood(r)).toBe('happy');
});

it('muestra la bolita roja con el número de novedades', () => {
  const r = setup({ badge: 3 });
  expect(r.getByText('3')).toBeTruthy();
  expect(setup({ badge: 12 }).getByText('9+')).toBeTruthy();
});

it('con "reducir movimiento" no se duerme solo ni inicia bucles', () => {
  const reduce = jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
  const repeat = jest.spyOn(Reanimated, 'withRepeat');
  try {
    const r = setup({ mood: 'love' });
    act(() => { jest.advanceTimersByTime(25_000); });
    expect(mood(r)).toBe('love');
    expect(repeat).not.toHaveBeenCalled();
  } finally {
    repeat.mockRestore();
    reduce.mockRestore();
  }
});
