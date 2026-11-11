/**
 * Reproducciones de los problemas reportados en la ronda v2.2 (ver docs/AUDITORIA_V2_2.md).
 * Cada prueba describe el comportamiento esperado. Se escribieron ANTES de corregir y se marcaron `it.failing`
 * mientras fallaban; al corregir cada problema la prueba pasa a `it` y debe quedar en verde.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import Welcome from '@/app/(auth)';
import Onboarding from '@/app/(auth)/onboarding';
import SignIn from '@/app/(auth)/sign-in';
import Routine from '@/app/(caregiver)/(tabs)/routine';
import Alerts from '@/app/(caregiver)/alerts';
import Preview from '@/app/(caregiver)/preview';
import { strings } from '@/i18n';
import RoutineSection from '@/app/(caregiver)/routine/[section]';
import { db, useDb } from '@/infrastructure/local/db';
import { execute } from '@/state/assistant';
import { useSession } from '@/state/session';
import { BuddyLauncher } from '@/features/feed/launcher';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';
import { toISODate } from '@/utils/dates';

let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  usePathname: () => '/summary',
  useLocalSearchParams: () => mockParams,
  Redirect: () => null,
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

let elderId: string;
beforeEach(async () => {
  mockPush.mockClear();
  mockParams = {};
  elderId = (await seedRenderData()).id;
});

const ui = async (node: React.ReactNode) => await render(<RenderProviders>{node}</RenderProviders>);
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toISODate(d); };

it('P2: lo que agrega BUDDY aparece en Rutina marcado "Nuevo"', async () => {
  execute({ type: 'add_medication', name: 'Losartán', strength: null, doseAmount: 1, doseUnit: 'unit', form: 'tablet', times: ['18:00'], days: [], everyHours: null, from: null, unitsPerPackage: null, instructions: '' });
  await ui(<Routine />);
  expect(screen.getByText('Losartán')).toBeTruthy();
  expect(screen.getByText('Nuevo')).toBeTruthy();
});

it('P3: 14 días de ánimo bajo generan una recomendación con escalada para el administrador', async () => {
  for (let i = 0; i < 14; i++) db.insert('checkins', { date: daysAgo(i), mood: 'bad', sleep: 'good', unwell: false }, { userId: testUser.id, elderId });
  // V3.0: las recomendaciones viven en Novedades (campana del Inicio); el Inicio muestra el estado de un segundo.
  await ui(<Alerts />);
  expect(screen.getByText(/consulta con un médico o un profesional de salud mental/)).toBeTruthy();
});

it('P4: la entrada pregunta si eres administrador o adulto mayor', async () => {
  useSession.setState({ status: 'signedOut', user: null });
  await ui(<Welcome />);
  expect(screen.getByText('Soy adulto mayor')).toBeTruthy();
});

it('P5: cada cambio queda en un registro de cambios para reflejarlo en el otro celular', () => {
  db.insert('reminders', { title: 'Llamar a Juan', time: '10:00', days: [] }, { userId: testUser.id, elderId });
  expect((useDb.getState() as unknown as { changelog?: unknown[] }).changelog?.length ?? 0).toBeGreaterThan(0);
});

// P6 (V4): la ubicación dejó de ser una tarjeta del Inicio y tiene su propia pestaña; lo cubre
// src/__tests__/integration/navigation-v31.test.tsx ("Ubicación" en la barra inferior).

it('P8: una cita tiene dirección', async () => {
  mockParams = { section: 'appointments' };
  await ui(<RoutineSection />);
  expect(screen.getByText('Dirección')).toBeTruthy();
});

// V4.2: el robot solo vive en el ícono, la carga, la presentación 1, el botón central y el chat; el login no lo lleva.
it('P9: el login no muestra robot decorativo', async () => {
  useSession.setState({ status: 'signedOut', user: null });
  await ui(<SignIn />);
  expect(screen.queryByTestId('auth-robot')).toBeNull();
  expect(screen.getByRole('button', { name: strings.auth.enter })).toBeTruthy();
});

// V4: la entrega del teléfono pasó a la Vista de [nombre] (Inicio > tarjeta de la persona), con flecha atrás y banner.
it('P10/P11: la Vista de [nombre] tiene flecha atrás, banner y "Cambiar a la cuenta de [nombre]"', async () => {
  await ui(<Preview />);
  expect(screen.getByRole('button', { name: strings.common.back })).toBeTruthy();
  expect(screen.getByText('Estás viendo la pantalla de Rosa')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a la cuenta de Rosa' }));
  expect(mockPush).toHaveBeenCalledWith('/account-switch');
});

it('P12: el onboarding tiene 4 presentaciones que explican qué es BUDDY', async () => {
  await ui(<Onboarding />);
  expect(screen.getByLabelText('Paso 1 de 4')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Sabes que está bien' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Siguiente' })).toBeTruthy();
});

it('P13: el robot lanzador (en todas las pestañas salvo el chat) muestra las novedades sin leer', async () => {
  db.insert('alerts', { kind: 'help_requested', title: 'Pidió ayuda', detail: 'Tocó "Pedir ayuda".', refId: 'h1', status: 'pending', snoozedUntil: null }, { userId: testUser.id, elderId });
  await ui(<BuddyLauncher />);
  // Pidió ayuda + sugerencia de actividad (no tiene ninguna): 2 novedades.
  expect(screen.getByLabelText('BUDDY, 2 novedades')).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
});

it('P14: con todo en orden, Novedades muestra tarjetas útiles (V3.0: fuera del Inicio)', async () => {
  await ui(<Alerts />);
  expect(screen.getAllByTestId('reco-card').length).toBeGreaterThan(0);
});
