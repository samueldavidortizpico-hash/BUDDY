/**
 * Lógica pura de horarios y estados de tomas. Sin reloj real: todo recibe `now` o `date`.
 * Política de zona horaria: las tomas siguen la hora local del dispositivo (fecha `YYYY-MM-DD` + `HH:mm`).
 */
import type {
  ClockTime,
  DisplayDoseStatus,
  DoseEvent,
  ISODate,
  Medication,
} from '@/types/domain';
import { atClock, clockToMinutes, daysBetween, minutesToClock, toClock, toISODate } from '@/utils/dates';
import { createId } from '@/utils/id';

/** Margen tras la hora programada para mostrar una toma como "sin confirmar" (no es omisión ni emergencia). */
export const UNCONFIRMED_AFTER_MIN = 60;
export const SNOOZE_MINUTES = 10;

export function isActiveOn(med: Medication, date: ISODate): boolean {
  if (!(daysBetween(med.startDate, date) >= 0)) return false;
  if (med.endDate && daysBetween(date, med.endDate) < 0) return false;
  return true;
}

/** Horas en que corresponde una toma ese día. "Solo cuando lo necesite" no programa tomas. */
export function scheduledTimes(med: Medication, date: ISODate): ClockTime[] {
  if (med.frequency === 'as_needed' || !isActiveOn(med, date)) return [];
  if (med.frequency === 'alternate' && daysBetween(med.startDate, date) % 2 !== 0) return [];
  return [...new Set(med.times)].sort((a, b) => clockToMinutes(a) - clockToMinutes(b));
}

/** Tomas que faltan por crear para `date` (no duplica las existentes). */
export function missingDoses(meds: Medication[], doses: DoseEvent[], date: ISODate): DoseEvent[] {
  const existing = new Set(doses.filter((d) => d.date === date).map((d) => `${d.medicationId}@${d.time}`));
  return meds.flatMap((med) =>
    scheduledTimes(med, date)
      .filter((time) => !existing.has(`${med.id}@${time}`))
      .map((time) => ({
        id: createId('dose'),
        medicationId: med.id,
        date,
        time,
        status: 'pending' as const,
        confirmedByUser: false,
        respondedAt: null,
        snoozedTo: null,
        demo: med.demo,
      })),
  );
}

export function effectiveTime(dose: DoseEvent): ClockTime {
  return dose.status === 'snoozed' && dose.snoozedTo ? dose.snoozedTo : dose.time;
}

export function displayStatus(dose: DoseEvent, now: Date): DisplayDoseStatus {
  if (dose.status === 'taken' || dose.status === 'skipped') return dose.status;
  const due = atClock(dose.date, effectiveTime(dose)).getTime();
  return now.getTime() - due > UNCONFIRMED_AFTER_MIN * 60_000 ? 'unconfirmed' : dose.status;
}

export function isOpen(status: DisplayDoseStatus): boolean {
  return status === 'pending' || status === 'snoozed' || status === 'unconfirmed';
}

/** Hora a la que se reprograma una toma pospuesta (no cruza la medianoche). */
export function snoozeTarget(now: Date, minutes = SNOOZE_MINUTES): ClockTime {
  const target = clockToMinutes(toClock(now)) + minutes;
  return target >= 1440 ? '23:59' : minutesToClock(target);
}

export interface DoseItem {
  dose: DoseEvent;
  medication: Medication;
  status: DisplayDoseStatus;
}

export interface DayPlan {
  date: ISODate;
  items: DoseItem[];
  taken: number;
  total: number;
  next: DoseItem | null;
  unconfirmed: number;
}

/** Plan del día: tomas ordenadas, progreso declarado y próxima toma. */
export function buildDayPlan(meds: Medication[], doses: DoseEvent[], date: ISODate, now: Date): DayPlan {
  const byId = new Map(meds.map((m) => [m.id, m]));
  const items = doses
    .filter((d) => d.date === date && byId.has(d.medicationId))
    .map((dose) => ({ dose, medication: byId.get(dose.medicationId)!, status: displayStatus(dose, now) }))
    .sort((a, b) => clockToMinutes(effectiveTime(a.dose)) - clockToMinutes(effectiveTime(b.dose)));
  const open = items.filter((i) => isOpen(i.status));
  const next = open.find((i) => i.status !== 'unconfirmed') ?? open[0] ?? null;
  return {
    date,
    items,
    taken: items.filter((i) => i.status === 'taken').length,
    total: items.length,
    next,
    unconfirmed: items.filter((i) => i.status === 'unconfirmed').length,
  };
}

export type DayPeriod = 'morning' | 'midday' | 'night';

const PERIODS: [DayPeriod, string][] = [
  ['morning', 'Mañana'],
  ['midday', 'Mediodía'],
  ['night', 'Noche'],
];

export function periodOf(time: ClockTime): DayPeriod {
  const m = clockToMinutes(time);
  return m < 12 * 60 ? 'morning' : m < 18 * 60 ? 'midday' : 'night';
}

/** Tomas por franja del día (solo franjas con tomas). */
export function periodProgress(items: DoseItem[]) {
  return PERIODS.map(([period, label]) => {
    const list = items.filter((i) => periodOf(i.dose.time) === period);
    return { period, label, total: list.length, taken: list.filter((i) => i.status === 'taken').length };
  }).filter((p) => p.total > 0);
}

/** Proporción de tomas confirmadas por día (null si ese día no había tomas). */
export function adherenceByDay(doses: DoseEvent[], days: ISODate[]): (number | null)[] {
  return days.map((day) => {
    const list = doses.filter((d) => d.date === day);
    if (list.length === 0) return null;
    return list.filter((d) => d.status === 'taken').length / list.length;
  });
}

export function todayISO(now: Date): ISODate {
  return toISODate(now);
}
