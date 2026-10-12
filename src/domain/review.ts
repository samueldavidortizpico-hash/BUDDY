/**
 * Revisión LIMITADA de BUDDY al guardar un medicamento (reglas deterministas, sin IA). Compara lo registrado:
 *  (a) nombre, principio(s) activo(s) y clase ATC vs. alergias y "evitar" del perfil (texto sin tildes ni mayúsculas,
 *      equivalencias editables por el cuidador y, en nivel 2, clases ATC: "penicilina" ↔ amoxicilina J01CA04);
 *  (b) principio activo repetido, también dentro de combinaciones (Dolex Forte + Dolex Avanzado = acetaminofén);
 *  (c) misma clase ATC (4.º nivel) con principios distintos (nivel 2);
 *  (d) horarios que se cruzan (mismo minuto) entre medicamentos distintos.
 * No es una revisión farmacológica: nunca dice que algo es seguro, apto o peligroso. Interacciones y contraindicaciones
 * por condición NO se evalúan (MedicationAnalysisService, Fase 7).
 */
import { FEATURES } from '@/config/features';

import { scheduleTimes } from './schedule';
import type { Elder, Medication } from './types';
import { normalizeText } from './validation';

export type FindingKind = 'allergy_match' | 'duplicate_ingredient' | 'same_class' | 'schedule_overlap';

export interface ReviewFinding {
  kind: FindingKind;
  /** Razón exacta, lista para mostrar al cuidador. */
  reason: string;
  /** De dónde sale la regla (trazabilidad). */
  source: string;
  otherMedicationId?: string;
}

export const NO_MATCH_TEXT = 'No encontré coincidencias con lo registrado (esta revisión solo compara los datos escritos).';
/** Cierre obligatorio de toda revisión de BUDDY (con o sin coincidencias). Nunca dice que algo es seguro o apto. */
export const CONSULT_TEXT = 'BUDDY advierte pero nunca receta ni cambia dosis. Por mayor seguridad, consulta con un médico o un farmacéutico.';

const SRC_PROFILE = 'Datos escritos por el cuidador en el perfil';
const SRC_ATC = 'Clasificación ATC de la OMS (código del registro del INVIMA) y tabla de clases de BUDDY v1, pendiente de revisión profesional';

/** Nombres que designan el mismo principio activo (DCI y nombre usual). */
const SAME_INGREDIENT: string[][] = [['acetaminofen', 'paracetamol'], ['acido acetilsalicilico', 'aspirina']];

/**
 * Clases por prefijo ATC (estructura pública de la clasificación ATC de la OMS). Nivel 2: requiere revisión
 * profesional antes de usarse con pacientes reales (FEATURES.level2Review).
 */
const ATC_CLASSES: { terms: string[]; prefixes: string[]; label: string }[] = [
  { terms: ['penicilina', 'penicilinas'], prefixes: ['J01C'], label: 'penicilinas (ATC J01C)' },
  { terms: ['cefalosporina', 'cefalosporinas'], prefixes: ['J01DB', 'J01DC', 'J01DD', 'J01DE'], label: 'cefalosporinas (ATC J01DB–J01DE)' },
  { terms: ['sulfa', 'sulfas', 'sulfonamida', 'sulfonamidas'], prefixes: ['J01E'], label: 'sulfonamidas (ATC J01E)' },
  { terms: ['quinolona', 'quinolonas'], prefixes: ['J01M'], label: 'quinolonas (ATC J01M)' },
  { terms: ['macrolido', 'macrolidos'], prefixes: ['J01FA'], label: 'macrólidos (ATC J01FA)' },
  { terms: ['aines', 'aine', 'antiinflamatorios', 'antiinflamatorio'], prefixes: ['M01A'], label: 'antiinflamatorios no esteroideos (ATC M01A)' },
  { terms: ['aspirina', 'acido acetilsalicilico'], prefixes: ['N02BA01', 'B01AC06'], label: 'ácido acetilsalicílico (ATC N02BA01, B01AC06)' },
  { terms: ['acetaminofen', 'paracetamol'], prefixes: ['N02BE01', 'N02BE51', 'N02BE71'], label: 'paracetamol/acetaminofén (ATC N02BE01, N02BE51, N02BE71)' },
  { terms: ['opioide', 'opioides', 'opiaceo', 'opiaceos'], prefixes: ['N02A'], label: 'opioides (ATC N02A)' },
];

/** Palabras (≥ 4 letras) de un texto normalizado. */
function words(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length >= 4);
}

/** Principios activos de un medicamento, normalizados y con su sinónimo ("acetaminofen + cafeina" → 2). */
function ingredientsOf(m: Pick<Medication, 'activeIngredient'>): string[] {
  return m.activeIngredient
    .split('+')
    .map((x) => normalizeText(x).replace(/\b(potasico|sodico|clorhidrato de|maleato de|sulfato de)\b/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((x) => SAME_INGREDIENT.find((g) => g.some((n) => x.startsWith(n)))?.[0] ?? x);
}

/** ¿El texto del medicamento contiene el término (o alguna equivalencia)? */
function mentions(medText: string, term: string, equivalences: Record<string, string[]>): string | null {
  const hay = normalizeText(medText);
  const key = normalizeText(term);
  const variants = [key, ...(equivalences[key] ?? equivalences[term] ?? []).map(normalizeText), ...(SAME_INGREDIENT.find((g) => g.includes(key)) ?? [])];
  for (const v of variants) {
    if (!v) continue;
    // Coincidencia de término completo o de palabra significativa.
    if (hay.includes(v) || words(v).some((w) => words(hay).includes(w))) return v;
  }
  return null;
}

/** Clase ATC (nivel 2) en la que cae el medicamento para un término de alergia, o null. */
function classHit(term: string, atc: string | undefined): string | null {
  if (!FEATURES.level2Review || !atc) return null;
  const t = normalizeText(term);
  const cls = ATC_CLASSES.find((c) => c.terms.includes(t));
  return cls && cls.prefixes.some((p) => atc.startsWith(p)) ? cls.label : null;
}

export function reviewMedication(
  med: Pick<Medication, 'id' | 'name' | 'activeIngredient' | 'schedule' | 'paused'> & { atc?: string },
  elder: Pick<Elder, 'allergies' | 'avoid' | 'equivalences'>,
  others: Medication[],
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const medText = `${med.name} ${med.activeIngredient}`;

  const profileTerms = [...elder.allergies.map((a) => ({ term: a, allergy: true })), ...elder.avoid.map((a) => ({ term: a, allergy: false }))];
  for (const { term, allergy } of profileTerms) {
    const hit = mentions(medText, term, elder.equivalences);
    const what = allergy ? `la alergia registrada "${term}"` : `algo que debe evitar: "${term}"`;
    if (hit) {
      findings.push({ kind: 'allergy_match', reason: `"${med.name}" coincide con ${what}${hit !== normalizeText(term) ? ` (equivalencia: ${hit})` : ''}.`, source: SRC_PROFILE });
      continue;
    }
    const cls = classHit(term, med.atc);
    if (cls) findings.push({ kind: 'allergy_match', reason: `"${med.name}" es de la clase ${cls}, que coincide con ${what}.`, source: SRC_ATC });
  }

  const live = others.filter((o) => o.id !== med.id && !o.deletedAt && !o.paused);
  const mine = ingredientsOf(med);
  for (const o of live) {
    const shared = ingredientsOf(o).filter((x) => mine.includes(x));
    if (shared.length) {
      findings.push({ kind: 'duplicate_ingredient', reason: `"${med.name}" y "${o.name}" tienen el mismo principio activo (${shared.join(', ')}).`, source: SRC_PROFILE, otherMedicationId: o.id });
    } else if (FEATURES.level2Review && med.atc && o.atc && med.atc.length >= 5 && med.atc.slice(0, 5) === o.atc.slice(0, 5)) {
      findings.push({
        kind: 'same_class',
        reason: `"${med.name}" y "${o.name}" son de la misma clase según la clasificación ATC (${med.atc.slice(0, 5)}). Puede ser intencional.`,
        source: SRC_ATC,
        otherMedicationId: o.id,
      });
    }
  }

  if (!med.paused) {
    const times = new Set(scheduleTimes(med.schedule));
    for (const o of live) {
      const shared = scheduleTimes(o.schedule).filter((t) => times.has(t));
      if (shared.length) {
        findings.push({ kind: 'schedule_overlap', reason: `"${med.name}" y "${o.name}" están programados a la misma hora (${shared.join(', ')}).`, source: SRC_PROFILE, otherMedicationId: o.id });
      }
    }
  }
  return findings;
}
