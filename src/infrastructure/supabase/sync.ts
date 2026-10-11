/**
 * Sincronización local ⇄ Supabase, genérica para todas las colecciones gracias a SyncMeta.
 * IMPLEMENTADA PERO NO PROBADA contra un proyecto real. Se activa con EXPO_PUBLIC_DATA_SOURCE=supabase.
 *
 * Estrategia "local primero":
 *  1. push: sube con upsert los registros de la cuenta en estado `pending` (incluidos los borrados lógicos).
 *  2. pull: trae los registros con `updated_at` posterior a la última sincronización y gana el más reciente.
 * Las tablas y columnas están en supabase/migrations (borrador). RLS limita cada fila a su dueño.
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
};

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

export async function syncAccount(userId: string): Promise<{ pushed: number; pulled: number }> {
  if (!supabaseConfigured) return { pushed: 0, pulled: 0 };
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
      db.putMany(coll, pending.map((r) => ({ ...r, syncStatus: 'synced' })) as never);
      pushed += pending.length;
    }
    const { data, error } = await sb.from(table).select('*').eq('owner_user_id', userId).gt('updated_at', since);
    if (error) throw error;
    const incoming = (data ?? []).map((row) => fromRow<Collections[typeof coll]>(row));
    const newer = incoming.filter((r) => {
      const local = db.get(coll, r.id);
      return !local || local.updatedAt <= r.updatedAt;
    });
    db.putMany(coll, newer as never);
    pulled += newer.length;
  }
  useDb.setState((s) => ({ lastPulledAt: { ...s.lastPulledAt, [userId]: startedAt } }));
  return { pushed, pulled };
}
