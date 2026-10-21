/**
 * HeartbeatRepository local (V3.0): guarda las señales de vida del celular del adulto mayor en la base local, como
 * borrador de la cuenta dueña de los datos (las últimas MAX). Sirve cuando el administrador y el adulto mayor usan el
 * mismo celular ("Probar como" o teléfono entregado). La fase de backend sube `pending` y marca `markSent`.
 */
import type { Heartbeat, HeartbeatRepository } from '@/domain/verification';

import { db } from './db';

const MAX = 200;
const key = (elderId: string) => `heartbeats.${elderId}`;
const sentKey = (elderId: string) => `heartbeats.sent.${elderId}`;

export function createLocalHeartbeats(ownerId: () => string): HeartbeatRepository {
  const recent = (elderId: string) => db.draft<Heartbeat[]>(ownerId(), key(elderId)) ?? [];
  return {
    record(elderId, beat) {
      db.setDraft(ownerId(), key(elderId), [...recent(elderId), beat].slice(-MAX));
    },
    recent,
    pending(elderId) {
      const sent = db.draft<string>(ownerId(), sentKey(elderId)) ?? '';
      return recent(elderId).filter((b) => b.at > sent);
    },
    markSent(elderId, upTo) {
      db.setDraft(ownerId(), sentKey(elderId), upTo);
    },
  };
}

export const heartbeatKey = key;
