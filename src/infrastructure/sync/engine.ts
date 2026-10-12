/**
 * SyncEngine: refleja los cambios entre el celular del administrador y el del adulto mayor a través del servidor.
 * **DESACTIVADO** (`SYNC_ENABLED = false`) hasta conectar Supabase (Fase 2). Hoy solo existen las reglas y el contrato,
 * probados con un transporte en memoria; nada sale del teléfono.
 *
 * Reglas de conflicto:
 * 1. El administrador manda sobre la RUTINA (perfil, medicamentos, horarios, contactos, citas…): un cambio del adulto
 *    mayor en esas colecciones se rechaza (además, `can()` no se lo permite en la app).
 * 2. El adulto mayor solo AGREGA EVENTOS (tomas confirmadas, agua, comidas, actividades, chequeo, pedir ayuda,
 *    ubicación). Los eventos no se pisan entre sí: cada uno tiene su id; si el mismo id llega de los dos lados, gana la
 *    versión más alta y, a igual versión, el `updatedAt` más reciente.
 * 3. Borrado lógico: un borrado del administrador en la rutina gana siempre.
 */
import type { Role, SyncMeta } from '@/domain/types';

import type { ChangeEntry, CollectionName } from '../local/db';

export const SYNC_ENABLED = false;

/** Colecciones que solo edita el administrador. */
export const ADMIN_COLLECTIONS: CollectionName[] = ['accounts', 'elders', 'medications', 'stock', 'waterPlans', 'meals', 'activities', 'contacts', 'reminders', 'appointments', 'messages'];
/** Colecciones de eventos que también crea el adulto mayor. */
export const EVENT_COLLECTIONS: CollectionName[] = ['doses', 'water', 'mealLogs', 'activityLogs', 'checkins', 'alerts'];

export type Winner = 'local' | 'remote';

/**
 * Decide qué versión de un mismo registro se queda.
 * `roleOf(autor)` dice si el autor de cada versión es administrador o adulto mayor.
 */
export function resolveConflict(coll: CollectionName, local: SyncMeta, remote: SyncMeta, roleOf: (authorId: string) => Role): Winner {
  if (ADMIN_COLLECTIONS.includes(coll)) {
    const localAdmin = roleOf(local.createdBy) === 'caregiver';
    const remoteAdmin = roleOf(remote.createdBy) === 'caregiver';
    if (localAdmin !== remoteAdmin) return remoteAdmin ? 'remote' : 'local';
  }
  const lv = local.version ?? 1;
  const rv = remote.version ?? 1;
  if (lv !== rv) return rv > lv ? 'remote' : 'local';
  return remote.updatedAt > local.updatedAt ? 'remote' : 'local';
}

/** ¿Se acepta un cambio de este autor en esta colección? (el adulto mayor no edita la rutina). */
export function acceptsChange(coll: CollectionName, authorRole: Role): boolean {
  return authorRole === 'caregiver' || EVENT_COLLECTIONS.includes(coll);
}

export interface SyncTransport {
  push(changes: ChangeEntry[], records: Record<string, SyncMeta>): Promise<{ accepted: string[]; rejected: { id: string; reason: string }[] }>;
  pull(since: string): Promise<{ coll: CollectionName; record: SyncMeta }[]>;
}

export type SyncOutcome = { status: 'disabled'; reason: string } | { status: 'ok'; pushed: number; pulled: number; rejected: number } | { status: 'error'; message: string };

/** Crea el motor. Con `enabled: false` (por defecto) no hace nada y lo dice. */
export function createSyncEngine(opts: { enabled?: boolean; transport?: SyncTransport } = {}) {
  const enabled = opts.enabled ?? SYNC_ENABLED;
  return {
    enabled,
    async run(input: { pending: ChangeEntry[]; records: Record<string, SyncMeta>; since: string; apply: (coll: CollectionName, record: SyncMeta) => void }): Promise<SyncOutcome> {
      if (!enabled || !opts.transport) return { status: 'disabled', reason: 'El reflejo entre celulares se activa al conectar el servidor (Fase 2).' };
      try {
        const res = await opts.transport.push(input.pending, input.records);
        const incoming = await opts.transport.pull(input.since);
        incoming.forEach((x) => input.apply(x.coll, x.record));
        return { status: 'ok', pushed: res.accepted.length, pulled: incoming.length, rejected: res.rejected.length };
      } catch (e) {
        // Nunca en silencio: el llamador lo muestra y lo encola para reintentar (sin datos de salud en el mensaje).
        return { status: 'error', message: e instanceof Error ? e.message : 'Error de sincronización' };
      }
    },
  };
}
