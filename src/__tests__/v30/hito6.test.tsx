/**
 * V3.0 · Hito 6: adulto mayor sin fricción (respuestas de 72), primeros cinco minutos del hijo (registro rápido de 5
 * pantallas en vez de 9) e invitación familiar (código con permiso, vencimiento y revocación; aceptar exige servidor).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { FULL, QUICK } from '@/app/(caregiver)/setup';
import InviteScreen from '@/app/(caregiver)/settings/invite';
import { checkInvite, inviteCode, newInvite, normalizeInviteCode, INVITE_DAYS } from '@/domain/invites';
import { db } from '@/infrastructure/local/db';
import { ElderScreen } from '@/features/elder/screen';
import { strings } from '@/i18n';
import { invites } from '@/state/invites';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';
import { toISODate } from '@/utils/dates';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => ({}),
  usePathname: () => '/summary',
  Redirect: () => null,
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

let elderId: string;
beforeEach(async () => {
  elderId = (await seedRenderData()).id;
});

describe('primeros cinco minutos del hijo', () => {
  it('el registro rápido tiene 5 pantallas (antes 9): persona, un medicamento, un contacto, chequeo y listo', () => {
    expect(QUICK).toEqual(['who', 'meds', 'contacts', 'checkin', 'done']);
    expect(FULL).toHaveLength(9);
    // Lo que sale del registro rápido sigue disponible en el asistente completo ("Primeros pasos").
    for (const k of ['health', 'food', 'routine', 'alerts', 'access']) expect(FULL).toContain(k);
  });
});

describe('adulto mayor sin fricción', () => {
  it('todas las respuestas de una toma miden 72 (tomé, en 10 minutos, no lo tomé)', () => {
    db.insert('medications', { name: 'Losartán [PRUEBA]', activeIngredient: '', strength: '', form: 'tablet', doseAmount: 1, doseUnit: 'unit', schedule: { kind: 'times', times: [new Date().toTimeString().slice(0, 5)], days: [] }, startDate: toISODate(new Date()), endDate: null, instructions: '', purpose: '', description: '', unitsPerPackage: 30, unitsOnHand: 30, refillAlertDays: 3, photoUri: null, paused: false }, { userId: testUser.id, elderId });
    render(<ElderScreen elderId={elderId} />, { wrapper: RenderProviders });
    for (const name of [strings.elder.taken, strings.elder.snooze, strings.elder.notTaken]) {
      const style = [screen.getByRole('button', { name }).props.style].flat(4).reduce((a, b) => ({ ...a, ...(b ?? {}) }), {});
      expect(style.minHeight).toBeGreaterThanOrEqual(72);
    }
    // Y "Opciones" visible, sin gesto oculto.
    expect(screen.getByRole('button', { name: strings.adminAccess.button })).toBeTruthy();
  });
});

describe('invitación familiar', () => {
  it('código legible de 8 caracteres sin letras confusas, y se normaliza lo que se escribe', () => {
    const code = inviteCode(new Uint8Array([0, 1, 2, 3, 250, 251, 252, 253]));
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(normalizeInviteCode(` ${code.toLowerCase().replace('-', ' ')} `)).toBe(code);
  });

  it('vence a los 7 días, se puede revocar y una aceptada no se reutiliza', () => {
    const now = new Date(2026, 9, 20, 9);
    const inv = newInvite({ code: 'ABCD-2345', elderId, role: 'viewer', now });
    expect(checkInvite(inv, now)).toBe('valid');
    expect(checkInvite(inv, new Date(now.getTime() + INVITE_DAYS * 86_400_000))).toBe('expired');
    expect(checkInvite({ ...inv, status: 'revoked' }, now)).toBe('revoked');
    expect(checkInvite({ ...inv, status: 'accepted' }, now)).toBe('used');
    expect(checkInvite(undefined, now)).toBe('unknown');
  });

  it('en local: crear con permiso, listar, revocar; aceptar desde otro celular dice que necesita el servidor', async () => {
    const inv = await invites.create({ elderId, role: 'admin' });
    expect(invites.list(elderId)).toEqual([inv]);
    await expect(invites.accept(inv.code, 'otro')).resolves.toEqual({ ok: false, reason: 'needs_backend' });
    invites.revoke(inv.code);
    await expect(invites.accept(inv.code, 'otro')).resolves.toEqual({ ok: false, reason: 'revoked' });
  });

  it('la pantalla crea la invitación con el permiso elegido y la muestra para compartir', async () => {
    db.setDraft(testUser.id, 'buddyPlusTest', true);
    render(<InviteScreen />, { wrapper: RenderProviders });
    fireEvent.press(screen.getByRole('tab', { name: strings.invite.roles.admin }));
    fireEvent.press(screen.getByRole('button', { name: strings.invite.create }));
    await waitFor(() => expect(invites.list(elderId)).toHaveLength(1));
    expect(screen.getByText(strings.invite.codeFor(strings.invite.roles.admin))).toBeTruthy();
    expect(screen.getByRole('button', { name: strings.invite.share })).toBeTruthy();
    expect(invites.list(elderId)[0]).toMatchObject({ role: 'admin', status: 'pending' });
  });

  it('Gratis no puede invitar otro cuidador; abre la oferta Plus sin crear código', async () => {
    render(<InviteScreen />, { wrapper: RenderProviders });
    fireEvent.press(screen.getByRole('tab', { name: strings.invite.roles.admin }));
    expect(screen.getByText('Agregar otro cuidador · Disponible en BUDDY Plus')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: strings.invite.create }));
    await waitFor(() => expect(invites.list(elderId)).toHaveLength(0));
  });
});
