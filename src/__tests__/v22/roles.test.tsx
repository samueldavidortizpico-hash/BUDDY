/**
 * Paso 2 (v2.2): cuentas y roles. Matriz de permisos, cuentas del adulto mayor creadas por su administrador,
 * dos cuentas en un mismo dispositivo con datos aislados, y acceso del administrador con PIN.
 */
import { Stack, router } from 'expo-router';
import { act, cleanup, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import Welcome from '@/app/(auth)';
import SignIn from '@/app/(auth)/sign-in';
import CaregiverLayout from '@/app/(caregiver)/_layout';
import ElderHome from '@/app/elder';
import ElderLayout from '@/app/elder/_layout';
import ElderOptions from '@/app/elder/options';
import Unlock from '@/app/elder/unlock';
import { AuthError } from '@/domain/auth';
import { can, type Permission } from '@/domain/permissions';
import { getAuthService } from '@/infrastructure';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { activeElderId } from '@/state/actions';
import { elderAnswers } from '@/state/care';
import { sessionActions, useSession } from '@/state/session';
import { RenderProviders, forceRecord, seedRenderData, testUser } from '@/testing/render-fixtures';

describe('matriz can(rol, acción)', () => {
  const adminOnly: Permission[] = ['add_medication', 'remove_medication', 'set_water_goal', 'edit_profile', 'manage_access', 'request_location', 'settings', 'use_assistant', 'handoff'];
  const elderAllowed: Permission[] = ['answer_question', 'confirm_dose', 'request_help', 'call_contact', 'location_consent', 'share_location'];
  it.each(adminOnly)('el adulto mayor NO puede %s', (a) => expect(can('elder', a)).toBe(false));
  it.each(adminOnly)('el administrador puede %s', (a) => expect(can('caregiver', a)).toBe(true));
  it.each(elderAllowed)('el adulto mayor puede %s', (a) => expect(can('elder', a)).toBe(true));
  it('la decisión sobre la ubicación es solo del adulto mayor', () => {
    expect(can('caregiver', 'location_consent')).toBe(false);
    expect(can('caregiver', 'share_location')).toBe(false);
  });
});

let n = 0;
const unique = (name: string) => `${name}${Date.now()}${n++}@correo.com`;

describe('cuentas del adulto mayor (dos cuentas en un mismo dispositivo)', () => {
  let elderId: string;
  const auth = getAuthService();
  beforeEach(async () => {
    elderId = (await seedRenderData()).id;
    // Sesión real del administrador en el proveedor local; la persona pasa a ser suya.
    const admin = await auth.signUp({ name: 'Laura', email: unique('laura'), password: 'Segura123' });
    useSession.setState({ status: 'signedIn', user: admin });
    forceRecord('elders', elderId, { ownerUserId: admin.id });
  });

  it('el administrador crea el acceso; el adulto mayor entra con su rol y ve solo su perfil', async () => {
    const ownerId = useSession.getState().user!.id;
    const email = unique('elis');
    await sessionActions.createElderAccess({ elderId, name: 'Rosa', email, password: 'Rosa2026!' });
    expect(await sessionActions.elderAccess(elderId)).toEqual({ email, revoked: false });
    await sessionActions.signOut();
    // Con el selector equivocado, el error lo explica.
    await expect(sessionActions.signIn({ email, password: 'Rosa2026!', role: 'caregiver' })).rejects.toMatchObject({ code: 'wrong_role' });
    const elderUser = await sessionActions.signIn({ email, password: 'Rosa2026!', role: 'elder' });
    useSession.setState({ status: 'signedIn', user: elderUser });
    expect(elderUser).toMatchObject({ role: 'elder', ownerId, elderId });
    expect(activeElderId()).toBe(elderId);
    // Lo que responde queda en los datos de su administrador, con su autoría.
    const water = elderAnswers.addWater();
    expect(water.ownerUserId).toBe(ownerId);
    expect(water.createdBy).toBe(elderUser.id);
  });

  it('revocar impide entrar; sin sesión de administrador no se puede reactivar', async () => {
    const email = unique('ana');
    await sessionActions.createElderAccess({ elderId, name: 'Rosa', email, password: 'Rosa2026!' });
    await sessionActions.revokeElderAccess(elderId);
    const admin = useSession.getState().user!;
    await auth.signOut();
    await expect(auth.signIn({ email, password: 'Rosa2026!', role: 'elder' })).rejects.toMatchObject({ code: 'revoked' });
    await expect(auth.resetManagedPassword({ ownerId: admin.id, elderId, password: 'Nueva2026!' })).rejects.toBeInstanceOf(AuthError);
  });

  it('restablecer la contraseña reactiva el acceso', async () => {
    const email = unique('eva');
    await sessionActions.createElderAccess({ elderId, name: 'Rosa', email, password: 'Rosa2026!' });
    await sessionActions.revokeElderAccess(elderId);
    await sessionActions.resetElderAccess(elderId, 'Nueva2026!');
    expect(await sessionActions.elderAccess(elderId)).toEqual({ email, revoked: false });
    await auth.signOut();
    expect((await auth.signIn({ email, password: 'Nueva2026!', role: 'elder' })).elderId).toBe(elderId);
  });

  it('rechaza contraseñas débiles para el acceso', async () => {
    await expect(sessionActions.createElderAccess({ elderId, name: 'Rosa', email: unique('x'), password: 'corta' })).rejects.toMatchObject({ code: 'weak_password' });
  });
});

describe('navegación por rol', () => {
  function TestRoot() {
    return (
      <RenderProviders>
        <Stack screenOptions={{ headerShown: false }} />
      </RenderProviders>
    );
  }
  const routes = {
    _layout: TestRoot,
    index: Welcome,
    'sign-in': SignIn,
    '(caregiver)/_layout': CaregiverLayout,
    '(caregiver)/summary': () => <Text>Resumen de prueba</Text>,
    'elder/_layout': ElderLayout,
    'elder/index': ElderHome,
    'elder/options': ElderOptions,
    'elder/unlock': Unlock,
  };
  let elderId: string;
  const elderSession = () => ({ id: 'elder-acc', email: 'e@correo.com', name: 'Rosa', createdAt: '', role: 'elder' as const, ownerId: testUser.id, elderId });
  beforeEach(async () => {
    elderId = (await seedRenderData()).id;
  });
  afterEach(() => cleanup());

  it('el adulto mayor con su acceso nunca entra a la zona del administrador', async () => {
    useSession.setState({ status: 'signedIn', user: elderSession() });
    const r = await renderRouter(routes, { initialUrl: '/summary' });
    await waitFor(() => expect(r.getPathname()).toBe('/elder'));
    expect(screen.getByText(/Rosa/)).toBeTruthy();
  });

  it('la entrada pregunta el rol; el adulto mayor solo tiene "Iniciar sesión"', async () => {
    useSession.setState({ status: 'signedOut', user: null });
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(strings.auth.roles.elder) }));
    expect(screen.getByText(strings.auth.roles.elderNote)).toBeTruthy();
    expect(screen.queryByRole('button', { name: strings.welcome.createAccount })).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(strings.auth.roles.admin) }));
    expect(screen.getByRole('button', { name: strings.welcome.createAccount })).toBeTruthy();
  });

  it('"Opciones" → contraseña de cuenta del administrador; una incorrecta conserva el rol adulto', async () => {
    const owner = await sessionActions.signUp({ name: '[PRUEBA] Admin', email: unique('v31-admin'), password: 'Segura123!' });
    forceRecord('elders', elderId, { ownerUserId: owner.id });
    await sessionActions.createElderAccess({ elderId, name: '[PRUEBA] Rosa', email: unique('v31-elder'), password: 'Codigo123!' });
    await sessionActions.switchToElder(elderId, 'Codigo123!');
    const r = await renderRouter(routes, { initialUrl: '/elder' });
    await fireEvent.press(await screen.findByRole('button', { name: strings.adminAccess.button }));
    await fireEvent.press(await screen.findByRole('button', { name: strings.adminAccess.enterAdmin }));
    await waitFor(() => expect(r.getPathname()).toBe('/elder/unlock'));
    await fireEvent.changeText(screen.getByLabelText('Contraseña del administrador'), 'incorrecta');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar como administrador' }));
    await screen.findByText(strings.auth.errors.invalid);
    expect(useSession.getState().user?.role).toBe('elder');
    await fireEvent.changeText(screen.getByLabelText('Contraseña del administrador'), 'Segura123!');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar como administrador' }));
    await waitFor(() => expect(r.getPathname()).toBe('/summary'));
    expect(useSession.getState().user?.id).toBe(owner.id);
  });

  it('"Opciones" → "Cerrar sesión" confirma con texto claro y vuelve a la elección de rol (sin PIN)', async () => {
    useSession.setState({ status: 'signedIn', user: elderSession() });
    db.setDraft(testUser.id, `permissions.introDone.${elderId}`, true);
    const r = await renderRouter(routes, { initialUrl: '/elder' });
    await fireEvent.press(await screen.findByRole('button', { name: strings.adminAccess.button }));
    await fireEvent.press(await screen.findByRole('button', { name: strings.adminAccess.signOut }));
    expect(screen.getByText(strings.adminAccess.signOutBody)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: strings.adminAccess.signOutConfirm }));
    await waitFor(() => expect(r.getPathname()).toBe('/'));
    expect(useSession.getState().user).toBeNull();
    expect(screen.getByRole('radio', { name: new RegExp(strings.auth.roles.admin) })).toBeTruthy();
  });
});

describe('extremo a extremo: entrar como adulto mayor, salir y entrar como administrador (V3.0)', () => {
  function TestRoot() {
    return (
      <RenderProviders>
        <Stack screenOptions={{ headerShown: false }} />
      </RenderProviders>
    );
  }
  const routes = {
    _layout: TestRoot,
    index: Welcome,
    'sign-in': SignIn,
    '(caregiver)/_layout': CaregiverLayout,
    '(caregiver)/summary': () => <Text>Resumen de prueba</Text>,
    'elder/_layout': ElderLayout,
    'elder/index': ElderHome,
    'elder/options': ElderOptions,
  };
  afterEach(() => cleanup());

  it('no queda atrapado en la pantalla del adulto mayor', async () => {
    const auth = getAuthService();
    const elderId = (await seedRenderData()).id;
    const adminEmail = unique('admin');
    const admin = await auth.signUp({ name: 'Laura', email: adminEmail, password: 'Segura123' });
    useSession.setState({ status: 'signedIn', user: admin });
    forceRecord('elders', elderId, { ownerUserId: admin.id });
    const elderEmail = unique('rosa');
    await sessionActions.createElderAccess({ elderId, name: 'Rosa', email: elderEmail, password: 'Rosa2026!' });
    await sessionActions.signOut();

    // 1. Entra el adulto mayor con su acceso: solo ve su pantalla.
    useSession.setState({ status: 'signedIn', user: await sessionActions.signIn({ email: elderEmail, password: 'Rosa2026!', role: 'elder' }) });
    const r = await renderRouter(routes, { initialUrl: '/summary' });
    await waitFor(() => expect(r.getPathname()).toBe('/elder'));

    // 2. Sale con "Opciones" → "Cerrar sesión".
    await fireEvent.press(screen.getByRole('button', { name: strings.adminAccess.button }));
    await fireEvent.press(await screen.findByRole('button', { name: strings.adminAccess.signOut }));
    await fireEvent.press(screen.getByRole('button', { name: strings.adminAccess.signOutConfirm }));
    await waitFor(() => expect(r.getPathname()).toBe('/'));

    // 3. Entra el administrador desde la pantalla de entrada, con su correo y contraseña.
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(strings.auth.roles.admin) }));
    expect(screen.getByRole('button', { name: strings.welcome.signIn })).toBeTruthy();
    // El botón navega tras el vuelo del robot, que mide con measureInWindow (en Jest no responde): se abre la ruta
    // a la que lleva ese botón.
    await act(() => router.push({ pathname: '/sign-in', params: { role: 'caregiver' } }));
    await waitFor(() => expect(r.getPathname()).toBe('/sign-in'));
    await fireEvent.changeText(screen.getByLabelText(strings.auth.email), adminEmail);
    await fireEvent.changeText(screen.getByLabelText(strings.auth.password), 'Segura123');
    await fireEvent.press(screen.getByRole('button', { name: strings.auth.enter }));
    await waitFor(() => expect(useSession.getState().user?.role ?? 'caregiver').toBe('caregiver'));
    await waitFor(() => expect(r.getPathname()).toBe('/summary'));
  });
});
