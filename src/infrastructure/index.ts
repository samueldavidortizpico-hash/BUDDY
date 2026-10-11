/**
 * Elige las implementaciones según el entorno (.env):
 *  - EXPO_PUBLIC_AUTH_PROVIDER = local | supabase   (por defecto local)
 *  - EXPO_PUBLIC_DATA_SOURCE   = local | supabase   (por defecto local; con supabase, local primero + sincronización)
 */
import type { AuthService } from '@/domain/auth';

import { createLocalAuthProvider } from './local/auth';
import { createSupabaseAuthProvider } from './supabase/auth';
import { syncAccount } from './supabase/sync';

export const AUTH_PROVIDER = process.env.EXPO_PUBLIC_AUTH_PROVIDER === 'supabase' ? 'supabase' : 'local';
export const DATA_SOURCE = process.env.EXPO_PUBLIC_DATA_SOURCE === 'supabase' ? 'supabase' : 'local';

let auth: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!auth) auth = AUTH_PROVIDER === 'supabase' ? createSupabaseAuthProvider() : createLocalAuthProvider();
  return auth;
}

/** Sincroniza la cuenta si la fuente de datos es Supabase; en local no hace nada. */
export async function syncIfRemote(userId: string) {
  if (DATA_SOURCE !== 'supabase') return { pushed: 0, pulled: 0 };
  return syncAccount(userId);
}
