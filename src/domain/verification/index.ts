/**
 * Detección de silencio (V3.0, principio "nunca falla en silencio"). PURO: recibe las señales de vida del celular del
 * adulto mayor y `now`, y decide si BUDDY puede verificar que el ciclo funciona.
 *
 * - Señales: apertura de la app, respuesta a un aviso, chequeo y estado del permiso de notificaciones.
 * - "No puedo verificar" si no hay señal en más de N horas (12 por defecto, lo define el administrador) o si los avisos
 *   están desactivados en ese celular. Es distinto de "sin confirmar" (una toma concreta) y NUNCA dice que está bien
 *   cuando no hay datos: sin ninguna señal, el estado es "sin datos".
 *
 * Entre dos celulares esto solo funciona con backend: hoy las señales se guardan en el mismo celular (se demuestra con
 * "Probar como"). `HeartbeatRepository` es el contrato que implementará el servidor.
 */
import type { Timestamp } from '../types';

export type HeartbeatKind = 'app_open' | 'answer' | 'checkin' | 'permissions';
/** Estado del permiso de notificaciones leído en el celular ('unsupported' = web, no se puede leer). */
export type NotificationPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export interface Heartbeat {
  at: Timestamp;
  kind: HeartbeatKind;
  /** Solo en `permissions` (y en `app_open` si se pudo leer). */
  notifications?: NotificationPermission;
}

/** Contrato de almacenamiento y envío de señales de vida. Local hoy; servidor en la fase de backend. */
export interface HeartbeatRepository {
  record(elderId: string, beat: Heartbeat): void;
  recent(elderId: string): Heartbeat[];
  /** Señales aún no enviadas al servidor (la fase de backend las sube y llama a `markSent`). */
  pending(elderId: string): Heartbeat[];
  markSent(elderId: string, upTo: Timestamp): void;
}

export const DEFAULT_SILENCE_HOURS = 12;

export type Verification =
  | { state: 'no_data' }
  | { state: 'ok'; lastAt: Timestamp }
  | { state: 'cannot_verify'; reason: 'silence' | 'notifications_off'; lastAt: Timestamp; text: string };

const clock = (d: Date) => {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "hoy a las 7:10 a. m.", "ayer a las 8 p. m.", "el lunes 12 a las 9 a. m.". */
export function sinceText(at: Date, now: Date): string {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000);
  const day = days <= 0 ? 'hoy' : days === 1 ? 'ayer' : `el ${DAYS[at.getDay()]} ${at.getDate()}`;
  return `${day} a las ${clock(at)}`;
}

export function verify(i: { heartbeats: Heartbeat[]; now: Date; elderName: string; maxSilenceHours?: number }): Verification {
  if (!i.heartbeats.length) return { state: 'no_data' };
  const sorted = [...i.heartbeats].sort((a, b) => a.at.localeCompare(b.at));
  const last = sorted[sorted.length - 1];
  const perm = [...sorted].reverse().find((b) => b.notifications)?.notifications;
  if (perm === 'denied' || perm === 'undetermined') {
    return { state: 'cannot_verify', reason: 'notifications_off', lastAt: last.at, text: `Las notificaciones están desactivadas en el celular de ${i.elderName}` };
  }
  const hours = i.maxSilenceHours ?? DEFAULT_SILENCE_HOURS;
  if (i.now.getTime() - Date.parse(last.at) > hours * 3_600_000) {
    return { state: 'cannot_verify', reason: 'silence', lastAt: last.at, text: `Sin señal desde ${sinceText(new Date(last.at), i.now)}` };
  }
  return { state: 'ok', lastAt: last.at };
}
