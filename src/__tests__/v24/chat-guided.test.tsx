/**
 * V2.4 · Chat guiado: menú de 8 acciones, una pregunta por vez DENTRO de la tarjeta fija, respuestas predeterminadas
 * (sin escribir), Atrás, Omitir, contador, confirmación siempre visible y tarea terminada colapsada a una línea.
 * Reproduce los problemas 1 y 2 (antes: la pregunta y los chips vivían en el historial y el teclado los tapaba).
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import Buddy from '@/app/(caregiver)/buddy';
import { db } from '@/infrastructure/local/db';
import { draftActions } from '@/state/assistant';
import { strings } from '@/i18n';
import { AUTOMATION_CORPUS, interpretAutomationCommand } from '@/domain/assistant/automation-commands';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';
import { toISODate } from '@/utils/dates';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
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
  mockPush.mockClear();
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
  expect(mockPush).not.toHaveBeenCalled();
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

it('quita la indicación redundante del nombre y conserva la hora de cada mensaje', async () => {
  chat();
  await fireEvent.press(screen.getByRole('button', { name: B.menu.medication }));
  await wait();
  expect(screen.getByText('¿Cómo se llama el medicamento?')).toBeTruthy();
  expect(screen.queryByText(B.typeBelow)).toBeNull();
  await say('hola');
  expect(screen.getAllByText(/\d{1,2}:\d{2}/).length).toBeGreaterThan(0);
});

it('crea, pausa, cambia y consulta automatizaciones desde BUDDY', async () => {
  chat();
  await say('pregúntale todos los días a las 8 de la noche cómo se siente');
  const rows = list('reminders').filter((r) => r.automation);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ time: '20:00', automation: { kind: 'mood', enabled: true } });
  await say('en la mañana a las 7 pregúntale cómo durmió');
  const sleep = list('reminders').find((r) => r.automation?.kind === 'sleep')!;
  expect(sleep.time).toBe('07:00');
  await say('cámbiale la pregunta de cómo se siente a las 9');
  expect(list('reminders').find((r) => r.id === rows[0].id)?.time).toBe('09:00');
  await say('pausa la pregunta del sueño');
  expect(list('reminders').find((r) => r.id === sleep.id)?.automation?.enabled).toBe(false);
  await say('¿qué automatizaciones tiene?');
  expect(screen.getAllByText(/Pausada · ¿Cómo dormiste\?/).length).toBeGreaterThan(0);
});

it('combina un medicamento y una pregunta sin mezclar sus horas', async () => {
  chat();
  await say('agrégale losartán a las 6 y pregúntale cómo se siente a las 8');
  expect(list('reminders').find((r) => r.automation?.kind === 'mood')?.time).toBe('08:00');
  expect(card()).toBeTruthy();
  expect(within(card()).getAllByText(/Losartán/i).length).toBeGreaterThan(0);
  expect(draftActions.get()?.actions[0]).toMatchObject({ type: 'add_medication', times: ['18:00'] });
});

it('crea un aviso por toma no confirmada a la hora real del medicamento', async () => {
  chat();
  const med = db.insert('medications', {
    name: 'Losartán', activeIngredient: '', strength: '', form: 'tablet', doseAmount: 1, doseUnit: 'unit',
    schedule: { kind: 'times', times: ['08:00'], days: [] }, startDate: toISODate(new Date()), endDate: null,
    instructions: '', purpose: '', description: '', unitsPerPackage: null, unitsOnHand: null, refillAlertDays: 3, photoUri: null, paused: false,
  }, { userId: testUser.id, elderId });
  await say('avísame si no se toma losartán');
  expect(list('reminders').find((r) => r.automation?.kind === 'medication_alert')).toMatchObject({ time: '08:00', automation: { medicationId: med.id, enabled: true } });
});

it('mantiene un corpus de al menos 40 frases reconocibles de automatizaciones', () => {
  const hits = AUTOMATION_CORPUS.filter((phrase) => interpretAutomationCommand(phrase) !== null);
  const ratio = hits.length / AUTOMATION_CORPUS.length;
  expect(AUTOMATION_CORPUS.length).toBeGreaterThanOrEqual(40);
  console.log(`Corpus de automatizaciones: ${(ratio * 100).toFixed(1)} % (${hits.length}/${AUTOMATION_CORPUS.length})`);
  if (hits.length !== AUTOMATION_CORPUS.length) console.log('No reconocidas:', AUTOMATION_CORPUS.filter((phrase) => interpretAutomationCommand(phrase) === null));
  expect(ratio).toBeGreaterThanOrEqual(0.9);
});
