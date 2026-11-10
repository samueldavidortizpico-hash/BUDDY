/**
 * V3.0 · Hito 1 (correcciones críticas). La geometría real (compositor visible, nada cortado a 360×640 y texto al 200 %,
 * cada pantalla empieza arriba) se mide en web con scripts/capture/v30-hito1.mjs; aquí se fija la estructura:
 * - el chat ya no es una pestaña y tiene "Volver",
 * - cada opción de Ajustes es una ruta con "Volver" y contenido desplazable que empieza arriba, sin hojas,
 * - el acceso del adulto mayor: contraseña temporal aceptable mostrada una vez, cambio de correo y revocación.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Buddy from '@/app/(caregiver)/buddy';
import SettingsSection from '@/app/(caregiver)/settings/[section]';
import ElderAccess from '@/app/(caregiver)/settings/access/[elderId]';
import { isAcceptablePassword, tempPassword } from '@/domain/validation';
import { getAuthService } from '@/infrastructure';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { sessionActions, useSession } from '@/state/session';
import { RenderProviders, forceRecord, seedRenderData } from '@/testing/render-fixtures';

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

const SECTIONS = ['account', 'appearance', 'elder', 'alerts', 'notifications', 'people', 'devices', 'legal', 'advanced', 'about'];

let elderId: string;
beforeEach(async () => {
  mockPush.mockClear();
  elderId = (await seedRenderData()).id;
  mockParams = {};
});

describe('1.1 chat de BUDDY como pantalla completa', () => {
  // La ruta vive en src/app/(caregiver)/buddy.tsx (stack, sin pestañas); scripts/check-headers.ts la trata como no raíz.
  it('tiene "Volver", compositor y botón enviar de 48, sin barra de pestañas', async () => {
    await render(<Buddy />, { wrapper: RenderProviders });
    expect(screen.getByRole('button', { name: strings.common.back })).toBeTruthy();
    expect(screen.getByLabelText(strings.buddy.placeholder)).toBeTruthy();
    const send = screen.getByRole('button', { name: strings.buddy.send });
    const style = [send.props.style].flat(3).reduce((a, b) => ({ ...a, ...(b ?? {}) }), {});
    expect(style.width).toBeGreaterThanOrEqual(48);
    expect(style.height).toBeGreaterThanOrEqual(48);
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});

describe('1.2 Ajustes: cada opción es una ruta completa', () => {
  it.each(SECTIONS)('%s: "Volver", desplazable, empieza arriba y sin hojas abiertas', async (section) => {
    mockParams = { section };
    await render(<SettingsSection />, { wrapper: RenderProviders });
    expect(screen.getByRole('button', { name: strings.common.back })).toBeTruthy();
    const scroll = screen.container.queryAll((node) => node.type === 'RCTScrollView')[0];
    expect(scroll.props.contentOffset?.y ?? 0).toBe(0);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('"Acceso" en Mis personas abre la ruta del acceso (no una hoja)', async () => {
    db.update('elders', elderId, { setupDone: true });
    mockParams = { section: 'people' };
    await render(<SettingsSection />, { wrapper: RenderProviders });
    await fireEvent.press(screen.getByRole('button', { name: strings.setup.access.manage }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings/access/[elderId]', params: { elderId } });
  });
});

describe('1.2 acceso del adulto mayor', () => {
  let n = 0;
  const unique = (name: string) => `${name}${Date.now()}${n++}@correo.com`;

  it('la contraseña temporal siempre es aceptable y legible', () => {
    for (let i = 0; i < 200; i++) {
      const pw = tempPassword(new Uint8Array(Array.from({ length: 12 }, () => Math.floor(Math.random() * 256))));
      expect(pw).toMatch(/^[A-Za-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
      expect(pw).not.toMatch(/[01lIO]/);
      expect(isAcceptablePassword(pw)).toBe(true);
    }
  });

  it('se guarda como hash con sal, nunca en texto plano', async () => {
    const admin = await getAuthService().signUp({ name: 'Laura', email: unique('laura'), password: 'Segura123' });
    useSession.setState({ status: 'signedIn', user: admin });
    const email = unique('rosa');
    await sessionActions.createElderAccess({ elderId, name: 'Rosa', email, password: 'Rosa2026!' });
    const store = (jest.requireMock('expo-secure-store') as { __store: Map<string, string> }).__store;
    const raw = [...store.values()].find((v) => v.includes(email))!;
    expect(raw).not.toContain('Rosa2026!');
    expect(JSON.parse(raw)).toMatchObject({ salt: expect.any(String), hash: expect.any(String), iterations: expect.any(Number) });
  });

  it('restablecer muestra una contraseña temporal UNA vez, que sirve para entrar', async () => {
    const admin = await getAuthService().signUp({ name: 'Laura', email: unique('laura'), password: 'Segura123' });
    useSession.setState({ status: 'signedIn', user: admin });
    forceRecord('elders', elderId, { ownerUserId: admin.id });
    const email = unique('rosa');
    await sessionActions.createElderAccess({ elderId, name: 'Rosa', email, password: 'Rosa2026!' });
    mockParams = { elderId };
    await render(<ElderAccess />, { wrapper: RenderProviders });
    expect(await screen.findByText(email)).toBeTruthy();
    expect(screen.getByRole('button', { name: strings.setup.access.copyEmail })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: strings.setup.access.reset }));
    await fireEvent.press(screen.getAllByRole('button', { name: strings.setup.access.reset }).at(-1)!);
    const temp = await screen.findByText(/^[A-Za-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    const pw = temp.props.children as string;
    await fireEvent.press(screen.getByRole('button', { name: strings.setup.access.tempDone }));
    expect(screen.queryByText(pw)).toBeNull();
    await sessionActions.signOut();
    await expect(sessionActions.signIn({ email, password: 'Rosa2026!', role: 'elder' })).rejects.toMatchObject({ code: 'invalid_credentials' });
    await expect(sessionActions.signIn({ email, password: pw, role: 'elder' })).resolves.toMatchObject({ role: 'elder' });
  });

  it('cambiar correo conserva la contraseña y libera el anterior; revocar impide entrar', async () => {
    const admin = await getAuthService().signUp({ name: 'Laura', email: unique('laura'), password: 'Segura123' });
    useSession.setState({ status: 'signedIn', user: admin });
    const old = unique('rosa');
    const next = unique('rosa-nuevo');
    await sessionActions.createElderAccess({ elderId, name: 'Rosa', email: old, password: 'Rosa2026!' });
    await sessionActions.changeElderEmail(elderId, next);
    expect(await sessionActions.elderAccess(elderId)).toEqual({ email: next, revoked: false });
    await sessionActions.revokeElderAccess(elderId);
    await sessionActions.signOut();
    await expect(sessionActions.signIn({ email: old, password: 'Rosa2026!', role: 'elder' })).rejects.toMatchObject({ code: 'invalid_credentials' });
    await expect(sessionActions.signIn({ email: next, password: 'Rosa2026!', role: 'elder' })).rejects.toMatchObject({ code: 'revoked' });
    await waitFor(() => expect(useSession.getState().user).toBeNull());
  });
});
