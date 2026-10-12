/**
 * Motor de recomendaciones y alertas de BUDDY para el administrador. PURO: recibe registros REALES y `now`, devuelve
 * el feed unificado. Nunca inventa datos ni diagnostica: describe lo que se registró ("lleva 3 días diciendo que se
 * siente mal") y sugiere acciones humanas (llamar, escribir, consultar). Los umbrales los define el cuidador o el
 * médico (Ajustes); los valores por defecto son solo un punto de partida.
 *
 * - Alertas: algo que requiere acción ahora (sin confirmar, pidió ayuda, existencias, coincidencia con alergia, cita).
 * - Recomendaciones: observaciones y patrones (ánimo, sueño, adherencia, agua, comidas, chequeo) y mensajes positivos.
 * Severidades: info, atención y señal de alarma. Nunca "emergencia"; el rojo solo para "pidió ayuda".
 * Una tarjeta por patrón (clave estable) con contador; la escalada cambia la severidad, no duplica tarjetas.
 */
import { addDays, lastDays } from '@/utils/dates';

import { displayStatus, effectiveTime } from '../schedule';
import { estimateStock } from '../stock';
import type { Activity, Alert, Appointment, CheckinAnswer, DoseEvent, ISODate, Meal, MealLog, Medication, WaterEntry } from '../types';

export type Severity = 'info' | 'attention' | 'alarm';
export type FeedKind = 'alert' | 'recommendation';

export type FeedAction =
  | { type: 'call' }
  | { type: 'confirm_dose'; doseId: string }
  | { type: 'add_activity'; kind: 'walk' | 'stretch' | 'air' | 'breath' | 'music' | 'call'; title: string; time: string; minutes: number }
  | { type: 'message'; text: string }
  | { type: 'open'; href: string }
  | { type: 'attend_alert'; alertId: string };

export interface FeedItem {
  /** Clave estable del patrón (una tarjeta por patrón). */
  key: string;
  kind: FeedKind;
  severity: Severity;
  /** true solo para "pidió ayuda" (único caso en rojo). */
  help?: boolean;
  /** Mensaje positivo (todo va bien). */
  positive?: boolean;
  title: string;
  /** Por qué aparece (regla y datos). */
  reason: string;
  /** Datos de apoyo (fechas, valores registrados). */
  support: string[];
  at: string;
  /** Días o veces que se repite el patrón. */
  count: number;
  /** Vence (deja de mostrarse) en esta fecha-hora. */
  expiresAt: string | null;
  actions: FeedAction[];
}

/** Umbrales definidos por el cuidador o el médico (Ajustes > Mis avisos). */
export interface Thresholds {
  moodDays: [attention: number, strong: number, alarm: number];
  sleepDays: [attention: number, alarm: number, consult: number];
  /** Adherencia semanal mínima (0–1). */
  adherence: number;
  waterDays: number;
  checkinDays: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  moodDays: [3, 7, 14],
  sleepDays: [3, 7, 14],
  adherence: 0.8,
  waterDays: 2,
  checkinDays: 2,
};

export interface RecoInput {
  now: Date;
  elderName: string;
  meds: Medication[];
  doses: DoseEvent[];
  checkins: CheckinAnswer[];
  water: WaterEntry[];
  waterGoal: number | null;
  meals: Meal[];
  mealLogs: MealLog[];
  activities: Activity[];
  alerts: Alert[];
  appointments: (Appointment & { questions?: string[]; address?: string })[];
  checkinTime: string | null;
  /** Desde cuándo hay registro de esta persona (no se reclaman días anteriores). */
  since: ISODate;
  thresholds?: Thresholds;
}

const RANK: Record<Severity, number> = { alarm: 0, attention: 1, info: 2 };
const CONSULT_MOOD = 'Por mayor seguridad, consulta con un médico o un profesional de salud mental.';
const CONSULT = 'Por mayor seguridad, consulta con un médico.';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const clock = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};
const endOfDay = (d: ISODate) => `${d}T23:59:59`;
const minutesOf = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Racha de días con una respuesta "mala" contando hacia atrás desde hoy. Una respuesta distinta corta la racha;
 * los días sin responder no cuentan ni la cortan, pero 3 seguidos sin responder la terminan.
 * La respuesta más reciente debe ser de hoy o de ayer (si no, no hay patrón actual).
 */
export function badStreak(checkins: CheckinAnswer[], field: 'mood' | 'sleep', today: ISODate): { days: number; dates: ISODate[] } {
  const by = new Map(checkins.filter((c) => c[field]).map((c) => [c.date, c[field]!]));
  const dates: ISODate[] = [];
  let gap = 0;
  for (let i = 0; i < 90; i++) {
    const d = addDays(today, -i);
    const v = by.get(d);
    if (!v) {
      if (i < 2 && !dates.length) continue; // hoy/ayer aún sin responder
      if (++gap >= 3) break;
      continue;
    }
    gap = 0;
    if (v !== 'bad') break;
    dates.push(d);
  }
  const fresh = dates.length && (dates[0] === today || dates[0] === addDays(today, -1));
  return fresh ? { days: dates.length, dates } : { days: 0, dates: [] };
}

export function buildFeed(i: RecoInput): FeedItem[] {
  const th = i.thresholds ?? DEFAULT_THRESHOLDS;
  const now = i.now;
  const today = iso(now);
  const nowIso = now.toISOString();
  const name = i.elderName;
  const out: FeedItem[] = [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const medsById = new Map(i.meds.map((m) => [m.id, m]));

  // ── Alertas ────────────────────────────────────────────────
  for (const a of i.alerts.filter((x) => x.status === 'pending' && (!x.snoozedUntil || Date.parse(x.snoozedUntil) < now.getTime()))) {
    if (a.kind === 'dose_unconfirmed' || a.kind === 'stock_low' || a.kind === 'stock_out') continue; // se calculan abajo con datos frescos
    const help = a.kind === 'help_requested';
    out.push({
      key: `alert-${a.id}`,
      kind: 'alert',
      severity: help ? 'alarm' : 'attention',
      help,
      title: a.title,
      reason: a.detail,
      support: [],
      at: a.createdAt,
      count: 1,
      expiresAt: null,
      actions: [{ type: 'call' }, { type: 'attend_alert', alertId: a.id }],
    });
  }

  // Tomas sin confirmar hoy (una tarjeta por toma). "Sin confirmar" no significa "no la tomó".
  for (const d of i.doses.filter((x) => x.date === today)) {
    const med = medsById.get(d.medicationId);
    if (!med || med.paused || displayStatus(d, now) !== 'unconfirmed') continue;
    out.push({
      key: `dose-${d.id}`,
      kind: 'alert',
      severity: 'attention',
      title: `${name} no ha confirmado ${med.name} de las ${clock(effectiveTime(d))}`,
      reason: 'Pasó más de una hora desde la toma y no hay respuesta. Puede que la haya tomado y no lo marcó.',
      support: [`${med.name}: ${clock(effectiveTime(d))}`],
      at: nowIso,
      count: 1,
      expiresAt: endOfDay(today),
      actions: [{ type: 'call' }, { type: 'confirm_dose', doseId: d.id }],
    });
  }

  // Existencias.
  for (const m of i.meds) {
    const e = estimateStock(m, today);
    if (e.level !== 'low' && e.level !== 'out') continue;
    out.push({
      key: `stock-${m.id}`,
      kind: 'alert',
      severity: e.level === 'out' ? 'attention' : 'info',
      title: e.level === 'out' ? `${m.name}: no quedan unidades registradas` : `Se está acabando ${m.name}`,
      reason: e.level === 'out' ? 'Las existencias registradas llegaron a cero.' : `Alcanza para unos ${e.daysLeft} días (estimado).`,
      support: [`Quedan ${m.unitsOnHand ?? 0} (estimado)`],
      at: nowIso,
      count: 1,
      expiresAt: null,
      actions: [{ type: 'open', href: `/medication/${m.id}` }],
    });
  }

  // Cita mañana.
  const tomorrow = addDays(today, 1);
  for (const ap of i.appointments.filter((x) => x.date === tomorrow)) {
    const where = ap.address || ap.place;
    const noQuestions = !ap.questions?.length;
    out.push({
      key: `appt-${ap.id}`,
      kind: 'alert',
      severity: 'info',
      title: `${ap.title} mañana a las ${clock(ap.time)}${where ? ` en ${where}` : ''}`,
      reason: noQuestions ? '¿Preparamos las preguntas para llevar a la cita?' : 'Recuérdale llevar sus medicamentos y las preguntas preparadas.',
      support: where ? [where] : [],
      at: nowIso,
      count: 1,
      expiresAt: endOfDay(tomorrow),
      actions: [{ type: 'open', href: '/routine/appointments' }],
    });
  }

  // ── Recomendaciones (patrones con escalada) ───────────────
  const mood = badStreak(i.checkins, 'mood', today);
  if (mood.days >= th.moodDays[0]) {
    const [, strong, alarm] = th.moodDays;
    const sev: Severity = mood.days >= alarm ? 'alarm' : 'attention';
    const span = mood.days >= 14 ? 'dos semanas o más' : mood.days >= 7 ? 'una semana o más' : plural(mood.days, 'día', 'días');
    out.push({
      key: 'mood-low',
      kind: 'recommendation',
      severity: sev,
      title: `${name} lleva ${span} diciendo que se siente mal`,
      reason:
        mood.days >= alarm
          ? `Lo respondió en el chequeo diario durante ${mood.days} días. ${CONSULT_MOOD}`
          : mood.days >= strong
            ? `Lo respondió durante ${mood.days} días. Una llamada o una visita pueden ayudar; si sigue igual, consulta con un profesional.`
            : `Lo respondió en el chequeo diario ${plural(mood.days, 'día', 'días')} seguidos. Llama para saber cómo está.`,
      support: mood.dates.slice(0, 7),
      at: nowIso,
      count: mood.days,
      expiresAt: null,
      actions: [{ type: 'call' }, { type: 'message', text: 'Pienso en ti. ¿Hablamos hoy un ratico?' }],
    });
  }

  const sleep = badStreak(i.checkins, 'sleep', today);
  if (sleep.days >= th.sleepDays[0]) {
    const [, alarm, consult] = th.sleepDays;
    out.push({
      key: 'sleep-bad',
      kind: 'recommendation',
      severity: sleep.days >= alarm ? 'alarm' : 'attention',
      title: `${name} dijo que durmió mal ${plural(sleep.days, 'noche', 'noches')}`,
      reason:
        sleep.days >= consult
          ? `Lleva ${sleep.days} noches respondiendo que durmió mal. ${CONSULT}`
          : sleep.days >= alarm
            ? `Lleva ${sleep.days} noches así. Pregúntale cómo está descansando; si sigue igual, consulta con un médico.`
            : 'Respuestas del chequeo diario. Pregúntale cómo está descansando.',
      support: sleep.dates.slice(0, 7),
      at: nowIso,
      count: sleep.days,
      expiresAt: null,
      actions: [{ type: 'call' }],
    });
  }

  // Adherencia de los últimos 7 días completos.
  const week = lastDays(addDays(today, -1), 7).filter((d) => d >= i.since);
  const weekDoses = i.doses.filter((d) => week.includes(d.date) && medsById.has(d.medicationId));
  const due = weekDoses.length;
  const taken = weekDoses.filter((d) => d.status === 'taken').length;
  if (due >= 4 && taken / due < th.adherence) {
    out.push({
      key: 'adherence-week',
      kind: 'recommendation',
      severity: 'attention',
      title: `Esta semana ${name} confirmó ${taken} de ${due} tomas`,
      reason: `Menos del ${Math.round(th.adherence * 100)} % que definiste. Pregúntale si necesita ayuda con los horarios; no cambies dosis sin el médico.`,
      support: [],
      at: nowIso,
      count: due - taken,
      expiresAt: null,
      actions: [{ type: 'call' }, { type: 'open', href: '/health' }],
    });
  } else if (due >= 7 && taken === due) {
    out.push({
      key: 'adherence-perfect',
      kind: 'recommendation',
      severity: 'info',
      positive: true,
      title: `${name} confirmó todas sus tomas esta semana`,
      reason: '¿Quieres enviarle un mensaje de ánimo?',
      support: [`${taken} de ${due} tomas`],
      at: nowIso,
      count: taken,
      expiresAt: null,
      actions: [{ type: 'message', text: '¡Qué bien lo hiciste esta semana! Me alegra mucho.' }],
    });
  }

  // Agua por debajo de la meta N días seguidos (días completos).
  if (i.waterGoal) {
    const days = Array.from({ length: th.waterDays }, (_, k) => addDays(today, -(k + 1))).filter((d) => d >= i.since);
    const counts = days.map((d) => i.water.filter((w) => w.date === d).length);
    if (days.length === th.waterDays && counts.every((c) => c < i.waterGoal!)) {
      out.push({
        key: 'water-low',
        kind: 'recommendation',
        severity: 'info',
        title: `${name} tomó menos agua de su meta ${plural(th.waterDays, 'día', 'días')} seguidos`,
        reason: `Meta: ${i.waterGoal} vasos. Un recordatorio más o un vaso a la vista pueden ayudar.`,
        support: days.map((d, k) => `${d}: ${counts[k]} vasos`),
        at: nowIso,
        count: th.waterDays,
        expiresAt: endOfDay(today),
        actions: [{ type: 'open', href: '/routine/water' }],
      });
    }
  }

  // Comidas de hoy sin confirmar (pasadas 3 h de su hora).
  const pendingMeals = i.meals.filter((m) => nowMin - minutesOf(m.time) > 180 && !i.mealLogs.some((l) => l.mealId === m.id && l.date === today));
  if (pendingMeals.length) {
    out.push({
      key: `meals-${today}`,
      kind: 'recommendation',
      severity: 'info',
      title: `${name} no ha confirmado ${pendingMeals.length === 1 ? 'una comida' : `${pendingMeals.length} comidas`} de hoy`,
      reason: 'Puede que haya comido y no lo marcó. Pregúntale con calma.',
      support: pendingMeals.map((m) => clock(m.time)),
      at: nowIso,
      count: pendingMeals.length,
      expiresAt: endOfDay(today),
      actions: [{ type: 'call' }],
    });
  }

  // Chequeo sin responder N días.
  if (i.checkinTime) {
    const days = Array.from({ length: th.checkinDays }, (_, k) => addDays(today, -(k + 1))).filter((d) => d >= i.since);
    if (days.length === th.checkinDays && days.every((d) => !i.checkins.some((c) => c.date === d && (c.mood || c.sleep)))) {
      out.push({
        key: 'checkin-missing',
        kind: 'recommendation',
        severity: 'attention',
        title: `${name} no ha respondido el chequeo en ${plural(th.checkinDays, 'día', 'días')}`,
        reason: 'Llama para saber cómo está. Si el teléfono no le muestra las preguntas, revisa la hora del chequeo.',
        support: days,
        at: nowIso,
        count: th.checkinDays,
        expiresAt: null,
        actions: [{ type: 'call' }],
      });
    }
  }

  // Sugerencia de actividad si no hay ninguna.
  if (!i.activities.length) {
    out.push({
      key: 'suggest-walk',
      kind: 'recommendation',
      severity: 'info',
      title: 'Una caminata corta puede acompañar su día',
      reason: 'No tiene actividades en su rutina. Puedes agregar una con un toque (idea general de bienestar, no un consejo médico).',
      support: [],
      at: nowIso,
      count: 1,
      expiresAt: null,
      actions: [{ type: 'add_activity', kind: 'walk', title: 'Caminar 15 minutos', time: '17:00', minutes: 15 }],
    });
  }

  // Con todo en orden: tarjetas informativas útiles (nunca un panel vacío).
  if (!out.some((x) => x.severity !== 'info' || x.kind === 'alert')) {
    const next = i.doses
      .filter((d) => d.date === today && medsById.has(d.medicationId) && (d.status === 'pending' || d.status === 'snoozed') && minutesOf(effectiveTime(d)) >= nowMin)
      .sort((a, b) => minutesOf(effectiveTime(a)) - minutesOf(effectiveTime(b)))[0];
    out.push({
      key: `ok-${today}`,
      kind: 'recommendation',
      severity: 'info',
      positive: true,
      title: 'Hoy va según lo programado',
      reason: next ? `Próxima toma: ${medsById.get(next.medicationId)!.name} a las ${clock(effectiveTime(next))}` : 'No hay nada pendiente por ahora. BUDDY sigue pendiente.',
      support: [],
      at: nowIso,
      count: 1,
      expiresAt: endOfDay(today),
      actions: [{ type: 'message', text: 'Hola, solo quería saludarte. ¡Que tengas un lindo día!' }],
    });
  }

  return out.sort((a, b) => RANK[a.severity] - RANK[b.severity] || Number(b.kind === 'alert') - Number(a.kind === 'alert') || b.at.localeCompare(a.at));
}

/** Versión de una tarjeta: si el patrón escala (más días o más severidad) vuelve a contar como novedad. */
export const itemVersion = (f: FeedItem) => `${f.key}:${f.severity}:${f.count}`;

export interface FeedPrefs {
  /** Última versión leída por clave. */
  read: Record<string, string>;
  /** Silenciada hasta (ISO) por clave. */
  muted: Record<string, string>;
}

export const EMPTY_PREFS: FeedPrefs = { read: {}, muted: {} };

/** Visible: no vencida y no silenciada. */
export function visibleFeed(items: FeedItem[], prefs: FeedPrefs, now: Date): FeedItem[] {
  return items.filter((f) => (!f.expiresAt || Date.parse(f.expiresAt) >= now.getTime()) && !(prefs.muted[f.key] && Date.parse(prefs.muted[f.key]) > now.getTime()));
}

export function unreadCount(items: FeedItem[], prefs: FeedPrefs): number {
  return items.filter((f) => !f.positive && prefs.read[f.key] !== itemVersion(f)).length;
}

