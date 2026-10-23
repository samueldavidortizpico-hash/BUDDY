/** Identidad y ambigüedad de las tomas. Puro; no consulta reloj ni almacenamiento. */
import type { DoseEvent, DoseHistoryEntry } from './types';

export type SlottedDose = Pick<DoseEvent, 'medicationId' | 'date' | 'time'> & Partial<Pick<DoseEvent, 'slot' | 'dayLimit' | 'status' | 'cancelledAt' | 'safetyHold' | 'history'>>;

/** Preserva posiciones explícitas y asigna las antiguas por hora, sin modificar la entrada. */
export function withDoseSlots<T extends SlottedDose>(doses: T[], timesFor?: (dose: T) => readonly string[]): (T & { slot: number })[] {
  const result = doses.map((d) => {
    const matching = timesFor?.(d).indexOf(d.time) ?? -1;
    return { ...d, slot: Number.isInteger(d.slot) && d.slot! >= 0 ? d.slot : matching >= 0 ? matching : undefined };
  });
  const groups = new Map<string, typeof result>();
  for (const d of result) {
    const key = `${d.medicationId}@${d.date}`;
    const group = groups.get(key) ?? [];
    group.push(d);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const used = new Set(group.flatMap((d) => Number.isInteger(d.slot) && d.slot! >= 0 ? [d.slot!] : []));
    const legacy = group.filter((d) => !Number.isInteger(d.slot) || d.slot! < 0).sort((a, b) => a.time.localeCompare(b.time));
    let next = 0;
    for (const d of legacy) {
      while (used.has(next)) next++;
      d.slot = next;
      used.add(next++);
    }
  }
  return result as (T & { slot: number })[];
}

function corrected(entry: DoseHistoryEntry): boolean {
  const before = entry.from?.status;
  const after = entry.to?.status;
  return (before === 'taken' || before === 'skipped') && !!after && before !== after;
}

/** R8: la UI debe pedir confirmación del cuidador antes de otra dosis ante incertidumbre. */
export function doseAmbiguity(doses: SlottedDose[], medicationId: string, date: string, slot?: number): boolean {
  const day = withDoseSlots(doses.filter((d) => d.medicationId === medicationId && d.date === date));
  const scope = slot === undefined ? day : day.filter((d) => d.slot === slot);
  if (scope.some((d) => d.safetyHold || d.history?.some((h) => corrected(h) || (h.action === 'schedule_changed' && (h.from?.status === 'taken' || h.from?.status === 'skipped'))))) return true;
  const seen = new Set<number>();
  return scope.some((d) => {
    if (seen.has(d.slot)) return true;
    seen.add(d.slot);
    return false;
  });
}

/** Límite conservador de posiciones aplicable a este medicamento y día. */
export function doseDayLimit(doses: SlottedDose[], scheduled: number): number {
  return Math.max(0, Math.min(scheduled, ...doses.flatMap((d) => typeof d.dayLimit === 'number' && Number.isFinite(d.dayLimit) ? [Math.floor(d.dayLimit)] : [])));
}
