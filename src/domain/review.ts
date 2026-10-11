/**
 * Revisión LIMITADA de BUDDY al guardar un medicamento. Solo compara lo que está escrito:
 *  (a) nombre o principio activo vs. alergias y contraindicaciones del perfil (texto sin tildes ni mayúsculas, con
 *      lista de equivalencias editable por el cuidador);
 *  (b) principio activo repetido entre medicamentos;
 *  (c) horarios que se cruzan (mismo minuto) entre medicamentos distintos.
 * No es una revisión farmacológica: nunca dice que algo es seguro, apto o peligroso.
 */
import { scheduleTimes } from './schedule';
import type { Elder, Medication } from './types';
import { normalizeText } from './validation';

export type FindingKind = 'allergy_match' | 'duplicate_ingredient' | 'schedule_overlap';

export interface ReviewFinding {
  kind: FindingKind;
  /** Razón exacta, lista para mostrar al cuidador. */
  reason: string;
  otherMedicationId?: string;
}

export const NO_MATCH_TEXT = 'No encontré coincidencias con lo registrado (esta revisión solo compara los datos escritos).';
export const CONSULT_TEXT = 'Consulta con el médico o el farmacéutico antes de continuar con este medicamento.';

/** Palabras (≥ 4 letras) de un texto normalizado. */
function words(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length >= 4);
}

/** ¿El texto del medicamento contiene el término (o alguna equivalencia)? */
function mentions(medText: string, term: string, equivalences: Record<string, string[]>): string | null {
  const hay = normalizeText(medText);
  const key = normalizeText(term);
  const variants = [key, ...(equivalences[key] ?? equivalences[term] ?? []).map(normalizeText)];
  for (const v of variants) {
    if (!v) continue;
    // Coincidencia de término completo o de palabra significativa.
    if (hay.includes(v) || words(v).some((w) => words(hay).includes(w))) return v;
  }
  return null;
}

export function reviewMedication(med: Pick<Medication, 'id' | 'name' | 'activeIngredient' | 'schedule' | 'paused'>, elder: Pick<Elder, 'allergies' | 'avoid' | 'equivalences'>, others: Medication[]): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const medText = `${med.name} ${med.activeIngredient}`;

  for (const allergy of elder.allergies) {
    const hit = mentions(medText, allergy, elder.equivalences);
    if (hit) findings.push({ kind: 'allergy_match', reason: `"${med.name}" coincide con la alergia registrada "${allergy}"${hit !== normalizeText(allergy) ? ` (equivalencia: ${hit})` : ''}.` });
  }
  for (const avoid of elder.avoid) {
    const hit = mentions(medText, avoid, elder.equivalences);
    if (hit) findings.push({ kind: 'allergy_match', reason: `"${med.name}" coincide con algo que debe evitar: "${avoid}".` });
  }

  const ingredient = normalizeText(med.activeIngredient);
  const live = others.filter((o) => o.id !== med.id && !o.deletedAt && !o.paused);
  if (ingredient) {
    for (const o of live) {
      if (normalizeText(o.activeIngredient) === ingredient) {
        findings.push({ kind: 'duplicate_ingredient', reason: `"${med.name}" y "${o.name}" tienen el mismo principio activo (${med.activeIngredient}).`, otherMedicationId: o.id });
      }
    }
  }

  if (!med.paused) {
    const mine = new Set(scheduleTimes(med.schedule));
    for (const o of live) {
      const shared = scheduleTimes(o.schedule).filter((t) => mine.has(t));
      if (shared.length) {
        findings.push({ kind: 'schedule_overlap', reason: `"${med.name}" y "${o.name}" están programados a la misma hora (${shared.join(', ')}).`, otherMedicationId: o.id });
      }
    }
  }
  return findings;
}
