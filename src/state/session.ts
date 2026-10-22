/**
 * Sesión de la app: quién está conectado y sus ajustes de cuenta. La autenticación la hace el AuthService elegido
 * en src/infrastructure (local hoy, Supabase mañana); aquí solo se refleja su estado.
 */
import { create } from 'zustand';

import { AuthError, dataOwnerId, roleOf, type AuthUser } from '@/domain/auth';
import { ALERT_KINDS, type AccountSettings, type Role } from '@/domain/types';
import { getAuthService, syncIfRemote } from '@/infrastructure';
import { db } from '@/infrastructure/local/db';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface SessionState {
  status: Status;
  user: AuthUser | null;
}

export const useSession = create<SessionState>(() => ({ status: 'loading', user: null }));

// Cada cambio queda en el ChangeLog con su autor real (administrador o adulto mayor).
db.setAuthorResolver(() => useSession.getState().user?.id ?? null);

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
  // Los ajustes de cuenta (PIN, persona activa, avisos) son del administrador; el adulto mayor usa los de su familiar.
  if (user && roleOf(user) === 'caregiver') ensureAccount(user);
  useSession.setState({ status: user ? 'signedIn' : 'signedOut', user });
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
  /** Verifica la contraseña, elimina la cuenta y borra TODOS sus datos locales. */
  deleteAccount: async (password: string) => {
    const user = useSession.getState().user;
    if (!user) throw new AuthError('invalid_credentials', 'Sin sesión');
    await getAuthService().deleteAccount(password);
    db.purgeUser(user.id);
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
