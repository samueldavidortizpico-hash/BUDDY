/**
 * V4.3: planes (bloqueos amables y desbloqueos), pantalla de planes y rol de enfermera (permisos y cuenta).
 * Datos ficticios de prueba.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Buddy from '@/app/(caregiver)/buddy';
import Plus from '@/app/(caregiver)/plus';
import Health from '@/app/(caregiver)/(tabs)/health';
import { dataOwnerId } from '@/domain/auth';
import { can, isLinkedRole, type Permission } from '@/domain/permissions';
import { getAuthService } from '@/infrastructure';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { homeHrefFor } from '@/state/nav';
import { sessionActions, useSession } from '@/state/session';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';

jest.mock('react-native-purchases', () => ({ __esModule: true, default: {}, LOG_LEVEL: { WARN: 3 } }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return { ...actual, useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }), useLocalSearchParams: () => ({}) };
});

const ui = async (node: React.ReactElement) => await render(<RenderProviders>{node}</RenderProviders>);
const setPlan = (plan: string) => db.setDraft(testUser.id, 'buddyPlan', plan);

describe('permisos de la enfermera', () => {
  const allowed: Permission[] = ['confirm_dose', 'answer_question', 'update_stock', 'request_help', 'call_contact'];
  const denied: Permission[] = ['add_medication', 'update_medication', 'remove_medication', 'manage_access', 'settings', 'use_assistant', 'edit_profile', 'location_consent', 'share_location', 'handoff'];
  it.each(allowed)('la enfermera puede %s', (a) => expect(can('nurse', a)).toBe(true));
  it.each(denied)('la enfermera NO puede %s', (a) => expect(can('nurse', a)).toBe(false));
  it('el adulto mayor sigue sin poder llevar existencias', () => expect(can('elder', 'update_stock')).toBe(false));
  it('la enfermera actúa sobre los datos de su administrador y entra a su propio inicio', () => {
    expect(isLinkedRole('nurse')).toBe(true);
    expect(dataOwnerId({ id: 'n1', email: 'n@x.co', name: 'Ana', createdAt: '', role: 'nurse', ownerId: 'admin-1', elderId: 'e1' })).toBe('admin-1');
    expect(homeHrefFor('admin-1', true, false, 'nurse')).toBe('/nurse');
  });
});

let n = 0;
const unique = (name: string) => `${name}${Date.now()}${n++}@correo.com`;

describe('cuenta de la enfermera', () => {
  const auth = getAuthService();
  let elderId: string;
  beforeEach(async () => {
    elderId = (await seedRenderData()).id;
    const admin = await auth.signUp({ name: 'Laura', email: unique('laura'), password: 'Segura123' });
    useSession.setState({ status: 'signedIn', user: admin });
    db.putMany('elders', [{ ...db.get('elders', elderId)!, ownerUserId: admin.id }]);
  });

  it('el administrador crea el acceso; la enfermera entra con su rol y no como administradora', async () => {
    const email = unique('ana');
    await sessionActions.createNurseAccess({ elderId, name: 'Ana', email, password: 'Cuidado2026!' });
    expect(await sessionActions.nurseAccess(elderId)).toEqual({ email, revoked: false });
    // El acceso del adulto mayor es independiente.
    expect(await sessionActions.elderAccess(elderId)).toBeNull();
    await sessionActions.signOut();
    await expect(sessionActions.signIn({ email, password: 'Cuidado2026!', role: 'caregiver' })).rejects.toMatchObject({ code: 'wrong_role', message: strings.auth.errors.wrongRoleNurse });
    const nurse = await sessionActions.signIn({ email, password: 'Cuidado2026!', role: 'nurse' });
    expect(nurse).toMatchObject({ role: 'nurse', elderId });
  });

  it('quitar el acceso impide entrar', async () => {
    const email = unique('ana');
    await sessionActions.createNurseAccess({ elderId, name: 'Ana', email, password: 'Cuidado2026!' });
    await sessionActions.revokeNurseAccess(elderId);
    await sessionActions.signOut();
    await expect(sessionActions.signIn({ email, password: 'Cuidado2026!', role: 'nurse' })).rejects.toMatchObject({ code: 'revoked' });
  });
});

describe('bloqueos amables y desbloqueos por plan', () => {
  beforeEach(async () => {
    await seedRenderData();
  });

  it('Gratis: el chat de BUDDY se ve con candado, el plan que lo incluye y "Ver planes"', async () => {
    setPlan('free');
    await ui(<Buddy />);
    expect(screen.getByText(strings.buddy.lockedTitle)).toBeTruthy();
    expect(screen.getByText('Incluido en Plus')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver planes' })).toBeTruthy();
  });

  it('Plus: el chat se desbloquea', async () => {
    setPlan('plus');
    await ui(<Buddy />);
    expect(screen.queryByText(strings.buddy.lockedTitle)).toBeNull();
  });

  it('Gratis: Hoy en Salud es libre; semanas y meses muestran el candado', async () => {
    setPlan('free');
    await ui(<Health />);
    expect(screen.queryByText(strings.health.historyLockedTitle)).toBeNull();
    await fireEvent.press(screen.getByRole('tab', { name: strings.health.periods.week }));
    expect(screen.getByText(strings.health.historyLockedTitle)).toBeTruthy();
  });
});

describe('pantalla de planes', () => {
  beforeEach(async () => {
    await seedRenderData();
    setPlan('free');
  });

  // V5.3 (auditoría de venta V-03, spec commerce/plan-offering): solo se cobra lo que se entrega.
  it('Plan con parte disponible: Plus se compra y separa lo incluido de lo que llega después', async () => {
    await ui(<Plus />);
    expect(screen.getByText('$7.000')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continuar con Plus · $7.000/mes' })).toBeTruthy();
    // El recomendado solo puede ser un plan que se pueda comprar.
    expect(screen.getByText(strings.plus.recommended)).toBeTruthy();
    const plus = screen.getByRole('radio', { name: /^Plus\./ });
    expect(plus.props.accessibilityLabel).toMatch(/Incluido: Chat con BUDDY.*Ve cómo durmió.*Salud con gráficas/);
    expect(plus.props.accessibilityLabel).toMatch(/Próximamente: Reloj inteligente.*Reporte en PDF/);
  });

  it('Plan con beneficios pendientes: Salud y Familiar salen como "Próximamente", sin precio ni botón de compra', async () => {
    await ui(<Plus />);
    expect(screen.queryByText('$11.000')).toBeNull();
    expect(screen.queryByText('$13.000')).toBeNull();
    expect(screen.queryByRole('radio', { name: /^Familiar\./ })).toBeNull();
    expect(screen.queryByRole('radio', { name: /^Salud\./ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Familiar|Salud/ })).toBeNull();
    expect(screen.getByTestId('soon-family')).toBeTruthy();
    expect(screen.getByTestId('soon-health')).toBeTruthy();
  });

  it('Precio anual sin definir: no se ofrece la opción anual ni ningún ahorro', async () => {
    await ui(<Plus />);
    expect(screen.queryByRole('tab', { name: strings.plus.yearly })).toBeNull();
    expect(screen.queryByText(/%|Ahorra/)).toBeNull();
    expect(screen.queryByText(strings.plus.yearlyTbd)).toBeNull();
  });

  it('antes de comprar dice que se renueva sola y cómo cancelar', async () => {
    await ui(<Plus />);
    expect(screen.getByText(strings.plus.autoRenew)).toBeTruthy();
    expect(screen.getByText(strings.plus.cancelAnytime)).toBeTruthy();
  });

  it('en desarrollo, continuar activa un plan de prueba sin cobrar', async () => {
    await ui(<Plus />);
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar con Plus · $7.000/mes' }));
    await waitFor(() => expect(db.draft(testUser.id, 'buddyPlan')).toBe('plus'));
  });
});
