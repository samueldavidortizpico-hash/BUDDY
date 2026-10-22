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
import AccountSwitch from '@/app/(caregiver)/account-switch';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { handoffActions } from '@/state/handoff';
import { sessionActions, useSession } from '@/state/session';
import { elderActions } from '@/state/actions';
import { RenderProviders, seedRenderData } from '@/testing/render-fixtures';

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
  '(caregiver)/account-switch': AccountSwitch,
  'elder/_layout': ElderLayout,
  'elder/index': ElderHome,
  'elder/unlock': Unlock,
};

let elderId: string;
let ownerId: string;
beforeEach(async () => {
  elderId = (await seedRenderData()).id;
  const owner = await sessionActions.signUp({ name: '[PRUEBA] Admin', email: `router-v31-${Date.now()}-${Math.random()}@example.test`, password: 'Segura123!' });
  ownerId = owner.id;
  db.update('elders', elderId, { ownerUserId: owner.id });
  elderActions.setActive(elderId);
});
afterEach(() => { cleanup(); jest.useRealTimers(); });

it.each(['/summary', '/elder'])('settles at summary from %s when persisted handoff references a missing patient', async (initialUrl) => {
  db.setHandoff({ userId: ownerId, elderId: 'missing', failedPins: 0, lockedUntil: null });
  const routed = renderRouter(routes, { initialUrl });
  await waitFor(() => expect(routed.getPathname()).toBe('/summary'));
  expect(screen.getByText('Resumen de prueba')).toBeTruthy();
});

it('welcome sends a signed-in caregiver to summary', async () => {
  const routed = renderRouter(routes, { initialUrl: '/' });
  await waitFor(() => expect(routed.getPathname()).toBe('/summary'));
});

it('legacy handoff returns with the owner account password without a redirect cycle', async () => {
  await handoffActions.setPin('1234');
  handoffActions.start(elderId);
  const routerScreen = renderRouter(routes, { initialUrl: '/summary' });
  await waitFor(() => expect(routerScreen.getPathname()).toBe('/elder'));
  fireEvent.press(screen.getByRole('button', { name: strings.adminAccess.button }));
  fireEvent.press(await screen.findByRole('button', { name: strings.adminAccess.enterAdmin }));
  await waitFor(() => expect(routerScreen.getPathname()).toBe('/elder/unlock'));
  fireEvent.changeText(screen.getByLabelText('Contraseña del administrador'), 'Segura123!');
  fireEvent.press(screen.getByRole('button', { name: 'Entrar como administrador' }));
  await waitFor(() => expect(routerScreen.getPathname()).toBe('/summary'));
  expect(routerScreen.getPathname()).toBe('/summary');
  expect(useSession.getState().user?.id).toBe(ownerId);
});

it('protected routes settle at welcome after sign-out', async () => {
  useSession.setState({ status: 'signedOut', user: null });
  const routed = renderRouter(routes, { initialUrl: '/elder' });
  await waitFor(() => expect(routed.getPathname()).toBe('/'));
});

it('preview → owned account → password → administrator completes without getting trapped', async () => {
  await sessionActions.createElderAccess({ elderId, name: '[PRUEBA] Rosa', email: `elder-router-${Date.now()}@example.test`, password: 'Codigo123!' });
  const routed = renderRouter(routes, { initialUrl: '/preview' });
  fireEvent.press(screen.getByRole('button', { name: 'Cambiar a la cuenta de Rosa' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/account-switch'));
  fireEvent.changeText(screen.getByLabelText('Código de acceso de esta persona'), 'Codigo123!');
  fireEvent.press(screen.getByRole('button', { name: 'Cambiar de cuenta' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/elder'));
  expect(useSession.getState().user?.role).toBe('elder');
  fireEvent.press(screen.getByRole('button', { name: strings.adminAccess.button }));
  fireEvent.press(await screen.findByRole('button', { name: 'Entrar como administrador' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/elder/unlock'));
  fireEvent.changeText(screen.getByLabelText('Contraseña del administrador'), 'Segura123!');
  fireEvent.press(screen.getByRole('button', { name: 'Entrar como administrador' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/summary'));
  expect(useSession.getState().user?.id).toBe(ownerId);
  await act(async () => { await sessionActions.signOut(); });
  await waitFor(() => expect(routed.getPathname()).toBe('/'));
});

it('renders caregiver preview through its real route', () => {
  const routed = renderRouter(routes, { initialUrl: '/preview' });
  expect(routed.getPathname()).toBe('/preview');
  expect(screen.getByText('Vista de Rosa')).toBeTruthy();
});
