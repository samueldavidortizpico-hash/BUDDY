/**
 * Familia (V4.3, plan Familiar): turnos de cuidado y notas compartidas. PURO. Hoy viven en este teléfono (borradores
 * de la cuenta); compartirlos con otros celulares llega con el servidor, como las invitaciones.
 */
import type { ISODate } from './types';

/** Responsable de cada día de la semana (0 = domingo … 6 = sábado). */
export type Shifts = Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, string>>;

export interface FamilyNote {
  id: string;
  text: string;
  author: string;
  at: string;
}

export const NOTE_MAX = 500;

/** Quién acompaña ese día (null si nadie tiene turno). */
export function shiftFor(shifts: Shifts, date: ISODate): string | null {
  const [y, m, d] = date.split('-').map(Number);
  return shifts[new Date(y, m - 1, d).getDay() as 0] ?? null;
}

/** Siguiente responsable al tocar un día: recorre los integrantes y termina en "sin turno". */
export function nextShift(current: string | undefined, members: string[]): string | undefined {
  if (!members.length) return undefined;
  const i = current ? members.indexOf(current) : -1;
  return i + 1 < members.length ? members[i + 1] : undefined;
}

/** Agrega una nota (recortada, sin vacías ni excesos) y deja las más recientes primero. */
export function addNote(notes: FamilyNote[], input: { id: string; text: string; author: string; now: Date }): FamilyNote[] {
  const text = input.text.trim().slice(0, NOTE_MAX);
  if (!text) return notes;
  return [{ id: input.id, text, author: input.author, at: input.now.toISOString() }, ...notes];
}
