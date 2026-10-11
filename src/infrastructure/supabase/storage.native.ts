/** Android/iOS: localStorage persistente sobre SQLite, como recomienda la guía de Supabase de Expo. */
import 'expo-sqlite/localStorage/install';

export const sessionStorage = globalThis.localStorage;
