/**
 * MedicationKnowledgeService (adaptadores). Dos fuentes VERIFICADAS:
 *  1. lookup(nombre): índice sin conexión de los datos abiertos del INVIMA (src/data/cum-index.json, CC BY-SA 4.0).
 *  2. explain(producto): información general en español de MedlinePlus.gov (NLM), por la ruta
 *     ATC del INVIMA → RxCUI (RxNorm) → MedlinePlus Connect en español. Si el producto es una combinación o no tiene
 *     ATC de un solo componente, se usa la coincidencia aproximada de RxNorm con el nombre del principio activo y solo
 *     se acepta si el título que devuelve MedlinePlus corresponde a ese principio activo.
 *
 * Privacidad: a las APIs externas solo se envían nombres o códigos de medicamentos, NUNCA datos del perfil ni de la
 * persona. Caché de 24 h (NLM recomienda 12–24 h), tiempo de espera de 8 s y modo sin conexión (se usa lo guardado,
 * indicando su fecha). Si algo falla, el resultado es "sin información verificada", nunca un texto inventado.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { lookupIndex, plainSummary, type CumIndex, type LookupResult, type ProductMatch, type SourceRef } from '@/domain/knowledge';
import { normalizeText } from '@/domain/validation';

export type ExplainResult =
  | { status: 'found'; title: string; uses: string; url: string; source: SourceRef; rxcui: string; stale: boolean }
  | { status: 'none' }
  | { status: 'offline' };

const CACHE_KEY = 'buddy.knowledge.v1';
const TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;
const RXNAV = 'https://rxnav.nlm.nih.gov/REST';
const CONNECT = 'https://connect.medlineplus.gov/service';

let index: CumIndex | null = null;
/** Carga diferida: el índice (≈1,4 MB) solo se lee la primera vez que se busca un medicamento. */
function getIndex(): CumIndex {
  index ??= require('@/data/cum-index.json') as CumIndex;
  return index;
}

async function getJson<T>(url: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

type Cache = Record<string, { at: number; value: Exclude<ExplainResult, { status: 'offline' }> }>;
async function readCache(): Promise<Cache> {
  try {
    return JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) ?? '{}') as Cache;
  } catch {
    return {};
  }
}
async function writeCache(key: string, value: Cache[string]['value']) {
  const cache = await readCache();
  cache[key] = { at: Date.now(), value };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache)).catch(() => undefined);
}

/** RxCUI del principio activo: por ATC (un solo componente) o por coincidencia aproximada del nombre. */
async function rxcuiFor(m: Pick<ProductMatch, 'atc' | 'ingredients'>): Promise<{ rxcui: string; approximate: boolean } | null> {
  if (m.ingredients.length === 1 && /^[A-Z]\d{2}[A-Z]{2}\d{2}$/.test(m.atc)) {
    const r = await getJson<{ idGroup?: { rxnormId?: string[] } }>(`${RXNAV}/rxcui.json?idtype=ATC&id=${encodeURIComponent(m.atc)}`);
    const id = r.idGroup?.rxnormId?.[0];
    if (id) return { rxcui: id, approximate: false };
  }
  const name = m.ingredients[0]?.name;
  if (!name) return null;
  const r = await getJson<{ approximateGroup?: { candidate?: { rxcui: string; rank: string }[] } }>(`${RXNAV}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=1`);
  const c = r.approximateGroup?.candidate?.find((x) => x.rank === '1');
  return c ? { rxcui: c.rxcui, approximate: true } : null;
}

interface ConnectFeed {
  feed?: { entry?: { title?: { _value?: string }; summary?: { _value?: string }; link?: { href?: string }[] }[] };
}

export const medicationKnowledge = {
  meta: () => getIndex().meta,

  lookup(name: string): LookupResult {
    return lookupIndex(getIndex(), name);
  },

  /** "Para qué se usa" en español con su fuente. Nunca devuelve dosis ni indicaciones personales. */
  async explain(m: Pick<ProductMatch, 'atc' | 'ingredients'>): Promise<ExplainResult> {
    const key = m.ingredients.length === 1 && m.atc ? `atc:${m.atc}` : `ing:${normalizeText(m.ingredients[0]?.name ?? '')}`;
    const cached = (await readCache())[key];
    if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
    try {
      const rx = await rxcuiFor(m);
      if (!rx) {
        await writeCache(key, { status: 'none' });
        return { status: 'none' };
      }
      const url = `${CONNECT}?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=${rx.rxcui}&knowledgeResponseType=application/json&informationRecipient.languageCode.c=es`;
      const entry = (await getJson<ConnectFeed>(url)).feed?.entry?.[0];
      const title = entry?.title?._value ?? '';
      const ingredient = normalizeText(m.ingredients[0]?.name ?? '').split(' ')[0].slice(0, 6);
      // Con la ruta aproximada, solo se acepta si MedlinePlus habla del mismo principio activo.
      const sameDrug = !rx.approximate || normalizeText(title).includes(ingredient);
      if (!entry || !entry.summary?._value || !sameDrug) {
        await writeCache(key, { status: 'none' });
        return { status: 'none' };
      }
      const value = {
        status: 'found' as const,
        title,
        uses: plainSummary(entry.summary._value, 2),
        url: entry.link?.[0]?.href?.split('?')[0] ?? 'https://medlineplus.gov/spanish/',
        source: { name: 'MedlinePlus.gov', url: 'https://medlineplus.gov/spanish/', date: new Date().toISOString().slice(0, 10), id: `RXCUI ${rx.rxcui}` },
        rxcui: rx.rxcui,
        stale: false,
      };
      await writeCache(key, value);
      return value;
    } catch {
      // Sin red o servicio caído: lo guardado (con su fecha) o "sin conexión". Nunca se inventa.
      if (cached?.value.status === 'found') return { ...cached.value, stale: true };
      return { status: 'offline' };
    }
  },
};

/**
 * MedicationAnalysisService: interacciones entre medicamentos y contraindicaciones por condición. CONTRATO solamente:
 * no existe todavía una base verificada con licencia (Fase 7, docs/BASE_FARMACOLOGICA.md). La API de interacciones de
 * RxNav fue retirada (≈ 2 de enero de 2024) y no se usa.
 */
export interface MedicationAnalysisService {
  interactions(ingredients: string[]): Promise<{ status: 'unavailable' }>;
}
export const medicationAnalysis: MedicationAnalysisService = {
  interactions: async () => ({ status: 'unavailable' }),
};
