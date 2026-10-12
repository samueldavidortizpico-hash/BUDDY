import { fireEvent, render } from '@testing-library/react-native';

import Welcome from '@/app/(auth)';
import ForgotPassword from '@/app/(auth)/forgot-password';
import Onboarding from '@/app/(auth)/onboarding';
import SignIn from '@/app/(auth)/sign-in';
import SignUp from '@/app/(auth)/sign-up';
import Buddy from '@/app/(caregiver)/(tabs)/buddy';
import Health from '@/app/(caregiver)/(tabs)/health';
import Routine from '@/app/(caregiver)/(tabs)/routine';
import Settings from '@/app/(caregiver)/(tabs)/settings';
import Summary from '@/app/(caregiver)/(tabs)/summary';
import Alerts from '@/app/(caregiver)/alerts';
import NewMedication from '@/app/(caregiver)/medication/new';
import RoutineSection from '@/app/(caregiver)/routine/[section]';
import SettingsSection from '@/app/(caregiver)/settings/[section]';
import Setup from '@/app/(caregiver)/setup';
import { useSession } from '@/state/session';
import { RenderProviders, seedMedication, seedRenderData } from '@/testing/render-fixtures';
import { useAppearanceStore } from '@/theme/provider';
import { strings } from '@/i18n';

let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => mockParams,
  Redirect: () => null,
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

beforeEach(async () => {
  mockPush.mockClear();
  const elder = await seedRenderData();
  seedMedication(elder.id);
  mockParams = {};
});

it('makes the older adult screen easy to find from the caregiver summary', async () => {
  const screen = render(<RenderProviders><Summary /></RenderProviders>);
  const preview = screen.getByRole('button', { name: strings.summary.elderScreenAction('Rosa') });
  expect(screen.getByText(strings.summary.elderScreenTitle)).toBeTruthy();
  fireEvent.press(preview);
  expect(mockPush).toHaveBeenCalledWith('/preview');
});

const cases = [
  ['bienvenida', Welcome, true], ['onboarding', Onboarding, true], ['login', SignIn, true],
  ['registro', SignUp, true], ['recuperación', ForgotPassword, true], ['resumen', Summary, false],
  ['rutina', Routine, false], ['chat', Buddy, false], ['salud', Health, false],
  ['configuración', Settings, false], ['alertas', Alerts, false], ['registro del paciente', Setup, false],
  ['medicamento manual', NewMedication, false],
] as const;

describe.each(['light', 'dark', 'hcLight', 'hcDark'] as const)('render in %s theme', (theme) => {
  it.each(cases)('%s mounts and rerenders with production providers', (_name, Screen, signedOut) => {
    useAppearanceStore.setState({ mode: theme.endsWith('Dark') || theme === 'dark' ? 'dark' : 'light', highContrast: theme.startsWith('hc') });
    if (signedOut) useSession.setState({ status: 'signedOut', user: null });
    mockParams = { mode: 'manual' };
    const ui = () => <RenderProviders><Screen /></RenderProviders>;
    const screen = render(ui());
    expect(screen.toJSON()).not.toBeNull();
    screen.rerender(ui());
    expect(screen.toJSON()).not.toBeNull();
  });
});

it.each(['water', 'meals', 'activities', 'contacts', 'checkin', 'appointments', 'reminders'])('routine section %s renders', (section) => {
  mockParams = { section };
  const screen = render(<RoutineSection />, { wrapper: RenderProviders });
  expect(screen.toJSON()).not.toBeNull();
});

it.each(['appearance', 'elder', 'account', 'alerts', 'people', 'devices', 'legal', 'advanced', 'about'])('settings section %s renders', (section) => {
  mockParams = { section };
  const screen = render(<SettingsSection />, { wrapper: RenderProviders });
  expect(screen.toJSON()).not.toBeNull();
});
