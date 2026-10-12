/**
 * Entrega del teléfono al adulto mayor: la app muestra solo su pantalla hasta que el familiar escribe su PIN.
 * PIN de 4 dígitos con sal + hash; 5 intentos y bloqueo creciente (30 s, 60 s, …, máx. 15 min).
 */
import { db } from '@/infrastructure/local/db';
import { hashSecret, newSalt } from '@/infrastructure/local/auth';

import { currentUserId } from './session';

const MAX = 5;
const PIN_ITERATIONS = 300;
const GUARD_KEY = 'pin.guard';
let unlocking = false;

export type PinResult = { result: 'ok' } | { result: 'wrong'; left: number } | { result: 'locked'; seconds: number };

/** Espera creciente tras 5 intentos fallidos: 30 s, 60 s, … hasta 15 min. */
function lockSeconds(failed: number) {
  return Math.min(900, 30 * 2 ** (failed - MAX));
}

function account() {
  return db.list('accounts', currentUserId())[0];
}

export const handoffActions = {
  hasPin: () => {
    const acc = account();
    return !!acc?.pinHash && !!acc.pinSalt;
  },
  async setPin(pin: string) {
    const acc = account();
    if (!acc || !/^\d{4}$/.test(pin)) return false;
    const salt = await newSalt();
    const pinHash = await hashSecret(pin, salt, PIN_ITERATIONS);
    if (currentUserId() !== acc.ownerUserId || account()?.id !== acc.id) return false;
    db.update('accounts', acc.id, { pinSalt: salt, pinHash });
    return true;
  },
  start(elderId: string) {
    const userId = currentUserId();
    const elder = db.get('elders', elderId);
    const acc = account();
    if (!elder || elder.deletedAt || elder.ownerUserId !== userId || !acc?.pinHash || !acc.pinSalt) {
      throw new Error('No se puede entregar el teléfono sin paciente y PIN válidos.');
    }
    db.setHandoff({ userId, elderId, failedPins: 0, lockedUntil: null });
  },
  /** Devuelve 'ok', 'wrong' (con intentos restantes) o 'locked' (con segundos de espera). */
  async unlock(pin: string): Promise<{ result: 'ok' } | { result: 'wrong'; left: number } | { result: 'locked'; seconds: number }> {
    if (unlocking) throw new Error('Ya hay una verificación de PIN en curso.');
    unlocking = true;
    try {
      const userId = currentUserId();
      const h = db.draftHandoff();
      const acc = account();
      if (!h) return { result: 'ok' };
      if (h.userId !== userId || !acc?.pinHash || !acc.pinSalt) throw new Error('No se puede verificar el PIN guardado.');
      if (h.lockedUntil && Date.parse(h.lockedUntil) > Date.now()) {
        return { result: 'locked', seconds: Math.ceil((Date.parse(h.lockedUntil) - Date.now()) / 1000) };
      }
      const matches = /^\d{4}$/.test(pin) && (await hashSecret(pin, acc.pinSalt, PIN_ITERATIONS)) === acc.pinHash;
      if (currentUserId() !== userId || db.draftHandoff() !== h || account()?.pinHash !== acc.pinHash || account()?.pinSalt !== acc.pinSalt) {
        throw new Error('La entrega o la sesión cambió durante la verificación.');
      }
      if (matches) {
        db.setHandoff(null);
        return { result: 'ok' };
      }
      const failed = h.failedPins + 1;
      if (failed >= MAX) {
        const seconds = lockSeconds(failed);
        db.setHandoff({ ...h, failedPins: failed, lockedUntil: new Date(Date.now() + seconds * 1000).toISOString() });
        return { result: 'locked', seconds };
      }
      db.setHandoff({ ...h, failedPins: failed });
      return { result: 'wrong', left: MAX - failed };
    } finally {
      unlocking = false;
    }
  },
  /**
   * Verifica el PIN del administrador sin entrega activa (pantalla del adulto mayor con su propio acceso).
   * Mismo límite de intentos y espera creciente; el contador vive en el borrador de la cuenta dueña.
   */
  async verifyAdminPin(pin: string): Promise<PinResult> {
    if (unlocking) throw new Error('Ya hay una verificación de PIN en curso.');
    unlocking = true;
    try {
      const owner = currentUserId();
      const acc = account();
      if (!acc?.pinHash || !acc.pinSalt) throw new Error('No hay PIN guardado.');
      const guard = db.draft<{ failed: number; lockedUntil: string | null }>(owner, GUARD_KEY) ?? { failed: 0, lockedUntil: null };
      if (guard.lockedUntil && Date.parse(guard.lockedUntil) > Date.now()) {
        return { result: 'locked', seconds: Math.ceil((Date.parse(guard.lockedUntil) - Date.now()) / 1000) };
      }
      const matches = /^\d{4}$/.test(pin) && (await hashSecret(pin, acc.pinSalt, PIN_ITERATIONS)) === acc.pinHash;
      if (matches) {
        db.setDraft(owner, GUARD_KEY, undefined);
        return { result: 'ok' };
      }
      const failed = guard.failed + 1;
      if (failed >= MAX) {
        const seconds = lockSeconds(failed);
        db.setDraft(owner, GUARD_KEY, { failed, lockedUntil: new Date(Date.now() + seconds * 1000).toISOString() });
        return { result: 'locked', seconds };
      }
      db.setDraft(owner, GUARD_KEY, { failed, lockedUntil: null });
      return { result: 'wrong', left: MAX - failed };
    } finally {
      unlocking = false;
    }
  },
};
