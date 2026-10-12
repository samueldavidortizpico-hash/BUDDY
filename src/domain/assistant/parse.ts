/**
 * Analizador de español para el asistente: números en palabra, fracciones, horas habladas, frecuencias, días y
 * teléfonos. Puro y determinista (probado en src/domain/__tests__/assistant.test.ts).
 */
import { intervalTimes, sortTimes, spreadTimes } from '../time';
import type { ClockTime, Weekday } from '../types';
import { digitsOnly, normalizeText } from '../validation';

const pad = (n: number) => String(n).padStart(2, '0');

export const NUMBER_WORDS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, noventa: 90, cien: 100, ciento: 100,
};

/** Normaliza y separa números pegados a palabras ("8vasos" → "8 vasos"). */
export function clean(text: string): string {
  return normalizeText(text)
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/[¿?¡!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "tres mil" → 3000, "5000" → 5000, "3 mil" → 3000, "veinte" → 20. */
export function parseNumberAt(words: string[], i: number): { value: number; len: number } | null {
  const w = words[i];
  if (!w) return null;
  let value: number | null = /^\d+([.,]\d+)?$/.test(w) ? Number(w.replace(',', '.')) : (NUMBER_WORDS[w] ?? null);
  if (value === null) return null;
  let len = 1;
  if (words[i + 1] === 'mil') {
    value *= 1000;
    len = 2;
  } else if (words[i + 1] === 'y' && NUMBER_WORDS[words[i + 2]] !== undefined && NUMBER_WORDS[words[i + 2]] < 10 && value >= 20) {
    value += NUMBER_WORDS[words[i + 2]];
    len = 3;
  }
  return { value, len };
}

/** Cantidad de una dosis: "media", "un cuarto", "una y media", "1/2", "dos", "2". Devuelve null si no hay. */
export function parseDoseAmount(text: string): number | null {
  const t = ` ${clean(text)} `;
  if (/\b(una|un|1) y (media|medio)\b/.test(t)) return 1.5;
  if (/\b(dos|2) y (media|medio)\b/.test(t)) return 2.5;
  if (/\b(media|medio)\s+(pasti|tablet|capsul|past)/.test(t) || /\b1\/2\b/.test(t)) return 0.5;
  if (/\bun cuarto\b|\b1\/4\b/.test(t)) return 0.25;
  if (/\btres cuartos\b|\b3\/4\b/.test(t)) return 0.75;
  const m = t.match(/\b(\d+(?:[.,]\d+)?|una|un|uno|dos|tres|cuatro)\s+(pastillas?|tabletas?|capsulas?|grageas?|comprimidos?)\b/);
  if (m) return /\d/.test(m[1]) ? Number(m[1].replace(',', '.')) : NUMBER_WORDS[m[1]];
  return null;
}

/** "50 mg", "500mg", "5 ml", "1 g" → texto normalizado de concentración. */
export function parseStrength(text: string): string | null {
  const m = clean(text).match(/\b(\d+(?:[.,]\d+)?)\s*(mg|mcg|g|ml|ui|%)\b/);
  return m ? `${m[1].replace('.', ',')} ${m[2] === 'ui' ? 'UI' : m[2]}` : null;
}

const PERIOD_DEFAULT: Record<string, ClockTime> = {
  manana: '08:00',
  mediodia: '12:00',
  tarde: '15:00',
  noche: '20:00',
};

function to24(h: number, m: number, period: string | null): ClockTime | null {
  if (h > 24 || m > 59) return null;
  let hour = h;
  if (period === 'pm' || period === 'tarde' || period === 'noche') {
    if (hour < 12) hour += 12;
  } else if (period === 'am' || period === 'manana' || period === 'madrugada') {
    if (hour === 12) hour = 0;
  } else if (period === 'mediodia') {
    hour = 12;
  } else if (hour >= 1 && hour <= 6) {
    // Sin indicar mañana o tarde, de 1 a 6 se entiende de la tarde (el cuidador puede corregirlo en la propuesta).
    hour += 12;
  }
  return `${pad(hour % 24)}:${pad(m)}`;
}

/**
 * Todas las horas mencionadas, en orden de aparición:
 * "a las 6 de la tarde", "6 pm", "6:30 p. m.", "18:00", "a la 1", "a las siete y media", "en la mañana", "al mediodía".
 */
export function parseTimes(text: string): ClockTime[] {
  const t = ` ${clean(text).replace(/(\d)\s*p\.?\s?m\.?(?![a-z])/g, '$1 pm').replace(/(\d)\s*a\.?\s?m\.?(?![a-z])/g, '$1 am')} `;
  const found: { at: number; time: ClockTime }[] = [];
  const re = /\b(?:a\s+las?|las?|desde\s+las?|hasta\s+las?)\s+(\d{1,2}|[a-z]+)(?::(\d{2})|\s+y\s+(media|cuarto)|\s+(\d{2})\b)?(?:\s*(am|pm)|\s+de\s+la\s+(manana|tarde|noche|madrugada)|\s+del\s+(mediodia))?|\b(\d{1,2}):(\d{2})\s*(am|pm)?|\b(\d{1,2})\s*(am|pm)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    let h: number | null;
    let min = 0;
    let period: string | null = null;
    if (m[1] !== undefined) {
      h = /^\d+$/.test(m[1]) ? Number(m[1]) : (NUMBER_WORDS[m[1]] ?? null);
      if (h === null || h > 24) continue;
      if (m[2]) min = Number(m[2]);
      else if (m[3] === 'media') min = 30;
      else if (m[3] === 'cuarto') min = 15;
      else if (m[4]) min = Number(m[4]);
      period = m[5] ?? m[6] ?? m[7] ?? null;
    } else if (m[8] !== undefined) {
      h = Number(m[8]);
      min = Number(m[9]);
      period = m[10] ?? (h >= 13 || h === 0 ? 'h24' : h === 12 ? 'h24' : null);
      if (period === null && h >= 7) period = 'h24';
    } else {
      h = Number(m[11]);
      period = m[12];
    }
    const time = period === 'h24' ? `${pad(h)}:${pad(min)}` : to24(h, min, period);
    if (time) found.push({ at: m.index, time });
  }
  if (!found.length) {
    for (const [word, time] of Object.entries(PERIOD_DEFAULT)) {
      const idx = t.search(new RegExp(`\\b(en|por|al|a)\\s+la\\s+${word}\\b|\\bal\\s+${word}\\b|\\bde\\s+${word}\\b`));
      if (idx >= 0) found.push({ at: idx, time });
    }
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.time);
}

/** "cada 8 horas desde las 8" → { everyHours: 8, from: '08:00' } */
export function parseInterval(text: string): { everyHours: number; from: ClockTime } | null {
  const t = clean(text);
  const m = t.match(/\bcada\s+(\d{1,2}|[a-z]+)\s+horas?\b/);
  if (!m) return null;
  const every = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1]];
  if (!every || every > 24) return null;
  const fromPart = t.slice(t.indexOf(m[0]) + m[0].length);
  const times = parseTimes(fromPart);
  // "desde las 8" con cada X horas: si no dice tarde, se entiende de la mañana.
  const raw = fromPart.match(/\b(?:desde|empezando|a partir de)\s+las?\s+(\d{1,2})\b(?!\s*(?:pm|de la tarde|de la noche))/);
  const from = raw ? `${pad(Number(raw[1]) % 24)}:00` : (times[0] ?? '08:00');
  return { everyHours: every, from };
}

/** "dos veces al día" → 2; "una vez al día" → 1. */
export function parseTimesPerDay(text: string): number | null {
  const m = clean(text).match(/\b(\d|una|un|dos|tres|cuatro)\s+(?:veces|vez)\s+(?:al|por|cada)\s+dia\b/);
  if (!m) return null;
  return /\d/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1]];
}

/** Horas por defecto para "N veces al día". */
export function defaultTimes(perDay: number): ClockTime[] {
  return perDay === 1 ? ['08:00'] : perDay === 2 ? ['08:00', '20:00'] : perDay === 3 ? ['08:00', '14:00', '20:00'] : spreadTimes(perDay, '07:00', '21:00');
}

const DAY_WORDS: [RegExp, Weekday][] = [
  [/\bdomingos?\b/, 0],
  [/\blunes\b/, 1],
  [/\bmartes\b/, 2],
  [/\bmiercoles\b/, 3],
  [/\bjueves\b/, 4],
  [/\bviernes\b/, 5],
  [/\bsabados?\b/, 6],
];

/** Días de la semana mencionados. Lista vacía = todos los días (o no se dijo). */
export function parseDays(text: string): Weekday[] {
  const t = clean(text);
  if (/\btodos los dias\b|\bdiario\b|\bdiariamente\b|\bcada dia\b/.test(t)) return [];
  if (/\bde lunes a viernes\b|\bentre semana\b/.test(t)) return [1, 2, 3, 4, 5];
  if (/\bfines? de semana\b/.test(t)) return [0, 6];
  return DAY_WORDS.filter(([re]) => re.test(t)).map(([, d]) => d);
}

/** Teléfonos de 10 dígitos (o fijos de 7) con o sin espacios, en orden de aparición. */
export function parsePhones(text: string): { phone: string; index: number }[] {
  const out: { phone: string; index: number }[] = [];
  const re = /(\+?57[\s-]?)?(\d[\d\s-]{5,14}\d)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const d = digitsOnly(m[0]);
    if ((d.length === 10 && (d.startsWith('3') || d.startsWith('60'))) || d.length === 7) out.push({ phone: d, index: m.index });
  }
  return out;
}

/** Primer número seguido de una unidad: "8 vasos" → 8, "3 mil pasos" → 3000, "15 minutos" → 15. */
export function numberBefore(text: string, unit: RegExp): number | null {
  const words = clean(text).split(' ');
  for (let i = 0; i < words.length; i++) {
    const n = parseNumberAt(words, i);
    if (n && unit.test(words[i + n.len] ?? '')) return n.value;
  }
  return null;
}

/** Distancia de edición (Levenshtein): cuántas letras hay que cambiar, quitar o poner para pasar de a a b. */
export function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Candidato más parecido a una palabra mal escrita ("losartn" → "Losartán"). Solo palabras de 5+ letras y como máximo
 * 1 error (2 si tiene 8+ letras): más tolerancia confundiría palabras distintas. Compara sin tildes ni mayúsculas.
 */
export function closest(word: string, candidates: string[], minLen = 5): string | null {
  const w = normalizeText(word);
  if (w.length < minLen) return null;
  const max = w.length >= 8 ? 2 : 1;
  let best: { c: string; d: number } | null = null;
  for (const c of candidates) {
    const d = editDistance(w, normalizeText(c));
    if (d <= max && (!best || d < best.d)) best = { c, d };
  }
  return best?.c ?? null;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/**
 * Fecha en español respecto a `today`: "hoy", "mañana", "pasado mañana", "el jueves", "el próximo martes" (siguiente
 * ocurrencia, nunca hoy), "15 de noviembre", "15/11", "en dos semanas", "en 3 días". Una fecha sin año que ya pasó
 * se entiende del año siguiente. "de la mañana" no es una fecha.
 */
export function parseDate(text: string, today = new Date()): string | null {
  const t = clean(text);
  const plus = (n: number) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const named = t.match(new RegExp(String.raw`\b(\d{1,2}) de (${MONTHS.join('|')})(?: de (\d{4}))?\b`));
  const numeric = t.match(/\b(\d{1,2})\s*[/-]\s*(\d{1,2})(?:\s*[/-]\s*(\d{2,4}))?\b/);
  if (named || numeric) {
    const day = Number(named?.[1] ?? numeric?.[1]);
    const month = named ? MONTHS.indexOf(named[2]) : Number(numeric![2]) - 1;
    const y = named?.[3] ?? numeric?.[3];
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      let year = y ? Number(y.length === 2 ? `20${y}` : y) : today.getFullYear();
      if (!y && new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())) year++;
      return `${year}-${pad(month + 1)}-${pad(day)}`;
    }
  }
  if (/\bpasado manana\b/.test(t)) return plus(2);
  if (/\bmanana\b/.test(t) && !/\b(de|en|por) la manana\b/.test(t)) return plus(1);
  if (/\bhoy\b/.test(t)) return plus(0);
  const span = t.match(/\ben (\d+|una|un|dos|tres|cuatro|cinco) (semanas?|dias?)\b/);
  if (span) {
    const n = /\d/.test(span[1]) ? Number(span[1]) : NUMBER_WORDS[span[1]];
    return plus(span[2].startsWith('semana') ? n * 7 : n);
  }
  const wd = t.match(/\b(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/);
  if (wd) {
    const diff = (WEEKDAY_NAMES.indexOf(wd[1]) - today.getDay() + 7) % 7;
    return plus(diff === 0 ? 7 : diff);
  }
  return null;
}

export { intervalTimes, sortTimes };
