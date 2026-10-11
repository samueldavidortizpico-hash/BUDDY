/** A dónde va el cuidador al entrar: sin persona registrada, al asistente de registro; si no, al Resumen. */
import type { Href } from 'expo-router';

import { useDb } from '@/infrastructure/local/db';

import { useSession } from './session';

export function homeHrefFor(userId: string | null, hasElder: boolean, handoff: boolean): Href {
  if (!userId) return '/';
  if (handoff) return '/elder';
  return hasElder ? '/summary' : '/setup';
}

export function useHomeHref(): Href {
  const userId = useSession((s) => s.user?.id ?? null);
  const hasElder = useDb((s) => Object.values(s.elders).some((e) => e.ownerUserId === userId && e.setupDone && !e.deletedAt));
  const handoff = useDb((s) => s.handoff?.userId === userId && !!userId);
  return homeHrefFor(userId, hasElder, handoff);
}
