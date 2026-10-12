/**
 * Ubicación compartida (puro). Solo existe con el consentimiento del adulto mayor, en primer plano (la app abierta).
 * Nunca se inventa una ubicación: sin datos reales, el estado lo dice.
 */
import type { Elder, LocationFix } from './types';

/** Después de este tiempo la última ubicación se marca como desactualizada. */
export const STALE_MIN = 30;
/** Minimización: solo se conservan las últimas ubicaciones. */
export const KEEP_FIXES = 20;

export type LocationView =
  | { kind: 'not_shared'; reason: 'none' | 'denied' | 'revoked' }
  | { kind: 'requested'; since: string | null }
  | { kind: 'waiting' }
  | { kind: 'located'; last: LocationFix; minutesAgo: number; stale: boolean; history: LocationFix[] };

export function locationView(elder: Pick<Elder, 'locationConsent' | 'locationRequestedAt'>, fixes: LocationFix[], now: Date): LocationView {
  const consent = elder.locationConsent ?? 'none';
  if (consent === 'requested') return { kind: 'requested', since: elder.locationRequestedAt ?? null };
  if (consent !== 'granted') return { kind: 'not_shared', reason: consent };
  const sorted = [...fixes].sort((a, b) => b.at.localeCompare(a.at));
  if (!sorted.length) return { kind: 'waiting' };
  const minutesAgo = Math.max(0, Math.round((now.getTime() - new Date(sorted[0].at).getTime()) / 60_000));
  return { kind: 'located', last: sorted[0], minutesAgo, stale: minutesAgo > STALE_MIN, history: sorted.slice(1, 10) };
}
