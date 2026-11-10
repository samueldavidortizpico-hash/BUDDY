/**
 * Sincronización local ⇄ Supabase, genérica para todas las colecciones gracias a SyncMeta.
 * IMPLEMENTADA PERO NO PROBADA contra un proyecto real. Se activa con EXPO_PUBLIC_DATA_SOURCE=supabase.
 *
 * Estrategia "local primero":
 *  1. push: sube con upsert los registros de la cuenta en estado `pending` (incluidos los borrados lógicos) y borra en
 *     el servidor lo que se purgó aquí (ubicaciones revocadas), según el ChangeLog.
 *  2. pull: trae por páginas los registros con `updated_at` posterior a la última sincronización; gana el más reciente
 *     y nunca se pisa un cambio local que aún no se ha subido.
 * Las tablas y columnas están en supabase/migrations (borrador). RLS limita cada fila a su dueño.
 *
 * Correcciones de la auditoría 2026-11-10:
 *  - FUN-02: solo queda `synced` lo que REALMENTE se subió; una edición hecha mientras subía sigue `pending`.
 *  - FUN-03: páginas de PAGE filas (antes una sola consulta que el servidor podía truncar sin avisar), borrados del
 *    ChangeLog enviados al servidor y una sola sincronización a la vez por cuenta.
 */
import { COLLECTIONS, db, useDb, type CollectionName, type Collections } from '../local/db';

import { getSupabase, supabaseConfigured } from './client';

/** Colección local → tabla. */
export const TABLES: Record<CollectionName, string> = {
  accounts: 'account_settings',
  elders: 'elders',
  medications: 'medications',
  doses: 'dose_events',
  stock: 'stock_entries',
  waterPlans: 'water_goals',
  water: 'water_entries',
  meals: 'meal_schedules',
  mealLogs: 'meal_logs',
  activities: 'activity_goals',
  activityLogs: 'activity_logs',
  contacts: 'emergency_contacts',
  reminders: 'reminders',
  appointments: 'appointments',
  checkins: 'checkin_answers',
  alerts: 'alerts',
  messages: 'assistant_messages',
  locations: 'location_fixes',
};

/** Filas por página al traer del servidor. */
export const PAGE = 500;

const toSnake = (k: string) => k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export function toRow(record: object): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) if (k !== 'syncStatus') row[toSnake(k)] = v;
  return row;
}

export function fromRow<T>(row: Record<string, unknown>): T {
  const rec: Record<string, unknown> = { syncStatus: 'synced' };
  for (const [k, v] of Object.entries(row)) rec[toCamel(k)] = v;
  return rec as T;
}

type Result = { pushed: number; pulled: number };
const running = new Map<string, Promise<Result>>();

/** Una sola sincronización a la vez por cuenta: una segunda llamada espera el resultado de la que ya corre. */
export function syncAccount(userId: string): Promise<Result> {
  if (!supabaseConfigured) return Promise.resolve({ pushed: 0, pulled: 0 });
  const current = running.get(userId);
  if (current) return current;
  const run = runSync(userId).finally(() => running.delete(userId));
  running.set(userId, run);
  return run;
}

/** Registro tal como está AHORA en el teléfono (contrato interno: la sincronización no pasa por la frontera de sesión). */
const local = <K extends CollectionName>(coll: K, id: string) => useDb.getState()[coll][id] as Collections[K] | undefined;

async function runSync(userId: string): Promise<Result> {
  const sb = getSupabase();
  let pushed = 0;
  let pulled = 0;
  const since = useDb.getState().lastPulledAt[userId] ?? '1970-01-01T00:00:00.000Z';
  const startedAt = new Date().toISOString();

  for (const coll of COLLECTIONS) {
    const table = TABLES[coll];
    const pending = Object.values(useDb.getState()[coll] as Record<string, Collections[typeof coll]>).filter(
      (r) => r.ownerUserId === userId && r.syncStatus === 'pending',
    );
    if (pending.length) {
      const { error } = await sb.from(table).upsert(pending.map(toRow));
      if (error) throw error;
      // FUN-02: mientras subía pudo haber una edición. Solo se marca lo que sigue igual a lo enviado (misma versión y
      // fecha); lo demás conserva su contenido nuevo y su estado `pending` para la próxima vuelta.
      const sent = pending.filter((r) => {
        const now = local(coll, r.id);
        return !!now && now.updatedAt === r.updatedAt && (now.version ?? 1) === (r.version ?? 1);
      });
      db.putMany(coll, sent.map((r) => ({ ...r, syncStatus: 'synced' })) as never);
      pushed += sent.length;
    }

    // Borrados REALES (db.purge): el registro ya no existe aquí; sin esto seguiría en el servidor y volvería al
    // sincronizar desde cero (por ejemplo, ubicaciones tras revocar el consentimiento).
    const purged = useDb.getState().changelog.filter((c) => c.ownerUserId === userId && c.entity === coll && c.op === 'delete' && c.syncStatus === 'pending' && !local(coll, c.entityId));
    if (purged.length) {
      const ids = [...new Set(purged.map((c) => c.entityId))];
      const { error } = await sb.from(table).delete().eq('owner_user_id', userId).in('id', ids);
      if (error) throw error;
      // El registro ya no existe en ningún lado: todo su historial pendiente (crear, cambiar, borrar) queda cerrado.
      const gone = new Set(ids);
      useDb.setState((s) => ({ changelog: s.changelog.map((c) => (c.entity === coll && c.ownerUserId === userId && gone.has(c.entityId) ? { ...c, syncStatus: 'synced' as const } : c)) }));
    }

    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb
        .from(table)
        .select('*')
        .eq('owner_user_id', userId)
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const incoming = ((data ?? []) as Record<string, unknown>[]).map((row) => fromRow<Collections[typeof coll]>(row));
      const newer = incoming.filter((r) => {
        const mine = local(coll, r.id);
        if (!mine) return true;
        // Un cambio local sin subir solo cede ante una fila estrictamente más nueva.
        return mine.syncStatus === 'pending' ? mine.updatedAt < r.updatedAt : mine.updatedAt <= r.updatedAt;
      });
      db.putMany(coll, newer as never);
      pulled += newer.length;
      if (incoming.length < PAGE) break;
    }
  }
  useDb.setState((s) => ({ lastPulledAt: { ...s.lastPulledAt, [userId]: startedAt } }));
  return { pushed, pulled };
}
