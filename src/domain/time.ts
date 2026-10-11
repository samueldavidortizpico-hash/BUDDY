/** Horas en 24 h ("HH:mm") ⇄ partes de 12 h para el selector, y repartos de horas en el día. */
import type { ClockTime, Weekday } from './types';

export interface ClockParts {
  /** 1–12 */
  hour: number;
  /** 0–59 */
  minute: number;
  pm: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toParts(t: ClockTime): ClockParts {
  const [h, m] = t.split(':').map(Number);
  return { hour: h % 12 === 0 ? 12 : h % 12, minute: m, pm: h >= 12 };
}

export function fromParts({ hour, minute, pm }: ClockParts): ClockTime {
  const h = (hour % 12) + (pm ? 12 : 0);
  return `${pad(h)}:${pad(minute)}`;
}

export function toMinutes(t: ClockTime): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): ClockTime {
  const m = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function addMinutes(t: ClockTime, delta: number): ClockTime {
  return fromMinutes(toMinutes(t) + delta);
}

export function sortTimes(times: ClockTime[]): ClockTime[] {
  return [...new Set(times)].sort((a, b) => toMinutes(a) - toMinutes(b));
}

/** Reparte `count` horas entre `from` y `to` (incluidas), redondeadas a 15 min. */
export function spreadTimes(count: number, from: ClockTime = '08:00', to: ClockTime = '20:00'): ClockTime[] {
  if (count <= 0) return [];
  if (count === 1) return [from];
  const a = toMinutes(from);
  const b = toMinutes(to);
  const step = (b - a) / (count - 1);
  return sortTimes(Array.from({ length: count }, (_, i) => fromMinutes(Math.round((a + step * i) / 15) * 15)));
}

/** "cada 8 horas desde las 08:00" → 08:00, 16:00, 00:00 (en orden del día). */
export function intervalTimes(everyHours: number, from: ClockTime): ClockTime[] {
  if (everyHours <= 0 || everyHours > 24) return [from];
  const n = Math.max(1, Math.floor(24 / everyHours));
  return sortTimes(Array.from({ length: n }, (_, i) => addMinutes(from, i * everyHours * 60)));
}

export const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const WEEKDAY_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** "Todos los días", "Lun, Jue" … */
export function describeDays(days: Weekday[]): string {
  if (!days.length || days.length === 7) return 'Todos los días';
  const set = [...days].sort();
  if (set.join() === '1,2,3,4,5') return 'De lunes a viernes';
  if (set.join() === '0,6') return 'Fines de semana';
  return set.map((d) => WEEKDAY_SHORT[d]).join(', ');
}

/** ¿Aplica ese día de la semana? Lista vacía = todos. */
export function onDay(days: Weekday[], date: Date): boolean {
  return !days.length || days.includes(date.getDay() as Weekday);
}
