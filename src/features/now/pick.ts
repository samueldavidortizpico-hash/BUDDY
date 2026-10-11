/**
 * Qué mostrar en la tarjeta "Ahora" del adulto mayor y qué queda para "Más tarde hoy".
 * Prioridad: medicamento que toca en ≤ 60 min o sin confirmar → agua hasta la meta → chequeo de ánimo
 * → próximo medicamento lejano → nada pendiente.
 */
import { effectiveTime, type DoseItem } from '@/features/medications/schedule';
import { clockToMinutes } from '@/utils/dates';

export type NowItem =
  | { kind: 'medication'; item: DoseItem }
  | { kind: 'water'; glasses: number; goal: number }
  | { kind: 'checkin' }
  | { kind: 'done' };

export interface NowInput {
  /** Tomas abiertas del día (pendientes, pospuestas o sin confirmar), en orden. */
  open: DoseItem[];
  next: DoseItem | null;
  nowMinutes: number;
  glasses: number;
  goal: number;
  moodDone: boolean;
}

const SOON = 60;

export function pickNow({ open, next, nowMinutes, glasses, goal, moodDone }: NowInput): { now: NowItem; later: NowItem[] } {
  const due = next && (next.status === 'unconfirmed' || clockToMinutes(effectiveTime(next.dose)) - nowMinutes <= SOON) ? next : null;
  const candidates: NowItem[] = [
    ...(due ? [{ kind: 'medication', item: due } as const] : []),
    ...(glasses < goal ? [{ kind: 'water', glasses, goal } as const] : []),
    ...(!moodDone ? [{ kind: 'checkin' } as const] : []),
  ];
  const now: NowItem = candidates[0] ?? (next ? { kind: 'medication', item: next } : { kind: 'done' });
  const heroDose = now.kind === 'medication' ? now.item.dose.id : null;
  const later: NowItem[] = [
    ...open.filter((i) => i.dose.id !== heroDose).map((item) => ({ kind: 'medication', item }) as const),
    ...candidates.filter((c) => c.kind !== 'medication' && c.kind !== now.kind),
  ];
  return { now, later };
}
