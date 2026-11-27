/**
 * Horarios de medicamentos y estado de las tomas. Puro: todo recibe `now` o `date`.
 * Zona horaria: las tomas siguen la hora local del dispositivo (fecha `YYYY-MM-DD` + `HH:mm`).
 */
import { atClock, daysBetween, minutesToClock, parseISODate, toISODate } from '@/utils/dates';

import { doseDayLimit, withDoseSlots, type SlottedDose } from './dose-safety';
import { intervalTimes, onDay, sortTimes, toMinutes } from './time';
import type { ClockTime, DisplayDoseStatus, DoseEvent, ISODate, Medication, MedSchedule, Weekday } from './types';

/**
 * Aviso escalonado (V3.0): aviso a la hora T, segundo aviso a T+10 si no respondió y estado "sin confirmar" a T+30, que
 * genera una alerta de seguimiento al administrador. Ambos márgenes los define el administrador (Ajustes > Mis avisos).
 * "Sin confirmar" no es omisión ni emergencia: puede que la haya tomado y no lo marcó.
 */
export const REMIND_AFTER_MIN = 10;
export const UNCONFIRMED_AFTER_MIN = 30;
export const SNOOZE_MINUTES = 10;

export interface Escalation {
  remindAfterMin: number;
  unconfirmedAfterMin: number;
}

/** Márgenes de la persona (con los valores por defecto). El segundo aviso siempre va antes del "sin confirmar". */
export function escalationOf(prefs?: { remindAfterMin?: number; unconfirmedAfterMin?: number } | null): Escalation {
  const unconfirmedAfterMin = Math.max(5, prefs?.unconfirmedAfterMin ?? UNCONFIRMED_AFTER_MIN);
  const remindAfterMin = Math.min(Math.max(1, prefs?.remindAfterMin ?? REMIND_AFTER_MIN), unconfirmedAfterMin - 1);
  return { remindAfterMin, unconfirmedAfterMin };
}

export function scheduleTimes(s: MedSchedule): ClockTime[] {
  return s.kind === 'times' ? sortTimes(s.times) : intervalTimes(s.everyHours, s.from);
}

export function scheduleDays(s: MedSchedule): Weekday[] {
  return s.days;
}

export function isActiveOn(med: Pick<Medication, 'startDate' | 'endDate' | 'paused'> & { deletedAt?: string | null }, date: ISODate): boolean {
  if (med.paused || med.deletedAt) return false;
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

export type NewDose = Pick<DoseEvent, 'slot' | 'medicationId' | 'date' | 'time' | 'status' | 'respondedAt' | 'snoozedTo' | 'snoozeCount' | 'answeredBy'>;

/** Tomas que faltan por crear para `date` (no duplica las existentes). */
export function missingDoses(meds: Medication[], doses: SlottedDose[], date: ISODate): NewDose[] {
  const existing = withDoseSlots(doses.filter((d) => d.date === date), (d) => {
    const med = meds.find((m) => m.id === d.medicationId);
    return med ? timesOn(med, date) : [];
  });
  return meds.flatMap((med) => {
    const day = existing.filter((d) => d.medicationId === med.id);
    const times = timesOn(med, date);
    const limit = doseDayLimit(day, times.length);
    const occupied = new Set(day.map((d) => d.slot));
    // Los registros fuera del nuevo rango también consumen cupo: nunca pedir otra dosis por reordenar.
    const registered = day.filter((d) => d.status === 'taken' || d.status === 'skipped').length;
    const livePending = day.filter((d) => d.status !== 'taken' && d.status !== 'skipped' && !d.cancelledAt).length;
    let room = Math.max(0, limit - registered - livePending);
    return times.slice(0, limit).flatMap((time, slot) => {
      if (occupied.has(slot) || room <= 0) return [];
      room--;
      return [{ medicationId: med.id, date, time, slot, status: 'pending' as const, respondedAt: null, snoozedTo: null, snoozeCount: 0, answeredBy: null }];
    });
  });
}

export function effectiveTime(dose: Pick<DoseEvent, 'status' | 'snoozedTo' | 'time'>): ClockTime {
  return dose.status === 'snoozed' && dose.snoozedTo ? dose.snoozedTo : dose.time;
}

export function displayStatus(dose: Pick<DoseEvent, 'status' | 'snoozedTo' | 'time' | 'date'>, now: Date, unconfirmedAfterMin = UNCONFIRMED_AFTER_MIN): DisplayDoseStatus {
  if (dose.status === 'taken' || dose.status === 'skipped') return dose.status;
  const due = atClock(dose.date, effectiveTime(dose)).getTime();
  return now.getTime() - due >= unconfirmedAfterMin * 60_000 ? 'unconfirmed' : dose.status;
}

/**
 * Etapa de una toma, separando lo que se suele confundir: "programada" (existe la hora), "aviso entregado al sistema"
 * (el celular del adulto mayor aceptó la notificación local; NO significa que la vio), "segundo aviso", "sin confirmar"
 * y "respondida" (tomé, no tomé, pospuse). "Enviado" no es "recibido" y "recibido" no es "tomado".
 */
export type DoseStage =
  | { stage: 'scheduled' }
  | { stage: 'delivered' }
  | { stage: 'second_notice' }
  | { stage: 'unconfirmed' }
  | { stage: 'answered'; answer: 'taken' | 'skipped' | 'snoozed'; by: DoseEvent['answeredBy'] };

export function doseStage(dose: Pick<DoseEvent, 'status' | 'snoozedTo' | 'time' | 'date' | 'answeredBy'>, now: Date, e: Escalation, delivered: boolean): DoseStage {
  if (dose.status === 'taken' || dose.status === 'skipped') return { stage: 'answered', answer: dose.status, by: dose.answeredBy };
  const since = (now.getTime() - atClock(dose.date, effectiveTime(dose)).getTime()) / 60_000;
  if (dose.status === 'snoozed' && since < 0) return { stage: 'answered', answer: 'snoozed', by: dose.answeredBy };
  if (since >= e.unconfirmedAfterMin) return { stage: 'unconfirmed' };
  if (since >= e.remindAfterMin) return { stage: 'second_notice' };
  return delivered ? { stage: 'delivered' } : { stage: 'scheduled' };
}

/**
 * Día local en que la toma pasa a "sin confirmar" (V4): una de las 23:50 lo hace a las 00:20 del día siguiente, así que
 * hay que revisarla también ese día; una que lo hizo ayer ya se revisó ayer y no vuelve a avisar.
 */
export function unconfirmedDay(dose: Pick<DoseEvent, 'status' | 'snoozedTo' | 'time' | 'date'>, unconfirmedAfterMin = UNCONFIRMED_AFTER_MIN): ISODate {
  return toISODate(new Date(atClock(dose.date, effectiveTime(dose)).getTime() + unconfirmedAfterMin * 60_000));
}

/** Tomas que se revisan hoy para "sin confirmar": las de hoy y las de ayer que cruzan la medianoche. */
export function dueForReview<T extends Pick<DoseEvent, 'status' | 'snoozedTo' | 'time' | 'date'>>(d: T, today: ISODate, unconfirmedAfterMin = UNCONFIRMED_AFTER_MIN): boolean {
  return d.date === today || unconfirmedDay(d, unconfirmedAfterMin) === today;
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
export function dayDoses(meds: Medication[], doses: DoseEvent[], date: ISODate, now: Date, unconfirmedAfterMin = UNCONFIRMED_AFTER_MIN): DoseItem[] {
  const byId = new Map(meds.filter((m) => !m.deletedAt).map((m) => [m.id, m]));
  return doses
    .filter((d) => d.date === date && !d.cancelledAt && !d.deletedAt && !(d.safetyHold && (d.status === 'pending' || d.status === 'snoozed')) && byId.has(d.medicationId))
    .map((dose) => ({ dose, medication: byId.get(dose.medicationId)!, status: displayStatus(dose, now, unconfirmedAfterMin) }))
    .sort((a, b) => toMinutes(effectiveTime(a.dose)) - toMinutes(effectiveTime(b.dose)));
}

/** Hora a la que se reprograma una toma pospuesta (no cruza la medianoche). */
export function snoozeTarget(now: Date, minutes = SNOOZE_MINUTES): ClockTime {
  const target = now.getHours() * 60 + now.getMinutes() + minutes;
  return minutesToClock(Math.min(target, 23 * 60 + 59));
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
