/**
 * Conocimiento VERIFICADO de medicamentos (puro, sin red). Busca en el índice compacto de los datos abiertos del
 * INVIMA (scripts/build-cum-index.mjs) por nombre comercial o principio activo, tolerando tildes y mayúsculas.
 *
 * Reglas (buddy-medical-safety):
 *  - Nunca se completa un dato por el resultado "más parecido": un error de ortografía devuelve SUGERENCIAS para que
 *    el cuidador elija; nada se rellena solo.
 *  - Cada coincidencia lleva su fuente (INVIMA, registro sanitario, fecha de corte) y su nivel de confianza.
 *  - La dosis nunca sale de aquí: el índice dice la concentración del producto, no cuánto debe tomar la persona.
 */
import { closest } from './assistant/parse';
import type { MedForm } from './types';
import { normalizeText } from './validation';

/** Índice compacto: textos repetidos en `dict`; cada item = [nombre, forma, vía, atc, desc. ATC, titular, registro, ingredientes]. */
export interface CumIndex {
  meta: { source: string; dataset: string; url: string; license: string; attribution: string; dataUpdatedAt: string; builtAt: string; products: number };
  dict: string[];
  items: [string, number, number, number, number, number, string, [number, string, number, number][]][];
}

export interface SourceRef {
  name: string;
  url: string;
  /** Fecha de corte de los datos (índice) o de la consulta (servicio en línea). */
  date: string;
  /** Registro sanitario u otro identificador en la fuente. */
  id?: string;
  license?: string;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  /** Referencia de la cantidad ("Tableta", "100 Ml"…). */
  per: string;
}

export interface ProductMatch {
  /** Nombre comercial tal como está en el registro (sin ®). */
  name: string;
  form: string;
  route: string;
  atc: string;
  atcDescription: string;
  holder: string;
  ingredients: Ingredient[];
  source: SourceRef;
  /** exacta = nombre o principio activo idénticos; parcial = el nombre empieza o contiene lo escrito. */
  confidence: 'exacta' | 'parcial';
}

export type LookupResult =
  | { status: 'found'; matches: ProductMatch[]; by: 'brand' | 'ingredient' }
  | { status: 'suggest'; suggestions: string[] }
  | { status: 'none' };

const MAX = 8;

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

/** Referencias que equivalen a "cada unidad" (tableta, cápsula…) o vacías: no se muestran. */
const SOLID_PER = /tablet|capsul|cápsul|comprimid|grage|sin dato|^cada\b/i;
/** "100 ml de jarabe", "100ml" → "100 ml"; null si no es una medida en ml. */
const liquidPer = (per: string) => {
  const m = per.match(/(\d+(?:[.,]\d+)?)\s*(ml|mililitro)/i);
  return m ? `${m[1].replace('.', ',')} ml` : /^(ml|mililitro)/i.test(per.trim()) ? 'ml' : null;
};
/** Clave de agrupación: cantidad en mg y referencia normalizada (0,1 g = 100 mg). Solo para agrupar; se muestra el texto de la fuente. */
function strengthKey(m: Pick<ProductMatch, 'ingredients'>): string {
  return m.ingredients
    .map((i) => {
      const n = Number(i.amount.replace(',', '.'));
      const u = i.unit.toLowerCase();
      const mg = u === 'g' ? n * 1000 : u === 'mcg' || u === 'µg' ? n / 1000 : n;
      return `${normalizeText(i.name).split(' ')[0]}:${Number.isFinite(mg) ? mg : i.amount}${u === 'g' || u === 'mcg' ? 'mg' : u}/${SOLID_PER.test(i.per) || !i.per ? 'u' : (liquidPer(i.per) ?? i.per)}`;
    })
    .sort()
    .join('+');
}

/** "500 mg", "3200 mg por 100 ml" (la referencia se muestra si no es la unidad de la forma). */
export function ingredientText(i: Ingredient, withName = true): string {
  const amount = `${i.amount.replace('.', ',')} ${i.unit}`.trim();
  const per = i.per && !SOLID_PER.test(i.per) ? ` por ${liquidPer(i.per) ?? i.per.toLowerCase()}` : '';
  return `${withName ? `${titleCase(i.name)} ` : ''}${amount}${per}`.trim();
}

/** Concentración legible del producto: "500 mg" o "Acetaminofén 500 mg + Cafeína 65 mg". */
export function strengthText(m: Pick<ProductMatch, 'ingredients'>): string {
  return m.ingredients.length === 1 ? ingredientText(m.ingredients[0], false) : m.ingredients.map((i) => ingredientText(i)).join(' + ');
}

/** Principios activos del producto, legibles ("Acetaminofen + Cafeina"). */
export const ingredientsText = (m: Pick<ProductMatch, 'ingredients'>) => m.ingredients.map((i) => titleCase(i.name)).join(' + ');

/** Forma farmacéutica del INVIMA → forma de BUDDY (para la unidad de la dosis). */
export function formOf(invimaForm: string): MedForm {
  const f = normalizeText(invimaForm);
  if (/jarabe|suspension|solucion oral|elixir/.test(f)) return 'syrup';
  if (/gotas/.test(f)) return 'drops';
  if (/crema|unguento|gel|locion/.test(f)) return 'cream';
  if (/inyectable|inyeccion/.test(f)) return 'injection';
  if (/parche|transdermico/.test(f)) return 'patch';
  if (/capsula/.test(f)) return 'capsule';
  if (/tableta|comprimido|gragea/.test(f)) return 'tablet';
  return 'other';
}

function toMatch(idx: CumIndex, it: CumIndex['items'][number], confidence: ProductMatch['confidence']): ProductMatch {
  const d = idx.dict;
  return {
    name: titleCase(it[0]),
    form: d[it[1]],
    route: d[it[2]],
    atc: d[it[3]],
    atcDescription: d[it[4]],
    holder: d[it[5]],
    ingredients: it[7].map(([n, amount, u, per]) => ({ name: d[n], amount, unit: d[u], per: d[per] })),
    source: { name: 'INVIMA (datos abiertos, Código Único de Medicamentos)', url: idx.meta.url, date: idx.meta.dataUpdatedAt, id: it[6], license: idx.meta.license },
    confidence,
  };
}

/** Presentaciones distintas (mismo nombre, forma y concentración = una sola opción). */
function unique(ms: ProductMatch[]): ProductMatch[] {
  const seen = new Set<string>();
  return ms.filter((m) => {
    const k = `${normalizeText(m.name)}|${m.form}|${strengthText(m)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Busca por nombre comercial ("dolex", "Dolex Forte") o principio activo ("losartán"). Devuelve como máximo 8
 * presentaciones para que el cuidador elija la de su caja. Con un error de ortografía devuelve sugerencias.
 */
export function lookupIndex(idx: CumIndex, query: string): LookupResult {
  const q = normalizeText(query).replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (q.length < 3) return { status: 'none' };
  const names = idx.items.map((it) => normalizeText(it[0]));

  const d = idx.dict;
  // 1. Principio activo de un solo componente ("losartán"): opciones por concentración y tipo de forma, no por laboratorio.
  const generic = idx.items.filter((it) => it[7].length === 1 && normalizeText(d[it[7][0][0]]).split(' ')[0] === q.split(' ')[0] && normalizeText(d[it[7][0][0]]).startsWith(q));
  if (generic.length) {
    const byPresentation = new Map<string, ProductMatch>();
    for (const it of generic) {
      const m = toMatch(idx, it, 'exacta');
      const key = `${formOf(m.form)}|${strengthKey(m)}`;
      if (!byPresentation.has(key)) byPresentation.set(key, { ...m, name: titleCase(m.ingredients[0].name) });
    }
    return { status: 'found', matches: [...byPresentation.values()].slice(0, MAX), by: 'ingredient' };
  }

  // 2. Nombre comercial: idéntico, o que empieza por lo escrito como palabra completa ("dolex" → "dolex forte").
  const brand = idx.items
    .map((it, i) => ({ it, n: names[i] }))
    .filter(({ n }) => n === q || n.startsWith(`${q} `))
    .sort((a, b) => a.n.length - b.n.length)
    .map(({ it, n }) => toMatch(idx, it, n === q ? 'exacta' : 'parcial'));
  if (brand.length) return { status: 'found', matches: unique(brand).slice(0, MAX), by: 'brand' };

  // 3. Principio activo que solo existe en combinaciones ("codeína" con acetaminofén, "levodopa" con carbidopa).
  const inCombos = idx.items.filter((it) => it[7].some(([n]) => normalizeText(d[n]).split(' ')[0] === q.split(' ')[0]));
  if (inCombos.length) return { status: 'found', matches: unique(inCombos.map((it) => toMatch(idx, it, 'parcial'))).slice(0, MAX), by: 'ingredient' };

  // 4. Mal escrito: solo SUGERENCIAS (primeras palabras de marcas y principios activos), nunca se elige sola.
  const vocab = new Set<string>();
  for (const n of names) vocab.add(n.split(' ')[0]);
  for (const it of idx.items) for (const [n] of it[7]) vocab.add(normalizeText(d[n]).split(' ')[0]);
  const first = q.split(' ')[0];
  const suggestions: string[] = [];
  for (let pass = 0; pass < 3 && suggestions.length < 3; pass++) {
    // Las sugerencias nunca se aplican solas: se toleran palabras de 4 letras ("dolx" → "Dolex").
    const hit = closest(first, [...vocab].filter((v) => !suggestions.includes(v)), 4);
    if (!hit) break;
    suggestions.push(hit);
  }
  return suggestions.length ? { status: 'suggest', suggestions: suggestions.map(titleCase) } : { status: 'none' };
}

/** Texto plano de un resumen HTML, recortado a las primeras `n` frases (para "Para qué se usa"). */
export function plainSummary(html: string, n = 2): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences.slice(0, n).map((x) => x.trim()).join(' ');
}

export const GENERAL_INFO_NOTICE = 'Información general; no reemplaza al médico ni al farmacéutico.';
