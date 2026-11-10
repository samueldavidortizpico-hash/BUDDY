/**
 * Sesión de la app: quién está conectado y sus ajustes de cuenta. La autenticación la hace el AuthService elegido
 * en src/infrastructure (local hoy, Supabase mañana); aquí solo se refleja su estado.
 */
import { create } from 'zustand';

import { FEATURES } from '@/config/features';
import { AuthError, dataOwnerId, roleOf, type AuthUser } from '@/domain/auth';
import { can, canAccessRecord, type Permission } from '@/domain/permissions';
import { ALERT_KINDS, type AccountSettings, type Role } from '@/domain/types';
import { getAuthService, syncIfRemote } from '@/infrastructure';
import { db, purgeAccountData, useDb } from '@/infrastructure/local/db';
import { clearScheduled } from '@/infrastructure/notifications';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface SessionState {
  status: Status;
  user: AuthUser | null;
}

export const useSession = create<SessionState>(() => ({ status: 'loading', user: null }));

// Cada cambio queda en el ChangeLog con su autor real (administrador o adulto mayor).
db.setAuthorResolver(() => useSession.getState().user?.id ?? null);
// Frontera de acceso de la base: cada lectura y escritura se comprueba contra la cuenta y la persona de la sesión.
db.setAccessGuard((coll, scope, mode) => canAccessRecord(useSession.getState().user, coll, scope, mode));

export const ALL_ALERTS = Object.fromEntries(ALERT_KINDS.map((k) => [k, true])) as AccountSettings['myAlerts'];

/** Crea los ajustes de la cuenta la primera vez que entra en este dispositivo. */
export function ensureAccount(user: AuthUser): AccountSettings {
  const existing = db.list('accounts', user.id)[0];
  if (existing) return existing;
  return db.insert(
    'accounts',
    {
      activeElderId: null,
      pinHash: null,
      pinSalt: null,
      myAlerts: ALL_ALERTS,
      permissions: { camera: false, notifications: false, health: false },
      demoMode: false,
    },
    { userId: user.id, elderId: null },
  );
}

function setUser(user: AuthUser | null) {
  const previous = useSession.getState().user;
  // La sesión se fija primero: la base solo deja escribir en la cuenta de quien está conectado.
  useSession.setState({ status: user ? 'signedIn' : 'signedOut', user });
  // Los ajustes de cuenta (PIN, persona activa, avisos) son del administrador; el adulto mayor usa los de su familiar.
  if (user && roleOf(user) === 'caregiver') ensureAccount(user);
  // SEC-07: los avisos programados pertenecen a la cuenta que sale (cerrar sesión, entrar con otra o eliminarla). No
  // se tocan en el primer arranque (los recordatorios sobreviven a reabrir la app) ni al pasar del adulto mayor a SU
  // administrador en el mismo teléfono: son de la misma persona y apagarlos sería dejarla sin recordatorios.
  if (previous && (!user || dataOwnerId(previous) !== dataOwnerId(user))) void clearScheduled().catch(() => undefined);
  if (user) syncIfRemote(dataOwnerId(user)).catch(() => undefined);
}

let started = false;

/** Carga la sesión guardada (llamar una vez, cuando la base local ya está hidratada). */
export async function startSession() {
  if (started) return;
  started = true;
  const auth = getAuthService();
  auth.onAuthStateChange(setUser);
  try {
    setUser(await auth.getSession());
  } catch {
    setUser(null);
  }
}

export const sessionActions = {
  signUp: async (input: { name: string; email: string; password: string }) => {
    const user = await getAuthService().signUp(input);
    setUser(user);
    return user;
  },
  switchToElder: async (elderId: string, password: string) => {
    const service = getAuthService();
    if (!service.switchToManaged) throw new AuthError('not_configured', 'El cambio de cuenta requiere el proveedor local o un backend compatible.');
    const user = await service.switchToManaged(elderId, password);
    db.setHandoff(null);
    setUser(user);
    return user;
  },
  returnToAdmin: async (password: string, email?: string) => {
    const service = getAuthService();
    if (!service.returnToOwner) throw new AuthError('not_configured', 'Inicia sesión con el correo y la contraseña del administrador.');
    const user = await service.returnToOwner(password, email);
    db.setHandoff(null);
    setUser(user);
    const acc = db.list('accounts', user.id)[0];
    if (acc) db.update('accounts', acc.id, { pinHash: null, pinSalt: null });
    db.setDraft(user.id, 'pin.guard', undefined);
    return user;
  },
  recoveryCode: async (password: string) => {
    const service = getAuthService();
    if (!service.regenerateRecoveryCode) throw new AuthError('not_configured', 'La recuperación por correo requiere backend.');
    return service.regenerateRecoveryCode(password);
  },
  recoverWithCode: async (input: { email: string; code: string; next: string }) => {
    const service = getAuthService();
    if (!service.recoverWithCode) throw new AuthError('not_configured', 'Usa la recuperación por correo del proveedor.');
    await service.recoverWithCode(input);
    db.setHandoff(null);
    setUser(null);
  },
  signIn: async (input: { email: string; password: string; role?: Role }) => {
    const user = await getAuthService().signIn(input);
    // Igual que al salir: la sesión queda fijada aunque el oyente del proveedor aún no haya respondido.
    if (useSession.getState().user?.id !== user.id) setUser(user);
    return user;
  },
  signOut: async () => {
    db.setHandoff(null);
    await getAuthService().signOut();
    // Sin esperar al oyente del proveedor: al volver a la entrada, la sesión ya está cerrada (si no, la entrada
    // redirigía de nuevo a la pantalla del adulto mayor).
    setUser(null);
    // Se espera a que el sistema suelte los avisos de quien salió: al terminar de cerrar sesión ya no queda ninguno.
    await clearScheduled().catch(() => undefined);
  },
  resetPassword: (email: string) => getAuthService().resetPassword(email),
  updatePassword: (current: string, next: string) => getAuthService().updatePassword({ current, next }),
  /** Acceso del adulto mayor creado por su administrador (correo y contraseña que el administrador define). */
  createElderAccess: (input: { elderId: string; name: string; email: string; password: string }) =>
    getAuthService().createManagedAccount({ ownerId: currentUserId(), ...input }),
  resetElderAccess: (elderId: string, password: string) => getAuthService().resetManagedPassword({ ownerId: currentUserId(), elderId, password }),
  revokeElderAccess: (elderId: string) => getAuthService().revokeManagedAccount({ ownerId: currentUserId(), elderId }),
  changeElderEmail: (elderId: string, email: string) => getAuthService().changeManagedEmail({ ownerId: currentUserId(), elderId, email }),
  elderAccess: (elderId: string) => getAuthService().managedAccount({ ownerId: currentUserId(), elderId }),
  /** V4.3: acceso de la enfermera de esa persona (plan Salud). */
  createNurseAccess: (input: { elderId: string; name: string; email: string; password: string }) =>
    getAuthService().createManagedAccount({ ownerId: currentUserId(), ...input, role: 'nurse' }),
  revokeNurseAccess: (elderId: string) => getAuthService().revokeManagedAccount({ ownerId: currentUserId(), elderId, role: 'nurse' }),
  resetNurseAccess: (elderId: string, password: string) => getAuthService().resetManagedPassword({ ownerId: currentUserId(), elderId, password, role: 'nurse' }),
  nurseAccess: (elderId: string) => getAuthService().managedAccount({ ownerId: currentUserId(), elderId, role: 'nurse' }),
  /**
   * Verifica la contraseña, elimina la cuenta con los accesos que creó (adulto mayor y enfermera de cada persona,
   * SEC-06) y borra TODOS sus datos locales. Solo el administrador: una cuenta vinculada la revoca quien la creó.
   */
  deleteAccount: async (password: string) => {
    const user = useSession.getState().user;
    if (!user) throw new AuthError('invalid_credentials', 'Sin sesión');
    if (roleOf(user) !== 'caregiver') throw new AuthError('forbidden', 'Solo el administrador puede eliminar la cuenta.');
    // Todas sus personas, también las borradas: sus accesos siguen existiendo hasta eliminarlos.
    const elderIds = Object.values(useDb.getState().elders).filter((e) => e.ownerUserId === user.id).map((e) => e.id);
    await getAuthService().deleteAccount(password, { elderIds });
    purgeAccountData(user.id);
    await clearScheduled().catch(() => undefined);
  },
};

function sessionUser(): AuthUser {
  const user = useSession.getState().user;
  if (!user) throw new Error('Se requiere una sesión iniciada.');
  return user;
}

/** Cuenta dueña de los datos (el administrador, también en la sesión del adulto mayor). */
export function currentUserId(): string {
  return dataOwnerId(sessionUser());
}

/** Quién hace el cambio (autor real, para el registro de cambios). */
export function currentAuthorId(): string {
  return sessionUser().id;
}

export function currentRole(): Role {
  return roleOf(useSession.getState().user);
}

/**
 * Rol EFECTIVO de quien usa el teléfono ahora, respecto a una persona (auditoría 2026-11-10, SEC-03 y SEC-04). Sale de
 * la sesión y de la entrega del teléfono, NUNCA de un argumento de quien llama: una sesión de adulto mayor o de
 * enfermera actúa como tal; la del administrador actúa como el adulto mayor solo mientras el teléfono está entregado a
 * esa persona (la entrega de prueba "Probar como" solo existe con las herramientas de desarrollo).
 */
export function actingRole(elderId?: string | null): Role {
  const user = useSession.getState().user;
  const role = roleOf(user);
  if (!user || role !== 'caregiver') return role;
  const handoff = db.draftHandoff();
  const valid = !!handoff && handoff.userId === user.id && (!elderId || handoff.elderId === elderId) && (handoff.mode !== 'test' || FEATURES.devTools);
  return valid ? 'elder' : 'caregiver';
}

/** ¿El rol efectivo puede hacer esto? Es la única puerta de la matriz `can` para los casos de uso. */
export function allowed(action: Permission, elderId?: string | null): boolean {
  return !!useSession.getState().user && can(actingRole(elderId), action);
}
