/**
 * Prueba de humo: cada ruta real se renderiza sin errores con los datos de demostración
 * y muestra su contenido principal. Más interacciones clave del bienestar diario.
 */
import { act, screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { useAppStore } from '@/store/app-store';
import { createDemoState } from '@/store/demo-state';
import { toISODate } from '@/utils/dates';

jest.mock('@expo-google-fonts/manrope', () => ({
  ...jest.requireActual('@expo-google-fonts/manrope'),
  useFonts: () => [true, null],
}));

beforeEach(async () => {
  await act(async () => {
    await useAppStore.persist.rehydrate();
    const fresh = createDemoState(new Date());
    useAppStore.setState({ ...fresh, settings: { ...fresh.settings, role: 'patient', onboarded: true } });
  });
});

const ROUTES: [string, string | RegExp][] = [
  ['/onboarding', 'Omitir'],
  ['/profile-choice', 'Una experiencia hecha para ti'],
  ['/home', 'TU PRÓXIMO MEDICAMENTO'],
  ['/medications', 'Mis medicamentos'],
  ['/medication/demo-med-amlodipino', 'Historial de tomas'],
  ['/modals/add-medication', 'Guardar medicamento'],
  ['/modals/reminder', 'Ya lo tomé'],
  ['/mood', 'BUDDY TE ESCUCHA'],
  ['/symptoms', '¿Qué estás sintiendo?'],
  ['/sleep', 'Calidad del sueño'],
  ['/health', 'RESUMEN DE REGISTROS'],
  ['/modals/add-vital', 'Tipo de registro'],
  ['/wellness', 'TU PROGRESO DE HOY'],
  ['/reports', 'Medicamentos'],
];

describe('cada pantalla se renderiza', () => {
  it.each(ROUTES)('%s', async (url, text) => {
    renderRouter('./src/app', { initialUrl: url });
    expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
  });
});

describe('bienestar diario', () => {
  it('Añadir vaso suma un vaso de agua de hoy', async () => {
    const user = userEvent.setup();
    const today = toISODate(new Date());
    const before = useAppStore.getState().water[today] ?? 0;
    renderRouter('./src/app', { initialUrl: '/wellness' });
    await user.press(await screen.findByRole('button', { name: 'Añadir vaso' }));
    expect(useAppStore.getState().water[today]).toBe(before + 1);
  });

  it('marcar un hábito lo guarda como hecho', async () => {
    const user = userEvent.setup();
    const today = toISODate(new Date());
    renderRouter('./src/app', { initialUrl: '/wellness' });
    await user.press(await screen.findByRole('checkbox', { name: /Caminata suave/ }));
    expect(useAppStore.getState().habits[today]).toContain('walk');
  });

  it('guardar el ánimo lo añade al historial', async () => {
    const user = userEvent.setup();
    const count = useAppStore.getState().moods.length;
    renderRouter('./src/app', { initialUrl: '/mood' });
    await user.press(await screen.findByRole('radio', { name: 'Excelente' }));
    await user.press(screen.getByRole('button', { name: 'Guardar cómo me siento' }));
    const moods = useAppStore.getState().moods;
    expect(moods).toHaveLength(count + 1);
    expect(moods.at(-1)?.mood).toBe('excellent');
  });

  it('un registro manual de salud valida el rango y se guarda como manual', async () => {
    const user = userEvent.setup();
    const count = useAppStore.getState().vitals.length;
    renderRouter('./src/app', { initialUrl: '/modals/add-vital?type=glucose' });
    await user.type(await screen.findByLabelText('Glucosa (mg/dL)'), '9999');
    await user.press(screen.getByRole('button', { name: 'Guardar registro' }));
    expect(await screen.findByText(/Revisa el valor/)).toBeOnTheScreen();
    expect(useAppStore.getState().vitals).toHaveLength(count);

    await user.clear(screen.getByLabelText('Glucosa (mg/dL)'));
    await user.type(screen.getByLabelText('Glucosa (mg/dL)'), '98');
    await user.press(screen.getByRole('button', { name: 'Guardar registro' }));
    expect(useAppStore.getState().vitals.at(-1)).toMatchObject({ type: 'glucose', value: 98, source: 'manual', demo: false });
  });
});
