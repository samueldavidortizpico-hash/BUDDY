import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { ErrorBoundary } from '@/app/_layout';
import { BuddyRobot } from '@/components/robot';
import { strings } from '@/i18n';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

it('renders the root error fallback and retry without a screen navigation context', async () => {
  const retry = jest.fn(async () => undefined);
  const screen = await render(<ErrorBoundary error={new Error('Controlled test error')} retry={retry} />);
  expect(screen.getByText(strings.common.errorTitle)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: strings.common.retry }));
  expect(retry).toHaveBeenCalledTimes(1);
});

it('keeps robot transforms finite at compact and regular sizes without navigation', async () => {
  for (const size of [56, 96, 320]) {
    const screen = await render(<BuddyRobot size={size} compact navigationIndependent mood="celebrate" />);
    const layers = screen.container.queryAll((node) => node.type === 'View').map((view) => StyleSheet.flatten(view.props.style));
    for (const style of layers) {
      for (const transform of style?.transform ?? []) {
        for (const value of Object.values(transform)) {
          expect(Number.isFinite(typeof value === 'string' ? parseFloat(value) : value)).toBe(true);
        }
      }
    }
    await screen.unmount();
  }
});

it('keeps the thinking robot still when reduced motion is enabled', async () => {
  const reducedMotion = jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
  const repeat = jest.spyOn(Reanimated, 'withRepeat');
  try {
    const screen = await render(<BuddyRobot navigationIndependent mood="think" />);
    expect(screen.toJSON()).not.toBeNull();
    expect(repeat).not.toHaveBeenCalled();
  } finally {
    repeat.mockRestore();
    reducedMotion.mockRestore();
  }
});
