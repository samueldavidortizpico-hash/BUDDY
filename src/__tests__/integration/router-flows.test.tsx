import { Stack } from 'expo-router';
import { act, cleanup, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import Welcome from '@/app/(auth)';
import CaregiverLayout from '@/app/(caregiver)/_layout';
import Handoff from '@/app/(caregiver)/handoff';
import Routine from '@/app/(caregiver)/(tabs)/routine';
import Preview from '@/app/(caregiver)/preview';
import ElderHome from '@/app/elder';
import ElderLayout from '@/app/elder/_layout';
import Unlock from '@/app/elder/unlock';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { handoffActions } from '@/state/handoff';
import { useSession } from '@/state/session';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';

// Use the real Expo Router and production route guards, with lightweight
// destination screens. Native animations remain mocked by the Jest preset.
function TestRoot() { return <RenderProviders><Stack screenOptions={{ headerShown: false }} /></RenderProviders>; }
const routes = {
  _layout: TestRoot,
  index: Welcome,
  '(caregiver)/_layout': CaregiverLayout,
  '(caregiver)/summary': () => <Text>Resumen de prueba</Text>,
  '(caregiver)/setup': () => <Text>Registro de prueba</Text>,
  '(caregiver)/routine': Routine,
  '(caregiver)/handoff': Handoff,
  '(caregiver)/preview': Preview,
  'elder/_layout': ElderLayout,
  'elder/index': ElderHome,
  'elder/unlock': Unlock,
};

let elderId: string;
beforeEach(async () => { elderId = (await seedRenderData()).id; });
afterEach(() => { cleanup(); jest.useRealTimers(); });

it.each(['/summary', '/elder'])('settles at summary from %s when persisted handoff references a missing patient', async (initialUrl) => {
  db.setHandoff({ userId: testUser.id, elderId: 'missing', failedPins: 0, lockedUntil: null });
  const routed = renderRouter(routes, { initialUrl });
  await waitFor(() => expect(routed.getPathname()).toBe('/summary'));
  expect(screen.getByText('Resumen de prueba')).toBeTruthy();
});

it('welcome sends a signed-in caregiver to summary', async () => {
  const routed = renderRouter(routes, { initialUrl: '/' });
  await waitFor(() => expect(routed.getPathname()).toBe('/summary'));
});

it('valid handoff enters elder and correct PIN returns to summary without a redirect cycle', async () => {
  await handoffActions.setPin('1234');
  handoffActions.start(elderId);
  const routerScreen = renderRouter(routes, { initialUrl: '/summary' });
  await waitFor(() => expect(routerScreen.getPathname()).toBe('/elder'));
  fireEvent.press(screen.getByRole('button', { name: strings.adminAccess.button }));
  fireEvent.press(await screen.findByRole('button', { name: strings.adminAccess.enterAdmin }));
  await waitFor(() => expect(routerScreen.getPathname()).toBe('/elder/unlock'));
  for (const digit of '1234') fireEvent.press(screen.getByRole('button', { name: strings.pin.digit(digit) }));
  await waitFor(() => expect(routerScreen.getPathname()).toBe('/summary'));
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(routerScreen.getPathname()).toBe('/summary');
  expect(useSession.getState().user?.id).toBe(testUser.id);
});

it('protected routes settle at welcome after sign-out', async () => {
  useSession.setState({ status: 'signedOut', user: null });
  const routed = renderRouter(routes, { initialUrl: '/elder' });
  await waitFor(() => expect(routed.getPathname()).toBe('/'));
});

it('creating and confirming a PIN from "Entregar a" enters the real elder screen', async () => {
  const routed = renderRouter(routes, { initialUrl: '/handoff' });
  fireEvent.press(screen.getByRole('button', { name: strings.routine.handoff('Rosa') }));
  for (const digit of '1234') fireEvent.press(screen.getByRole('button', { name: strings.pin.digit(digit) }));
  await screen.findByText(strings.pin.confirm);
  for (const digit of '1234') fireEvent.press(screen.getByRole('button', { name: strings.pin.digit(digit) }));
  await waitFor(() => expect(routed.getPathname()).toBe('/elder'));
  expect(screen.getByText(/Rosa/)).toBeTruthy();
  expect(handoffActions.hasPin()).toBe(true);
});

it('renders caregiver preview through its real route', () => {
  const routed = renderRouter(routes, { initialUrl: '/preview' });
  expect(routed.getPathname()).toBe('/preview');
  expect(screen.getByText(strings.routine.preview('Rosa'))).toBeTruthy();
});
