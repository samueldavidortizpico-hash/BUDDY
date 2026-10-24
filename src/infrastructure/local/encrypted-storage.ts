/**
 * Almacenamiento cifrado de la base local (V4 Fase 3, docs/ALMACENAMIENTO_SEGURO.md). Envuelve el AsyncStorage actual:
 * cada escritura se guarda cifrada con AES-GCM (autenticado: un byte cambiado no se descifra) y la clave vive en el
 * SecureStore (Keychain / Keystore), nunca junto a los datos.
 *
 * Migración sin pérdida: lee el original en claro → guarda una copia de respaldo → cifra → verifica descifrando → solo
 * entonces borra el original. La copia se borra en la siguiente apertura exitosa. Si algo falla, sigue leyendo y
 * escribiendo el original (reversión). Si la clave se perdió o los datos fueron alterados, no finge que no hay datos:
 * queda bloqueado para escritura (no sobrescribe nada) y avisa con `health()`. Nada de esto escribe en la consola.
 */
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';

export interface Cipher {
  /** Cifra texto. `create`: puede generar la clave si aún no existe (solo en la migración). */
  encrypt(plain: string, create?: boolean): Promise<string>;
  decrypt(sealed: string): Promise<string>;
}

export interface KeyStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface TextStorage {
  getItem(name: string): Promise<string | null>;
  setItem(name: string, value: string): Promise<void>;
  removeItem(name: string): Promise<void>;
}

export type StorageHealth = 'ok' | 'fallback' | 'key_lost' | 'tampered';

export class KeyMissingError extends Error {}

/** AES-256-GCM de expo-crypto; el nombre de la base va como dato asociado (no se puede cambiar un archivo por otro). */
export function createAesCipher(keys: KeyStore, keyName = 'buddy.db.key', aad = 'buddy.db'): Cipher {
  let cached: AESEncryptionKey | null = null;
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const key = async (create: boolean) => {
    if (cached) return cached;
    const saved = await keys.get(keyName);
    if (saved) return (cached = (await AESEncryptionKey.import(saved, 'base64')) as AESEncryptionKey);
    if (!create) throw new KeyMissingError();
    const fresh = (await AESEncryptionKey.generate(256)) as AESEncryptionKey;
    await keys.set(keyName, await fresh.encoded('base64'));
    return (cached = fresh);
  };
  return {
    async encrypt(plain, create = false) {
      const sealed = await aesEncryptAsync(enc.encode(plain), await key(create), { additionalData: enc.encode(aad) });
      return sealed.combined('base64');
    },
    async decrypt(sealed) {
      const bytes = await aesDecryptAsync(AESSealedData.fromCombined(sealed), await key(false), { additionalData: enc.encode(aad) });
      return dec.decode(bytes as Uint8Array);
    },
  };
}

/** Envoltorio para `createJSONStorage` de zustand: misma interfaz que AsyncStorage. */
export function createEncryptedStorage(base: TextStorage, cipher: Cipher) {
  let state: StorageHealth = 'ok';
  const ENC = (n: string) => `${n}.enc`;
  const BAK = (n: string) => `${n}.bak`;

  async function migrate(name: string, plain: string): Promise<string> {
    try {
      await base.setItem(BAK(name), plain);
      const sealed = await cipher.encrypt(plain, true);
      await base.setItem(ENC(name), sealed);
      if ((await cipher.decrypt(sealed)) !== plain) throw new Error('verify');
      await base.removeItem(name);
      state = 'ok';
    } catch {
      // Reversión: el original sigue intacto y es el que se usa.
      await base.removeItem(ENC(name)).catch(() => undefined);
      state = 'fallback';
    }
    return plain;
  }

  return {
    health: (): StorageHealth => state,
    async getItem(name: string): Promise<string | null> {
      const [sealed, plain, backup] = await Promise.all([base.getItem(ENC(name)), base.getItem(name), base.getItem(BAK(name))]);
      if (sealed) {
        try {
          const value = await cipher.decrypt(sealed);
          // Apertura exitosa: el original (si una migración se interrumpió antes de borrarlo) y el respaldo sobran.
          if (plain !== null) await base.removeItem(name);
          if (backup !== null) await base.removeItem(BAK(name));
          state = 'ok';
          return value;
        } catch (e) {
          // Cifrado a medias (se interrumpió al escribirlo): se rehace desde el original.
          if (plain !== null) return migrate(name, plain);
          state = e instanceof KeyMissingError ? 'key_lost' : 'tampered';
          // Sin escribir nada: se muestra el respaldo si lo hay; si no, se informa el error (nunca "no hay datos").
          if (backup !== null) return backup;
          throw e;
        }
      }
      if (plain !== null) return migrate(name, plain);
      return null;
    },
    async setItem(name: string, value: string): Promise<void> {
      if (state === 'key_lost' || state === 'tampered') return; // bloqueado: no sobrescribir datos que no se pudieron leer
      if (state === 'fallback') return base.setItem(name, value);
      await base.setItem(ENC(name), await cipher.encrypt(value, true));
    },
    async removeItem(name: string): Promise<void> {
      await Promise.all([base.removeItem(name), base.removeItem(ENC(name)), base.removeItem(BAK(name))]);
    },
  };
}
