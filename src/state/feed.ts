/**
 * Feed unificado de alertas y recomendaciones de BUDDY para el administrador (estado y acciones).
 * El cálculo es puro (src/domain/recommendations/engine.ts); aquí se leen los registros reales, las preferencias
 * (leído, silenciado) y los umbrales, y se ejecutan las acciones de las tarjetas por los casos de uso de siempre.
 */
import { useMemo } from 'react';

import { DEFAULT_THRESHOLDS, EMPTY_PREFS, buildFeed, itemVersion, unreadCount, visibleFeed, type FeedAction, type FeedItem, type FeedPrefs, type Thresholds } from '@/domain/recommendations/engine';
import { useNow } from '@/hooks/use-now';
import { verify, type Heartbeat } from '@/domain/verification';
import { db, useDb } from '@/infrastructure/local/db';
import { heartbeatKey } from '@/infrastructure/local/heartbeats';
import { toISODate } from '@/utils/dates';

import { activeElderId, routineActions } from './actions';
import { execute } from './assistant';
import { alertActions, doseActions, medicationActions } from './care';
import { useActiveElder, useRecords, useUserId } from './data';
import { markRecent } from './recent';
import { currentUserId } from './session';

const prefsKey = (elderId: string) => `feed.prefs.${elderId}`;
const thresholdsKey = (elderId: string) => `reco.thresholds.${elderId}`;
const EMPTY_THRESHOLDS = DEFAULT_THRESHOLDS;
const NO_BEATS: Heartbeat[] = [];

/** Feed calculado desde la base (sin hooks): lo usa el chat ("¿alguna recomendación hoy?"). */
export function computeFeed(now = new Date()): FeedItem[] {
  const userId = currentUserId();
  const elderId = activeElderId();
  const elder = elderId ? db.get('elders', elderId) : undefined;
  if (!elderId || !elder) return [];
  const list = <K extends Parameters<typeof db.list>[0]>(c: K) => db.list(c, userId, elderId);
  const items = buildFeed({
    now,
    elderName: elder.firstName,
    meds: list('medications'),
    doses: list('doses'),
    checkins: list('checkins'),
    water: list('water'),
    waterGoal: list('waterPlans')[0]?.glasses ?? null,
    meals: list('meals'),
    mealLogs: list('mealLogs'),
    activities: list('activities'),
    alerts: list('alerts'),
    appointments: list('appointments'),
    checkinTime: elder.checkinTime,
    since: toISODate(new Date(elder.createdAt)),
    thresholds: feedActions.thresholds(elderId),
    escalation: elder.screen,
    verification: verify({ heartbeats: db.draft<Heartbeat[]>(userId, heartbeatKey(elderId)) ?? [], now, elderName: elder.firstName, maxSilenceHours: elder.screen.silenceHours }),
  });
  return visibleFeed(items, feedActions.prefs(elderId), now);
}

/** Feed visible y novedades sin leer de la persona activa. Se recalcula al cambiar los datos o cada minuto. */
export function useFeed(): { items: FeedItem[]; unread: number; alarm: boolean; unreadItems: FeedItem[] } {
  const now = useNow(60_000);
  const userId = useUserId();
  const elder = useActiveElder();
  const meds = useRecords('medications');
  const doses = useRecords('doses');
  const checkins = useRecords('checkins');
  const water = useRecords('water');
  const plans = useRecords('waterPlans');
  const meals = useRecords('meals');
  const mealLogs = useRecords('mealLogs');
  const activities = useRecords('activities');
  const alerts = useRecords('alerts');
  const appointments = useRecords('appointments');
  const prefs = useDb((s) => (userId && elder ? (s.drafts[userId]?.[prefsKey(elder.id)] as FeedPrefs | undefined) : undefined)) ?? EMPTY_PREFS;
  const thresholds = useDb((s) => (userId && elder ? (s.drafts[userId]?.[thresholdsKey(elder.id)] as Thresholds | undefined) : undefined)) ?? EMPTY_THRESHOLDS;
  const beats = useDb((s) => (userId && elder ? (s.drafts[userId]?.[heartbeatKey(elder.id)] as Heartbeat[] | undefined) : undefined)) ?? NO_BEATS;
  return useMemo(() => {
    if (!elder?.setupDone) return { items: [], unread: 0, alarm: false, unreadItems: [] };
    const all = buildFeed({
      now,
      elderName: elder.firstName,
      meds,
      doses,
      checkins,
      water,
      waterGoal: plans[0]?.glasses ?? null,
      meals,
      mealLogs,
      activities,
      alerts,
      appointments,
      checkinTime: elder.checkinTime,
      since: toISODate(new Date(elder.createdAt)),
      thresholds,
      escalation: elder.screen,
      verification: verify({ heartbeats: beats, now, elderName: elder.firstName, maxSilenceHours: elder.screen.silenceHours }),
    });
    const items = visibleFeed(all, prefs, now);
    return { items, unread: unreadCount(items, prefs), alarm: items.some((f) => f.severity === 'alarm'), unreadItems: items.filter((f) => prefs.read[f.key] !== itemVersion(f)) };
  }, [now, elder, meds, doses, checkins, water, plans, meals, mealLogs, activities, alerts, appointments, prefs, thresholds, beats]);
}

export const feedActions = {
  prefs(elderId: string): FeedPrefs {
    return db.draft<FeedPrefs>(currentUserId(), prefsKey(elderId)) ?? EMPTY_PREFS;
  },
  savePrefs(elderId: string, prefs: FeedPrefs) {
    db.setDraft(currentUserId(), prefsKey(elderId), prefs);
  },
  /** Abrir el feed marca como leído lo que se ve. */
  markRead(items: FeedItem[]) {
    const elderId = activeElderId();
    if (!elderId) return;
    const p = feedActions.prefs(elderId);
    // Solo escribe si hay algo nuevo: escribir siempre recalcula el feed y volvería a marcar (bucle).
    if (items.every((f) => p.read[f.key] === itemVersion(f))) return;
    feedActions.savePrefs(elderId, { ...p, read: { ...p.read, ...Object.fromEntries(items.map((f) => [f.key, itemVersion(f)])) } });
  },
  /** Silenciar (días) o posponer (horas) una tarjeta. */
  mute(key: string, hours: number) {
    const elderId = activeElderId();
    if (!elderId) return;
    const p = feedActions.prefs(elderId);
    feedActions.savePrefs(elderId, { ...p, muted: { ...p.muted, [key]: new Date(Date.now() + hours * 3_600_000).toISOString() } });
  },
  thresholds(elderId: string): Thresholds {
    return db.draft<Thresholds>(currentUserId(), thresholdsKey(elderId)) ?? DEFAULT_THRESHOLDS;
  },
  setThresholds(elderId: string, t: Thresholds) {
    db.setDraft(currentUserId(), thresholdsKey(elderId), t);
  },
  /**
   * Ejecuta la acción de una tarjeta por el mismo camino que el resto de la app. Devuelve un texto de resultado o,
   * para "Llamar" y "Ver detalle", qué debe abrir la pantalla.
   */
  run(action: FeedAction): { done?: string; call?: string; open?: string } {
    const elderId = activeElderId();
    switch (action.type) {
      case 'confirm_dose':
        // Confirmación del cuidador ("ya confirmé por teléfono"): queda registrada como respuesta del cuidador.
        doseActions.confirm(action.doseId, 'caregiver');
        return { done: 'Listo, quedó confirmada por ti.' };
      case 'add_activity': {
        if (!elderId) return {};
        const a = routineActions.addActivity({ kind: action.kind, title: action.title, time: action.time, minutes: action.minutes }, elderId);
        markRecent([a.id]);
        return { done: `Listo, agregué "${action.title}" a su rutina.` };
      }
      case 'message': {
        const r = execute({ type: 'send_message', text: action.text });
        return { done: r.summary };
      }
      case 'attend_alert':
        alertActions.attend(action.alertId);
        return { done: 'Marcado como atendido.' };
      case 'open':
        return { open: action.href };
      case 'purchase': {
        const med = db.get('medications', action.medicationId);
        if (!med) return {};
        // Sin saber cuántas unidades trae la caja no se inventa: se abre el medicamento para registrarla.
        if (!med.unitsPerPackage) return { open: `/medication/${med.id}` };
        medicationActions.registerPurchase(med.id, { packages: 1 });
        return { done: `Listo, sumé 1 caja de ${med.name} (${med.unitsPerPackage} unidades). Si compraste otra cantidad, corrígelo en Rutina.` };
      }
      case 'call': {
        // Llamar al adulto mayor (su celular, si se registró). Sin teléfono, la pantalla indica dónde agregarlo.
        const phone = elderId ? db.get('elders', elderId)?.phone : undefined;
        return { call: phone ? phone.replace(/[^\d+]/g, '') : '' };
      }
      default:
        return {};
    }
  },
};

/** Fecha local de hoy (para claves diarias en pruebas y pantallas). */
export const todayKey = () => toISODate(new Date());
