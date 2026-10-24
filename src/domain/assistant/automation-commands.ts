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

const pad = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/**
 * Mañana o tarde según el contexto (V4): "cada noche a las 9" es 21:00; "cómo durmió a las 6", 06:00; "si ya cenó a
 * las 7", 19:00. Solo cambia horas ambiguas: lo explícito ("de la mañana", "a las 20") se respeta.
 */
function settle(kind: AutomationKind, time: string, part: string): string {
  if (!time) return time;
  const [h, m] = time.split(':').map(Number);
  if (/\b(noche|tarde)\b/.test(part)) return h < 12 ? pad(h + 12, m) : time;
  if (/\b(manana|madrugada|despertar|temprano|am)\b/.test(part)) return h >= 12 && !/\b(1[3-9]|2[0-3])\b/.test(part) ? pad(h - 12, m) : time;
  if (/\b(1[3-9]|2[0-3])(:|\b)/.test(part)) return time;
  if (kind === 'sleep' && h >= 12) return pad(h - 12, m);
  if (kind === 'meal' && /\bcen/.test(part) && h < 12) return pad(h + 12, m);
  return time;
}

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
  if (/\b(cambia|cambiale|mueve|pasa|ponla|ajusta)\b/.test(s) && /\b(a las|para las|a la)\b/.test(s) && times.length) return { type: 'set_time', kind, time: settle(kind, times.at(-1)!, s) };
  if (/pregunt|avis|recuerd|recordatorio/.test(s)) {
    if (kind === 'medication_alert') {
      const medication = s.match(/(?:tome|toma|tomar|tomarse) (?:el |la )?(?:pastilla |pastillas |medicamento |remedio |medicina )?(?:de |del )?([a-z]+(?: [a-z]+)?)/)?.[1];
      return { type: 'create', items: [{ kind, time: times[0] ?? '', medication, days: parseDays(s) }] };
    }
    // V4: cada parte separada por " y " es una pregunta con su propia hora ("a las 8 de la noche cómo se siente y a las
    // 7 de la mañana cómo durmió"). Antes ambas tomaban la última hora del mensaje.
    const re = /como se siente|como te sientes|como durmio|como dormiste|emocional|tomar agua|tomo agua|vaso de agua|desayun|almuerz|almorz|cenar|ceno|caminata|caminar/g;
    const parts = s.split(/\s+y\s+(?=(?:a las|a la|preguntale|como|si|recuerdale|en la|por la|cada|todos|todas)\b)/);
    const result: { kind: AutomationKind; time: string; days: import('../types').Weekday[] }[] = [];
    parts.forEach((part, i) => {
      const found = [...part.matchAll(re)].map((m) => kindFor(m[0])).filter((k): k is AutomationKind => !!k);
      const k = found[0] ?? (parts.length === 1 ? kind : null);
      if (!k) return;
      const time = parseTimes(part).at(-1) ?? (parts.length === 1 ? times[0] : times[i]) ?? '';
      // Sin hora: se crea igual y el chat pregunta "¿A qué hora le pregunto?".
      result.push({ kind: k, time: settle(k, time, part), days: parseDays(part) });
    });
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
