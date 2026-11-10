/**
 * SupabaseAuthProvider: misma interfaz que el proveedor local, contra Supabase Auth.
 * IMPLEMENTADO PERO NO PROBADO contra un proyecto real (no hay proyecto en esta fase). Se activa con
 * EXPO_PUBLIC_AUTH_PROVIDER=supabase y las claves del .env. Si faltan, cada método lanza "not_configured".
 * Eliminar cuenta requiere la Edge Function `delete-account` (docs/SUPABASE_PLAN.md): el cliente no puede borrar
 * usuarios de auth sin la clave de servicio.
 */
import { AuthError, roleOf, type AuthService, type AuthUser } from '@/domain/auth';
import { isAcceptablePassword, isValidEmail, normalizeEmail } from '@/domain/validation';
import { strings } from '@/i18n';

import { getSupabase, supabaseConfigured } from './client';

const e = strings.auth.errors;

type Link = { role?: 'caregiver' | 'elder' | 'nurse'; owner_id?: string; elder_id?: string };
type SbUser = { id: string; email?: string; created_at: string; user_metadata?: { name?: string }; app_metadata?: Link };

/**
 * SEC-10: el rol y el vínculo (administrador y persona) salen de `app_metadata`, que solo escribe el servidor (la Edge
 * Function `manage-elder-account` con la clave de servicio). `user_metadata` lo puede editar el propio usuario desde el
 * cliente, así que de ahí solo se lee el nombre: nunca decide a qué cuenta o persona se accede. Sin vínculo del
 * servidor, la cuenta es un administrador de sus propios datos. RLS debe repetir esta regla (docs/SUPABASE_PLAN.md).
 */
export const toUser = (u: SbUser): AuthUser => {
  const link = u.app_metadata ?? {};
  const linked = (link.role === 'elder' || link.role === 'nurse') && !!link.owner_id && !!link.elder_id;
  return {
    id: u.id,
    email: u.email ?? '',
    name: u.user_metadata?.name ?? '',
    createdAt: u.created_at,
    role: linked ? link.role : 'caregiver',
    ownerId: linked ? link.owner_id! : null,
    elderId: linked ? link.elder_id! : null,
  };
};

function guard() {
  if (!supabaseConfigured) throw new AuthError('not_configured', e.notConfigured);
  return getSupabase();
}

function mapError(error: { message?: string; status?: number } | null): never {
  const msg = error?.message?.toLowerCase() ?? '';
  if (msg.includes('already registered')) throw new AuthError('email_taken', e.taken);
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) throw new AuthError('invalid_credentials', e.invalid);
  if (error?.status === 429) throw new AuthError('locked', e.locked(60), 60_000);
  if (msg.includes('fetch') || msg.includes('network')) throw new AuthError('network', e.unknown);
  throw new AuthError('unknown', e.unknown);
}

export function createSupabaseAuthProvider(): AuthService {
  return {
    kind: 'supabase',

    async signUp({ name, email, password }) {
      if (!isValidEmail(email)) throw new AuthError('invalid_email', e.email);
      if (!isAcceptablePassword(password)) throw new AuthError('weak_password', e.weak);
      const { data, error } = await guard().auth.signUp({ email: normalizeEmail(email), password, options: { data: { name: name.trim() } } });
      if (error || !data.user) mapError(error);
      // FUN-04: si el proyecto exige confirmar el correo, hay usuario pero NO sesión. No se entra a la app: quien
      // llama muestra "revisa tu correo" en vez de una sesión que el servidor rechazaría en cada operación.
      if (!data.session) throw new AuthError('confirm_email', e.confirmEmail);
      return toUser(data.user as SbUser);
    },

    async signIn({ email, password, role }) {
      const sb = guard();
      const { data, error } = await sb.auth.signInWithPassword({ email: normalizeEmail(email), password });
      if (error || !data.user) mapError(error);
      const user = toUser(data.user as SbUser);
      if (role && roleOf(user) !== role) {
        await sb.auth.signOut();
        throw new AuthError('wrong_role', roleOf(user) === 'elder' ? e.wrongRoleElder : roleOf(user) === 'nurse' ? e.wrongRoleNurse : e.wrongRoleAdmin);
      }
      return user;
    },

    async signOut() {
      await guard().auth.signOut();
    },

    async getSession() {
      if (!supabaseConfigured) return null;
      const { data } = await getSupabase().auth.getSession();
      return data.session?.user ? toUser(data.session.user as SbUser) : null;
    },

    onAuthStateChange(listener) {
      if (!supabaseConfigured) return () => undefined;
      const { data } = getSupabase().auth.onAuthStateChange((_event, session) => listener(session?.user ? toUser(session.user as SbUser) : null));
      return () => data.subscription.unsubscribe();
    },

    async resetPassword(email) {
      const { error } = await guard().auth.resetPasswordForEmail(normalizeEmail(email));
      // Mismo mensaje exista o no la cuenta.
      if (error && error.status !== 400) mapError(error);
      return { sent: true, message: strings.auth.forgot.sent };
    },

    async updatePassword({ current, next }) {
      const sb = guard();
      const { data } = await sb.auth.getUser();
      if (!data.user?.email) throw new AuthError('invalid_credentials', e.invalid);
      if (!isAcceptablePassword(next)) throw new AuthError('weak_password', e.weak);
      const check = await sb.auth.signInWithPassword({ email: data.user.email, password: current });
      if (check.error) mapError(check.error);
      const { error } = await sb.auth.updateUser({ password: next });
      if (error) mapError(error);
    },

    async deleteAccount(password) {
      const sb = guard();
      const { data } = await sb.auth.getUser();
      if (!data.user?.email) throw new AuthError('invalid_credentials', e.invalid);
      const check = await sb.auth.signInWithPassword({ email: data.user.email, password });
      if (check.error) mapError(check.error);
      const { error } = await sb.functions.invoke('delete-account', { method: 'POST' });
      if (error) mapError(error);
      await sb.auth.signOut();
    },

    // Crear o administrar la cuenta de OTRA persona exige la clave de servicio: se hará con la Edge Function
    // `manage-elder-account` (docs/SUPABASE_PLAN.md). Nunca desde la app.
    async createManagedAccount() {
      throw new AuthError('not_configured', e.notConfigured);
    },
    async resetManagedPassword() {
      throw new AuthError('not_configured', e.notConfigured);
    },
    async revokeManagedAccount() {
      throw new AuthError('not_configured', e.notConfigured);
    },
    async changeManagedEmail() {
      throw new AuthError('not_configured', e.notConfigured);
    },
    async managedAccount() {
      return null;
    },
  };
}
