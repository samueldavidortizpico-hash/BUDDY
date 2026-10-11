/**
 * Qué ve el adulto mayor "Ahora": UNA pregunta o recordatorio a la vez, y lo que viene "Más tarde hoy".
 * Prioridad: aviso de existencias sin leer → medicamento (sin confirmar o en ≤ 60 min) → chequeo → comida →
 * actividad → agua → recordatorio → nada pendiente. Puro: todo recibe `now`.
 */
import { effectiveTime, isOpen, type DoseItem } from './schedule';
import { onDay, toMinutes } from './time';
import type { Activity, ActivityLog, Alert, CheckinAnswer, ClockTime, Meal, MealLog, Reminder, WaterPlan } from './types';

export type ElderItem =
  | { kind: 'stock'; alert: Alert }
  | { kind: 'dose'; item: DoseItem }
  | { kind: 'checkin'; step: 'mood' | 'sleep' | 'unwell' }
  | { kind: 'meal'; meal: Meal }
  | { kind: 'activity'; activity: Activity }
  | { kind: 'water'; glasses: number; goal: number }
  | { kind: 'reminder'; reminder: Reminder }
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
  reminders: Reminder[];
  seenReminders: string[];
}

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

  if (i.water) {
    const shouldHave = i.water.times.filter((t) => toMinutes(t) <= nowMin).length;
    if (i.glassesToday < Math.min(shouldHave, i.water.glasses)) queue.push({ kind: 'water', glasses: i.glassesToday, goal: i.water.glasses });
  }

  for (const r of i.reminders) if (onDay(r.days, i.now) && due(r.time, 120) && !i.seenReminders.includes(r.id)) queue.push({ kind: 'reminder', reminder: r });

  const later: { time: ClockTime; label: string; kind: ElderItem['kind'] }[] = [];
  for (const d of open) if (d !== dose && toMinutes(effectiveTime(d.dose)) > nowMin) later.push({ time: effectiveTime(d.dose), label: d.medication.name, kind: 'dose' });
  for (const m of i.meals) if (toMinutes(m.time) > nowMin) later.push({ time: m.time, label: m.kind, kind: 'meal' });
  for (const a of i.activities) if (onDay(a.days, i.now) && toMinutes(a.time) > nowMin) later.push({ time: a.time, label: a.title, kind: 'activity' });
  if (i.checkinTime && toMinutes(i.checkinTime) > nowMin) later.push({ time: i.checkinTime, label: 'checkin', kind: 'checkin' });
  later.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

  return { now: queue[0] ?? { kind: 'done' }, later };
}
