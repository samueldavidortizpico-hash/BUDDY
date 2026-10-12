/** A dónde va el cuidador al entrar: sin persona registrada, al asistente de registro; si no, al Resumen. */
import type { Href } from 'expo-router';

import { dataOwnerId } from '@/domain/auth';
import type { Role } from '@/domain/types';
import { useDb, type DbState, type Handoff } from '@/infrastructure/local/db';

import { useSession } from './session';

/** Todos los guards deben aceptar la misma entrega para evitar /summary ⇄ /elder. */
export function selectValidHandoff(state: DbState, userId: string | null): Handoff | null {
  const handoff = state.handoff;
  const elder = handoff ? state.elders[handoff.elderId] : undefined;
  return userId && handoff?.userId === userId && elder && !elder.deletedAt && elder.ownerUserId === userId ? handoff : null;
}

export function useValidHandoff(): Handoff | null {
  const userId = useSession((s) => (s.user ? dataOwnerId(s.user) : null));
  return useDb((s) => selectValidHandoff(s, userId));
}

export function homeHrefFor(userId: string | null, hasElder: boolean, handoff: boolean, role: Role = 'caregiver'): Href {
  if (!userId) return '/';
  if (handoff || role === 'elder') return '/elder';
  return hasElder ? '/summary' : '/setup';
}

export function useHomeHref(): Href {
  const userId = useSession((s) => (s.user ? dataOwnerId(s.user) : null));
  const role = useSession((s) => s.user?.role ?? 'caregiver');
  const hasElder = useDb((s) => Object.values(s.elders).some((e) => e.ownerUserId === userId && e.setupDone && !e.deletedAt));
  const handoff = useValidHandoff();
  return homeHrefFor(userId, hasElder, !!handoff, role);
}
