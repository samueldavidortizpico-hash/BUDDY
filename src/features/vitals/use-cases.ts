/**
 * Registros de salud MANUALES. No hay dispositivos conectados ni umbrales clínicos:
 * los rangos de validación solo detectan errores de escritura, no valoran la salud.
 * Las tendencias son descriptivas (más alto / más bajo que el registro anterior).
 */
import type { VitalsRepository } from '@/repositories/contracts';
import type { ISODate, Timestamp, VitalEntry, VitalType } from '@/types/domain';
import { toISODate } from '@/utils/dates';
import { createId } from '@/utils/id';

import { parseDecimal } from '../medications/use-cases';

export const VITALS: Record<
  VitalType,
  { label: string; unit: string; decimals: number; range: [number, number]; secondaryRange?: [number, number] }
> = {
  bloodPressure: { label: 'Presión arterial', unit: 'mmHg', decimals: 0, range: [50, 260], secondaryRange: [30, 160] },
  glucose: { label: 'Glucosa', unit: 'mg/dL', decimals: 0, range: [20, 600] },
  pulse: { label: 'Pulso', unit: 'lpm', decimals: 0, range: [20, 250] },
  oxygen: { label: 'Oxigenación', unit: '%', decimals: 0, range: [50, 100] },
  temperature: { label: 'Temperatura', unit: '°C', decimals: 1, range: [30, 45] },
  weight: { label: 'Peso', unit: 'kg', decimals: 1, range: [20, 300] },
};

export const VITAL_TYPES = Object.keys(VITALS) as VitalType[];

export function formatVitalValue(e: Pick<VitalEntry, 'type' | 'value' | 'secondary'>): string {
  const { decimals } = VITALS[e.type];
  const fmt = (n: number) => n.toFixed(decimals).replace('.', ',');
  return e.type === 'bloodPressure' && e.secondary !== null ? `${fmt(e.value)}/${fmt(e.secondary)}` : fmt(e.value);
}

export function entriesOf(entries: VitalEntry[], type: VitalType): VitalEntry[] {
  return entries.filter((e) => e.type === type).sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1));
}

export type TrendWord = 'first' | 'up' | 'down' | 'same';

/** Compara el último registro con el anterior. Solo describe; no dice si es bueno o malo. */
export function describeTrend(list: VitalEntry[]): { word: TrendWord; text: string } {
  if (list.length < 2) return { word: 'first', text: list.length ? 'Primer registro' : 'Sin registros' };
  const [prev, last] = list.slice(-2);
  if (last.value === prev.value && last.secondary === prev.secondary) return { word: 'same', text: 'Igual que el anterior' };
  return last.value > prev.value
    ? { word: 'up', text: 'Más alto que el anterior' }
    : { word: 'down', text: 'Más bajo que el anterior' };
}

/** Valores normalizados 0–100 para dibujar el sparkline (solo forma visual). */
export function sparkValues(list: VitalEntry[], n = 7): number[] {
  const values = list.slice(-n).map((e) => e.value);
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((v) => (max === min ? 55 : 20 + ((v - min) / (max - min)) * 75));
}

export interface VitalDraft {
  type: VitalType;
  value: string;
  secondary: string;
}

export function validateVital(d: VitalDraft): { value?: string; secondary?: string } {
  const meta = VITALS[d.type];
  const errors: { value?: string; secondary?: string } = {};
  const v = parseDecimal(d.value);
  if (!(v >= meta.range[0] && v <= meta.range[1]))
    errors.value = `Revisa el valor: escribe un número entre ${meta.range[0]} y ${meta.range[1]}.`;
  if (meta.secondaryRange) {
    const s = parseDecimal(d.secondary);
    if (!(s >= meta.secondaryRange[0] && s <= meta.secondaryRange[1]))
      errors.secondary = `Revisa el segundo valor: entre ${meta.secondaryRange[0]} y ${meta.secondaryRange[1]}.`;
  }
  return errors;
}

export function addVital(repo: VitalsRepository, d: VitalDraft, now: Date) {
  const errors = validateVital(d);
  if (Object.keys(errors).length > 0) return { ok: false as const, errors };
  const entry: VitalEntry = {
    id: createId('vital'),
    type: d.type,
    value: parseDecimal(d.value),
    secondary: VITALS[d.type].secondaryRange ? parseDecimal(d.secondary) : null,
    recordedAt: now.toISOString() as Timestamp,
    source: 'manual',
    demo: false,
  };
  repo.add(entry);
  return { ok: true as const, entry };
}

export function countOn(entries: VitalEntry[], date: ISODate): number {
  return entries.filter((e) => toISODate(new Date(e.recordedAt)) === date).length;
}

export function latest(entries: VitalEntry[]): VitalEntry | null {
  return entries.reduce<VitalEntry | null>((a, b) => (!a || b.recordedAt > a.recordedAt ? b : a), null);
}
