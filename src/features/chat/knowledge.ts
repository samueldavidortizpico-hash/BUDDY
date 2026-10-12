/**
 * Puente entre el chat y el MedicationKnowledgeService: completa el borrador de un medicamento con las presentaciones
 * del registro del INVIMA (para elegir) o con sugerencias si el nombre está mal escrito. Nunca elige por el cuidador.
 */
import { formOf, ingredientsText, strengthText, type ProductMatch } from '@/domain/knowledge';
import type { AssistantAction, ProductChoice } from '@/domain/assistant/types';
import { medicationKnowledge } from '@/infrastructure/knowledge';

type AddMed = Extract<AssistantAction, { type: 'add_medication' }>;

/** Presentación del registro → opción tocable (sin dosis). Etiquetas únicas. */
export function choicesOf(matches: ProductMatch[]): ProductChoice[] {
  const seen = new Map<string, number>();
  return matches.map((m) => {
    const base = `${m.name} · ${strengthText(m)} · ${m.form.toLowerCase()}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return {
      label: n > 1 ? `${base} (${n})` : base,
      name: m.name,
      strength: strengthText(m),
      form: formOf(m.form),
      activeIngredient: ingredientsText(m),
      atc: m.atc,
      source: { source: m.source.name, id: m.source.id, date: m.source.date },
    };
  });
}

/** Resultado de buscar el nombre: la acción enriquecida y si no se encontró nada (para decirlo con honestidad). */
export function enrichMedication(a: AddMed): { action: AddMed; notFound: boolean; matches: ProductMatch[] } {
  if (!a.name || a.candidates || a.productDecided) return { action: a, notFound: false, matches: [] };
  const r = medicationKnowledge.lookup(a.name);
  if (r.status === 'found') return { action: { ...a, candidates: choicesOf(r.matches) }, notFound: false, matches: r.matches };
  if (r.status === 'suggest') return { action: { ...a, suggestions: r.suggestions }, notFound: false, matches: [] };
  return { action: { ...a, productDecided: true, verified: null }, notFound: true, matches: [] };
}
