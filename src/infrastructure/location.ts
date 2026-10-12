/**
 * Adaptador de expo-location (solo PRIMER PLANO: la app abierta). El permiso del sistema se pide en contexto, justo
 * después de que el adulto mayor acepta compartir su ubicación, nunca al abrir la app. Funciona en Expo Go.
 * Segundo plano y zonas seguras: Fase 5 (build instalable), docs/ROADMAP.md.
 */
import * as Location from 'expo-location';

export type FixResult = { ok: true; lat: number; lng: number; accuracy: number | null } | { ok: false; reason: 'denied' | 'unavailable' };

export async function currentFix(ask: boolean): Promise<FixResult> {
  try {
    const perm = ask ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'denied' };
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { ok: true, lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy ?? null };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
