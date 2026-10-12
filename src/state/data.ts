/** Hooks de lectura: datos vivos de la cuenta conectada y de su adulto mayor activo. */
import { useMemo } from 'react';

import type { AccountSettings, Elder } from '@/domain/types';
import { db, useDb, type CollectionName, type Collections } from '@/infrastructure/local/db';

import { dataOwnerId } from '@/domain/auth';

import { useSession } from './session';

/** Cuenta dueña de los datos (en la sesión del adulto mayor, su administrador). */
export function useUserId(): string | null {
  return useSession((s) => (s.user ? dataOwnerId(s.user) : null));
}

export function useRole() {
  return useSession((s) => s.user?.role ?? 'caregiver');
}

export function useAccount(): AccountSettings | null {
  const userId = useUserId();
  const accounts = useDb((s) => s.accounts);
  return useMemo(() => Object.values(accounts).find((a) => a.ownerUserId === userId && !a.deletedAt) ?? null, [accounts, userId]);
}

/** Todos los adultos mayores de la cuenta (incluidos los de registro sin terminar). */
export function useElders(): Elder[] {
  const userId = useUserId();
  const elders = useDb((s) => s.elders);
  return useMemo(
    () => Object.values(elders).filter((e) => e.ownerUserId === userId && !e.deletedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [elders, userId],
  );
}

export function useActiveElder(): Elder | null {
  const account = useAccount();
  const elders = useElders();
  const linked = useSession((s) => (s.user?.role === 'elder' ? (s.user.elderId ?? null) : null));
  if (linked) return elders.find((e) => e.id === linked) ?? null;
  return elders.find((e) => e.id === account?.activeElderId) ?? elders.find((e) => e.setupDone) ?? elders[0] ?? null;
}

/**
 * Registros vivos de una colección para la cuenta conectada. Por defecto, solo los del adulto mayor activo;
 * con `scope: 'account'` todos los de la cuenta; con `elderId` los de esa persona.
 */
export function useRecords<K extends CollectionName>(coll: K, opts: { scope?: 'elder' | 'account'; elderId?: string | null } = {}): Collections[K][] {
  const userId = useUserId();
  const active = useActiveElder();
  const table = useDb((s) => s[coll]) as Record<string, Collections[K]>;
  const elderId = opts.elderId !== undefined ? opts.elderId : opts.scope === 'account' ? undefined : (active?.id ?? null);
  return useMemo(
    () =>
      Object.values(table).filter(
        (r) => r.ownerUserId === userId && !r.deletedAt && (elderId === undefined || r.elderId === elderId),
      ),
    [table, userId, elderId],
  );
}

export function useRecord<K extends CollectionName>(coll: K, id: string | undefined): Collections[K] | null {
  const table = useDb((s) => s[coll]) as Record<string, Collections[K]>;
  const rec = id ? table[id] : undefined;
  return rec && !rec.deletedAt ? rec : null;
}

export const dbReady = () => db.isReady();
