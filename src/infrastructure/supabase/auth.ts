/**
 * SupabaseAuthProvider: misma interfaz que el proveedor local, contra Supabase Auth.
 * IMPLEMENTADO PERO NO PROBADO contra un proyecto real (no hay proyecto en esta fase). Se activa con
 * EXPO_PUBLIC_AUTH_PROVIDER=supabase y las claves del .env. Si faltan, cada método lanza "not_configured".
 * Eliminar cuenta requiere la Edge Function `delete-account` (docs/SUPABASE_PLAN.md): el cliente no puede borrar
 * usuarios de auth sin la clave de servicio.
 */
import { AuthError, type AuthService, type AuthUser } from '@/domain/auth';
import { isAcceptablePassword, isValidEmail, normalizeEmail } from '@/domain/validation';
import { strings } from '@/i18n';

import { getSupabase, supabaseConfigured } from './client';

const e = strings.auth.errors;

type SbUser = { id: string; email?: string; created_at: string; user_metadata?: { name?: string } };

const toUser = (u: SbUser): AuthUser => ({ id: u.id, email: u.email ?? '', name: u.user_metadata?.name ?? '', createdAt: u.created_at });

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
      return toUser(data.user as SbUser);
    },

    async signIn({ email, password }) {
      const { data, error } = await guard().auth.signInWithPassword({ email: normalizeEmail(email), password });
      if (error || !data.user) mapError(error);
      return toUser(data.user as SbUser);
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
  };
}
