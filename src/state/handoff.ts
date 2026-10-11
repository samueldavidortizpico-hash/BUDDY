/**
 * Entrega del teléfono al adulto mayor: la app muestra solo su pantalla hasta que el familiar escribe su PIN.
 * PIN de 4 dígitos con sal + hash; 5 intentos y bloqueo creciente (30 s, 60 s, …, máx. 15 min).
 */
import { db } from '@/infrastructure/local/db';
import { hashSecret, newSalt } from '@/infrastructure/local/auth';

import { currentUserId } from './session';

const MAX = 5;
const PIN_ITERATIONS = 300;

function account() {
  return db.list('accounts', currentUserId())[0];
}

export const handoffActions = {
  hasPin: () => !!account()?.pinHash,
  async setPin(pin: string) {
    const acc = account();
    if (!acc || !/^\d{4}$/.test(pin)) return false;
    const salt = await newSalt();
    db.update('accounts', acc.id, { pinSalt: salt, pinHash: await hashSecret(pin, salt, PIN_ITERATIONS) });
    return true;
  },
  start(elderId: string) {
    db.setHandoff({ userId: currentUserId(), elderId, failedPins: 0, lockedUntil: null });
  },
  /** Devuelve 'ok', 'wrong' (con intentos restantes) o 'locked' (con segundos de espera). */
  async unlock(pin: string): Promise<{ result: 'ok' } | { result: 'wrong'; left: number } | { result: 'locked'; seconds: number }> {
    const h = db.draftHandoff();
    const acc = account();
    if (!h || !acc?.pinHash || !acc.pinSalt) {
      db.setHandoff(null);
      return { result: 'ok' };
    }
    if (h.lockedUntil && Date.parse(h.lockedUntil) > Date.now()) return { result: 'locked', seconds: Math.ceil((Date.parse(h.lockedUntil) - Date.now()) / 1000) };
    if ((await hashSecret(pin, acc.pinSalt, PIN_ITERATIONS)) === acc.pinHash) {
      db.setHandoff(null);
      return { result: 'ok' };
    }
    const failed = h.failedPins + 1;
    if (failed >= MAX) {
      const seconds = Math.min(900, 30 * 2 ** (failed - MAX));
      db.setHandoff({ ...h, failedPins: failed, lockedUntil: new Date(Date.now() + seconds * 1000).toISOString() });
      return { result: 'locked', seconds };
    }
    db.setHandoff({ ...h, failedPins: failed });
    return { result: 'wrong', left: MAX - failed };
  },
};
