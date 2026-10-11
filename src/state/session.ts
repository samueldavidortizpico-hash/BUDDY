/**
 * Sesión de la app: quién está conectado y sus ajustes de cuenta. La autenticación la hace el AuthService elegido
 * en src/infrastructure (local hoy, Supabase mañana); aquí solo se refleja su estado.
 */
import { create } from 'zustand';

import { AuthError, type AuthUser } from '@/domain/auth';
import { ALERT_KINDS, type AccountSettings } from '@/domain/types';
import { getAuthService, syncIfRemote } from '@/infrastructure';
import { db } from '@/infrastructure/local/db';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface SessionState {
  status: Status;
  user: AuthUser | null;
}

export const useSession = create<SessionState>(() => ({ status: 'loading', user: null }));

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
  if (user) ensureAccount(user);
  useSession.setState({ status: user ? 'signedIn' : 'signedOut', user });
  if (user) syncIfRemote(user.id).catch(() => undefined);
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
  signUp: (input: { name: string; email: string; password: string }) => getAuthService().signUp(input),
  signIn: (input: { email: string; password: string }) => getAuthService().signIn(input),
  signOut: async () => {
    db.setHandoff(null);
    await getAuthService().signOut();
  },
  resetPassword: (email: string) => getAuthService().resetPassword(email),
  updatePassword: (current: string, next: string) => getAuthService().updatePassword({ current, next }),
  /** Verifica la contraseña, elimina la cuenta y borra TODOS sus datos locales. */
  deleteAccount: async (password: string) => {
    const user = useSession.getState().user;
    if (!user) throw new AuthError('invalid_credentials', 'Sin sesión');
    await getAuthService().deleteAccount(password);
    db.purgeUser(user.id);
  },
};

export function currentUserId(): string {
  const id = useSession.getState().user?.id;
  if (!id) throw new Error('Se requiere una sesión iniciada.');
  return id;
}
