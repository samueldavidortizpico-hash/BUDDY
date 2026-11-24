/**
 * V5: el chat entiende más formas de preguntar y cada pregunta sugerida (chips tras una respuesta y al no entender)
 * llega al tema correcto, que se responde SOLO con lo registrado. Datos de prueba ficticios.
 */
import { interpretText } from '@/domain/assistant/engine';
import { voiceIssues } from '@/domain/assistant/voice';
import { strings } from '@/i18n';

const ctx = { elderName: 'Rosa', medicationNames: ['Losartán'], contactNames: ['Juan'], today: new Date(2026, 9, 23, 9) };
const B = strings.buddy;

function got(text: string): string {
  const r = interpretText(text, ctx);
  if (!r.actions.length) return r.reply ?? 'nada';
  const a = r.actions[0] as { type: string; topic?: string; match?: string | null };
  return a.topic ? `${a.type}:${a.topic}${a.match ? `@${a.match}` : ''}` : a.type;
}

it.each([
  // Frases nuevas
  ['¿qué le toca ahora?', 'query_summary:next'],
  ['próxima pastilla', 'query_summary:next'],
  ['¿a qué hora le toca el losartán?', 'query_summary:next@Losartán'],
  ['¿cómo está mi mamá?', 'query_summary:day'],
  ['¿todo bien?', 'query_summary:day'],
  // Sin regresión: el ánimo sigue siendo ánimo
  ['¿cómo está de ánimo?', 'query_summary:mood'],
  ['¿cómo amaneció?', 'query_summary:mood'],
  ['¿cómo está hoy?', 'query_summary:day'],
  // Cada chip sugerido llega a su tema
  [B.ask.day, 'query_summary:day'],
  [B.ask.next, 'query_summary:next'],
  [B.ask.sleep, 'query_summary:sleep'],
  [B.ask.medication, 'query_summary:medication'],
  [B.ask.stock, 'query_summary:stock'],
  [B.ask.water, 'query_summary:water'],
  [B.ask.tookMed('Losartán'), 'query_summary:medication@Losartán'],
  [B.ask.stockOf('Losartán'), 'query_summary:stock@Losartán'],
])('"%s" → %s', (text, want) => {
  expect(got(text)).toBe(want);
});

it('charla corta: se presenta y vuelve al día de la persona, cumpliendo la guía de voz', () => {
  for (const text of ['¿quién eres?', '¿cómo estás?', 'qué tal']) {
    const r = interpretText(text, ctx);
    expect(r.understood).toBe(true);
    expect(r.actions).toHaveLength(0);
    expect(r.reply).toContain('Rosa');
    expect(voiceIssues(r.reply!)).toEqual([]);
  }
});
