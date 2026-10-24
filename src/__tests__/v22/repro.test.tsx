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

const ui = (node: React.ReactNode) => render(<RenderProviders>{node}</RenderProviders>);
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toISODate(d); };

it('P2: lo que agrega BUDDY aparece en Rutina marcado "Nuevo"', () => {
  execute({ type: 'add_medication', name: 'Losartán', strength: null, doseAmount: 1, doseUnit: 'unit', form: 'tablet', times: ['18:00'], days: [], everyHours: null, from: null, unitsPerPackage: null, instructions: '' });
  ui(<Routine />);
  expect(screen.getByText('Losartán')).toBeTruthy();
  expect(screen.getByText('Nuevo')).toBeTruthy();
});

it('P3: 14 días de ánimo bajo generan una recomendación con escalada para el administrador', () => {
  for (let i = 0; i < 14; i++) db.insert('checkins', { date: daysAgo(i), mood: 'bad', sleep: 'good', unwell: false }, { userId: testUser.id, elderId });
  // V3.0: las recomendaciones viven en Novedades (campana del Inicio); el Inicio muestra el estado de un segundo.
  ui(<Alerts />);
  expect(screen.getByText(/consulta con un médico o un profesional de salud mental/)).toBeTruthy();
});

it('P4: la entrada pregunta si eres administrador o adulto mayor', () => {
  useSession.setState({ status: 'signedOut', user: null });
  ui(<Welcome />);
  expect(screen.getByText('Soy adulto mayor')).toBeTruthy();
});

it('P5: cada cambio queda en un registro de cambios para reflejarlo en el otro celular', () => {
  db.insert('reminders', { title: 'Llamar a Juan', time: '10:00', days: [] }, { userId: testUser.id, elderId });
  expect((useDb.getState() as unknown as { changelog?: unknown[] }).changelog?.length ?? 0).toBeGreaterThan(0);
});

// P6 (V4): la ubicación dejó de ser una tarjeta del Inicio y tiene su propia pestaña; lo cubre
// src/__tests__/integration/navigation-v31.test.tsx ("Ubicación" en la barra inferior).

it('P8: una cita tiene dirección', () => {
  mockParams = { section: 'appointments' };
  ui(<RoutineSection />);
  expect(screen.getByText('Dirección')).toBeTruthy();
});

it('P9: en el login el robot forma parte del contenido que se desplaza (no una capa global)', () => {
  useSession.setState({ status: 'signedOut', user: null });
  ui(<SignIn />);
  expect(screen.getByTestId('auth-robot')).toBeTruthy();
});

it('P10/P11: "Entregar a [nombre]" abre una pantalla propia con flecha atrás y vista previa', () => {
  ui(<Routine />);
  fireEvent.press(screen.getByRole('button', { name: 'Entregar a Rosa' }));
  expect(mockPush).toHaveBeenCalledWith('/handoff');
});

it('P12: el onboarding tiene 6 diapositivas que explican qué es BUDDY', () => {
  ui(<Onboarding />);
  expect(screen.getByText(/de 6/)).toBeTruthy();
});

it('P13: el robot lanzador (en todas las pestañas salvo el chat) muestra las novedades sin leer', () => {
  db.insert('alerts', { kind: 'help_requested', title: 'Pidió ayuda', detail: 'Tocó "Pedir ayuda".', refId: 'h1', status: 'pending', snoozedUntil: null }, { userId: testUser.id, elderId });
  ui(<BuddyLauncher />);
  // Pidió ayuda + sugerencia de actividad (no tiene ninguna): 2 novedades.
  expect(screen.getByLabelText('BUDDY, 2 novedades')).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
});

it('P14: con todo en orden, Novedades muestra tarjetas útiles (V3.0: fuera del Inicio)', () => {
  ui(<Alerts />);
  expect(screen.getAllByTestId('reco-card').length).toBeGreaterThan(0);
});
