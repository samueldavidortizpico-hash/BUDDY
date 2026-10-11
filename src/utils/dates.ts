/** Utilidades de fecha y hora en hora local del dispositivo (formato es-CO, sin depender de Intl). */
import type { ClockTime, ISODate } from '@/types/domain';

const pad = (n: number) => String(n).padStart(2, '0');

export const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DAY_INITIALS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Fecha local a medianoche. Devuelve null si el texto no es una fecha válida. */
export function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toISODate(d) === iso ? d : null;
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISODate(iso) ?? new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Días completos entre dos fechas (b − a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  const da = parseISODate(a);
  const db = parseISODate(b);
  if (!da || !db) return NaN;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export function clockToMinutes(t: ClockTime): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToClock(total: number): ClockTime {
  const m = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function toClock(d: Date): ClockTime {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isValidClock(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

/** Instante local de una fecha + hora. */
export function atClock(date: ISODate, time: ClockTime): Date {
  const d = parseISODate(date) ?? new Date();
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

/** 14:05 → "2:05 p. m." */
export function formatClock(t: ClockTime): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/** "lunes, 10 de marzo" */
export function formatLongDate(d: Date): string {
  return `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** "Hoy", "Ayer", "Mañana" o "10 de marzo". */
export function formatRelativeDay(iso: ISODate, today: ISODate): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return 'Hoy';
  if (diff === -1) return 'Ayer';
  if (diff === 1) return 'Mañana';
  const d = parseISODate(iso);
  return d ? `${d.getDate()} de ${MONTHS[d.getMonth()]}` : iso;
}

export function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** "hace 8 min", "hace 2 h", "hace 3 días" */
export function formatAgo(from: Date, now: Date): string {
  const min = Math.max(0, Math.round((now.getTime() - from.getTime()) / 60_000));
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.round(h / 24);
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

/** Duración en minutos → "7 h 20 min" */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${pad(m)} min`;
}

/** Últimos `n` días terminando en `today`, del más antiguo al más reciente. */
export function lastDays(today: ISODate, n: number): ISODate[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

export function dayInitial(iso: ISODate): string {
  const d = parseISODate(iso);
  return d ? DAY_INITIALS[d.getDay()] : '';
}
