import { act, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import { useAppStore } from '@/store/app-store';
import { createDemoState } from '@/store/demo-state';

jest.mock('@expo-google-fonts/manrope', () => ({
  ...jest.requireActual('@expo-google-fonts/manrope'),
  useFonts: () => [true, null],
}));

beforeEach(async () => {
  // El layout raíz espera la hidratación del almacenamiento antes de pintar (como en el teléfono).
  await act(async () => {
    await useAppStore.persist.rehydrate();
    useAppStore.setState(createDemoState(new Date()));
  });
});

describe('navegación de BUDDY', () => {
  it('bienvenida → elegir perfil → adulto mayor abre el Inicio', async () => {
    const user = userEvent.setup();
    const r = renderRouter('./src/app', { initialUrl: '/' });

    await user.press(await screen.findByRole('button', { name: 'Iniciar sesión' }));
    expect(r.getPathname()).toBe('/profile-choice');

    await user.press(await screen.findByRole('button', { name: /Adulto mayor/ }));
    expect(r.getPathname()).toBe('/home');
    expect(useAppStore.getState().settings.role).toBe('patient');
    expect(await screen.findByText('TU PRÓXIMO MEDICAMENTO')).toBeOnTheScreen();
  });

  it('familiar o cuidador abre el Resumen', async () => {
    const user = userEvent.setup();
    const r = renderRouter('./src/app', { initialUrl: '/profile-choice' });
    await user.press(await screen.findByRole('button', { name: /Familiar o cuidador/ }));
    expect(r.getPathname()).toBe('/summary');
  });

  it('registrar medicamento: valida los campos y al guardar aparece con sus tomas de hoy', async () => {
    const user = userEvent.setup();
    renderRouter('./src/app', { initialUrl: '/modals/add-medication' });

    await user.press(await screen.findByRole('button', { name: 'Guardar medicamento' }));
    expect(await screen.findByText('Escribe el nombre del medicamento.')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Nombre del medicamento'), 'Medicamento de prueba');
    await user.type(screen.getByLabelText('Concentración'), '50');
    await user.press(screen.getByRole('radio', { name: 'Tableta' }));
    await user.type(screen.getByLabelText(/^Dosis/), '1');
    await user.press(screen.getByRole('button', { name: 'Agregar hora de toma' }));
    await user.press(screen.getByRole('button', { name: 'Guardar medicamento' }));

    expect(await screen.findByText('Medicamento guardado')).toBeOnTheScreen();
    const { medications, doses } = useAppStore.getState();
    const saved = medications.find((m) => m.name === 'Medicamento de prueba');
    expect(saved).toMatchObject({ strengthValue: '50', strengthUnit: 'mg', form: 'Tableta', doseAmount: '1', times: ['08:00'], demo: false });
    expect(doses.some((d) => d.medicationId === saved?.id)).toBe(true);
  });

  it('recordatorio: "Ya lo tomé" registra la confirmación declarada', async () => {
    const user = userEvent.setup();
    const dose = useAppStore.getState().doses.find((d) => d.medicationId === 'demo-med-vitamina-d' && d.status === 'pending' && d.date === new Date().toISOString().slice(0, 10))
      ?? useAppStore.getState().doses.filter((d) => d.status === 'pending').at(-1)!;
    renderRouter('./src/app', { initialUrl: `/modals/reminder?doseId=${dose.id}` });

    await user.press(await screen.findByRole('button', { name: 'Ya lo tomé' }));
    expect(await screen.findByText(/¡Muy bien/)).toBeOnTheScreen();
    expect(useAppStore.getState().doses.find((d) => d.id === dose.id)).toMatchObject({ status: 'taken', confirmedByUser: true });
  });

  it('con un perfil guardado, la bienvenida lleva directo a su experiencia', async () => {
    // Se monta en otra ruta y luego se navega a "/": un <Redirect> en el primer render deja el árbol vacío en pruebas.
    const r = renderRouter('./src/app', { initialUrl: '/onboarding' });
    await screen.findByText('Omitir');
    act(() => useAppStore.setState((s) => ({ settings: { ...s.settings, role: 'patient', onboarded: true } })));
    act(() => router.navigate('/'));
    expect(await screen.findByText('TU PRÓXIMO MEDICAMENTO')).toBeOnTheScreen();
    expect(r.getPathname()).toBe('/home');
  });
});
