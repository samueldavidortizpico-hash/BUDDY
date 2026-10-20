/**
 * V2.4 · Problemas 4 y 5: "agrega dolex" ofrece las presentaciones del registro del INVIMA (índice real del
 * repositorio), prellena con su fuente y muestra "Para qué se usa" de MedlinePlus.gov. Las respuestas de NLM se
 * SIMULAN (sin red en pruebas). Un error de ortografía nunca se corrige solo: solo sugiere.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import Buddy from '@/app/(caregiver)/buddy';
import { GENERAL_INFO_NOTICE } from '@/domain/knowledge';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { draftActions } from '@/state/assistant';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

const B = strings.buddy;
const K = strings.knowledge;
let elderId: string;
const fetchMock = globalThis.fetch as jest.Mock;

/** Respuestas fijas con la forma real de RxNav y MedlinePlus Connect (comprobada con llamadas reales el 2026-10-12). */
function nlmOnline() {
  fetchMock.mockImplementation(async (url: string) => {
    const body = url.includes('rxcui.json?idtype=ATC')
      ? { idGroup: { rxnormId: ['161'] } }
      : url.includes('connect.medlineplus.gov')
        ? { feed: { entry: [{ title: { _value: 'Acetaminofeno' }, summary: { _value: '<p>El acetaminofeno se usa para aliviar el dolor leve a moderado. También se usa para bajar la fiebre. Otra frase.</p>' }, link: [{ href: 'https://medlineplus.gov/spanish/druginfo/meds/a681004-es.html?utm_source=x' }] }] } }
        : {};
    return { ok: true, json: async () => body } as Response;
  });
}

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockRejectedValue(new Error('Sin red en las pruebas'));
  elderId = (await seedRenderData()).id;
});
afterEach(() => jest.useRealTimers());

const wait = async (ms = 1500) => act(async () => { jest.advanceTimersByTime(ms); });
const card = () => screen.getByTestId('draft-pinned');
const tap = async (name: string | RegExp) => {
  fireEvent.press(within(card()).getByRole('button', { name }));
  await wait();
};
async function say(text: string) {
  fireEvent.changeText(screen.getByLabelText(B.placeholder), text);
  fireEvent.press(screen.getByRole('button', { name: B.send }));
  await wait();
}
const chat = () => render(<RenderProviders><Buddy /></RenderProviders>);

it('"agrega dolex": presentaciones del registro, prellenado con fuente e información de MedlinePlus', async () => {
  nlmOnline();
  chat();
  await say('agrega dolex');
  expect(screen.getByText(K.matchesIntro('Dolex'))).toBeTruthy();
  expect(within(card()).getByText(/¿Cuál es la presentación de Dolex\?/)).toBeTruthy();
  await tap(/^Dolex Avanzado · 500 mg/);
  // Tarjeta con lo que dice el registro (fuente y fecha) e información general verificada.
  const info = screen.getByTestId('med-info');
  expect(within(info).getByText(/Según el registro del INVIMA, Dolex Avanzado contiene acetaminofen \(500 mg\)\. Confirma la concentración con la caja\./)).toBeTruthy();
  expect(within(info).getByText(/Fuente: INVIMA, datos abiertos/)).toBeTruthy();
  await wait(100);
  expect(within(info).getByText('El acetaminofeno se usa para aliviar el dolor leve a moderado. También se usa para bajar la fiebre.')).toBeTruthy();
  expect(within(info).getByText(/Información de MedlinePlus\.gov · consultada el/)).toBeTruthy();
  expect(within(info).getByText(GENERAL_INFO_NOTICE)).toBeTruthy();
  // A la API externa solo se envían códigos o nombres de medicamentos, nunca datos de la persona.
  for (const [url] of fetchMock.mock.calls as [string][]) expect(url).not.toMatch(/Elis|Rosa|alerg/i);
  // La dosis la sigue diciendo el cuidador.
  expect(within(card()).getByText(/¿Cuánto toma de Dolex Avanzado cada vez\?/)).toBeTruthy();
  await tap('1 tableta');
  await tap('8:00 p. m.');
  fireEvent.press(within(card()).getByRole('button', { name: B.confirmAdd }));
  await wait();
  const [med] = db.list('medications', testUser.id, elderId);
  expect(med).toMatchObject({ name: 'Dolex Avanzado', strength: '500 mg', activeIngredient: 'Acetaminofen', atc: 'N02BE01', doseAmount: 1 });
  expect(med.verifiedSource).toMatchObject({ source: expect.stringContaining('INVIMA'), id: expect.stringMatching(/^INVIMA/) });
});

it('sin conexión: lo del registro sigue visible y dice que no pudo consultar, sin inventar', async () => {
  chat();
  await say('agrega dolex');
  await tap(/^Dolex Avanzado · 500 mg/);
  await wait(100);
  const info = screen.getByTestId('med-info');
  expect(within(info).getByText(/Según el registro del INVIMA/)).toBeTruthy();
  expect(within(info).getByText(K.offline)).toBeTruthy();
  expect(within(info).queryByText(/se usa para/)).toBeNull();
});

it('un nombre mal escrito NO se corrige solo: sugiere y el cuidador elige', async () => {
  chat();
  await say('agrega dolx');
  expect(draftActions.get()?.actions[0]).toMatchObject({ name: 'Dolx' });
  expect(within(card()).getByText(/No encontré "Dolx" en el registro del INVIMA\. ¿Quisiste decir…\?/)).toBeTruthy();
  await tap('Dolex');
  expect(within(card()).getByText(/¿Cuál es la presentación de Dolex\?/)).toBeTruthy();
});

it('un medicamento que no está en el registro se dice con honestidad y se registra a mano', async () => {
  chat();
  await say('agrega zqxvita');
  expect(screen.getByText(K.notInRegistry('Zqxvita'))).toBeTruthy();
  expect(within(card()).getByText(/¿Cuánto toma de Zqxvita cada vez\?/)).toBeTruthy();
});

it('"¿para qué sirve el losartán?" responde con la tarjeta verificada del registro', async () => {
  chat();
  await say('¿para qué sirve el losartán?');
  expect(within(screen.getByTestId('med-info')).getByText(/Según el registro del INVIMA, Losartán Potásico contiene losartán potásico/i)).toBeTruthy();
});
