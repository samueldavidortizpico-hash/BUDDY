/**
 * Adaptador de expo-notifications para el NotificationScheduler. Solo notificaciones LOCALES (las programa el propio
 * teléfono): funcionan en Expo Go en iOS y Android. Las notificaciones remotas (push) y los avisos en el celular de otra
 * persona requieren servidor y build instalable (Fases 2 y 3, docs/NOTIFICACIONES.md). En web no hay soporte: no-op.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { planSignature, type PlannedNotification } from '@/domain/notifications';

const CHANNEL = 'recordatorios';
export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

let handlerSet = false;
let lastSignature = '';

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
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Recordatorios de BUDDY', importance: Notifications.AndroidImportance.HIGH });
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
export async function applyPlan(plan: PlannedNotification[]): Promise<{ state: PermissionState; scheduled: number }> {
  const state = await notificationPermission(false);
  if (state !== 'granted') return { state, scheduled: 0 };
  const sig = planSignature(plan);
  if (sig === lastSignature) return { state, scheduled: plan.length };
  await Notifications.cancelAllScheduledNotificationsAsync();
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
export async function clearScheduled() {
  if (!notificationsSupported) return;
  lastSignature = '';
  await Notifications.cancelAllScheduledNotificationsAsync();
}
