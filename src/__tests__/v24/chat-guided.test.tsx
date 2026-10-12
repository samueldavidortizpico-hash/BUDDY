/**
 * V2.4 · Chat guiado: menú de 8 acciones, una pregunta por vez DENTRO de la tarjeta fija, respuestas predeterminadas
 * (sin escribir), Atrás, Omitir, contador, confirmación siempre visible y tarea terminada colapsada a una línea.
 * Reproduce los problemas 1 y 2 (antes: la pregunta y los chips vivían en el historial y el teclado los tapaba).
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import Buddy from '@/app/(caregiver)/(tabs)/buddy';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';
import { toISODate } from '@/utils/dates';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

const B = strings.buddy;
let elderId: string;

beforeEach(async () => {
  jest.useFakeTimers();
  const morning = new Date();
  morning.setHours(8, 0, 0, 0);
  jest.setSystemTime(morning);
  elderId = (await seedRenderData()).id;
});
afterEach(() => jest.useRealTimers());

const wait = async (ms = 1500) => act(async () => { jest.advanceTimersByTime(ms); });
const list = <K extends Parameters<typeof db.list>[0]>(coll: K) => db.list(coll, testUser.id, elderId);
const card = () => screen.getByTestId('draft-pinned');
const tap = async (name: string | RegExp, scope = card()) => {
  fireEvent.press(within(scope).getByRole('button', { name }));
  await wait();
};
async function say(text: string) {
  fireEvent.changeText(screen.getByLabelText(B.placeholder), text);
  fireEvent.press(screen.getByRole('button', { name: B.send }));
  await wait();
}
const chat = () => render(<RenderProviders><Buddy /></RenderProviders>);
const userBubbles = () => db.list('messages', testUser.id, elderId).filter((m) => m.from === 'user').length;

it('el chat vacío muestra el menú de 8 acciones', () => {
  chat();
  for (const label of Object.values(B.menu)) expect(screen.getByRole('button', { name: label })).toBeTruthy();
});

it('agrega un medicamento solo con respuestas predeterminadas, sin burbujas por cada respuesta', async () => {
  chat();
  await say('agrega losartán');
  // V2.4 Hito 2: primero la presentación del registro del INVIMA, elegida con un toque.
  expect(within(card()).getByText(B.step(2, 4))).toBeTruthy();
  const before = userBubbles();
  await tap(/^Losartán Potásico · 50 mg/);
  expect(within(card()).getByText(/¿Cuánto toma de Losartán Potásico cada vez\?/)).toBeTruthy();
  await tap('1 tableta');
  expect(within(card()).getByText(/¿A qué hora debe tomar Losartán Potásico\?/)).toBeTruthy();
  await tap('8:00 a. m.');
  expect(userBubbles()).toBe(before); // las respuestas por botón no llenan el historial
  // Completo: la tarjeta deja de preguntar y muestra el resumen con la confirmación activa.
  const confirm = within(card()).getByRole('button', { name: B.confirmAdd });
  expect(confirm.props.accessibilityState?.disabled).toBeFalsy();
  fireEvent.press(confirm);
  await wait();
  expect(list('medications')[0]).toMatchObject({ name: 'Losartán Potásico', strength: '50 mg', doseAmount: 1, schedule: { kind: 'times', times: ['08:00'] } });
  expect(list('medications')[0].verifiedSource).toMatchObject({ source: expect.stringContaining('INVIMA') });
  // Tarea terminada colapsada a una línea con Ver y Deshacer.
  expect(screen.queryByTestId('draft-pinned')).toBeNull();
  const done = screen.getByTestId('task-done');
  expect(within(done).getByRole('button', { name: B.see })).toBeTruthy();
  fireEvent.press(within(done).getByRole('button', { name: strings.common.undo }));
  await wait();
  expect(list('medications')).toHaveLength(0);
});

it('Atrás vuelve a preguntar el dato anterior y Omitir salta un dato opcional', async () => {
  chat();
  await say('agrega metformina');
  await tap('No está en la lista');
  await tap('½ tableta');
  await tap(B.back);
  expect(within(card()).getByText(/¿Cuánto toma de Metformina cada vez\?/)).toBeTruthy();
  await tap('1½ tabletas');
  await tap('8:00 p. m.');
  // Detalle opcional desde el resumen, y Omitir.
  await tap(`${B.addDetail}: Concentración`);
  expect(within(card()).getByText(/¿Qué concentración tiene Metformina\?/)).toBeTruthy();
  await tap(B.skip);
  fireEvent.press(within(card()).getByRole('button', { name: B.confirmAdd }));
  await wait();
  expect(list('medications')[0]).toMatchObject({ name: 'Metformina', doseAmount: 1.5, strength: '' });
});

it('agua desde el menú con el contador +/−', async () => {
  chat();
  fireEvent.press(screen.getByRole('button', { name: B.menu.water }));
  await wait();
  expect(within(card()).getByText('8')).toBeTruthy();
  await tap(B.more);
  await tap(B.useValue('9'));
  fireEvent.press(within(card()).getByRole('button', { name: B.confirmAdd }));
  await wait();
  expect(list('waterPlans')[0]).toMatchObject({ glasses: 9 });
});

it('cita médica desde el menú, solo con botones', async () => {
  chat();
  fireEvent.press(screen.getByRole('button', { name: B.menu.appointment }));
  await wait();
  await tap('Médico general');
  await tap('Mañana');
  await tap('10:00 a. m.');
  fireEvent.press(within(card()).getByRole('button', { name: B.confirmAdd }));
  await wait();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  expect(list('appointments')[0]).toMatchObject({ title: 'Médico general', date: toISODate(tomorrow), time: '10:00' });
});

it('si no entiende, muestra el menú de acciones en lugar de solo "no entendí"', async () => {
  chat();
  await say('hola');
  await say('asdf qwer');
  expect(screen.getAllByRole('button', { name: B.menu.medication }).length).toBeGreaterThan(0);
  await say('¿qué puedes hacer?');
  expect(screen.getAllByText(B.menuIntro).length).toBeGreaterThan(0);
});

it('pliega los mensajes anteriores', async () => {
  chat();
  for (let i = 0; i < 8; i++) await say('hola');
  expect(screen.getByRole('button', { name: /Ver mensajes anteriores/ })).toBeTruthy();
});
