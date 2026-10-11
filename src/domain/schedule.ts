/**
 * Horarios de medicamentos y estado de las tomas. Puro: todo recibe `now` o `date`.
 * Zona horaria: las tomas siguen la hora local del dispositivo (fecha `YYYY-MM-DD` + `HH:mm`).
 */
import { atClock, daysBetween, parseISODate } from '@/utils/dates';

import { intervalTimes, onDay, sortTimes, toMinutes } from './time';
import type { ClockTime, DisplayDoseStatus, DoseEvent, ISODate, Medication, MedSchedule, Weekday } from './types';

/** Margen tras la hora programada para mostrar una toma como "sin confirmar" (no es omisión ni emergencia). */
export const UNCONFIRMED_AFTER_MIN = 60;
export const SNOOZE_MINUTES = 10;

export function scheduleTimes(s: MedSchedule): ClockTime[] {
  return s.kind === 'times' ? sortTimes(s.times) : intervalTimes(s.everyHours, s.from);
}

export function scheduleDays(s: MedSchedule): Weekday[] {
  return s.days;
}

export function isActiveOn(med: Pick<Medication, 'startDate' | 'endDate' | 'paused'>, date: ISODate): boolean {
  if (med.paused) return false;
  if (!(daysBetween(med.startDate, date) >= 0)) return false;
  return !(med.endDate && daysBetween(date, med.endDate) < 0);
}

/** Horas en que corresponde una toma ese día. */
export function timesOn(med: Medication, date: ISODate): ClockTime[] {
  const d = parseISODate(date);
  if (!d || !isActiveOn(med, date) || !onDay(med.schedule.days, d)) return [];
  return scheduleTimes(med.schedule);
}

/** Tomas por día en promedio (promedia los días de la semana si no son todos). */
export function dosesPerDay(med: Pick<Medication, 'schedule'>): number {
  const per = scheduleTimes(med.schedule).length;
  const days = med.schedule.days.length;
  return days === 0 || days === 7 ? per : (per * days) / 7;
}

export type NewDose = Pick<DoseEvent, 'medicationId' | 'date' | 'time' | 'status' | 'respondedAt' | 'snoozedTo' | 'snoozeCount' | 'answeredBy'>;

/** Tomas que faltan por crear para `date` (no duplica las existentes). */
export function missingDoses(meds: Medication[], doses: Pick<DoseEvent, 'medicationId' | 'date' | 'time'>[], date: ISODate): NewDose[] {
  const existing = new Set(doses.filter((d) => d.date === date).map((d) => `${d.medicationId}@${d.time}`));
  return meds.flatMap((med) =>
    timesOn(med, date)
      .filter((time) => !existing.has(`${med.id}@${time}`))
      .map((time) => ({ medicationId: med.id, date, time, status: 'pending' as const, respondedAt: null, snoozedTo: null, snoozeCount: 0, answeredBy: null })),
  );
}

export function effectiveTime(dose: Pick<DoseEvent, 'status' | 'snoozedTo' | 'time'>): ClockTime {
  return dose.status === 'snoozed' && dose.snoozedTo ? dose.snoozedTo : dose.time;
}

export function displayStatus(dose: Pick<DoseEvent, 'status' | 'snoozedTo' | 'time' | 'date'>, now: Date): DisplayDoseStatus {
  if (dose.status === 'taken' || dose.status === 'skipped') return dose.status;
  const due = atClock(dose.date, effectiveTime(dose)).getTime();
  return now.getTime() - due > UNCONFIRMED_AFTER_MIN * 60_000 ? 'unconfirmed' : dose.status;
}

export function isOpen(status: DisplayDoseStatus): boolean {
  return status === 'pending' || status === 'snoozed' || status === 'unconfirmed';
}

export interface DoseItem {
  dose: DoseEvent;
  medication: Medication;
  status: DisplayDoseStatus;
}

/** Tomas del día, ordenadas por hora efectiva. */
export function dayDoses(meds: Medication[], doses: DoseEvent[], date: ISODate, now: Date): DoseItem[] {
  const byId = new Map(meds.map((m) => [m.id, m]));
  return doses
    .filter((d) => d.date === date && byId.has(d.medicationId))
    .map((dose) => ({ dose, medication: byId.get(dose.medicationId)!, status: displayStatus(dose, now) }))
    .sort((a, b) => toMinutes(effectiveTime(a.dose)) - toMinutes(effectiveTime(b.dose)));
}

/** Hora a la que se reprograma una toma pospuesta (no cruza la medianoche). */
export function snoozeTarget(now: Date, minutes = SNOOZE_MINUTES): ClockTime {
  const target = now.getHours() * 60 + now.getMinutes() + minutes;
  const m = Math.min(target, 23 * 60 + 59);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// ── Textos de dosis ──────────────────────────────────────────

const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾', '1.5': '1½', '2.5': '2½' };

export function amountText(n: number): string {
  return FRACTIONS[String(n)] ?? String(n).replace('.', ',');
}

const FORM_UNIT: Record<Medication['form'], [string, string]> = {
  tablet: ['tableta', 'tabletas'],
  capsule: ['cápsula', 'cápsulas'],
  syrup: ['ml', 'ml'],
  drops: ['gota', 'gotas'],
  cream: ['aplicación', 'aplicaciones'],
  injection: ['inyección', 'inyecciones'],
  patch: ['parche', 'parches'],
  other: ['unidad', 'unidades'],
};

/** "½ tableta", "2 tabletas", "5 ml", "10 gotas" — repite exactamente lo que escribió el cuidador. */
export function doseText(med: Pick<Medication, 'doseAmount' | 'doseUnit' | 'form'>): string {
  const n = med.doseAmount;
  if (med.doseUnit === 'ml') return `${amountText(n)} ml`;
  if (med.doseUnit === 'drops') return `${amountText(n)} ${n === 1 ? 'gota' : 'gotas'}`;
  const [one, many] = FORM_UNIT[med.form];
  return `${amountText(n)} ${n <= 1 ? one : many}`;
}

/** Unidad de existencias según la presentación. */
export function stockUnit(med: Pick<Medication, 'doseUnit' | 'form'>, n = 2): string {
  if (med.doseUnit === 'ml') return 'ml';
  if (med.doseUnit === 'drops') return n === 1 ? 'gota' : 'gotas';
  const [one, many] = FORM_UNIT[med.form];
  return n === 1 ? one : many;
}
