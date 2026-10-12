/**
 * Base de datos local de BUDDY: colecciones tipadas en un store zustand persistido en AsyncStorage.
 * - Cada registro lleva SyncMeta (UUID, dueño, adulto mayor, fechas, borrado lógico, estado de sincronización).
 * - El esquema tiene versión y migraciones (`migrate`). Al subir de versión, añade un caso en MIGRATIONS.
 * - Los datos de cada cuenta quedan aislados por `ownerUserId`.
 * Es la única capa que conoce el store; el resto usa `db.*` o los hooks de src/state.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  AccountSettings,
  Activity,
  ActivityLog,
  Alert,
  Appointment,
  AssistantMessage,
  CheckinAnswer,
  Contact,
  DoseEvent,
  Elder,
  Meal,
  MealLog,
  Medication,
  Reminder,
  StockEntry,
  SyncMeta,
  WaterEntry,
  WaterPlan,
} from '@/domain/types';

export interface Collections {
  accounts: AccountSettings;
  elders: Elder;
  medications: Medication;
  doses: DoseEvent;
  stock: StockEntry;
  waterPlans: WaterPlan;
  water: WaterEntry;
  meals: Meal;
  mealLogs: MealLog;
  activities: Activity;
  activityLogs: ActivityLog;
  contacts: Contact;
  reminders: Reminder;
  appointments: Appointment;
  checkins: CheckinAnswer;
  alerts: Alert;
  messages: AssistantMessage;
}

export type CollectionName = keyof Collections;

export const COLLECTIONS: CollectionName[] = [
  'accounts',
  'elders',
  'medications',
  'doses',
  'stock',
  'waterPlans',
  'water',
  'meals',
  'mealLogs',
  'activities',
  'activityLogs',
  'contacts',
  'reminders',
  'appointments',
  'checkins',
  'alerts',
  'messages',
];

/** Entrega del teléfono al adulto mayor: mientras exista, la app muestra solo su pantalla. */
export interface Handoff {
  userId: string;
  elderId: string;
  failedPins: number;
  lockedUntil: string | null;
}

type Tables = { [K in CollectionName]: Record<string, Collections[K]> };

export interface DbState extends Tables {
  /** Borradores de asistentes (registro, medicamento) por cuenta. */
  drafts: Record<string, Record<string, unknown>>;
  handoff: Handoff | null;
  /** Última sincronización por cuenta (Supabase). */
  lastPulledAt: Record<string, string>;
}

export const SCHEMA_VERSION = 2;

const empty = (): DbState => ({
  ...(Object.fromEntries(COLLECTIONS.map((c) => [c, {}])) as Tables),
  drafts: {},
  handoff: null,
  lastPulledAt: {},
});

/** Migraciones por versión de origen. v1 era el prototipo con datos de ejemplo: no se conserva nada. */
const MIGRATIONS: Record<number, (s: Record<string, unknown>) => Record<string, unknown>> = {
  1: () => empty() as unknown as Record<string, unknown>,
};

export function migrate(persisted: unknown, from: number): DbState {
  let s = (persisted ?? {}) as Record<string, unknown>;
  for (let v = from; v < SCHEMA_VERSION; v++) s = MIGRATIONS[v]?.(s) ?? s;
  return { ...empty(), ...(s as Partial<DbState>) };
}

export const useDb = create<DbState>()(
  persist(empty, {
    name: 'buddy.db',
    version: SCHEMA_VERSION,
    storage: createJSONStorage(() => AsyncStorage),
    migrate,
  }),
);

// Limpia el almacenamiento del prototipo (datos de ejemplo de la v1).
AsyncStorage.removeItem('buddy-store-v1').catch(() => undefined);

export const newId = () => Crypto.randomUUID();
const now = () => new Date().toISOString();

export type NewRecord<K extends CollectionName> = Omit<Collections[K], keyof SyncMeta> & { id?: string };

export interface Actor {
  /** Cuenta dueña del dato (administrador). */
  userId: string;
  elderId: string | null;
  /** Autor real del cambio si no es el dueño (el adulto mayor con su propio acceso). */
  by?: string;
}

export const db = {
  get<K extends CollectionName>(coll: K, id: string): Collections[K] | undefined {
    return useDb.getState()[coll][id] as Collections[K] | undefined;
  },

  /** Registros vivos (no borrados) de una cuenta; si `elderId` se indica, solo de ese adulto mayor. */
  list<K extends CollectionName>(coll: K, userId: string, elderId?: string | null): Collections[K][] {
    return Object.values(useDb.getState()[coll] as Record<string, Collections[K]>).filter(
      (r) => r.ownerUserId === userId && !r.deletedAt && (elderId === undefined || r.elderId === elderId),
    );
  },

  insert<K extends CollectionName>(coll: K, data: NewRecord<K>, actor: Actor): Collections[K] {
    const t = now();
    const record = {
      ...data,
      id: data.id ?? newId(),
      ownerUserId: actor.userId,
      elderId: actor.elderId,
      createdBy: actor.by ?? actor.userId,
      createdAt: t,
      updatedAt: t,
      deletedAt: null,
      syncStatus: 'pending',
    } as Collections[K];
    useDb.setState((s) => ({ [coll]: { ...s[coll], [record.id]: record } }) as Partial<DbState>);
    return record;
  },

  update<K extends CollectionName>(coll: K, id: string, patch: Partial<Collections[K]>): Collections[K] | undefined {
    const current = db.get(coll, id);
    if (!current) return undefined;
    const next = { ...current, ...patch, updatedAt: now(), syncStatus: 'pending' } as Collections[K];
    useDb.setState((s) => ({ [coll]: { ...s[coll], [id]: next } }) as Partial<DbState>);
    return next;
  },

  /** Borrado lógico (se puede deshacer con `restore`). */
  remove<K extends CollectionName>(coll: K, id: string) {
    return db.update(coll, id, { deletedAt: now() } as Partial<Collections[K]>);
  },

  restore<K extends CollectionName>(coll: K, id: string) {
    return db.update(coll, id, { deletedAt: null } as Partial<Collections[K]>);
  },

  /** Inserta registros ya formados (sincronización desde el servidor). */
  putMany<K extends CollectionName>(coll: K, records: Collections[K][]) {
    if (!records.length) return;
    useDb.setState((s) => ({ [coll]: { ...s[coll], ...Object.fromEntries(records.map((r) => [r.id, r])) } }) as Partial<DbState>);
  },

  /** Borra físicamente todos los datos de una cuenta (eliminar cuenta, restablecer). */
  purgeUser(userId: string) {
    useDb.setState((s) => {
      const next: Partial<DbState> = {};
      for (const c of COLLECTIONS) {
        next[c] = Object.fromEntries(Object.entries(s[c]).filter(([, r]) => r.ownerUserId !== userId)) as never;
      }
      const drafts = { ...s.drafts };
      delete drafts[userId];
      return { ...next, drafts, handoff: s.handoff?.userId === userId ? null : s.handoff };
    });
  },

  draft<T>(userId: string, key: string): T | undefined {
    return useDb.getState().drafts[userId]?.[key] as T | undefined;
  },

  setDraft(userId: string, key: string, value: unknown) {
    useDb.setState((s) => {
      const mine = { ...(s.drafts[userId] ?? {}) };
      if (value === undefined) delete mine[key];
      else mine[key] = value;
      return { drafts: { ...s.drafts, [userId]: mine } };
    });
  },

  setHandoff(handoff: Handoff | null) {
    useDb.setState({ handoff });
  },

  draftHandoff(): Handoff | null {
    return useDb.getState().handoff;
  },

  isReady: () => useDb.persist.hasHydrated(),
  onReady: (cb: () => void) => useDb.persist.onFinishHydration(cb),
};
