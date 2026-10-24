/**
 * V4 Fase 8: el chat se entiende y actúa. 40 frases de la guía (docs/VOZ_DE_BUDDY.md) + 40 de preguntas programadas y
 * combinaciones, con 90 % de acierto mínimo, y la revisión automática de que cada respuesta cumple la guía de voz.
 */
import { interpretAutomationCommand, type AutomationCommand } from '@/domain/assistant/automation-commands';
import { interpretText } from '@/domain/assistant/engine';
import { voiceIssues } from '@/domain/assistant/voice';
import { strings } from '@/i18n';

const ctx = { elderName: 'Rosa', medicationNames: ['Losartán'], contactNames: ['Juan'], today: new Date(2026, 9, 23, 9) };

/** Frase → acción esperada ("tipo" o "query_summary:tema") o respuesta directa (/regex/). */
const GUIDE: [string, string | RegExp][] = [
  ['¿se tomó todo hoy?', 'query_summary:medication'],
  ['¿cómo durmió esta semana?', 'query_summary:sleep'],
  ['¿cómo está hoy?', 'query_summary:day'],
  ['¿cuánta agua ha tomado?', 'query_summary:water'],
  ['¿ya desayunó?', 'query_summary:meals'],
  ['¿dónde está mi mamá?', 'query_summary:location'],
  ['¿cuántas pastillas le quedan de losartán?', 'query_summary:stock'],
  ['¿cómo está de ánimo?', 'query_summary:mood'],
  ['¿hizo la caminata?', 'query_summary:activity'],
  ['dame el resumen del día', 'query_summary:day'],
  ['¿hay alguna novedad?', 'query_summary:recommendations'],
  ['agrégale losartán 50 mg a las 8 de la mañana', 'add_medication'],
  ['ponle metformina después del almuerzo', 'add_medication'],
  ['agrega dolex cada 8 horas', 'add_medication'],
  ['cambia el losartán a las 9', 'update_medication'],
  ['quítale el losartán', 'remove_medication'],
  ['compré 2 cajas de losartán', 'update_stock'],
  ['quedan 10 pastillas de losartán', 'update_stock'],
  ['que tome 8 vasos de agua al día', 'set_water_goal'],
  ['agrega a Juan, su hijo, 3001234567 como contacto de emergencia', 'add_emergency_contact'],
  ['cita con el cardiólogo el jueves a las 10', 'add_appointment'],
  ['recuérdale desayunar a las 7', 'add_meal_reminder'],
  ['que camine 20 minutos a las 5 de la tarde', 'add_activity_goal'],
  ['el chequeo a las 10 de la mañana', 'set_checkin_time'],
  ['quiero escanear la caja del medicamento', 'open_scan'],
  ['¿para qué sirve el losartán?', 'medication_info'],
  ['dile que la quiero mucho', 'send_message'],
  ['es una emergencia', 'emergency'],
  ['¿qué puedes hacer?', 'show_menu'],
  ['sugiéreme una rutina', 'suggest_routine'],
  ['que camine 5000 pasos al día', 'set_steps_goal'],
  ['recuérdale llamar a la tía a las 4', 'add_note_for_elder'],
  ['¿cómo amaneció?', 'query_summary:mood'],
  ['¿comió bien hoy?', 'query_summary:meals'],
  ['¿cuántas veces tomó agua?', 'query_summary:water'],
  ['agrégale acetaminofén de 500 a las 8 y a las 8 de la noche', 'add_medication'],
  ['cambia el número de Juan a 3109876543', 'update_emergency_contact'],
  ['¿cómo le fue hoy?', 'query_summary:day'],
  ['hola', /^¡Hola! ¿Qué hacemos hoy por Rosa\?$/],
  ['gracias', /^Con gusto\./],
];

type Want = AutomationCommand['type'] | `${'create' | 'set_time' | 'pause' | 'resume' | 'delete'}:${string}`;
/** Frase → "tipo" o "tipo:clase@hora[,clase@hora]" de la pregunta programada. */
const AUTOMATIONS: [string, Want][] = [
  ['pregúntale todos los días a las 8 de la noche cómo se siente', 'create:mood@20:00'],
  ['en la mañana a las 7 pregúntale cómo durmió', 'create:sleep@07:00'],
  ['pregúntale a las 8 de la noche cómo se siente y a las 7 de la mañana cómo durmió', 'create:mood@20:00,sleep@07:00'],
  ['avísame si no se toma el losartán', 'create:medication_alert@'],
  ['cámbiale la pregunta de cómo se siente a las 9', 'set_time:mood@09:00'],
  ['pausa la pregunta del sueño', 'pause:sleep'],
  ['¿qué automatizaciones tiene?', 'list'],
  ['pregúntale cada noche a las 9 cómo se siente', 'create:mood@21:00'],
  ['pregúntale diariamente a las 20 cómo se siente', 'create:mood@20:00'],
  ['pregúntale los lunes a las 8 cómo se siente', 'create:mood@08:00'],
  ['pregúntale al despertar a las 6 cómo durmió', 'create:sleep@06:00'],
  ['pregúntale todas las mañanas a las 7 cómo durmió', 'create:sleep@07:00'],
  ['pregúntale si ya tomó agua a las 10', 'create:water@10:00'],
  ['pregúntale si ya desayunó a las 8', 'create:meal@08:00'],
  ['pregúntale si ya almorzó a la 1', 'create:meal@13:00'],
  ['pregúntale si ya cenó a las 7', 'create:meal@19:00'],
  ['pregúntale si hizo su caminata a las 5', 'create:walk@17:00'],
  ['pregúntale si se siente mal emocionalmente a las 6', 'create:emotional@18:00'],
  ['recuérdale tomar agua a las 11', 'create:water@11:00'],
  ['recuérdale caminar a las 4', 'create:walk@16:00'],
  ['reanuda la pregunta del sueño', 'resume:sleep'],
  ['activa de nuevo la pregunta de cómo se siente', 'resume:mood'],
  ['pausa la automatización de ánimo', 'pause:mood'],
  ['borra la pregunta de cómo durmió', 'delete:sleep'],
  ['elimina la automatización de caminata', 'delete:walk'],
  ['mueve cómo durmió para las 6', 'set_time:sleep@06:00'],
  ['qué preguntas tiene programadas', 'list'],
  ['qué automatizaciones tiene activas', 'list'],
  ['avísame si no toma la pastilla losartán', 'create:medication_alert@'],
  ['pregúntale todos los días a las 9 cómo se siente y a las 7 cómo durmió', 'create:mood@09:00,sleep@07:00'],
  ['pregúntale cómo se siente a las 8 de la noche', 'create:mood@20:00'],
  ['pregúntale cómo durmió a las 7 de la mañana', 'create:sleep@07:00'],
  ['agrégale losartán a las 6 y pregúntale cómo se siente a las 8', 'create:mood@08:00'],
  ['pregúntale cada tarde a las 4 si ya tomó agua', 'create:water@16:00'],
  ['recuérdale a las 3 de la tarde tomar agua', 'create:water@15:00'],
  ['pregúntale a las 7:30 cómo durmió', 'create:sleep@07:30'],
  ['cambia la pregunta del sueño a las 8', 'set_time:sleep@08:00'],
  ['suspende la pregunta de cómo se siente', 'pause:mood'],
  ['pregúntale cómo se siente', 'create:mood@'],
  ['pregúntale todos los días a las 8 y media de la noche cómo se siente', 'create:mood@20:30'],
];

function gotGuide(text: string): string {
  const r = interpretText(text, ctx);
  if (!r.actions.length) return r.reply ?? 'nada';
  const a = r.actions[0] as { type: string; topic?: string };
  return a.topic ? `${a.type}:${a.topic}` : a.type;
}

function gotAuto(text: string): string {
  const c = interpretAutomationCommand(text);
  if (!c) return 'nada';
  if (c.type === 'list') return 'list';
  if (c.type === 'create') return `create:${c.items.map((i) => `${i.kind}@${i.time}`).join(',')}`;
  if (c.type === 'set_time') return `set_time:${c.kind}@${c.time}`;
  return `${c.type}:${c.kind}`;
}

it('entiende al menos el 90 % de las 40 frases de la guía', () => {
  const fails = GUIDE.filter(([text, want]) => { const got = gotGuide(text); return typeof want === 'string' ? got !== want : !want.test(got); });
  console.log(`Guía de voz: ${GUIDE.length - fails.length}/${GUIDE.length}${fails.length ? `\nNo acertó: ${fails.map(([t]) => `"${t}" → ${gotGuide(t)}`).join('; ')}` : ''}`);
  expect(GUIDE).toHaveLength(40);
  expect((GUIDE.length - fails.length) / GUIDE.length).toBeGreaterThanOrEqual(0.9);
});

it('entiende al menos el 90 % de las 40 frases de preguntas programadas y combinaciones', () => {
  const fails = AUTOMATIONS.filter(([text, want]) => gotAuto(text) !== want);
  console.log(`Preguntas programadas: ${AUTOMATIONS.length - fails.length}/${AUTOMATIONS.length}${fails.length ? `\nNo acertó: ${fails.map(([t]) => `"${t}" → ${gotAuto(t)}`).join('; ')}` : ''}`);
  expect(AUTOMATIONS).toHaveLength(40);
  expect((AUTOMATIONS.length - fails.length) / AUTOMATIONS.length).toBeGreaterThanOrEqual(0.9);
});

describe('cada respuesta cumple la guía de voz (longitud, nada técnico, tildes, signos)', () => {
  const samples: unknown[] = ['Rosa', 'Losartán', '8:00 p. m.', 3];
  const texts: [string, string][] = [];
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'string') texts.push([path, v]);
    else if (typeof v === 'function') {
      try {
        const r = (v as (...a: unknown[]) => unknown)(...samples);
        if (typeof r === 'string') texts.push([`${path}()`, r]);
      } catch {
        /* otra firma: la cubre su prueba propia */
      }
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  // El marcador del compositor no es una respuesta ("Escríbele a BUDDY…").
  const replies: Record<string, unknown> = { ...strings.buddy };
  delete replies.placeholder;
  walk(replies, 'buddy');
  const A = strings.buddy.auto;
  texts.push(['auto.created', A.created(`${A.item('¿Cómo te sientes hoy?', '8:00 p. m.')} y ${A.item('¿Cómo dormiste?', '7:00 a. m.')}`)]);
  texts.push(['auto.list', A.list([A.row('¿Cómo te sientes hoy?', '8:00 p. m.', true), A.row('¿Cómo dormiste?', '7:00 a. m.', false)])]);
  for (const [text] of GUIDE) {
    const r = interpretText(text, ctx);
    if (r.reply) texts.push([`respuesta a "${text}"`, r.reply]);
  }
  it.each(texts)('%s', (_path, text) => {
    expect(voiceIssues(text)).toEqual([]);
  });
});

it('el revisor detecta lo que la guía prohíbe', () => {
  expect(voiceIssues('Quedó a las 20:00 en Rutina > Automatizaciones.')).toEqual(expect.arrayContaining(['texto técnico', 'hora sin a. m./p. m.']));
  expect(voiceIssues('Uno. Dos. Tres.')).toContain('más de 2 frases');
  expect(voiceIssues('Que hacemos hoy?')).toContain('pregunta sin ¿');
  expect(voiceIssues('Hoy es un buen dia.')).toContain('falta tilde: "dia"');
  expect(voiceIssues('{"id":"abc"}')).toContain('texto técnico');
  expect(voiceIssues('Listo: le preguntaré a las 8:00 p. m. Su celular lo programará.')).toEqual([]);
});
