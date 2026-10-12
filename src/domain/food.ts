/**
 * FoodAnalysisService (evaluador determinista, puro). Compara los valores de la tabla nutricional que escribe el
 * cuidador con los umbrales de la norma colombiana de etiquetado frontal VIGENTE y con las restricciones escritas en
 * el perfil. Es descriptivo: no es consejo médico ni nutricional personalizado y no recomienda dietas.
 *
 * - Solo evalúa productos ENVASADOS con tabla nutricional. Un plato casero o sin etiqueta no tiene veredicto.
 * - Si falta un dato que la norma necesita (p. ej. la energía para los porcentajes), ese nutriente queda "sin datos
 *   suficientes"; nunca se supone.
 * - La norma exige el sello solo si el nutriente fue ADICIONADO; si el cuidador no sabe, se dice "supera el umbral
 *   de la norma", no "debe llevar sello".
 */
import { normalizeText } from './validation';

/** Umbrales versionados (Tabla 17), con su fuente y fecha de consulta. */
export const FOOD_RULES = {
  version: 'Res. 810 de 2021, modificada por la Res. 2492 de 2022 y corregida por la Res. 254 de 2023 (Tabla 17)',
  source: 'https://normograma.invima.gov.co/normograma/compilacion/docs/resolucion_minsaludps_0254_2023.htm',
  consultedAt: '2026-10-12',
  /** Proyecto de resolución publicado en abril de 2026 para derogarla: en consulta, NO vigente a esta fecha. */
  pending: 'Proyecto de resolución de abril de 2026 (en consulta pública, no vigente)',
  sodiumMgPerKcal: 1,
  sodiumMgPer100g: 300,
  /** Bebidas analcohólicas sin aporte energético. */
  sodiumMgPer100mlNoEnergy: 40,
  freeSugarsEnergyPct: 10,
  satFatEnergyPct: 10,
  transFatEnergyPct: 1,
  kcalPerGramSugar: 4,
  kcalPerGramFat: 9,
} as const;

export type Nutrient = 'sodium' | 'sugars' | 'satFat' | 'transFat';
export const NUTRIENT_LABEL: Record<Nutrient, string> = { sodium: 'sodio', sugars: 'azúcares', satFat: 'grasas saturadas', transFat: 'grasas trans' };

export interface FoodInput {
  name: string;
  /** false = plato casero o sin etiqueta: no hay veredicto. */
  packaged: boolean;
  state: 'solid' | 'liquid';
  /** Base de los valores: por 100 g/ml o por porción (con su tamaño en g o ml). */
  basis: 'per100' | 'portion';
  portionSize?: number | null;
  energyKcal?: number | null;
  sodiumMg?: number | null;
  /** Azúcares libres o añadidos (g). */
  freeSugarsG?: number | null;
  satFatG?: number | null;
  transFatG?: number | null;
  /** ¿La lista de ingredientes dice que se agregó sal, azúcar, grasas o edulcorantes? */
  added: 'yes' | 'no' | 'unknown';
}

export type NutrientStatus = { nutrient: Nutrient; status: 'exceeds' | 'below' | 'missing'; detail: string };

export type FoodResult =
  | { kind: 'not_applicable'; message: string }
  | { kind: 'evaluated'; nutrients: NutrientStatus[]; profileNotes: string[]; summary: string; notice: string; source: string };

export const FOOD_NOTICE = 'Resultado descriptivo según la norma de etiquetado; no es consejo médico ni nutricional personalizado.';
export const HOMEMADE_MESSAGE = 'Para platos caseros o alimentos sin etiqueta no hay un cálculo de la norma. Puedes registrar la comida; para una guía personal, consulta con un nutricionista.';

const has = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
/** 12.345 → "12,3" */
const num = (n: number, decimals = 1) => String(Math.round(n * 10 ** decimals) / 10 ** decimals).replace('.', ',');

/** Restricciones del perfil (texto del cuidador) que se relacionan con cada nutriente. */
function restrictionFor(text: string): Nutrient[] {
  const t = normalizeText(text);
  if (/azucar|dulce/.test(t)) return ['sugars'];
  if (/\bsal\b|sodio/.test(t)) return ['sodium'];
  if (/grasa/.test(t)) return ['satFat', 'transFat'];
  return [];
}

export function evaluateFood(i: FoodInput, dietRestrictions: string[] = []): FoodResult {
  if (!i.packaged) return { kind: 'not_applicable', message: HOMEMADE_MESSAGE };
  const R = FOOD_RULES;
  const kcal = has(i.energyKcal) ? i.energyKcal : null;
  const unit = i.state === 'solid' ? 'g' : 'ml';
  // Para el umbral por 100 g/ml hace falta convertir si los datos son por porción.
  const to100 = (v: number) => (i.basis === 'per100' ? v : has(i.portionSize) && i.portionSize > 0 ? (v * 100) / i.portionSize : null);

  const nutrients: NutrientStatus[] = [];

  // Sodio: ≥ 1 mg/kcal y/o ≥ 300 mg/100 g (sólidos); líquidos: ≥ 1 mg/kcal, o ≥ 40 mg/100 ml sin aporte energético.
  if (!has(i.sodiumMg)) nutrients.push({ nutrient: 'sodium', status: 'missing', detail: 'Falta el sodio.' });
  else {
    const perKcal = kcal ? i.sodiumMg / kcal : null;
    const per100 = to100(i.sodiumMg);
    const limit100 = i.state === 'solid' ? R.sodiumMgPer100g : kcal === 0 ? R.sodiumMgPer100mlNoEnergy : null;
    if (perKcal !== null && perKcal >= R.sodiumMgPerKcal) {
      nutrients.push({ nutrient: 'sodium', status: 'exceeds', detail: `${num(perKcal, 2)} mg de sodio por kcal (umbral: 1 mg/kcal).` });
    } else if (per100 !== null && limit100 !== null && per100 >= limit100) {
      nutrients.push({ nutrient: 'sodium', status: 'exceeds', detail: `${Math.round(per100)} mg de sodio por 100 ${unit} (umbral: ${limit100} mg).` });
    } else if (limit100 !== null && per100 === null) {
      // Sin tamaño de porción no se puede revisar el umbral por 100 g/ml: no se da por bueno.
      nutrients.push({ nutrient: 'sodium', status: 'missing', detail: 'Falta el tamaño de la porción para revisar el sodio por 100.' });
    } else if (perKcal === null && kcal !== 0) {
      nutrients.push({ nutrient: 'sodium', status: 'missing', detail: 'Falta la energía (kcal) para calcular el sodio por kcal.' });
    } else nutrients.push({ nutrient: 'sodium', status: 'below', detail: 'Por debajo del umbral de la norma.' });
  }

  // Azúcares libres, grasas saturadas y trans: porcentaje de la energía total (misma cantidad de alimento).
  const energyShare = (nutrient: Nutrient, grams: number | null | undefined, factor: number, limit: number, label: string) => {
    if (!has(grams)) return nutrients.push({ nutrient, status: 'missing', detail: `Falta ${label}.` });
    // Sin aporte energético (0 kcal) y 0 g del nutriente: no supera. Con energía desconocida: faltan datos.
    if (kcal === 0 && grams === 0) return nutrients.push({ nutrient, status: 'below', detail: 'Sin aporte energético.' });
    if (!kcal) return nutrients.push({ nutrient, status: 'missing', detail: 'Falta la energía (kcal) para calcular el porcentaje.' });
    const share = ((grams * factor) / kcal) * 100;
    nutrients.push({ nutrient, status: share >= limit ? 'exceeds' : 'below', detail: `${num(share)} % de la energía (umbral: ${limit} %).` });
  };
  energyShare('sugars', i.freeSugarsG, R.kcalPerGramSugar, R.freeSugarsEnergyPct, 'el dato de azúcares');
  energyShare('satFat', i.satFatG, R.kcalPerGramFat, R.satFatEnergyPct, 'el dato de grasas saturadas');
  energyShare('transFat', i.transFatG, R.kcalPerGramFat, R.transFatEnergyPct, 'el dato de grasas trans');

  const over = nutrients.filter((n) => n.status === 'exceeds').map((n) => NUTRIENT_LABEL[n.nutrient]);
  const missing = nutrients.some((n) => n.status === 'missing');
  const summary = over.length
    ? i.added === 'yes'
      ? `Exceso en ${over.join(', ')} según la norma.`
      : `Supera el umbral de la norma en ${over.join(', ')}${i.added === 'no' ? ' (sin ingredientes añadidos la norma no exige sello)' : ''}.`
    : missing
      ? 'Faltan datos para evaluar todo lo que pide la norma.'
      : 'No supera los umbrales de la norma con los datos escritos.';

  const profileNotes = dietRestrictions.flatMap((r) => {
    const hit = restrictionFor(r).filter((n) => nutrients.some((x) => x.nutrient === n && x.status === 'exceeds'));
    return hit.length ? [`Restricción registrada por el cuidador: "${r}". Este producto supera el umbral de ${hit.map((n) => NUTRIENT_LABEL[n]).join(' y ')}.`] : [];
  });

  return { kind: 'evaluated', nutrients, profileNotes, summary, notice: FOOD_NOTICE, source: FOOD_RULES.version };
}
