/**
 * Paso 1 (v2.2): una prueba de integración por acción del chat (hook + borrador + ActionExecutor + store) que
 * comprueba que el estado cambió y que la pantalla correspondiente lo muestra. Datos ficticios de prueba.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import Buddy from '@/app/(caregiver)/(tabs)/buddy';
import Routine from '@/app/(caregiver)/(tabs)/routine';
import RoutineSection from '@/app/(caregiver)/routine/[section]';
import { ElderScreen } from '@/features/elder/screen';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { draftActions } from '@/state/assistant';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';
import { toISODate } from '@/utils/dates';

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

const B = strings.buddy;
let elderId: string;

beforeEach(async () => {
  jest.useFakeTimers();
  // 8:00 a. m. local: las tomas de la tarde todavía están "más tarde hoy".
  const morning = new Date();
  morning.setHours(8, 0, 0, 0);
  jest.setSystemTime(morning);
  mockParams = {};
  mockPush.mockClear();
  elderId = (await seedRenderData()).id;
});
afterEach(() => jest.useRealTimers());

const wait = async (ms = 1500) => act(async () => { jest.advanceTimersByTime(ms); });
const list = <K extends Parameters<typeof db.list>[0]>(coll: K) => db.list(coll, testUser.id, elderId);

async function say(text: string) {
  fireEvent.changeText(screen.getByLabelText(B.placeholder), text);
  fireEvent.press(screen.getByRole('button', { name: B.send }));
  await wait();
}

async function confirmFromPinned() {
  const pinned = screen.getByTestId('draft-pinned');
  fireEvent.press(within(pinned).getByRole('button', { name: B.confirmAdd }));
  await wait();
}

function chat() {
  return render(<RenderProviders><Buddy /></RenderProviders>);
}

function seedLosartan(extra: Partial<Parameters<typeof db.insert<'medications'>>[1]> = {}) {
  return db.insert('medications', {
    name: 'Losartán', activeIngredient: '', strength: '', form: 'tablet', doseAmount: 1, doseUnit: 'unit',
    schedule: { kind: 'times', times: ['18:00'], days: [] }, startDate: toISODate(new Date()), endDate: null,
    instructions: '', purpose: '', description: '', unitsPerPackage: 30, unitsOnHand: 10, refillAlertDays: 7, photoUri: null, paused: false, ...extra,
  }, { userId: testUser.id, elderId });
}

describe('medicamentos', () => {
  it('agrega, se ve en Rutina como "Nuevo" y en la pantalla del paciente', async () => {
    const c = chat();
    await say('Ponle losartán a las 6 de la tarde');
    expect(screen.getByText(/¿Cuánto toma de Losartán cada vez\?/)).toBeTruthy();
    await say('1 tableta');
    await confirmFromPinned();
    expect(list('medications').map((m) => m.name)).toEqual(['Losartán']);
    expect(screen.getByText(/Listo, agregué Losartán a las 6:00 p\. m\./)).toBeTruthy();
    expect(screen.getByText(B.seeRoutine)).toBeTruthy();
    expect(screen.queryByTestId('draft-pinned')).toBeNull();
    c.unmount();

    const r = render(<RenderProviders><Routine /></RenderProviders>);
    expect(r.getByText('Losartán')).toBeTruthy();
    expect(r.getByText(strings.routine.isNew)).toBeTruthy();
    r.unmount();

    render(<RenderProviders><ElderScreen elderId={elderId} preview /></RenderProviders>);
    expect(screen.getAllByText(/Losartán/).length).toBeGreaterThan(0);
  });

  it('el borrador sobrevive a salir del chat (cambiar de pestaña) y se retoma donde iba', async () => {
    const c = chat();
    await say('Agrega atorvastatina');
    c.unmount();
    expect(draftActions.get()?.actions[0]).toMatchObject({ type: 'add_medication', name: 'Atorvastatina' });
    chat();
    expect(within(screen.getByTestId('draft-pinned')).getAllByText(/Atorvastatina/).length).toBeGreaterThan(0);
    // BUDDY pregunta la dosis primero: si se responde con una hora, no la toma como dosis y vuelve a preguntar.
    await say('8:00 p. m.');
    expect(screen.getByText(/No entendí ese dato\. ¿Cuánto toma de Atorvastatina/)).toBeTruthy();
    expect(draftActions.get()?.actions[0]).toMatchObject({ doseAmount: null });
    await say('½ tableta');
    await say('8:00 p. m.');
    await confirmFromPinned();
    expect(list('medications')[0]).toMatchObject({ name: 'Atorvastatina', doseAmount: 0.5, schedule: { kind: 'times', times: ['20:00'] } });
  });

  it('el botón confirmar no se activa hasta tener lo obligatorio, y Deshacer revierte', async () => {
    chat();
    await say('quiero agregar un medicamento');
    expect(screen.getByText('¿Cómo se llama el medicamento?')).toBeTruthy();
    const pinned = screen.getByTestId('draft-pinned');
    expect(within(pinned).getByRole('button', { name: B.confirmAdd }).props.accessibilityState?.disabled).toBe(true);
    await say('Metformina');
    await say('1 tableta');
    await say('8:00 a. m.');
    expect(screen.getByTestId('chat-final-confirm')).toBeTruthy();
    await confirmFromPinned();
    expect(list('medications')).toHaveLength(1);
    fireEvent.press(screen.getByText(strings.common.undo));
    await wait();
    expect(list('medications')).toHaveLength(0);
  });

  it('cambiar la hora (edición) y quitar (eliminación)', async () => {
    const med = seedLosartan();
    chat();
    await say('cambia el losartán a las 7');
    await confirmFromPinned();
    expect(db.get('medications', med.id)?.schedule).toMatchObject({ times: ['07:00'] });
    await say('quita el losartán');
    await confirmFromPinned();
    expect(db.get('medications', med.id)?.deletedAt).not.toBeNull();
  });

  it('existencias: registra una compra y se ve en la rutina', async () => {
    const med = seedLosartan();
    chat();
    await say('compré 30 pastillas de losartán');
    await confirmFromPinned();
    expect(db.get('medications', med.id)?.unitsOnHand).toBe(40);
    expect(screen.getByText(/ahora hay 40/)).toBeTruthy();
  });
});

describe('rutina', () => {
  it('agua: pregunta cuántos vasos y se ve en Rutina > Agua', async () => {
    const c = chat();
    await say('ponle agua');
    expect(screen.getByText('¿Cuántos vasos de agua al día?')).toBeTruthy();
    await say('8');
    await confirmFromPinned();
    expect(list('waterPlans')[0]?.glasses).toBe(8);
    c.unmount();
    mockParams = { seg: 'water' };
    render(<RenderProviders><Routine /></RenderProviders>);
    expect(screen.getByText(strings.routine.glasses(8))).toBeTruthy();
    expect(screen.getByText(strings.routine.isNew)).toBeTruthy();
  });

  it('comidas: se ven en Rutina > Comidas', async () => {
    const c = chat();
    await say('ponle el desayuno a las 7');
    await confirmFromPinned();
    expect(list('meals')).toMatchObject([{ kind: 'breakfast', time: '07:00' }]);
    c.unmount();
    mockParams = { seg: 'meals' };
    render(<RenderProviders><Routine /></RenderProviders>);
    expect(screen.getByText('Desayuno')).toBeTruthy();
  });

  it('actividades y metas: pregunta la hora y se ven en Rutina > Metas', async () => {
    const c = chat();
    await say('que camine todos los días');
    expect(screen.getByText('¿A qué hora?')).toBeTruthy();
    await say('5:00 p. m.');
    await confirmFromPinned();
    expect(list('activities')).toMatchObject([{ kind: 'walk', time: '17:00' }]);
    c.unmount();
    mockParams = { seg: 'activities' };
    render(<RenderProviders><Routine /></RenderProviders>);
    expect(screen.getByText('Caminar')).toBeTruthy();
  });

  it('contacto de emergencia: se ve en Rutina > Más', async () => {
    const c = chat();
    await say('Configúrale de emergencia a Juan, su hijo, 300 123 4567');
    await confirmFromPinned();
    expect(list('contacts')).toMatchObject([{ name: 'Juan', phone: '3001234567', primary: true }]);
    c.unmount();
    mockParams = { seg: 'more' };
    render(<RenderProviders><Routine /></RenderProviders>);
    expect(screen.getByText(/Juan/)).toBeTruthy();
  });

  it('hora del chequeo: pregunta la hora y queda en el perfil', async () => {
    chat();
    await say('ponle el chequeo diario');
    await say('10:00 a. m.');
    await confirmFromPinned();
    expect(db.get('elders', elderId)?.checkinTime).toBe('10:00');
  });

  it('cita con dirección: pregunta lo que falta y se ve en Citas', async () => {
    const c = chat();
    await say('ponle una cita mañana con el cardiólogo');
    expect(screen.getByText('¿A qué hora es la cita?')).toBeTruthy();
    await say('10:00 a. m.');
    // La dirección es opcional: se agrega desde Editar.
    fireEvent.press(within(screen.getByTestId('draft-pinned')).getByRole('button', { name: strings.common.edit }));
    fireEvent.press(within(screen.getByTestId('draft-pinned')).getByRole('button', { name: /Dirección/ }));
    await wait();
    await say('Calle 10 # 5-20, Bogotá, frente al parque');
    await confirmFromPinned();
    const [ap] = list('appointments');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(ap).toMatchObject({ title: 'Cita con cardiólogo', date: toISODate(tomorrow), time: '10:00', place: 'Calle 10 # 5-20, Bogotá, frente al parque' });
    c.unmount();
    mockParams = { section: 'appointments' };
    render(<RenderProviders><RoutineSection /></RenderProviders>);
    expect(screen.getByText(/Cita con cardiólogo/)).toBeTruthy();
  });

  it('recordatorio para el adulto mayor: pregunta la hora', async () => {
    chat();
    await say('recuérdale llamar a Juan el domingo');
    await say('11:00 a. m.');
    await confirmFromPinned();
    expect(list('reminders')).toMatchObject([{ title: 'Llamar a Juan', time: '11:00', days: [0] }]);
  });

  it('mensaje para el adulto mayor: lo ve hoy en su pantalla', async () => {
    const c = chat();
    await say('mándale un mensaje: te quiero mucho');
    await confirmFromPinned();
    const [r] = list('reminders');
    expect(r).toMatchObject({ title: 'Mensaje de Laura: Te quiero mucho', date: toISODate(new Date()) });
    c.unmount();
    render(<RenderProviders><ElderScreen elderId={elderId} preview /></RenderProviders>);
    expect(screen.getByText('Mensaje de Laura: Te quiero mucho')).toBeTruthy();
  });
});

describe('reglas de seguridad del chat', () => {
  it('nunca propone una dosis: si falta, la pregunta y repite la del cuidador', async () => {
    chat();
    await say('Ponle losartán a las 8');
    expect(draftActions.get()?.actions[0]).toMatchObject({ doseAmount: null });
    await say('2 tabletas');
    expect(within(screen.getByTestId('draft-pinned')).getByText('Dosis por toma: 2 tabletas')).toBeTruthy();
  });

  it('ante una urgencia recomienda el 123 y el contacto principal, sin crear borradores', async () => {
    chat();
    await say('se cayó y no responde');
    expect(screen.getByText(B.emergency)).toBeTruthy();
    expect(screen.queryByTestId('draft-pinned')).toBeNull();
  });
});
