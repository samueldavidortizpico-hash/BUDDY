/**
 * LocalAssistantEngine: intérprete de español por reglas (sin IA). Detecta intenciones, extrae datos y, si falta algo
 * imprescindible, lo pregunta con respuestas rápidas en lugar de inventarlo. Nunca propone dosis: repite las del cuidador.
 * RemoteAssistantEngine: esqueleto para una Edge Function con LLM (Fase 6) que devuelva las mismas acciones.
 */
import { spreadTimes } from '../time';
import type { ActivityKind, MealKind, MedForm, Weekday } from '../types';
import { normalizeText } from '../validation';

import { APPOINTMENT_INTENT, parseAppointment } from './appointment';
import {
  clean,
  closest,
  defaultTimes,
  numberBefore,
  parseDays,
  parseDoseAmount,
  parseInterval,
  parsePhones,
  parseStrength,
  parseTimes,
  parseTimesPerDay,
} from './parse';
import type { AssistantAction, AssistantContext, AssistantEngine, Interpretation, MissingField, QueryTopic } from './types';

const has = (t: string, re: RegExp) => re.test(t);

export const EXAMPLES = [
  'Ponle losartán a las 6 de la tarde todos los días',
  'Ponle 8 vasos de agua al día',
  'Configúrale de emergencia a Juan, su hijo, 300 123 4567',
  'Ponle una meta de caminar 15 minutos a las 5',
];

const EMERGENCY = /\bes una emergencia\b|\buna urgencia\b|\bdolor (de|en el) pecho\b|\bse (cayo|callo)\b|\bcaida\b|\bno respira\b|\bdesmay|\binconsciente\b|\bhacerse dano\b|\bquitarse la vida\b|\bsuicid|\bconvulsion|\bsangra mucho\b|\bse ahoga\b/;
const MED_WORDS = /\b(pastillas?|tabletas?|capsulas?|medicamentos?|medicinas?|jarabe|gotas|grageas?|comprimidos?|pildoras?|inyeccion|crema|parche|\d+\s*(mg|mcg|ml|ui))\b/;
const ADD_VERBS = /^(ponle|ponerle|pon|agrega|agregale|agregar|anade|anadele|dale|darle|programa|programale|registra|registrale|configura|configurale|anota|anotale|agenda|agendale|crea|creale|apunta|apuntale)\b/;
/** Verbos que se corrigen si vienen mal escritos ("agraga", "progama", "ponlee"). */
const FIXABLE_VERBS = ['ponle', 'agrega', 'agregale', 'anade', 'anadele', 'programa', 'programale', 'registra', 'configura', 'configurale', 'recuerdale', 'agenda', 'anota'];
/** "¿Qué puedes hacer?", "ayuda": se responde con el menú de acciones. */
const HELP = /^(ayuda|ayudame|menu|opciones|que (puedes|sabes) hacer|que haces|como funciona(s)?|como te uso|para que sirves)\b/;
const QUESTION = /^(donde|como|cuanto|cuanta|cuantas|cuantos|que tal|tomo|comio|almorzo|ceno|durmio|ya tomo|ya comio|resumen|dime|dame|cual|camino|hizo|que le toca|que sigue|proxima|siguiente|a que hora|todo (bien|en orden)|esta bien|sigue bien)\b/;

/** Palabra original (con tildes) equivalente a un token normalizado, para conservar los nombres propios. */
function original(text: string, token: string): string {
  const w = text.split(/[\s,.;:!?¿¡]+/).find((x) => normalizeText(x) === token);
  const s = w ?? token;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function findName(t: string, names: string[]): string | null {
  const words = new Set(t.split(' '));
  let best: string | null = null;
  for (const n of names) {
    const nn = normalizeText(n);
    const first = nn.split(' ')[0];
    if (t.includes(nn) || (first.length >= 4 && words.has(first))) {
      if (!best || nn.length > normalizeText(best).length) best = n;
    }
  }
  if (best) return best;
  // Mal escrito ("losartam", "metformna"): la palabra más parecida a un nombre conocido.
  for (const w of words) {
    const hit = closest(w, names);
    if (hit) return hit;
  }
  return null;
}

function medForm(t: string): { form: MedForm; unit: 'unit' | 'ml' | 'drops' | 'application' } {
  if (has(t, /\bjarabe\b/)) return { form: 'syrup', unit: 'ml' };
  if (has(t, /\bgotas\b/)) return { form: 'drops', unit: 'drops' };
  if (has(t, /\bcrema\b|\bungüento\b|\bunguento\b/)) return { form: 'cream', unit: 'application' };
  if (has(t, /\bcapsulas?\b/)) return { form: 'capsule', unit: 'unit' };
  if (has(t, /\binyeccion\b/)) return { form: 'injection', unit: 'unit' };
  if (has(t, /\bparche\b/)) return { form: 'patch', unit: 'unit' };
  return { form: 'tablet', unit: 'unit' };
}

const NAME_STOP = new Set([
  'a', 'al', 'las', 'la', 'los', 'cada', 'todos', 'todo', 'en', 'por', 'con', 'veces', 'vez', 'diario', 'despues', 'antes', 'para', 'que', 'y', 'desde', 'hasta',
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'sabados', 'domingo', 'domingos', 'mg', 'ml', 'mcg', 'ui', 'de', 'del', 'una', 'un', 'dos', 'tres',
]);

/** Nombre del medicamento: lo que sigue al verbo, sin la dosis ni artículos, hasta una palabra de corte. */
function medName(t: string, raw: string, known?: string[]): string | null {
  let s = t.replace(ADD_VERBS, '').trim();
  s = s.replace(/^(le |el |la |unos |unas |un (?!cuarto)|una (?!y media))+/, '');
  s = s.replace(/^(\d+([.,]\d+)?|media|medio|una y media|un cuarto|una|un|dos|tres|cuatro)\s+(pastillas?|tabletas?|capsulas?|grageas?|comprimidos?|gotas|ml|cucharadas?)?\s*(de\s+)?/, '');
  s = s.replace(/^(pastillas?|tabletas?|capsulas?|medicamento|medicina|jarabe|gotas|crema)\s+(de\s+|para\s+)?/, '');
  s = s.replace(/^(el |la |del )/, '');
  const tokens: string[] = [];
  for (const w of s.split(' ')) {
    if (!w || NAME_STOP.has(w) || /^\d/.test(w)) {
      // "vitamina d": se admite una letra suelta tras el primer token.
      if (w && tokens.length === 1 && /^[b-df-hj-np-tv-xz]$/.test(w)) {
        tokens.push(w);
        continue;
      }
      break;
    }
    tokens.push(w);
    if (tokens.length === 3) break;
  }
  if (!tokens.length || tokens.every((tk) => GENERIC_MED.has(tk))) return null;
  const name = tokens.map((tok) => (tok.length === 1 ? tok.toUpperCase() : original(raw, tok))).join(' ');
  // "losartan" con Losartán ya registrado: mismo nombre sin tildes → se usa el registrado. Un error de ortografía
  // ("losartn") NO se corrige solo (buddy-medical-safety): el registro del INVIMA ofrecerá sugerencias para elegir.
  return known?.find((k) => normalizeText(k) === normalizeText(name)) ?? name;
}

const ACTIVITY_WORDS: [RegExp, ActivityKind, string][] = [
  [/\bcamin(ar|ata|e|o)\b|\bpasear\b|\bpaseo\b/, 'walk', 'Caminar'],
  [/\bestir(ar|amiento|arse|amientos)\b/, 'stretch', 'Estirarse'],
  [/\baire fresco\b|\bsalir al sol\b|\btomar el sol\b/, 'air', 'Tomar aire fresco'],
  [/\brespira(cion|r)\b/, 'breath', 'Respiración tranquila'],
  [/\bmusica\b|\bcancion/, 'music', 'Escuchar música'],
  [/\bleer\b|\blectura\b/, 'read', 'Leer un rato'],
];

const RELATIONS = /\b(hijo|hija|hermano|hermana|nieto|nieta|vecino|vecina|esposo|esposa|sobrino|sobrina|amigo|amiga|yerno|nuera|cunado|cunada)\b/;

const MEALS: [RegExp, MealKind][] = [
  [/\bdesayun\w*/, 'breakfast'],
  [/\balmuerz\w*|\balmuerc\w*|\balmorzar\b/, 'lunch'],
  [/\bcena\b|\bcenar\b|\bcomida de la noche\b/, 'dinner'],
  [/\bmerienda\b|\bonces\b|\bmedia manana\b/, 'snack'],
];

function queryTopic(t: string): QueryTopic | null {
  if (/recomendacion|sugerencia|novedad|alerta/.test(t)) return 'recommendations';
  if (/\bdonde (esta|anda|se encuentra)\b|\bubicacion\b/.test(t)) return 'location';
  // V5: "¿qué le toca ahora?", "¿próxima pastilla?", "¿a qué hora le toca?": la siguiente toma programada de hoy.
  if (/\bque le toca\b|\bque sigue\b|\b(proxima|siguiente) (toma|dosis|pastilla|medicina|medicamento)\b|\ba que hora (le toca|toma|se toma)\b/.test(t)) return 'next';
  if (/\bresumen\b|\bcomo (va|fue|le fue|le va)\b.*\bdia\b|\bcomo (va|esta|le fue|le va) hoy\b/.test(t)) return 'day';
  if (/\bdurmio\b|\bsueno\b|\bdormir\b/.test(t)) return 'sleep';
  if (/\bquedan?\b|\bexistencias\b|\bcuantas (pastillas|tabletas)\b/.test(t)) return 'stock';
  if (/\banimo\b|\bcomo (se siente|amanecio)\b/.test(t)) return 'mood';
  if (/\bagua\b|\bvasos?\b/.test(t)) return 'water';
  if (/\bcomio\b|\bdesayuno\b|\balmorzo\b|\bceno\b|\bcomida\b/.test(t)) return 'meals';
  if (/\bcamino\b|\bactividad\b|\bejercicio\b|\bhizo\b/.test(t)) return 'activity';
  if (/\btomo\b|\bmedicamento|\bpastilla|\bdosis\b/.test(t)) return 'medication';
  // V5: "¿cómo está mi mamá?", "¿todo bien?", "¿cómo sigue?" sin otro tema: el resumen del día (incluye el ánimo).
  if (/\bcomo (esta|sigue|anda)\b|\btodo (bien|en orden)\b|\besta bien\b|\bsigue bien\b|\bque tal (esta|va|sigue)\b/.test(t)) return 'day';
  return null;
}

/**
 * "quiero que tome X", "necesita tomar X", "pon que tome X", "quiero agregar…" significan lo mismo que una orden:
 * se normalizan a "ponle …" para que el resto de reglas las entienda.
 */
export function intentPrefix(t: string): string {
  return t.replace(
    /^(?:por favor\s+)?(?:recuerdale (?:tomar(?:se)?|que (?:se )?tome)(?! agua)|anota(?:le)? que (?:se )?tome|quiero que (?:se )?tome|quiero agregar(?:le)?|quiero anadir(?:le)?|necesita (?:tomar|tomarse)|tiene que (?:tomar|tomarse)|debe (?:tomar|tomarse)|pon(?:le)? que (?:se )?tome|que (?:se )?tome|hay que darle|agregar)\b/,
    'ponle',
  );
}

/** Palabras que no son el nombre de un medicamento ("agregar medicamento", "un remedio nuevo"). */
const GENERIC_MED = new Set(['medicamento', 'medicamentos', 'medicina', 'medicinas', 'remedio', 'pastilla', 'nuevo', 'nueva', 'otro', 'otra', 'ponle']);

const MEAL_TIME: Record<MealKind, string> = { breakfast: '07:30', lunch: '12:30', dinner: '18:30', snack: '16:00' };

/** Corrige el verbo inicial mal escrito ("agraga dolex" → "agrega dolex"). */
function fixVerb(t: string): string {
  const [first, ...rest] = t.split(' ');
  if (!first || ADD_VERBS.test(first) || /^(recuerdale|quitale|cambiale)$/.test(first)) return t;
  const fixed = closest(first, FIXABLE_VERBS);
  return fixed ? [fixed, ...rest].join(' ') : t;
}

export function interpretText(raw: string, ctx: AssistantContext): Interpretation {
  const today = ctx.today ?? new Date();
  const t = intentPrefix(fixVerb(clean(raw)));
  const actions: AssistantAction[] = [];
  const missing: MissingField[] = [];
  const isQuestion = raw.includes('?') || QUESTION.test(t);

  if (!t) return { actions, missing, reply: null, understood: false };

  // 1. Urgencias: siempre primero.
  if (EMERGENCY.test(t)) return { actions: [{ type: 'emergency' }], missing, reply: null, understood: true };

  // 1a. Saludo y agradecimiento (V4): una respuesta corta, nunca "No entendí".
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches)\b/.test(t) && t.split(' ').length <= 3) return { actions, missing, reply: `¡Hola! ¿Qué hacemos hoy por ${ctx.elderName}?`, understood: true };
  if (/^(gracias|muchas gracias|mil gracias)\b/.test(t)) return { actions, missing, reply: 'Con gusto. Aquí estoy si necesitas algo más.', understood: true };
  // V5: charla corta. BUDDY se presenta o responde y vuelve a lo que importa: cómo va el día de la persona cuidada.
  if (/^(quien eres|que eres|como te llamas)\b/.test(t)) return { actions, missing, reply: `Soy BUDDY. Te ayudo con la rutina de ${ctx.elderName} y te cuento cómo va su día con lo que está registrado.`, understood: true };
  if (/^(como estas|como vas|que tal estas|que tal)$/.test(t)) return { actions, missing, reply: `¡Muy bien, gracias! ¿Te cuento cómo va el día de ${ctx.elderName}?`, understood: true };

  // 1b. Ayuda: el menú de acciones.
  if (HELP.test(t)) return { actions: [{ type: 'show_menu' }], missing, reply: null, understood: true };

  // 1c. "¿Para qué sirve el losartán?", "¿qué es el dolex?": información verificada (nunca de memoria).
  const info = t.match(/\b(?:para que (?:sirve|es|se usa)|que es|que hace|informacion (?:de|del|sobre))\s+(?:el |la |los |las )?([a-z0-9]+(?: [a-z0-9]+)?)/);
  if (info && !ADD_VERBS.test(t)) {
    const name = findName(t, ctx.medicationNames) ?? original(raw, info[1].split(' ')[0]);
    return { actions: [{ type: 'medication_info', name }], missing, reply: null, understood: true };
  }

  // 1d. Citas, controles y exámenes (antes que contactos: una cita puede traer el teléfono del consultorio).
  if (APPOINTMENT_INTENT.test(t)) return { actions: [parseAppointment(raw, today)], missing, reply: null, understood: true };

  // 2. Cámara y sugerencias.
  if (/\bescane\w*|\bcamara\b|\bfoto (del|de la|de un|de una) (medicamento|caja|envase|remedio)\b/.test(t)) return { actions: [{ type: 'open_scan' }], missing, reply: null, understood: true };
  if (/\brecomienda\w*|\bsugier\w*|\bque actividades\b|\bideas\b.*\bactividad/.test(t)) return { actions: [{ type: 'suggest_routine' }], missing, reply: null, understood: true };

  // 3. Preguntas: se responden solo con registros reales (el ejecutor consulta los datos).
  if (isQuestion && !ADD_VERBS.test(t)) {
    const topic = queryTopic(t);
    if (topic) {
      return { actions: [{ type: 'query_summary', topic, match: findName(t, ctx.medicationNames), ...(/esta semana|ultimos siete dias|esta ultima semana/.test(t) ? { period: 'week' as const } : {}) }], missing, reply: null, understood: true };
    }
  }

  // 3b. Mensajes para el adulto mayor: "mándale un mensaje: te quiero mucho", "dile que lo llamo a las 5".
  const msg = raw.match(/^\s*(?:m[aá]ndale|env[ií]ale|escr[ií]bele|dile|d[ií]gale)\s+(?:un\s+)?(?:mensaje\s*)?(?:que\s+|:\s*|diciendo\s+)?(.+)$/i);
  if (msg && msg[1].trim().length > 1) {
    const text = msg[1].trim().replace(/^["“]|["”]$/g, '');
    return { actions: [{ type: 'send_message', text: text.charAt(0).toUpperCase() + text.slice(1) }], missing, reply: null, understood: true };
  }

  // 4. Quitar o cambiar medicamentos y contactos existentes.
  if (/\b(quitale|quita|quitarle|elimina|eliminale|borra|borrale|suspende|suspendele)\b/.test(t)) {
    const match = findName(t, ctx.medicationNames);
    actions.push({ type: 'remove_medication', match: match ?? '' });
    if (!match) missing.push({ actionIndex: 0, field: 'match', question: '¿Qué medicamento quieres quitar?', quickReplies: ctx.medicationNames.slice(0, 4), optional: false });
    return { actions, missing, reply: null, understood: true };
  }
  if (/\b(cambiale|cambia|cambiar|mueve|muevele|pasale|pasa|corre|correle)\b/.test(t)) {
    const phones = parsePhones(raw);
    const contact = findName(t, ctx.contactNames);
    if (phones.length && contact) return { actions: [{ type: 'update_emergency_contact', match: contact, phone: phones[0].phone }], missing, reply: null, understood: true };
    const match = findName(t, ctx.medicationNames);
    const times = parseTimes(t);
    const dose = parseDoseAmount(t);
    if (match || times.length) {
      actions.push({ type: 'update_medication', match: match ?? '', times: times.length ? times : null, doseAmount: dose });
      if (!match) missing.push({ actionIndex: 0, field: 'match', question: '¿Qué medicamento quieres cambiar?', quickReplies: ctx.medicationNames.slice(0, 4), optional: false });
      return { actions, missing, reply: null, understood: true };
    }
  }

  // 5a. Existencias que se corrigen: "quedan 10 pastillas de losartán" (antes creaba un medicamento nuevo).
  if (/^(le )?quedan?\b/.test(t) && !isQuestion) {
    const units = numberBefore(t, /^(pastillas?|tabletas?|capsulas?|unidades|ml|gotas)$/);
    const match = findName(t, ctx.medicationNames);
    if (units !== null) {
      actions.push({ type: 'update_stock', match: match ?? '', units, mode: 'set' });
      if (!match) missing.push({ actionIndex: 0, field: 'match', question: '¿De qué medicamento?', quickReplies: ctx.medicationNames.slice(0, 4), optional: false });
      return { actions, missing, reply: null, understood: true };
    }
  }

  // 5. Existencias: "compré 30 pastillas de losartán".
  if (/\b(compre|compramos|compro|trajimos|traje|llegaron|consegui)\b/.test(t)) {
    const units = numberBefore(t, /^(pastillas?|tabletas?|capsulas?|unidades|ml|gotas|cajas?)$/);
    const boxes = /\bcajas?\b/.test(t);
    const match = findName(t, ctx.medicationNames);
    if (units !== null) {
      actions.push({ type: 'update_stock', match: match ?? '', units, mode: 'add', boxes });
      if (!match) missing.push({ actionIndex: 0, field: 'match', question: '¿De qué medicamento?', quickReplies: ctx.medicationNames.slice(0, 4), optional: false });
      return { actions, missing, reply: null, understood: true };
    }
  }

  // 6. Contactos de emergencia (uno o varios, cada uno con su teléfono).
  const phones = parsePhones(raw);
  if (phones.length && (/\bemergencia\b|\bcontacto\b|\bllamar\b|\btelefono\b|\bnumero\b|\bsu (hijo|hija|hermano|hermana|nieto|nieta|vecino|vecina|esposo|esposa|sobrino|sobrina)\b/.test(t))) {
    let start = 0;
    for (const p of phones) {
      const segment = raw.slice(start, p.index);
      start = p.index + p.phone.length + 3;
      const seg = clean(segment);
      const relation = seg.match(/\bsu ([a-z]+)\b/)?.[1] ?? seg.match(RELATIONS)?.[1] ?? '';
      // Nombre: palabra con mayúscula del segmento original (o la palabra tras "a ").
      const caps = segment.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)(?:\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+))?/g)?.filter((w) => !/^(Configúrale|Configurale|Ponle|Agrega|Agrégale|Pon|Su|Y|De|A|Emergencia)$/.test(w.split(' ')[0])) ?? [];
      const afterA = seg.match(/\ba ([a-z]+)\b/)?.[1];
      const name = caps[0] ?? (afterA && !['su', 'la', 'el'].includes(afterA) ? original(segment, afterA) : '');
      actions.push({ type: 'add_emergency_contact', name, relation: relation ? relation.charAt(0).toUpperCase() + relation.slice(1) : '', phone: p.phone });
      if (!name) missing.push({ actionIndex: actions.length - 1, field: 'name', question: `¿Cómo se llama el contacto del número ${p.phone}?`, quickReplies: [], optional: false });
    }
    return { actions, missing, reply: null, understood: true };
  }
  if (/\bcontacto\b|\bde emergencia\b/.test(t) && !phones.length && !isQuestion) {
    actions.push({ type: 'add_emergency_contact', name: '', relation: '', phone: '' });
    return { actions, missing, reply: null, understood: true };
  }

  // 7. Agua.
  const glasses = numberBefore(t, /^vasos?$/);
  if (glasses !== null && /\bagua\b|\bvasos?\b/.test(t)) {
    const n = Math.min(14, Math.max(1, glasses));
    actions.push({ type: 'set_water_goal', glasses: n, times: spreadTimes(n) });
  } else if (/\bagua\b/.test(t) && !isQuestion && !MED_WORDS.test(t)) {
    // "ponle agua": falta cuántos vasos (0 = por preguntar).
    actions.push({ type: 'set_water_goal', glasses: 0, times: [] });
    missing.push({ actionIndex: actions.length - 1, field: 'glasses', question: '¿Cuántos vasos de agua al día?', quickReplies: ['6', '8', '10'], optional: false });
  }

  // 8. Comidas: cada una con la hora que la sigue.
  const mealHits = MEALS.map(([re, kind]) => ({ kind, idx: t.search(re) })).filter((m) => m.idx >= 0).sort((a, b) => a.idx - b.idx);
  // "metformina en el desayuno y la cena": las comidas son la HORA del medicamento, no un recordatorio de comida.
  const mealAsTime = mealHits.length > 0 && /\b(en|con|al|despues del|antes del|despues de|antes de) (el |la )?(desayuno|almuerzo|cena)\b/.test(t) && !!medName(t, raw, ctx.medicationNames);
  if (mealHits.length && !isQuestion && !mealAsTime) {
    const meals = mealHits.map((m, i) => {
      const segment = t.slice(m.idx, mealHits[i + 1]?.idx ?? t.length);
      const time = parseTimes(segment)[0] ?? ({ breakfast: '07:30', lunch: '12:30', dinner: '18:30', snack: '16:00' } as const)[m.kind];
      // "almuerzo a la 1" = 13:00 (parseTimes ya entiende 1–6 como de la tarde).
      return { kind: m.kind, time };
    });
    actions.push({ type: 'add_meal_reminder', meals });
  }

  // 9. Chequeo diario.
  if (/\bchequeo\b|\bpreguntas\b/.test(t)) {
    const time = parseTimes(t)[0];
    if (time) actions.push({ type: 'set_checkin_time', time });
    else {
      actions.push({ type: 'set_checkin_time', time: '' });
      missing.push({ actionIndex: actions.length - 1, field: 'time', question: '¿A qué hora quieres el chequeo?', quickReplies: ['9:00 a. m.', '10:00 a. m.', '4:00 p. m.'], optional: false });
    }
  }

  // 11. Recordatorios para el adulto mayor ("recuérdale llamar a su nieta los domingos").
  const isNote = /\b(recuerdale|recordarle|recordale|que no se le olvide|recordatorio)\b/.test(t);
  if (isNote && !actions.length) {
    let title = t.replace(/^.*?\b(recuerdale|recordarle|recordale|que no se le olvide|recordatorio de|recordatorio)\b\s*(que\s+)?/, '');
    // Se quitan del final, una por una, las partes de horario ("los domingos", "a las 5"…).
    for (let prev = ''; prev !== title; ) {
      prev = title;
      title = title.replace(/\s*\b(todos los dias|(?:el|los) (?:lunes|martes|miercoles|jueves|viernes|sabados?|domingos?)|a las? .*|cada .*)$/, '').trim();
    }
    // Conserva tildes y mayúsculas de los nombres propios ("Juan", "nieta").
    const restored = title.split(' ').map((w) => (raw.includes(original(raw, w)) && /[A-ZÁÉÍÓÚÑ]/.test(original(raw, w)[0]) && raw.split(/\s+/).includes(original(raw, w)) ? original(raw, w) : w)).join(' ');
    const pretty = restored ? restored.charAt(0).toUpperCase() + restored.slice(1) : 'Recordatorio';
    actions.push({ type: 'add_note_for_elder', title: pretty, time: parseTimes(t)[0] ?? null, days: parseDays(t) });
  }

  // 12. Actividad y pasos.
  const act = ACTIVITY_WORDS.find(([re]) => re.test(t));
  if (act && !isNote) {
    const minutes = numberBefore(t, /^min(utos?)?$/);
    const place = t.match(/\bpor (el|la) ([a-z]+)\b/);
    const title = `${act[2]}${minutes ? ` ${minutes} minutos` : ''}${place ? ` por ${place[1]} ${place[2]}` : ''}`;
    actions.push({ type: 'add_activity_goal', kind: act[1], title, time: parseTimes(t)[0] ?? null, minutes, days: parseDays(t) });
  }
  const steps = numberBefore(t, /^pasos$/);
  if (steps !== null) actions.push({ type: 'set_steps_goal', steps });

  // 13. Medicamento nuevo (si no se reconoció otra cosa, o si hay palabras de medicamento).
  const otherIntent = actions.length > 0;
  if ((!otherIntent && (ADD_VERBS.test(t) || MED_WORDS.test(t))) || (otherIntent && MED_WORDS.test(t) && !/\bagua\b/.test(t))) {
    // Sin nombre pero claramente un medicamento ("agregar medicamento"): se pregunta el nombre.
    const name = medName(t, raw, ctx.medicationNames) ?? (/\b(medicamento|medicina|remedio|pastilla)\b/.test(t) && !otherIntent ? '' : null);
    if (name !== null) {
      const interval = parseInterval(t);
      const perDay = parseTimesPerDay(t);
      const explicit = parseTimes(t);
      const mealTimes = mealAsTime ? [...new Set(mealHits.map((m) => MEAL_TIME[m.kind]))].sort() : [];
      const times = interval ? [] : explicit.length ? explicit : perDay ? defaultTimes(perDay) : mealTimes;
      const { form, unit } = medForm(t);
      const amount = unit === 'ml' ? numberBefore(t, /^ml$/) : unit === 'drops' ? numberBefore(t, /^gotas$/) : parseDoseAmount(t);
      const idx = actions.length;
      actions.push({
        type: 'add_medication',
        name,
        strength: parseStrength(t),
        doseAmount: amount,
        doseUnit: unit,
        form,
        times,
        days: parseDays(t),
        everyHours: interval?.everyHours ?? null,
        from: interval?.from ?? null,
        unitsPerPackage: numberBefore(t, /^(pastillas|tabletas|capsulas|unidades)$/) && /\b(caja|frasco|trae|viene)\b/.test(t) ? numberBefore(t, /^(pastillas|tabletas|capsulas|unidades)$/) : null,
        unitsOnHand: null,
        instructions: /\bcon (la )?comida\b/.test(t) || mealAsTime ? 'Con comida' : /\ben ayunas\b/.test(t) ? 'En ayunas' : /\bantes de dormir\b/.test(t) ? 'Antes de dormir' : '',
        purpose: '',
      });
      if (!name) missing.push({ actionIndex: idx, field: 'name', question: '¿Cómo se llama el medicamento?', quickReplies: [], optional: false });
      if (!times.length && !interval) missing.push({ actionIndex: idx, field: 'time', question: `¿A qué hora debe tomar ${name}?`, quickReplies: ['8:00 a. m.', '8:00 p. m.', 'Dos veces al día'], optional: false });
      if (amount === null)
        missing.push({
          actionIndex: idx,
          field: 'doseAmount',
          question: `¿Cuánto toma de ${name} cada vez? Escríbelo como lo indicó el médico.`,
          quickReplies: unit === 'ml' ? ['5 ml', '10 ml'] : unit === 'drops' ? ['5 gotas', '10 gotas'] : ['1 tableta', '½ tableta', '2 tabletas'],
          optional: false,
        });
      if (!parseStrength(t)) missing.push({ actionIndex: idx, field: 'strength', question: `¿Qué concentración tiene ${name}? (viene en la caja, por ejemplo 50 mg)`, quickReplies: ['No sé'], optional: true });
      missing.push({ actionIndex: idx, field: 'unitsPerPackage', question: '¿Cuántas unidades trae la caja o el frasco? Así te aviso antes de que se acaben.', quickReplies: ['30', '60', 'No sé'], optional: true });
    }
  }

  if (!actions.length) {
    return {
      actions,
      missing,
      reply: `No entendí del todo. Puedes decirme, por ejemplo: "${EXAMPLES[0]}" o "${EXAMPLES[1]}".`,
      understood: false,
    };
  }
  return { actions, missing: missing.filter((m) => !(m.field === 'unitsPerPackage' && (actions[m.actionIndex] as { unitsPerPackage?: number | null }).unitsPerPackage)), reply: null, understood: true };
}

/** Aplica la respuesta a un dato que faltaba ("½ tableta", "50 mg", "8 pm", "30", "No sé"). */
export function applyAnswer(action: AssistantAction, field: MissingField['field'], answer: string): AssistantAction {
  const t = clean(answer);
  const skip = /\bno se\b|\bno lo se\b|\bomitir\b|\bdespues\b/.test(t);
  if (action.type === 'add_medication') {
    if (field === 'doseAmount') {
      const v = action.doseUnit === 'ml' ? numberBefore(t, /^ml$/) ?? Number(t.match(/\d+([.,]\d+)?/)?.[0]?.replace(',', '.')) : action.doseUnit === 'drops' ? numberBefore(t, /^gotas$/) ?? Number(t.match(/\d+/)?.[0]) : parseDoseAmount(answer.replace('½', 'media')) ?? (t.includes('½') ? 0.5 : Number(t.match(/\d+([.,]\d+)?/)?.[0]?.replace(',', '.')));
      return { ...action, doseAmount: Number.isFinite(v) && v ? v : action.doseAmount };
    }
    if (field === 'strength') return { ...action, strength: skip ? '' : (parseStrength(answer) ?? answer.trim()) };
    if (field === 'unitsPerPackage') return { ...action, unitsPerPackage: skip ? null : Number(t.match(/\d+/)?.[0]) || null };
    if (field === 'time') {
      const perDay = parseTimesPerDay(t);
      const times = perDay ? defaultTimes(perDay) : parseTimes(answer.includes('a las') ? answer : `a las ${answer}`);
      return { ...action, times: times.length ? times : action.times };
    }
  }
  if (action.type === 'set_checkin_time' && field === 'time') return { ...action, time: parseTimes(`a las ${answer}`)[0] ?? action.time };
  if ((action.type === 'remove_medication' || action.type === 'update_medication' || action.type === 'update_stock') && field === 'match') return { ...action, match: answer.trim() };
  if (action.type === 'add_emergency_contact' && field === 'name') return { ...action, name: answer.trim() };
  return action;
}

export const localAssistantEngine: AssistantEngine = {
  interpret: async (text, ctx) => interpretText(text, ctx),
};

/** Esqueleto Fase 6: llamará a una Edge Function de Supabase que use un LLM con TOOL_SCHEMAS. */
export const remoteAssistantEngine: AssistantEngine = {
  interpret: async () => {
    throw new Error('RemoteAssistantEngine no está configurado (Fase 6).');
  },
};

export type { Weekday };
