/**
 * Adaptador de expo-notifications para el NotificationScheduler. Solo notificaciones LOCALES (las programa el propio
 * teléfono): funcionan en Expo Go en iOS y Android. Las notificaciones remotas (push) y los avisos en el celular de otra
 * persona requieren servidor y build instalable (Fases 2 y 3, docs/NOTIFICACIONES.md). En web no hay soporte: no-op.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { planSignature, type PlannedNotification } from '@/domain/notifications';

const CHANNEL = 'recordatorios';
const SUMMARY_ID = 'admin-daily-summary';
export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

let handlerSet = false;
let lastSignature = '';
// Una sola cola para aplicar, cancelar y limpiar: un plan anterior nunca termina después del siguiente.
let scheduling: Promise<unknown> = Promise.resolve();
function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const result = scheduling.then(work);
  scheduling = result.catch(() => undefined);
  return result;
}

function ensureHandler() {
  if (handlerSet || !notificationsSupported) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  // En Android 13+ el permiso no se pide hasta que exista al menos un canal.
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Recordatorios de BUDDY', importance: AndroidImportance.HIGH });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function notificationPermission(ask: boolean): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  ensureHandler();
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || !ask) return current.granted ? 'granted' : current.canAskAgain ? 'undetermined' : 'denied';
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted ? 'granted' : asked.canAskAgain ? 'undetermined' : 'denied';
}

function toTrigger(t: PlannedNotification['trigger']): Notifications.NotificationTriggerInput {
  switch (t.type) {
    case 'daily':
      return { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: t.hour, minute: t.minute, channelId: CHANNEL };
    case 'weekly':
      return { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: t.weekday, hour: t.hour, minute: t.minute, channelId: CHANNEL };
    default:
      return { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(t.date), channelId: CHANNEL };
  }
}

/**
 * Reemplaza los avisos programados por el plan nuevo (solo si cambió). No pide permiso: si no lo hay, no programa y
 * devuelve 'denied'/'undetermined' para que la pantalla lo explique.
 */
export function applyPlan(plan: PlannedNotification[]): Promise<{ state: PermissionState; scheduled: number }> {
  const snapshot = plan.map(n => ({ ...n, trigger: { ...n.trigger } }));
  return exclusive(() => replacePlan(snapshot));
}

async function replacePlan(plan: PlannedNotification[]): Promise<{ state: PermissionState; scheduled: number }> {
  const state = await notificationPermission(false);
  if (state !== 'granted') return { state, scheduled: 0 };
  const sig = planSignature(plan);
  if (sig === lastSignature) return { state, scheduled: plan.length };
  // Se cancelan solo los avisos del adulto mayor: el resumen diario del administrador (mismo celular en la demo) se queda.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  // Si falla a mitad de camino, un reintento debe reconstruir el plan completo.
  lastSignature = '';
  await Promise.all(scheduled.filter((n) => n.identifier !== SUMMARY_ID).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({ identifier: n.key, content: { title: n.title, body: n.body, sound: true }, trigger: toTrigger(n.trigger) });
  }
  lastSignature = sig;
  return { state, scheduled: plan.length };
}

/** Notificación de prueba en 5 s, para ver cómo le llega al adulto mayor (pide permiso en contexto). */
export async function sendTestNotification(elderName: string): Promise<PermissionState> {
  const state = await notificationPermission(true);
  if (state !== 'granted') return state;
  await Notifications.scheduleNotificationAsync({
    content: { title: `Hola, ${elderName}`, body: 'Así te llegarán los recordatorios de BUDDY.', sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL },
  });
  return state;
}

/** Al cerrar sesión o salir de la pantalla del adulto mayor en un teléfono que no es suyo. */
export function clearScheduled() {
  return exclusive(async () => {
    if (!notificationsSupported) return;
    lastSignature = '';
    await Notifications.cancelAllScheduledNotificationsAsync();
  });
}

/** Cancela T y T+N aunque la pantalla que aplica el plan no esté montada. */
export function cancelDoseNotifications(medicationId: string, date?: string, time?: string): Promise<void> {
  return exclusive(async () => {
    if (!notificationsSupported) return;
    lastSignature = '';
    const prefix = date && time ? `med-${medicationId}-${date}-${time}` : `med-${medicationId}-`;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if ((date && time ? n.identifier === prefix || n.identifier === `${prefix}-r` : n.identifier.startsWith(prefix)) || (!date && n.identifier === `stock-${medicationId}`)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  });
}

/**
 * Resumen diario del administrador (V3.0): una notificación local hoy a la hora elegida con el resumen calculado AHORA
 * (el texto dice hasta qué hora son los datos). Se reemplaza cada vez que cambian los datos con la app abierta. Sin texto
 * (sin registros reales) o con la hora ya pasada, no se programa. No pide permiso.
 */
export async function scheduleDailySummary(text: string | null, when: Date | null): Promise<PermissionState> {
  const state = await notificationPermission(false);
  if (state !== 'granted') return state;
  await Notifications.cancelScheduledNotificationAsync(SUMMARY_ID).catch(() => undefined);
  if (!text || !when || when.getTime() <= Date.now()) return state;
  await Notifications.scheduleNotificationAsync({
    identifier: SUMMARY_ID,
    content: { title: 'Resumen de hoy en BUDDY', body: text, sound: false },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
  });
  return state;
}
