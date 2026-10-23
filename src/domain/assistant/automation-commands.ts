import { parseDays, parseTimes } from './parse';

export type AutomationKind = NonNullable<import('../types').Reminder['automation']>['kind'];
export type AutomationCommand =
  | { type: 'list' }
  | { type: 'pause'; kind: AutomationKind }
  | { type: 'resume'; kind: AutomationKind }
  | { type: 'delete'; kind: AutomationKind }
  | { type: 'set_time'; kind: AutomationKind; time: string }
  | { type: 'create'; items: { kind: AutomationKind; time: string; medication?: string; days: import('../types').Weekday[] }[] };

const kindFor = (s: string): AutomationKind | null => {
  if (/losartan|medicamento|pastilla|tome/.test(s) && /no se|no tomo|si no/.test(s)) return 'medication_alert';
  if (/durm|sueno/.test(s)) return 'sleep';
  if (/siente mal emocional|emocional/.test(s)) return 'emotional';
  if (/siente|animo|sentir/.test(s)) return 'mood';
  if (/agua|vaso/.test(s)) return 'water';
  if (/desayun|almuerz|almorz|cen|comid/.test(s)) return 'meal';
  if (/camin|pase/.test(s)) return 'walk';
  return null;
};

/** Intérprete local determinista; no afirma programación remota ni inventa respuestas. */
export function interpretAutomationCommand(input: string): AutomationCommand | null {
  const s = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/automatizacion|pregunta/.test(s) && /(que|cuales|lista|tiene|ver|mostrar)/.test(s)) return { type: 'list' };
  const kind = kindFor(s);
  if (!kind) return null;
  if (/\b(pausa|pausale|pausala|deten|desactiva|suspende)\b/.test(s)) return { type: 'pause', kind };
  if (/\b(reactiva|reanuda|activa de nuevo|continua)\b/.test(s)) return { type: 'resume', kind };
  if (/\b(borra|elimina|quita)\b/.test(s) && /automatizacion|pregunta/.test(s)) return { type: 'delete', kind };
  const times = parseTimes(s);
  if (/\b(cambia|cambiale|mueve|pasa|ponla|ajusta)\b/.test(s) && /\b(a las|para las|a la)\b/.test(s) && times.length) return { type: 'set_time', kind, time: times.at(-1)! };
  if (/pregunt|avis|recuerd|recordatorio/.test(s)) {
    if (kind === 'medication_alert') {
      const medication = s.match(/(?:tome|toma|tomar|tomarse) (?:el |la )?([a-z]+(?: [a-z]+)?)/)?.[1];
      return { type: 'create', items: [{ kind, time: times[0] ?? '', medication, days: parseDays(s) }] };
    }
    const matches: { kind: AutomationKind; index: number }[] = [];
    const re = /como se siente|como te sientes|como durmio|como dormiste|emocional|tomar agua|vaso de agua|desayun|almuerz|cenar|caminata|caminar/g;
    for (const m of s.matchAll(re)) {
      const k = kindFor(m[0]);
      if (k) matches.push({ kind: k, index: m.index ?? 0 });
    }
    if (!matches.length) matches.push({ kind, index: 0 });
    const result = matches.map((m, i) => {
      const next = matches[i + 1]?.index ?? s.length;
      const segment = s.slice(Math.max(0, m.index - 35), next);
      const found = parseTimes(segment);
      const time = found.at(-1) ?? times[i] ?? times[0];
      if (!time) return null;
      return { kind: m.kind, time, days: parseDays(segment) };
    }).filter((x): x is NonNullable<typeof x> => !!x);
    if (result.length) return { type: 'create', items: result };
  }
  return null;
}

export const AUTOMATION_CORPUS = [
  ...['todos los días', 'cada día', 'diariamente', 'en la noche', 'por la noche', 'a diario', 'todas las noches', 'cada noche', 'cada tarde', 'cada semana los lunes'].map((v) => `pregúntale ${v} a las 8 cómo se siente`),
  ...['por la mañana', 'en la mañana', 'al despertar', 'cada mañana', 'todas las mañanas', 'diariamente', 'cada día', 'a diario', 'en la madrugada', 'temprano'].map((v) => `pregúntale ${v} a las 7 cómo durmió`),
  'pregúntale a las 8 cómo se siente y a las 7 cómo durmió',
  'avísame si no se toma losartán', 'pausa la pregunta del sueño', 'reanuda la pregunta del sueño', '¿qué automatizaciones tiene?',
  'cámbiale la pregunta de cómo se siente a las 9', 'pregúntale todos los días a las 8 cómo se siente',
  'en la mañana a las 7 pregúntale cómo durmió', 'pregúntale si ya tomó agua a las 10', 'pregúntale si ya desayunó a las 8',
  'pregúntale si ya almorzó a la 1', 'pregúntale si ya cenó a las 7', 'pregúntale si hizo su caminata a las 5',
  'pregúntale si se siente mal emocionalmente a las 6', 'pausa la automatización de ánimo', 'reanuda cómo se siente',
  'borra la pregunta de cómo durmió', 'qué preguntas tiene programadas', 'mueve cómo durmió para las 6',
  'pregúntale diariamente a las 20 cómo se siente', 'pregúntale los lunes a las 8 cómo se siente',
  'recuérdale tomar agua a las 11', 'recuérdale caminar a las 4', 'avísame si no toma la pastilla losartán',
  'pregúntale todos los días a las 9 cómo se siente y a las 7 cómo durmió', 'pregúntale cómo se siente a las 8 de la noche',
  'pregúntale cómo durmió a las 7 de la mañana', 'activa de nuevo la pregunta de cómo se siente',
  'elimina la automatización de caminata', 'qué automatizaciones tiene activas',
];
