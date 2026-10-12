/**
 * Borrador de una petición a BUDDY (DraftAction). Puro y determinista: qué campos tiene cada acción, cuáles son
 * obligatorios, cuál preguntar después (uno a la vez, con respuestas rápidas) y cómo aplicar cada respuesta.
 * El borrador se guarda en la base local (sobrevive a cambiar de pestaña y a cerrar la app): ver src/state/assistant.ts.
 *
 * Reglas de seguridad: la dosis es SIEMPRE la que escribe el cuidador (BUDDY la repite para confirmarla); nunca se
 * propone una dosis ni se completa un dato clínico por defecto.
 */
import { doseText } from '../schedule';
import { describeDays, spreadTimes } from '../time';
import type { Weekday } from '../types';
import { formatPhone, normalizeText } from '../validation';

import { applyAnswer } from './engine';
import { clean, defaultTimes, parseDate, parseDays, parseDoseAmount, parsePhones, parseTimes, parseTimesPerDay } from './parse';
import type { AssistantAction, AssistantContext, FieldKey } from './types';

export interface DraftField {
  key: FieldKey;
  label: string;
  /** Valor mostrado; null = aún no se sabe. */
  value: string | null;
  required: boolean;
}

export interface DraftQuestion {
  index: number;
  field: FieldKey;
  question: string;
  quickReplies: string[];
}

export interface Draft {
  id: string;
  actions: AssistantAction[];
  /** Dato que BUDDY está preguntando ahora (null = no pregunta nada). */
  asking: { index: number; field: FieldKey } | null;
  createdAt: string;
}

/** Acciones que modifican datos y por eso usan borrador, confirmación y deshacer. */
export const DRAFTABLE = new Set<AssistantAction['type']>([
  'add_medication',
  'update_medication',
  'remove_medication',
  'update_stock',
  'set_water_goal',
  'add_activity_goal',
  'set_steps_goal',
  'add_emergency_contact',
  'update_emergency_contact',
  'set_checkin_time',
  'add_meal_reminder',
  'add_appointment',
  'add_note_for_elder',
  'send_message',
]);

const clock = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const suffix = h < 12 ? 'a. m.' : 'p. m.';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
};
const MEAL_NAME: Record<string, string> = { breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snack: 'Merienda' };
const text = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
const num = (v: number | null | undefined, unit = '') => (v === null || v === undefined ? null : `${String(v).replace('.', ',')}${unit}`);

/** Título de la tarjeta del borrador. */
export function draftTitle(a: AssistantAction): string {
  switch (a.type) {
    case 'add_medication':
      return a.name ? `Medicamento en preparación: ${a.name}` : 'Medicamento en preparación';
    case 'update_medication':
      return `Cambio de ${a.match || 'medicamento'}`;
    case 'remove_medication':
      return `Quitar ${a.match || 'medicamento'}`;
    case 'update_stock':
      return `Existencias de ${a.match || 'medicamento'}`;
    case 'set_water_goal':
      return 'Meta de agua';
    case 'add_activity_goal':
      return 'Actividad o meta';
    case 'set_steps_goal':
      return 'Meta de pasos';
    case 'add_emergency_contact':
      return 'Contacto de emergencia';
    case 'update_emergency_contact':
      return `Teléfono de ${a.match}`;
    case 'set_checkin_time':
      return 'Hora del chequeo diario';
    case 'add_meal_reminder':
      return 'Comidas';
    case 'add_appointment':
      return 'Cita';
    case 'add_note_for_elder':
      return 'Recordatorio para tu familiar';
    case 'send_message':
      return 'Mensaje para tu familiar';
    default:
      return 'Acción';
  }
}

/** Campos de una acción con su valor actual. */
export function draftFields(a: AssistantAction): DraftField[] {
  switch (a.type) {
    case 'add_medication': {
      const when = a.everyHours ? `Cada ${a.everyHours} h desde ${clock(a.from ?? '08:00')}` : a.times.length ? a.times.map(clock).join(', ') : null;
      const choosing = !!(a.candidates?.length || a.suggestions?.length);
      return [
        { key: 'name', label: 'Nombre', value: text(a.name), required: true },
        ...(choosing || a.verified
          ? [{ key: 'product' as FieldKey, label: 'Presentación', value: a.productDecided ? (a.verified ? `${a.strength ?? ''} · registro INVIMA`.replace(/^ · /, '') : 'Registrada a mano') : null, required: choosing }]
          : []),
        { key: 'doseAmount', label: 'Dosis por toma', value: a.doseAmount ? doseText({ doseAmount: a.doseAmount, doseUnit: a.doseUnit, form: a.form }) : null, required: true },
        { key: 'time', label: 'Hora', value: when, required: true },
        { key: 'days', label: 'Días', value: describeDays(a.days), required: false },
        { key: 'strength', label: 'Concentración', value: text(a.strength), required: false },
        { key: 'unitsPerPackage', label: 'Unidades por caja', value: num(a.unitsPerPackage), required: false },
        { key: 'unitsOnHand', label: 'Existencias', value: num(a.unitsOnHand), required: false },
        { key: 'instructions', label: 'Instrucciones', value: text(a.instructions), required: false },
        { key: 'purpose', label: 'Para qué sirve', value: text(a.purpose), required: false },
      ];
    }
    case 'update_medication':
      return [
        { key: 'match', label: 'Medicamento', value: text(a.match), required: true },
        { key: 'time', label: 'Hora nueva', value: a.times?.length ? a.times.map(clock).join(', ') : null, required: !a.doseAmount },
        { key: 'doseAmount', label: 'Dosis nueva', value: num(a.doseAmount), required: false },
      ];
    case 'remove_medication':
      return [{ key: 'match', label: 'Medicamento', value: text(a.match), required: true }];
    case 'update_stock':
      return [
        { key: 'match', label: 'Medicamento', value: text(a.match), required: true },
        { key: 'units', label: a.boxes ? 'Cajas compradas' : 'Unidades compradas', value: a.units ? String(a.units) : null, required: true },
      ];
    case 'set_water_goal':
      return [
        { key: 'glasses', label: 'Vasos al día', value: a.glasses ? String(a.glasses) : null, required: true },
        { key: 'time', label: 'Horas', value: a.times.length ? a.times.map(clock).join(', ') : null, required: false },
      ];
    case 'add_activity_goal':
      return [
        { key: 'title', label: 'Actividad', value: text(a.title), required: true },
        { key: 'time', label: 'Hora', value: a.time ? clock(a.time) : null, required: true },
        { key: 'days', label: 'Días', value: describeDays(a.days), required: false },
      ];
    case 'set_steps_goal':
      return [{ key: 'steps', label: 'Pasos al día', value: a.steps ? String(a.steps) : null, required: true }];
    case 'add_emergency_contact':
      return [
        { key: 'name', label: 'Nombre', value: text(a.name), required: true },
        { key: 'phone', label: 'Teléfono', value: a.phone ? formatPhone(a.phone) : null, required: true },
        { key: 'relation', label: 'Parentesco', value: text(a.relation), required: false },
      ];
    case 'update_emergency_contact':
      return [
        { key: 'match', label: 'Contacto', value: text(a.match), required: true },
        { key: 'phone', label: 'Teléfono nuevo', value: a.phone ? formatPhone(a.phone) : null, required: true },
      ];
    case 'set_checkin_time':
      return [{ key: 'time', label: 'Hora', value: a.time ? clock(a.time) : null, required: true }];
    case 'add_meal_reminder':
      return a.meals.map((m) => ({ key: 'time' as FieldKey, label: MEAL_NAME[m.kind], value: clock(m.time), required: true }));
    case 'add_appointment':
      return [
        { key: 'title', label: 'Cita', value: text(a.title), required: true },
        { key: 'date', label: 'Fecha', value: a.date ? longDate(a.date) : null, required: true },
        { key: 'time', label: 'Hora', value: a.time ? clock(a.time) : null, required: true },
        { key: 'address', label: 'Dirección', value: text(a.address), required: false },
        { key: 'institution', label: 'Lugar', value: text(a.institution), required: false },
        { key: 'doctor', label: 'Médico', value: text(a.doctor), required: false },
        { key: 'phone', label: 'Teléfono', value: a.phone ? formatPhone(a.phone) : null, required: false },
        { key: 'questions', label: 'Preguntas', value: a.questions?.length ? a.questions.join(' · ') : null, required: false },
      ];
    case 'add_note_for_elder':
      return [
        { key: 'title', label: 'Qué recordar', value: text(a.title), required: true },
        { key: 'time', label: 'Hora', value: a.time ? clock(a.time) : null, required: true },
        { key: 'days', label: 'Días', value: describeDays(a.days), required: false },
      ];
    case 'send_message':
      return [{ key: 'title', label: 'Mensaje', value: text(a.text), required: true }];
    default:
      return [];
  }
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function longDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS[date.getDay()]} ${d} de ${MONTHS[m - 1]}`;
}

export const isComplete = (a: AssistantAction) => draftFields(a).every((f) => !f.required || f.value !== null);
export const draftComplete = (d: Pick<Draft, 'actions'>) => d.actions.every(isComplete);

/** Primer dato obligatorio que falta en todo el borrador (BUDDY deja de preguntar cuando no hay ninguno). */
export function nextQuestion(actions: AssistantAction[], ctx: AssistantContext): DraftQuestion | null {
  for (let index = 0; index < actions.length; index++) {
    const f = draftFields(actions[index]).find((x) => x.required && x.value === null);
    if (f) return { index, field: f.key, ...questionFor(actions[index], f.key, ctx) };
  }
  return null;
}

/** Respuestas fijas del paso "Presentación". */
export const NOT_LISTED = 'No está en la lista';
export const KEEP_TYPED = (name: string) => `Dejar "${name}"`;
const UNIT_OF: Record<string, 'unit' | 'ml' | 'drops' | 'application'> = { syrup: 'ml', drops: 'drops', cream: 'application' };

const TIMES = ['8:00 a. m.', '12:00 p. m.', '6:00 p. m.', '8:00 p. m.'];

/** Pregunta y respuestas rápidas para un dato. */
export function questionFor(a: AssistantAction, field: FieldKey, ctx: AssistantContext): { question: string; quickReplies: string[] } {
  const medName = a.type === 'add_medication' && a.name ? a.name : 'el medicamento';
  switch (field) {
    case 'name':
      return a.type === 'add_emergency_contact' ? { question: '¿Cómo se llama el contacto?', quickReplies: [] } : { question: '¿Cómo se llama el medicamento?', quickReplies: [] };
    case 'product':
      if (a.type === 'add_medication' && a.suggestions?.length)
        return { question: `No encontré "${a.name}" en el registro del INVIMA. ¿Quisiste decir…?`, quickReplies: [...a.suggestions, KEEP_TYPED(a.name)] };
      return {
        question: `¿Cuál es la presentación de ${medName}? Elígela tal como dice la caja.`,
        quickReplies: a.type === 'add_medication' ? [...(a.candidates ?? []).map((c) => c.label), NOT_LISTED] : [],
      };
    case 'doseAmount': {
      const unit = a.type === 'add_medication' ? a.doseUnit : 'unit';
      return {
        question: `¿Cuánto toma de ${medName} cada vez? Escríbelo como lo indicó el médico.`,
        quickReplies: unit === 'ml' ? ['5 ml', '10 ml', '15 ml'] : unit === 'drops' ? ['5 gotas', '10 gotas', '20 gotas'] : ['½ tableta', '1 tableta', '1½ tabletas', '2 tabletas'],
      };
    }
    case 'time':
      if (a.type === 'add_medication') return { question: `¿A qué hora debe tomar ${medName}?`, quickReplies: [...TIMES, 'Dos veces al día'] };
      if (a.type === 'set_checkin_time') return { question: '¿A qué hora quieres el chequeo diario?', quickReplies: ['9:00 a. m.', '10:00 a. m.', '4:00 p. m.'] };
      if (a.type === 'add_appointment') return { question: '¿A qué hora es la cita?', quickReplies: ['8:00 a. m.', '10:00 a. m.', '2:00 p. m.'] };
      return { question: '¿A qué hora?', quickReplies: ['9:00 a. m.', '11:00 a. m.', '5:00 p. m.'] };
    case 'days':
      return { question: '¿Qué días?', quickReplies: ['Todos los días', 'De lunes a viernes', 'Fines de semana'] };
    case 'strength':
      return { question: `¿Qué concentración tiene ${medName}? Viene en la caja, por ejemplo 50 mg.`, quickReplies: ['No sé'] };
    case 'unitsPerPackage':
      return { question: '¿Cuántas unidades trae la caja o el frasco?', quickReplies: ['30', '60', 'No sé'] };
    case 'unitsOnHand':
      return { question: '¿Cuántas unidades hay ahora en casa?', quickReplies: ['10', '30', 'No sé'] };
    case 'instructions':
      return { question: '¿Alguna instrucción para tomarlo?', quickReplies: ['Con comida', 'En ayunas', 'Antes de dormir', 'Ninguna'] };
    case 'purpose':
      return { question: '¿Para qué se lo indicaron? Escríbelo con tus palabras.', quickReplies: ['No sé'] };
    case 'match':
      if (a.type === 'update_emergency_contact') return { question: '¿De qué contacto?', quickReplies: ctx.contactNames.slice(0, 4) };
      return { question: '¿Qué medicamento?', quickReplies: ctx.medicationNames.slice(0, 4) };
    case 'units':
      return { question: a.type === 'update_stock' && a.boxes ? '¿Cuántas cajas compraste?' : '¿Cuántas unidades compraste?', quickReplies: ['1', '2', '30'] };
    case 'glasses':
      return { question: '¿Cuántos vasos de agua al día?', quickReplies: ['6', '8', '10'] };
    case 'title':
      if (a.type === 'add_appointment') return { question: '¿Con quién es la cita o para qué?', quickReplies: ['Médico general', 'Odontólogo', 'Laboratorio'] };
      if (a.type === 'add_activity_goal') return { question: '¿Qué actividad?', quickReplies: ['Caminar 15 minutos', 'Estirarse 10 minutos'] };
      if (a.type === 'send_message') return { question: '¿Qué mensaje quieres enviarle?', quickReplies: [] };
      return { question: '¿Qué quieres que le recuerde?', quickReplies: [] };
    case 'date':
      return { question: '¿Qué día es la cita?', quickReplies: ['Mañana', 'Pasado mañana', 'En una semana'] };
    case 'address':
      return { question: '¿En qué dirección? Calle, ciudad y una referencia.', quickReplies: ['Aún no la sé'] };
    case 'phone':
      return { question: a.type === 'add_appointment' ? '¿Cuál es el teléfono del consultorio?' : '¿Cuál es su teléfono?', quickReplies: a.type === 'add_appointment' ? ['No lo sé'] : [] };
    case 'doctor':
      return { question: '¿Con qué médico es?', quickReplies: ['No lo sé'] };
    case 'institution':
      return { question: '¿En qué clínica, hospital o consultorio?', quickReplies: ['No lo sé'] };
    case 'questions':
      return { question: '¿Qué quieres preguntar en la cita?', quickReplies: ['Resultados de exámenes', 'Si puede hacer ejercicio', 'Ninguna'] };
    case 'relation':
      return { question: '¿Qué es para tu familiar?', quickReplies: ['Hijo', 'Hija', 'Vecino', 'No sé'] };
    case 'steps':
      return { question: '¿Cuántos pasos al día?', quickReplies: ['3000', '5000'] };
    default:
      return { question: '¿Me das ese dato?', quickReplies: [] };
  }
}

const SKIP = /^(no se|no lo se|omitir|despues|ninguna|ninguno|aun no la se|aun no se)$/;
const LOOKS_LIKE_TIME = /\d:\d{2}|\b\d{1,2}\s*(am|pm|a m|p m)\b|\bde la (manana|tarde|noche)\b/;

/** "mañana", "pasado mañana", "en una semana", "el jueves", "20 de diciembre", "20/12" (ver parseDate). */
export const parseDateAnswer = (answer: string, today = new Date()) => parseDate(answer, today);

const firstTime = (answer: string) => {
  const perDay = parseTimesPerDay(answer);
  if (perDay) return defaultTimes(perDay);
  return parseTimes(/\ba las?\b/.test(clean(answer)) ? answer : `a las ${answer}`);
};

/** Aplica la respuesta del cuidador al dato que se preguntó. Si no se entiende, la acción queda igual. */
export function applyField(a: AssistantAction, field: FieldKey, answer: string): AssistantAction {
  const t = clean(answer);
  const skip = SKIP.test(t) || t === 'no';
  const n = Number(t.match(/\d+([.,]\d+)?/)?.[0]?.replace(',', '.'));
  switch (a.type) {
    case 'add_medication':
      if (field === 'name') return { ...a, name: answer.trim().replace(/^./, (c) => c.toUpperCase()) };
      if (field === 'product') {
        if (answer === NOT_LISTED || answer === KEEP_TYPED(a.name)) return { ...a, productDecided: true, verified: null, suggestions: undefined };
        const c = a.candidates?.find((x) => x.label === answer);
        // Los datos del registro se copian tal cual; la dosis NO (la dice el cuidador después).
        return c
          ? { ...a, name: c.name, strength: c.strength, form: c.form, doseUnit: UNIT_OF[c.form] ?? 'unit', activeIngredient: c.activeIngredient, atc: c.atc, verified: c.source, productDecided: true }
          : a;
      }
      // Una hora ("8:00 p. m.") nunca se toma como dosis: BUDDY vuelve a preguntar.
      if (field === 'doseAmount' && LOOKS_LIKE_TIME.test(t)) return a;
      // "1½ tabletas" → 1.5; "½ tableta" → 0.5 (la dosis la elige el cuidador; BUDDY solo la registra).
      if (field === 'doseAmount') return applyAnswer(a, field, answer.replace(/(\d)\s*½/g, (_, d: string) => `${Number(d) + 0.5}`).replace('½', '0.5'));
      if (field === 'strength' || field === 'unitsPerPackage') return applyAnswer(a, field, answer);
      if (field === 'time') {
        const times = firstTime(answer);
        return times.length ? { ...a, times, everyHours: null, from: null } : a;
      }
      if (field === 'days') return { ...a, days: parseDays(answer) as Weekday[] };
      if (field === 'unitsOnHand') return { ...a, unitsOnHand: skip || !Number.isFinite(n) ? null : n };
      if (field === 'instructions') return { ...a, instructions: skip ? '' : answer.trim() };
      if (field === 'purpose') return { ...a, purpose: skip ? '' : answer.trim() };
      return a;
    case 'update_medication':
      if (field === 'match') return { ...a, match: answer.trim() };
      if (field === 'time') {
        const times = firstTime(answer);
        return times.length ? { ...a, times } : a;
      }
      if (field === 'doseAmount') {
        const v = parseDoseAmount(answer.replace('½', 'media')) ?? (t.includes('½') ? 0.5 : n);
        return Number.isFinite(v) && v > 0 ? { ...a, doseAmount: v } : a;
      }
      return a;
    case 'remove_medication':
      return field === 'match' ? { ...a, match: answer.trim() } : a;
    case 'update_stock':
      if (field === 'match') return { ...a, match: answer.trim() };
      if (field === 'units') return Number.isFinite(n) && n > 0 ? { ...a, units: n } : a;
      return a;
    case 'set_water_goal':
      if (field === 'glasses' && Number.isFinite(n) && n >= 1) {
        const glasses = Math.min(14, Math.round(n));
        return { ...a, glasses, times: spreadTimes(glasses) };
      }
      return a;
    case 'add_activity_goal':
      if (field === 'title') return { ...a, title: answer.trim() };
      if (field === 'time') return { ...a, time: firstTime(answer)[0] ?? a.time };
      if (field === 'days') return { ...a, days: parseDays(answer) as Weekday[] };
      return a;
    case 'set_steps_goal':
      return field === 'steps' && Number.isFinite(n) && n >= 100 ? { ...a, steps: Math.round(n) } : a;
    case 'add_emergency_contact':
      if (field === 'name') return { ...a, name: answer.trim() };
      if (field === 'phone') return { ...a, phone: parsePhones(answer)[0]?.phone ?? a.phone };
      if (field === 'relation') return { ...a, relation: skip ? '' : answer.trim() };
      return a;
    case 'update_emergency_contact':
      if (field === 'match') return { ...a, match: answer.trim() };
      if (field === 'phone') return { ...a, phone: parsePhones(answer)[0]?.phone ?? a.phone };
      return a;
    case 'set_checkin_time':
      return field === 'time' ? { ...a, time: firstTime(answer)[0] ?? a.time } : a;
    case 'add_appointment':
      if (field === 'title') return { ...a, title: answer.trim() };
      if (field === 'date') return { ...a, date: parseDateAnswer(answer) ?? a.date };
      if (field === 'time') return { ...a, time: firstTime(answer)[0] ?? a.time };
      if (field === 'address') return { ...a, address: skip ? '' : answer.trim() };
      if (field === 'institution') return { ...a, institution: skip ? undefined : answer.trim() };
      if (field === 'doctor') return { ...a, doctor: skip ? undefined : answer.trim() };
      if (field === 'phone') return skip ? { ...a, phone: undefined } : { ...a, phone: parsePhones(answer)[0]?.phone ?? a.phone };
      if (field === 'questions') return { ...a, questions: skip ? undefined : [...(a.questions ?? []), answer.trim()] };
      return a;
    case 'add_note_for_elder':
      if (field === 'title') return { ...a, title: answer.trim() };
      if (field === 'time') return { ...a, time: firstTime(answer)[0] ?? a.time };
      if (field === 'days') return { ...a, days: parseDays(answer) as Weekday[] };
      return a;
    case 'send_message':
      return field === 'title' ? { ...a, text: answer.trim() } : a;
    default:
      return a;
  }
}

/** Cierra una frase sin duplicar el punto de "a. m." / "p. m." ("6:00 p. m.." → "6:00 p. m."). */
export const sentence = (s: string) => s.replace(/m\.\./g, 'm.');

/** Respuesta de BUDDY tras confirmar: "Listo, agregué Losartán a las 6:00 p. m.". */
export function doneText(a: AssistantAction): string {
  return sentence(doneRaw(a));
}

function doneRaw(a: AssistantAction): string {
  switch (a.type) {
    case 'add_medication': {
      const when = a.everyHours ? `cada ${a.everyHours} horas desde las ${clock(a.from ?? '08:00')}` : `a las ${a.times.map(clock).join(' y ')}`;
      return `Listo, agregué ${a.name} ${when}.`;
    }
    case 'update_medication':
      return `Listo, cambié ${a.match}${a.times?.length ? ` a las ${a.times.map(clock).join(' y ')}` : ''}.`;
    case 'remove_medication':
      return `Listo, quité ${a.match} de la rutina.`;
    case 'set_water_goal':
      return `Listo, meta de ${a.glasses} vasos de agua al día.`;
    case 'add_activity_goal':
      return `Listo, agregué "${a.title}" a las ${clock(a.time ?? '17:00')}.`;
    case 'set_steps_goal':
      return `Listo, meta de ${a.steps} pasos.`;
    case 'add_emergency_contact':
      return `Listo, agregué a ${a.name} como contacto de emergencia.`;
    case 'update_emergency_contact':
      return `Listo, nuevo teléfono de ${a.match}: ${formatPhone(a.phone)}.`;
    case 'set_checkin_time':
      return `Listo, el chequeo diario será a las ${clock(a.time)}.`;
    case 'add_meal_reminder':
      return `Listo, agregué ${a.meals.map((m) => `${MEAL_NAME[m.kind].toLowerCase()} a las ${clock(m.time)}`).join(', ')}.`;
    case 'add_appointment':
      return `Listo, agregué ${a.title} el ${a.date ? longDate(a.date) : ''} a las ${clock(a.time ?? '09:00')}${a.address ? ` en ${a.address}` : ''}.`;
    case 'add_note_for_elder':
      return `Listo, le recordaré "${a.title}" a las ${clock(a.time ?? '11:00')}.`;
    case 'send_message':
      return 'Listo, le dejé tu mensaje en su pantalla de hoy.';
    default:
      return 'Listo.';
  }
}

/** ¿El texto es una confirmación ("sí", "confirmar", "dale")? */
export const isConfirmWord = (s: string) => /^(si|confirmar|confirmo|dale|listo|correcto|confirmar y agregar|agregar)$/.test(normalizeText(s).replace(/[.!¡]/g, '').trim());

// ── Flujo guiado de la tarjeta activa ─────────────────────────

/** Control con el que se responde cada dato (escribir siempre es opcional). */
export type InputKind = 'time' | 'date' | 'count' | 'choice' | 'text';

export function inputKind(a: AssistantAction, field: FieldKey): InputKind {
  if (field === 'time') return 'time';
  if (field === 'date') return 'date';
  if (field === 'glasses' || field === 'units' || field === 'unitsOnHand' || field === 'unitsPerPackage' || field === 'steps') return 'count';
  if (field === 'doseAmount' || field === 'days' || field === 'instructions' || field === 'match' || field === 'relation') return 'choice';
  if (field === 'title' && (a.type === 'add_appointment' || a.type === 'add_activity_goal')) return 'choice';
  return 'text';
}

/** Rango del contador (+/−) y su valor inicial. */
export function countRange(field: FieldKey): { min: number; max: number; step: number; start: number } {
  switch (field) {
    case 'glasses':
      return { min: 1, max: 14, step: 1, start: 8 };
    case 'steps':
      return { min: 500, max: 20000, step: 500, start: 3000 };
    case 'unitsPerPackage':
      return { min: 1, max: 500, step: 1, start: 30 };
    default:
      return { min: 1, max: 500, step: 1, start: 1 };
  }
}

/** "Paso 2 de 3": posición del dato que se pregunta entre los obligatorios. */
export function stepInfo(d: Draft): { current: number; total: number; done: number } {
  const req = d.actions.flatMap((a, index) => draftFields(a).filter((f) => f.required).map((f) => ({ ...f, index })));
  const at = d.asking ? req.findIndex((f) => f.index === d.asking!.index && f.key === d.asking!.field) : -1;
  const done = req.filter((f) => f.value !== null).length;
  return { current: at >= 0 ? at + 1 : Math.min(done + 1, req.length), total: req.length, done };
}

/** Dato obligatorio anterior al que se pregunta (para "Atrás"); null en el primero. */
export function previousField(d: Draft): { index: number; field: FieldKey } | null {
  if (!d.asking) return null;
  const req = d.actions.flatMap((a, index) => draftFields(a).filter((f) => f.required).map((f) => ({ index, field: f.key })));
  const at = req.findIndex((f) => f.index === d.asking!.index && f.field === d.asking!.field);
  return at > 0 ? req[at - 1] : null;
}

/** ¿El dato que se pregunta es opcional? (se puede omitir). */
export function isOptional(d: Draft): boolean {
  if (!d.asking) return false;
  const f = draftFields(d.actions[d.asking.index]).find((x) => x.key === d.asking!.field);
  return !!f && !f.required;
}

/** Datos opcionales vacíos que el cuidador puede agregar con un toque ("Agregar detalle"). */
export function optionalEmpty(d: Draft): { index: number; field: FieldKey; label: string }[] {
  return d.actions.flatMap((a, index) => draftFields(a).filter((f) => !f.required && f.value === null).map((f) => ({ index, field: f.key, label: f.label })));
}

/** Las 8 acciones del menú de BUDDY. */
export type MenuKey = 'medication' | 'water' | 'appointment' | 'contact' | 'meal' | 'activity' | 'medInfo' | 'day';
export const MENU: MenuKey[] = ['medication', 'water', 'appointment', 'contact', 'meal', 'activity', 'medInfo', 'day'];

/** Acción en blanco con la que arranca cada flujo guiado del menú (null = no crea borrador). */
export function menuTemplate(key: MenuKey): AssistantAction | null {
  switch (key) {
    case 'medication':
      return { type: 'add_medication', name: '', strength: null, doseAmount: null, doseUnit: 'unit', form: 'tablet', times: [], days: [], everyHours: null, from: null, unitsPerPackage: null, unitsOnHand: null, instructions: '', purpose: '' };
    case 'water':
      return { type: 'set_water_goal', glasses: 0, times: [] };
    case 'appointment':
      return { type: 'add_appointment', title: '', date: null, time: null, address: '' };
    case 'contact':
      return { type: 'add_emergency_contact', name: '', relation: '', phone: '' };
    case 'activity':
      return { type: 'add_activity_goal', kind: 'custom', title: '', time: null, minutes: null, days: [] };
    default:
      return null;
  }
}
