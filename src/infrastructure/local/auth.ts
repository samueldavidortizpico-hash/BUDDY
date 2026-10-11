/**
 * LocalAuthProvider: cuentas en el dispositivo. Es una BARRERA DE DISPOSITIVO, no seguridad de servidor:
 * quien tenga el teléfono desbloqueado y herramientas de depuración podría leer los datos locales.
 * La seguridad real llega con SupabaseAuthProvider (docs/SUPABASE_PLAN.md).
 *
 * - Contraseña: sal aleatoria de 16 bytes + SHA-256 iterado (`ITERATIONS` rondas).
 * - Cada cuenta en su propia clave `buddy.account.<sha256(correo)>`; varias cuentas por dispositivo.
 * - Bloqueo tras 5 intentos fallidos: 30 s, y se duplica hasta 15 min.
 * - Los mensajes de error no revelan si el correo existe.
 */
import * as Crypto from 'expo-crypto';

import { AuthError, type AuthService, type AuthUser } from '@/domain/auth';
import { isAcceptablePassword, isValidEmail, normalizeEmail } from '@/domain/validation';
import { strings } from '@/i18n';

import { secureStorage } from '../secure-storage';

export const ITERATIONS = 1000;
const MAX_ATTEMPTS = 5;
const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 15 * 60_000;
const SESSION_KEY = 'buddy.session';
const INDEX_KEY = 'buddy.accounts';

interface StoredAccount extends AuthUser {
  salt: string;
  hash: string;
  iterations: number;
  failedAttempts: number;
  lockedUntil: number | null;
}

const e = strings.auth.errors;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashSecret(secret: string, salt: string, iterations = ITERATIONS): Promise<string> {
  let h = `${salt}:${secret}`;
  for (let i = 0; i < iterations; i++) {
    h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}${h}`);
  }
  return h;
}

export async function newSalt(): Promise<string> {
  return toHex(await Crypto.getRandomBytesAsync(16));
}

/** Comparación en tiempo constante. */
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const accountKey = async (email: string) => `buddy.account.${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalizeEmail(email))}`;

async function readAccount(email: string): Promise<StoredAccount | null> {
  const raw = await secureStorage.get(await accountKey(email));
  return raw ? (JSON.parse(raw) as StoredAccount) : null;
}

async function writeAccount(acc: StoredAccount) {
  await secureStorage.set(await accountKey(acc.email), JSON.stringify(acc));
}

const publicUser = ({ id, email, name, createdAt }: AuthUser): AuthUser => ({ id, email, name, createdAt });

export function createLocalAuthProvider(): AuthService {
  const listeners = new Set<(u: AuthUser | null) => void>();
  const emit = (u: AuthUser | null) => listeners.forEach((l) => l(u));

  async function setSession(user: AuthUser | null) {
    if (user) await secureStorage.set(SESSION_KEY, JSON.stringify(publicUser(user)));
    else await secureStorage.remove(SESSION_KEY);
    emit(user ? publicUser(user) : null);
  }

  async function verify(email: string, password: string): Promise<StoredAccount> {
    const acc = await readAccount(email);
    // Con o sin cuenta se calcula un hash, para no revelar por el tiempo de respuesta si el correo existe.
    const salt = acc?.salt ?? 'buddy-no-account';
    const hash = await hashSecret(password, salt, acc?.iterations ?? ITERATIONS);
    if (!acc) throw new AuthError('invalid_credentials', e.invalid);
    if (acc.lockedUntil && acc.lockedUntil > Date.now()) {
      throw new AuthError('locked', e.locked(Math.ceil((acc.lockedUntil - Date.now()) / 1000)), acc.lockedUntil - Date.now());
    }
    if (!same(hash, acc.hash)) {
      const failed = acc.failedAttempts + 1;
      const over = failed - MAX_ATTEMPTS;
      const lockMs = over >= 0 ? Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** over) : 0;
      await writeAccount({ ...acc, failedAttempts: failed, lockedUntil: lockMs ? Date.now() + lockMs : null });
      if (lockMs) throw new AuthError('locked', e.locked(Math.ceil(lockMs / 1000)), lockMs);
      throw new AuthError('invalid_credentials', e.invalid);
    }
    if (acc.failedAttempts || acc.lockedUntil) await writeAccount({ ...acc, failedAttempts: 0, lockedUntil: null });
    return acc;
  }

  return {
    kind: 'local',

    async signUp({ name, email, password }) {
      if (!isValidEmail(email)) throw new AuthError('invalid_email', e.email);
      if (!isAcceptablePassword(password)) throw new AuthError('weak_password', e.weak);
      if (await readAccount(email)) throw new AuthError('email_taken', e.taken);
      const salt = await newSalt();
      const acc: StoredAccount = {
        id: Crypto.randomUUID(),
        email: normalizeEmail(email),
        name: name.trim(),
        createdAt: new Date().toISOString(),
        salt,
        hash: await hashSecret(password, salt),
        iterations: ITERATIONS,
        failedAttempts: 0,
        lockedUntil: null,
      };
      await writeAccount(acc);
      const index = JSON.parse((await secureStorage.get(INDEX_KEY)) ?? '[]') as string[];
      await secureStorage.set(INDEX_KEY, JSON.stringify([...new Set([...index, acc.id])]));
      await setSession(acc);
      return publicUser(acc);
    },

    async signIn({ email, password }) {
      const acc = await verify(email, password);
      await setSession(acc);
      return publicUser(acc);
    },

    async signOut() {
      await setSession(null);
    },

    async getSession() {
      const raw = await secureStorage.get(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    },

    onAuthStateChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async resetPassword() {
      return { sent: false, message: strings.auth.forgot.localMessage };
    },

    async updatePassword({ current, next }) {
      const session = await this.getSession();
      if (!session) throw new AuthError('invalid_credentials', e.invalid);
      if (!isAcceptablePassword(next)) throw new AuthError('weak_password', e.weak);
      const acc = await verify(session.email, current);
      const salt = await newSalt();
      await writeAccount({ ...acc, salt, hash: await hashSecret(next, salt), iterations: ITERATIONS });
    },

    async deleteAccount(password) {
      const session = await this.getSession();
      if (!session) throw new AuthError('invalid_credentials', e.invalid);
      await verify(session.email, password);
      await secureStorage.remove(await accountKey(session.email));
      const index = JSON.parse((await secureStorage.get(INDEX_KEY)) ?? '[]') as string[];
      await secureStorage.set(INDEX_KEY, JSON.stringify(index.filter((id) => id !== session.id)));
      await setSession(null);
    },
  };
}
