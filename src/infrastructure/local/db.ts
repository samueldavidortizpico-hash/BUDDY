/**
 * Base de datos local de BUDDY: colecciones tipadas en un store zustand persistido en AsyncStorage.
 * - Cada registro lleva SyncMeta (UUID, dueño, adulto mayor, fechas, borrado lógico, estado de sincronización).
 * - El esquema tiene versión y migraciones (`migrate`). Al subir de versión, añade un caso en MIGRATIONS.
 * - Los datos de cada cuenta quedan aislados por `ownerUserId`: leer y escribir pasa por la FRONTERA DE ACCESO que
 *   instala la sesión (`setAccessGuard`). `putMany` y `purgeAccountData` son el contrato interno de sincronización y de
 *   borrado de cuenta: no pasan por la frontera y solo los usa la infraestructura o la capa de sesión.
 * Es la única capa que conoce el store; el resto usa `db.*` o los hooks de src/state.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { FEATURES } from '@/config/features';

import { secureStorage } from '../secure-storage';
import { createAesCipher, createEncryptedStorage } from './encrypted-storage';

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
  LocationFix,
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
  locations: LocationFix;
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
  'locations',
];

/** Entrega del teléfono al adulto mayor: mientras exista, la app muestra solo su pantalla. */
export interface Handoff {
  userId: string;
  elderId: string;
  failedPins: number;
  lockedUntil: string | null;
  /** `locked`: teléfono entregado, se sale con PIN. `test`: "Probar como", se sale sin PIN. */
  mode?: 'locked' | 'test';
}

/**
 * Entrada del registro de cambios local (ChangeLog). Toda escritura deja una: es lo que el SyncEngine enviará al
 * servidor para reflejar los cambios en el otro celular (docs/SUPABASE_PLAN.md). Sin datos de salud: solo ids.
 */
export interface ChangeEntry {
  id: string;
  entity: CollectionName;
  entityId: string;
  op: 'insert' | 'update' | 'delete' | 'restore';
  /** Cuenta que hizo el cambio (administrador o adulto mayor). */
  author: string;
  ownerUserId: string;
  updatedAt: string;
  version: number;
  syncStatus: 'pending' | 'synced';
}

/** Máximo de entradas sincronizadas que se conservan (las pendientes nunca se descartan). */
const CHANGELOG_KEEP_SYNCED = 500;

type Tables = { [K in CollectionName]: Record<string, Collections[K]> };

export interface DbState extends Tables {
  /** Borradores de asistentes (registro, medicamento) por cuenta. */
  drafts: Record<string, Record<string, unknown>>;
  handoff: Handoff | null;
  /** Última sincronización por cuenta (Supabase). */
  lastPulledAt: Record<string, string>;
  changelog: ChangeEntry[];
}

export const SCHEMA_VERSION = 2;

const empty = (): DbState => ({
  ...(Object.fromEntries(COLLECTIONS.map((c) => [c, {}])) as Tables),
  drafts: {},
  handoff: null,
  lastPulledAt: {},
  changelog: [],
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
    // V4 Fase 3: cifrada detrás de la bandera (docs/ALMACENAMIENTO_SEGURO.md); si no, el AsyncStorage de siempre.
    storage: createJSONStorage(() => (FEATURES.encryptedStorage ? createEncryptedStorage(AsyncStorage, createAesCipher(secureStorage)) : AsyncStorage)),
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

let authorResolver: () => string | null = () => null;

/**
 * Metadatos que solo escribe la base: un caso de uso no puede cambiar el dueño, la persona, el autor, las fechas, la
 * versión, el estado de sincronización ni el borrado lógico (para eso están `remove` y `restore`). Auditoría
 * 2026-11-10, SEC-02: antes `update` aceptaba un `Partial` del registro completo.
 */
const PROTECTED = ['id', 'ownerUserId', 'elderId', 'createdBy', 'createdAt', 'updatedAt', 'deletedAt', 'syncStatus', 'version'] as const;
export type Patch<K extends CollectionName> = Partial<Omit<Collections[K], (typeof PROTECTED)[number]>>;

/** A quién pertenece un registro: lo único que la frontera necesita saber de él. */
export interface Scope {
  ownerUserId: string;
  elderId: string | null;
}
export type AccessMode = 'read' | 'write';
/**
 * Frontera de acceso: ¿quien está conectado puede leer o escribir datos de esa cuenta y esa persona? La define la sesión
 * (la base no conoce la sesión). Sin sesión instalada (pruebas de infraestructura pura) todo pasa.
 */
export type AccessGuard = (coll: CollectionName | 'drafts', scope: Scope, mode: AccessMode) => boolean;
let access: AccessGuard = () => true;

const raw = <K extends CollectionName>(coll: K, id: string) => useDb.getState()[coll][id] as Collections[K] | undefined;

function logChange(log: ChangeEntry[], entity: CollectionName, r: SyncMeta, op: ChangeEntry['op'], author: string): ChangeEntry[] {
  const entry: ChangeEntry = { id: newId(), entity, entityId: r.id, op, author, ownerUserId: r.ownerUserId, updatedAt: r.updatedAt, version: r.version ?? 1, syncStatus: 'pending' };
  const synced = log.filter((c) => c.syncStatus === 'synced');
  const kept = synced.length > CHANGELOG_KEEP_SYNCED ? log.filter((c) => c.syncStatus === 'pending' || synced.indexOf(c) >= synced.length - CHANGELOG_KEEP_SYNCED) : log;
  return [...kept, entry];
}

/** Única escritura sobre un registro existente: comprueba la frontera, sube la versión y deja el cambio en el ChangeLog. */
function write<K extends CollectionName>(coll: K, id: string, patch: Partial<Collections[K]>, op: ChangeEntry['op']): Collections[K] | undefined {
  const current = raw(coll, id);
  if (!current || !access(coll, current, 'write')) return undefined;
  const next = { ...current, ...patch, updatedAt: now(), syncStatus: 'pending', version: (current.version ?? 1) + 1 } as Collections[K];
  useDb.setState((s) => ({ [coll]: { ...s[coll], [id]: next }, changelog: logChange(s.changelog, coll, next, op, authorResolver() ?? next.ownerUserId) }) as Partial<DbState>);
  return next;
}

/**
 * Borrado físico de TODOS los datos de una cuenta, sin frontera: lo llama la capa de sesión después de verificar la
 * contraseña y cerrar la sesión (eliminar cuenta). Las pantallas usan `db.purgeUser`, que sí comprueba al dueño.
 */
export function purgeAccountData(userId: string) {
  useDb.setState((s) => {
    const next: Partial<DbState> = {};
    for (const c of COLLECTIONS) {
      next[c] = Object.fromEntries(Object.entries(s[c]).filter(([, r]) => r.ownerUserId !== userId)) as never;
    }
    const drafts = { ...s.drafts };
    delete drafts[userId];
    const lastPulledAt = { ...s.lastPulledAt };
    delete lastPulledAt[userId];
    return { ...next, drafts, lastPulledAt, handoff: s.handoff?.userId === userId ? null : s.handoff, changelog: s.changelog.filter((c) => c.ownerUserId !== userId) };
  });
}

export const db = {
  /** Un registro por id, solo si quien está conectado puede verlo (otra cuenta u otra persona → `undefined`). */
  get<K extends CollectionName>(coll: K, id: string): Collections[K] | undefined {
    const r = raw(coll, id);
    return r && access(coll, r, 'read') ? r : undefined;
  },

  /** Registros vivos (no borrados) de una cuenta; si `elderId` se indica, solo de ese adulto mayor. */
  list<K extends CollectionName>(coll: K, userId: string, elderId?: string | null): Collections[K][] {
    return Object.values(useDb.getState()[coll] as Record<string, Collections[K]>).filter(
      (r) => r.ownerUserId === userId && !r.deletedAt && (elderId === undefined || r.elderId === elderId) && access(coll, r, 'read'),
    );
  },

  insert<K extends CollectionName>(coll: K, data: NewRecord<K>, actor: Actor): Collections[K] {
    if (!access(coll, { ownerUserId: actor.userId, elderId: actor.elderId }, 'write')) throw new Error('BUDDY: escritura fuera de la cuenta o la persona de la sesión.');
    const t = now();
    const author = actor.by ?? actor.userId;
    const record = {
      ...data,
      id: data.id ?? newId(),
      ownerUserId: actor.userId,
      elderId: actor.elderId,
      createdBy: author,
      createdAt: t,
      updatedAt: t,
      deletedAt: null,
      syncStatus: 'pending',
      version: 1,
    } as Collections[K];
    useDb.setState((s) => ({ [coll]: { ...s[coll], [record.id]: record }, changelog: logChange(s.changelog, coll, record, 'insert', author) }) as Partial<DbState>);
    return record;
  },

  /** Cambia campos de contenido. Los metadatos protegidos se descartan aunque lleguen por un tipo forzado. */
  update<K extends CollectionName>(coll: K, id: string, patch: Patch<K>): Collections[K] | undefined {
    const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => !(PROTECTED as readonly string[]).includes(k))) as Partial<Collections[K]>;
    return write(coll, id, clean, 'update');
  },

  /** Las pantallas y el SyncEngine se suscriben a una colección y reaccionan al instante a cada cambio. */
  subscribe<K extends CollectionName>(coll: K, listener: (records: Record<string, Collections[K]>) => void): () => void {
    return useDb.subscribe((s, prev) => {
      if (s[coll] !== prev[coll]) listener(s[coll] as Record<string, Collections[K]>);
    });
  },

  /** Quién está escribiendo (lo define la sesión; la base no conoce la sesión). */
  setAuthorResolver(fn: () => string | null) {
    authorResolver = fn;
  },

  /** Instala la frontera de acceso (la sesión, una sola vez al cargar). */
  setAccessGuard(fn: AccessGuard) {
    access = fn;
  },

  /** Cambios aún no enviados al servidor. */
  pendingChanges(ownerUserId: string): ChangeEntry[] {
    return useDb.getState().changelog.filter((c) => c.ownerUserId === ownerUserId && c.syncStatus === 'pending');
  },

  /** Borrado lógico (se puede deshacer con `restore`). */
  remove<K extends CollectionName>(coll: K, id: string) {
    return write(coll, id, { deletedAt: now() } as Partial<Collections[K]>, 'delete');
  },

  /**
   * Borrado REAL (no deja el dato con `deletedAt`): para datos que deben desaparecer, como la ubicación al revocar
   * el consentimiento. Queda una entrada "delete" en el ChangeLog para borrarlo también en el servidor.
   */
  purge<K extends CollectionName>(coll: K, ids: string[]) {
    if (!ids.length) return;
    useDb.setState((s) => {
      let changelog = s.changelog;
      const table = { ...s[coll] } as Record<string, Collections[K]>;
      for (const id of ids) {
        const r = table[id];
        if (!r || !access(coll, r, 'write')) continue;
        changelog = logChange(changelog, coll, { ...r, updatedAt: now() }, 'delete', authorResolver() ?? r.ownerUserId);
        delete table[id];
      }
      return { [coll]: table, changelog } as Partial<DbState>;
    });
  },

  restore<K extends CollectionName>(coll: K, id: string) {
    return write(coll, id, { deletedAt: null } as Partial<Collections[K]>, 'restore');
  },

  /** Inserta registros ya formados (sincronización desde el servidor). Contrato interno: no pasa por la frontera. */
  putMany<K extends CollectionName>(coll: K, records: Collections[K][]) {
    if (!records.length) return;
    useDb.setState((s) => ({ [coll]: { ...s[coll], ...Object.fromEntries(records.map((r) => [r.id, r])) } }) as Partial<DbState>);
  },

  /** Borra físicamente todos los datos de la cuenta conectada (restablecer). Solo su administrador. */
  purgeUser(userId: string) {
    if (!access('accounts', { ownerUserId: userId, elderId: null }, 'write')) return;
    purgeAccountData(userId);
  },

  draft<T>(userId: string, key: string): T | undefined {
    if (!access('drafts', { ownerUserId: userId, elderId: null }, 'read')) return undefined;
    return useDb.getState().drafts[userId]?.[key] as T | undefined;
  },

  setDraft(userId: string, key: string, value: unknown) {
    if (!access('drafts', { ownerUserId: userId, elderId: null }, 'write')) return;
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
