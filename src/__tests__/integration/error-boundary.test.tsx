import { fireEvent, render } from '@testing-library/react-native';

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

it('el robot es la imagen real dentro de su marco, decorativo salvo que lleve etiqueta', async () => {
  const deco = await render(<BuddyRobot size={56} />);
  expect(deco.toJSON()).not.toBeNull();
  expect(deco.queryByRole('image')).toBeNull();
  await deco.unmount();
  const labeled = await render(<BuddyRobot size={96} shape="square" accessibilityLabel="BUDDY" />);
  expect(labeled.getByRole('image', { name: 'BUDDY' })).toBeTruthy();
  await labeled.unmount();
});
