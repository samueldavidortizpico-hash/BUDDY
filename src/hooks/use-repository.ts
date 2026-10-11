import { useSyncExternalStore } from 'react';

import type { Subscribable } from '@/repositories/contracts';

/** Lee un valor de un repositorio y vuelve a renderizar cuando cambia. `read` debe devolver referencias estables. */
export function useRepositoryValue<T>(repo: Subscribable, read: () => T): T {
  return useSyncExternalStore(repo.subscribe, read, read);
}
