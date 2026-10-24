/**
 * Guía de voz de BUDDY (docs/VOZ_DE_BUDDY.md) como revisión automática de cada respuesta: máximo dos frases, nada
 * técnico (códigos, JSON, ids, rutas con ">"), horas en a. m./p. m., signos de apertura (¿ ¡), tildes de palabras
 * frecuentes y nunca una frase cortada. Puro: solo mira el texto.
 */
const TECH = /[{}[\]]|=>|\bundefined\b|\bnull\b|\bNaN\b|\b[0-9a-f]{8}-[0-9a-f]{4}-|\b[a-z]+_[a-z]+\b|\bjson\b|\s>\s/i;
const H24 = /\b([01]?\d|2[0-3]):[0-5]\d\b(?!\s?[ap]\.\s?m\.)/;
const NO_ACCENT = /\b(dia|dias|medicacion|tambien|ultima|ultimo|aqui|despues|telefono|informacion|notificacion|segun|algun|ningun|manana|sueno)\b/i;

export const MAX_SENTENCES = 2;

/** Frases de un texto: "a. m." y "p. m." no cortan la frase. */
export function sentences(text: string): string[] {
  return text
    .replace(/\b([ap])\. m\./g, '$1m')
    .split(/[.!?]+(?=\s|$)/)
    .map((x) => x.trim())
    .filter((x) => /[a-záéíóúñ0-9]/i.test(x));
}

export function voiceIssues(text: string): string[] {
  const out: string[] = [];
  const t = text.trim();
  if (!t) return ['vacío'];
  if (sentences(t).length > MAX_SENTENCES) out.push(`más de ${MAX_SENTENCES} frases`);
  if (TECH.test(t)) out.push('texto técnico');
  if (H24.test(t)) out.push('hora sin a. m./p. m.');
  const accent = t.match(NO_ACCENT);
  if (accent) out.push(`falta tilde: "${accent[0]}"`);
  if ((t.match(/\?/g) ?? []).length > (t.match(/¿/g) ?? []).length) out.push('pregunta sin ¿');
  if ((t.match(/!/g) ?? []).length > (t.match(/¡/g) ?? []).length) out.push('exclamación sin ¡');
  if (/(\.\.\.|…)$/.test(t)) out.push('frase cortada');
  return out;
}
