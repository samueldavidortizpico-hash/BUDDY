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
  ['/chat', /BUDDY de demostración/],
  ['/settings', 'Perfil y configuración'],
  ['/settings/personal', 'Datos personales'],
  ['/settings/contacts', 'Contactos autorizados'],
  ['/settings/privacy', 'Permisos y privacidad'],
  ['/settings/notifications', 'Recordatorios de medicamentos'],
  ['/settings/accessibility', 'Tamaño del texto'],
  ['/settings/emergency', 'Configuración de emergencia'],
  ['/safety', 'Revisión farmacológica'],
  ['/modals/emergency', /no se realizan llamadas/],
  ['/summary', 'Panel del cuidador'],
  ['/tracking', 'Permisos'],
  ['/tracking?tab=wellbeing', 'Registros de hoy'],
  ['/alerts', 'Actividad reciente'],
  ['/account', 'Familiar o cuidador'],
  ['/dev/gallery', 'Galería (desarrollo)'],
];

describe('cuidador', () => {
  it('una toma sin respuesta aparece como "Medicamento sin confirmar" (no emergencia) y se puede marcar atendida', async () => {
    const user = userEvent.setup();
    // Fuerza una toma de hoy sin respuesta hace más de una hora.
    const doses = useAppStore.getState().doses;
    const today = toISODate(new Date());
    const target = doses.find((d) => d.date === today)!;
    useAppStore.setState({
      doses: doses.map((d) => (d.id === target.id ? { ...d, status: 'pending' as const, time: '00:00', snoozedTo: null } : d)),
    });
    renderRouter('./src/app', { initialUrl: '/alerts' });
    expect((await screen.findAllByText('Medicamento sin confirmar')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Emergencia')).toBeNull();
    expect(screen.queryByText(/omitid/i)).toBeNull();
    await user.press(screen.getAllByRole('button', { name: 'Marcar como atendida' })[0]);
    expect(Object.values(useAppStore.getState().alertOverrides)).toContain('attended');
  });

  it('revocar el acceso a la ubicación pide confirmación y lo desactiva', async () => {
    const user = userEvent.setup();
    renderRouter('./src/app', { initialUrl: '/tracking' });
    await user.press(await screen.findByRole('button', { name: 'Revocar acceso a la ubicación' }));
    await user.press(await screen.findByRole('button', { name: 'Sí, revocar acceso' }));
    expect(useAppStore.getState().settings.locationSharing.enabled).toBe(false);
    expect(await screen.findByText('Ubicación no compartida')).toBeOnTheScreen();
  });
});

describe('cada pantalla se renderiza', () => {
  it.each(ROUTES)('%s', async (url, text) => {
    renderRouter('./src/app', { initialUrl: url });
    expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
  });
});

describe('chat y ajustes', () => {
  it('enviar una sugerencia muestra la respuesta local de BUDDY sin interpretar la presión', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderRouter('./src/app', { initialUrl: '/chat' });
    await user.press(await screen.findByRole('button', { name: '¿Cómo está mi presión?' }));
    expect(screen.getByLabelText('BUDDY está escribiendo')).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    const last = useAppStore.getState().chat.at(-1);
    expect(last?.from).toBe('buddy');
    expect(last?.text).toMatch(/registro manual/);
    jest.useRealTimers();
  });

  it('el tamaño de texto elegido se guarda para toda la app', async () => {
    const user = userEvent.setup();
    renderRouter('./src/app', { initialUrl: '/settings' });
    await user.press(await screen.findByRole('tab', { name: 'Muy grande' }));
    expect(useAppStore.getState().settings.textScale).toBe('xlarge');
  });

  it('cerrar sesión pide confirmación y vuelve a la bienvenida', async () => {
    const user = userEvent.setup();
    const r = renderRouter('./src/app', { initialUrl: '/settings' });
    await user.press(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    await user.press(await screen.findByRole('button', { name: 'Sí, cerrar sesión' }));
    expect(useAppStore.getState().settings.role).toBeNull();
    expect(r.getPathname()).toBe('/');
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
