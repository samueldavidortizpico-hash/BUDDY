import { CORPUS, CORPUS_CONTEXT, HELDOUT, type CorpusCase } from '../../../tests/assistant.corpus';
import { interpretText } from '../assistant/engine';

/** ¿La interpretación cumple lo esperado? Devuelve la diferencia (vacía = acierto). */
function diff(k: CorpusCase): string {
  const r = interpretText(k.text, CORPUS_CONTEXT);
  if ('understood' in k.expect) return r.understood ? `entendió ${r.actions.map((a) => a.type).join(', ')}` : '';
  const { type, ...fields } = k.expect;
  const a = r.actions.find((x) => x.type === type) as Record<string, unknown> | undefined;
  if (!a) return `esperaba ${type}; obtuvo ${r.actions.map((x) => x.type).join(', ') || 'nada'}`;
  return Object.entries(fields)
    .filter(([key, v]) => JSON.stringify(a[key] ?? null) !== JSON.stringify(v))
    .map(([key, v]) => `${key}: esperaba ${JSON.stringify(v)}, obtuvo ${JSON.stringify(a[key] ?? null)}`)
    .join('; ');
}

describe('corpus de comprensión del asistente', () => {
  const results = CORPUS.map((k) => ({ k, d: diff(k) }));
  const fails = results.filter((x) => x.d);
  const accuracy = 1 - fails.length / CORPUS.length;

  it('tiene al menos 120 frases, 30 de citas y 30 de medicamentos', () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(120);
    expect(CORPUS.filter((k) => k.group === 'cita').length).toBeGreaterThanOrEqual(30);
    expect(CORPUS.filter((k) => k.group === 'medicamento').length).toBeGreaterThanOrEqual(30);
  });

  it('acierta al menos el 90 %', () => {
    // Informe para docs/AUDITORIA_V2_4.md: porcentaje y frases que fallan.
    console.log(`Acierto del corpus: ${(accuracy * 100).toFixed(1)} % (${CORPUS.length - fails.length}/${CORPUS.length})\n${fails.map((f) => `✗ [${f.k.group}] "${f.k.text}" → ${f.d}`).join('\n')}`);
    expect(accuracy).toBeGreaterThanOrEqual(0.9);
  });

  it('informa el acierto del conjunto reservado (no se ajusta el motor con él)', () => {
    const held = HELDOUT.map((k) => ({ k, d: diff(k) }));
    const bad = held.filter((x) => x.d);
    console.log(`Acierto del conjunto reservado: ${(100 - (bad.length / HELDOUT.length) * 100).toFixed(1)} % (${HELDOUT.length - bad.length}/${HELDOUT.length})\n${bad.map((f) => `✗ [${f.k.group}] "${f.k.text}" → ${f.d}`).join('\n')}`);
    expect(HELDOUT.length).toBeGreaterThanOrEqual(20);
  });
});
