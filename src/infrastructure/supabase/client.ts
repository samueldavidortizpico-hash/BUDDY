/**
 * Cliente de Supabase (guía oficial de Expo: https://docs.expo.dev/guides/using-supabase/).
 * Solo se crea si existen EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY (ver .env.example).
 * NUNCA uses aquí la clave "service_role": esa clave salta las políticas RLS y no puede ir en una app.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = url.startsWith('https://') && anonKey.length > 20;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseConfigured) throw new Error('Supabase no está configurado: define EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  if (!client) {
    // El almacenamiento de sesión (expo-sqlite en el teléfono) solo se carga cuando Supabase está configurado.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sessionStorage } = require('./storage') as typeof import('./storage');
    client = createClient(url, anonKey, {
      auth: { storage: sessionStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: Platform.OS === 'web' },
    });
    // La renovación del token corre solo con la app en primer plano.
    if (Platform.OS !== 'web') {
      AppState.addEventListener('change', (state) => {
        if (state === 'active') client?.auth.startAutoRefresh();
        else client?.auth.stopAutoRefresh();
      });
    }
  }
  return client;
}
