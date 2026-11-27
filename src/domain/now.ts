/**
 * Qué ve el adulto mayor "Ahora": UNA pregunta o recordatorio a la vez, y lo que viene "Más tarde hoy".
 * Prioridad: aviso de existencias sin leer → medicamento (sin confirmar o en ≤ 60 min) → chequeo → comida →
 * actividad → agua → recordatorio → nada pendiente. Puro: todo recibe `now`.
 */
import { effectiveTime, isOpen, type DoseItem } from './schedule';
import { onDay, toMinutes } from './time';
import type { Activity, ActivityLog, Alert, Appointment, CheckinAnswer, ClockTime, Meal, MealLog, Reminder, WaterPlan } from './types';

export type ElderItem =
  | { kind: 'stock'; alert: Alert }
  | { kind: 'dose'; item: DoseItem }
  | { kind: 'checkin'; step: 'mood' | 'sleep' | 'unwell' }
  | { kind: 'meal'; meal: Meal }
  | { kind: 'activity'; activity: Activity }
  | { kind: 'water'; glasses: number; goal: number }
  | { kind: 'reminder'; reminder: Reminder }
  | { kind: 'appointment'; appointment: Appointment; when: 'tomorrow' | 'today' }
  | { kind: 'done' };

export interface ElderInput {
  now: Date;
  doses: DoseItem[];
  stockAlerts: Alert[];
  seenAlerts: string[];
  checkinTime: ClockTime | null;
  checkin: CheckinAnswer | null;
  meals: Meal[];
  mealLogs: MealLog[];
  activities: Activity[];
  activityLogs: ActivityLog[];
  water: WaterPlan | null;
  glassesToday: number;
  /** Hora del último vaso registrado hoy: un vaso responde el aviso de agua vigente. */
  lastGlassAt?: string | null;
  reminders: Reminder[];
  seenReminders: string[];
  /** Citas: se avisan el día anterior desde `apptNoticeTime` (18:00 por defecto) y el mismo día desde 3 h antes. */
  appointments?: Appointment[];
  apptNoticeTime?: ClockTime;
}

/** Clave de "Entendido" de una cita por aviso (día anterior / mismo día). */
export const appointmentSeenKey = (id: string, when: 'tomorrow' | 'today') => `appt-${id}-${when}`;

/**
 * Clave de "ya visto" de un recordatorio POR DÍA: un recordatorio diario debe volver a mostrarse mañana.
 * (Antes se guardaba solo el id y un recordatorio diario visto una vez no volvía a aparecer nunca.)
 */
export const reminderSeenKey = (id: string, date: string) => `${id}@${date}`;

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const SOON_MIN = 60;
/** Ventana para preguntar por una comida o actividad después de su hora. */
const ASK_WINDOW_MIN = 180;

export function elderNow(i: ElderInput): { now: ElderItem; later: { time: ClockTime; label: string; kind: ElderItem['kind'] }[] } {
  const nowMin = i.now.getHours() * 60 + i.now.getMinutes();
  const due = (time: ClockTime, window = ASK_WINDOW_MIN) => nowMin >= toMinutes(time) && nowMin - toMinutes(time) <= window;

  const queue: ElderItem[] = [];
  for (const a of i.stockAlerts) if (!i.seenAlerts.includes(a.id)) queue.push({ kind: 'stock', alert: a });

  const open = i.doses.filter((d) => isOpen(d.status));
  const dose = open.find((d) => d.status === 'unconfirmed') ?? open.find((d) => toMinutes(effectiveTime(d.dose)) - nowMin <= SOON_MIN);
  if (dose) queue.push({ kind: 'dose', item: dose });

  // Citas después de los medicamentos: un aviso de cita no tapa una toma.
  const todayIso = localDate(i.now);
  const tomorrowIso = localDate(new Date(i.now.getFullYear(), i.now.getMonth(), i.now.getDate() + 1));
  for (const ap of i.appointments ?? []) {
    if (ap.date === tomorrowIso && nowMin >= toMinutes(i.apptNoticeTime ?? '18:00') && !i.seenReminders.includes(appointmentSeenKey(ap.id, 'tomorrow'))) {
      queue.push({ kind: 'appointment', appointment: ap, when: 'tomorrow' });
    }
    if (ap.date === todayIso && nowMin >= toMinutes(ap.time) - 180 && nowMin <= toMinutes(ap.time) && !i.seenReminders.includes(appointmentSeenKey(ap.id, 'today'))) {
      queue.push({ kind: 'appointment', appointment: ap, when: 'today' });
    }
  }


  if (i.checkinTime && nowMin >= toMinutes(i.checkinTime)) {
    const c = i.checkin;
    if (!c || c.mood === null) queue.push({ kind: 'checkin', step: 'mood' });
    else if (c.sleep === null) queue.push({ kind: 'checkin', step: 'sleep' });
    else if (c.unwell === null) queue.push({ kind: 'checkin', step: 'unwell' });
  }

  for (const m of i.meals) if (due(m.time) && !i.mealLogs.some((l) => l.mealId === m.id && l.answer === 'yes')) queue.push({ kind: 'meal', meal: m });
  for (const a of i.activities) {
    if (onDay(a.days, i.now) && due(a.time) && !i.activityLogs.some((l) => l.activityId === a.id && l.done)) queue.push({ kind: 'activity', activity: a });
  }

  // Agua: un aviso por hora programada. Se responde con UN vaso tomado desde esa hora (antes se exigía ponerse al
  // día con todos los vasos atrasados y el aviso no se iba hasta registrar hasta 8 seguidos).
  if (i.water && i.glassesToday < i.water.glasses) {
    const lastDue = i.water.times.map(toMinutes).filter((m) => m <= nowMin).sort((a, b) => b - a)[0];
    const last = i.lastGlassAt ? new Date(i.lastGlassAt) : null;
    const answered = last && localDate(last) === localDate(i.now) && last.getHours() * 60 + last.getMinutes() >= (lastDue ?? 0);
    if (lastDue !== undefined && !answered) queue.push({ kind: 'water', glasses: i.glassesToday, goal: i.water.glasses });
  }

  const today = localDate(i.now);
  for (const r of i.reminders) {
    // Automatización apagada o solo para el cuidador ("Avisar si no toma…"): no es una pregunta para el adulto mayor.
    if (r.automation && (!r.automation.enabled || r.automation.kind === 'medication_alert')) continue;
    const applies = r.date ? r.date === today : onDay(r.days, i.now);
    if (applies && due(r.time, 120) && !i.seenReminders.includes(reminderSeenKey(r.id, today))) queue.push({ kind: 'reminder', reminder: r });
  }

  const later: { time: ClockTime; label: string; kind: ElderItem['kind'] }[] = [];
  for (const d of open) if (d !== dose && toMinutes(effectiveTime(d.dose)) > nowMin) later.push({ time: effectiveTime(d.dose), label: d.medication.name, kind: 'dose' });
  for (const m of i.meals) if (toMinutes(m.time) > nowMin) later.push({ time: m.time, label: m.kind, kind: 'meal' });
  for (const a of i.activities) if (onDay(a.days, i.now) && toMinutes(a.time) > nowMin) later.push({ time: a.time, label: a.title, kind: 'activity' });
  if (i.checkinTime && toMinutes(i.checkinTime) > nowMin) later.push({ time: i.checkinTime, label: 'checkin', kind: 'checkin' });
  later.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

  return { now: queue[0] ?? { kind: 'done' }, later };
}
