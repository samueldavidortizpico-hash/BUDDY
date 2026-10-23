import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { RenderProviders, seedRenderData } from '@/testing/render-fixtures';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }), useIsFocused: () => true }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

beforeEach(async () => { await seedRenderData(); mockPush.mockClear(); });

it('provides four tabs and a central BUDDY action that opens the full-screen route', async () => {
  const names = ['summary', 'health', 'location', 'routine'];
  const titles = ['Inicio', 'Salud', 'Ubicación', 'Rutina'];
  const navigate = jest.fn();
  const props = {
    state: { index: 0, routes: names.map((name) => ({ key: name, name })) },
    descriptors: Object.fromEntries(names.map((name, i) => [name, { options: { title: titles[i] } }])),
    navigation: { emit: () => ({ defaultPrevented: false }), navigate },
  } as unknown as BottomTabBarProps;
  const ui = render(<BottomTabBar {...props} icons={{}} caregiver />, { wrapper: RenderProviders });
  expect(ui.getAllByRole('tab')).toHaveLength(4);
  fireEvent.press(ui.getByRole('button', { name: /BUDDY/ }));
  expect(mockPush).toHaveBeenCalledWith('/buddy');
  expect(navigate).not.toHaveBeenCalled();
  fireEvent.press(ui.getByRole('tab', { name: 'Ubicación' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('location', undefined));
});
