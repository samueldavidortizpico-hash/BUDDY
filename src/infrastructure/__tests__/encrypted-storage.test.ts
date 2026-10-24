/**
 * V4 Fase 3: almacenamiento cifrado. Cifrador de prueba con AES-256-GCM real de Node (autenticado), para que la
 * detección de manipulación sea verdadera; el de la app usa el mismo algoritmo de expo-crypto. Datos [PRUEBA].
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { createEncryptedStorage, KeyMissingError, type Cipher, type TextStorage } from '../local/encrypted-storage';

function memory(): TextStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

function gcm(keys: Map<string, Buffer>): Cipher {
  const key = (create: boolean) => {
    if (!keys.has('k')) {
      if (!create) throw new KeyMissingError();
      keys.set('k', randomBytes(32));
    }
    return keys.get('k')!;
  };
  return {
    async encrypt(plain, create = false) {
      const iv = randomBytes(12);
      const c = createCipheriv('aes-256-gcm', key(create), iv);
      const body = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
      return Buffer.concat([iv, body, c.getAuthTag()]).toString('base64');
    },
    async decrypt(sealed) {
      const raw = Buffer.from(sealed, 'base64');
      const d = createDecipheriv('aes-256-gcm', key(false), raw.subarray(0, 12));
      d.setAuthTag(raw.subarray(raw.length - 16));
      return Buffer.concat([d.update(raw.subarray(12, raw.length - 16)), d.final()]).toString('utf8');
    },
  };
}

const DATA = JSON.stringify({ state: { medications: { m1: { name: '[PRUEBA] Losartán' } } }, version: 2 });

it('cifra y descifra ida y vuelta, sin dejar el texto en claro', async () => {
  const base = memory();
  const s = createEncryptedStorage(base, gcm(new Map()));
  await s.setItem('buddy.db', DATA);
  expect(base.data.get('buddy.db.enc')).not.toContain('Losartán');
  expect(base.data.has('buddy.db')).toBe(false);
  expect(await s.getItem('buddy.db')).toBe(DATA);
});

it('detecta la manipulación (un byte cambiado) y no sobrescribe nada', async () => {
  const base = memory();
  const keys = new Map<string, Buffer>();
  await createEncryptedStorage(base, gcm(keys)).setItem('buddy.db', DATA);
  const raw = Buffer.from(base.data.get('buddy.db.enc')!, 'base64');
  raw[20] ^= 0xff;
  base.data.set('buddy.db.enc', raw.toString('base64'));
  const reopened = createEncryptedStorage(base, gcm(keys));
  await expect(reopened.getItem('buddy.db')).rejects.toBeTruthy();
  expect(reopened.health()).toBe('tampered');
  await reopened.setItem('buddy.db', '{}');
  expect(base.data.get('buddy.db.enc')).toBe(raw.toString('base64'));
});

it('migra datos existentes en claro: respaldo, cifra, verifica y solo entonces borra el original', async () => {
  const base = memory();
  base.data.set('buddy.db', DATA);
  const keys = new Map<string, Buffer>();
  const s = createEncryptedStorage(base, gcm(keys));
  expect(await s.getItem('buddy.db')).toBe(DATA);
  expect(base.data.has('buddy.db')).toBe(false);
  expect(base.data.get('buddy.db.bak')).toBe(DATA);
  expect(s.health()).toBe('ok');
  // La siguiente apertura exitosa borra el respaldo.
  const again = createEncryptedStorage(base, gcm(keys));
  expect(await again.getItem('buddy.db')).toBe(DATA);
  expect(base.data.has('buddy.db.bak')).toBe(false);
});

it('clave perdida: no finge que no hay datos, muestra el respaldo y no escribe', async () => {
  const base = memory();
  base.data.set('buddy.db', DATA);
  await createEncryptedStorage(base, gcm(new Map())).getItem('buddy.db');
  const lost = createEncryptedStorage(base, gcm(new Map()));
  expect(await lost.getItem('buddy.db')).toBe(DATA);
  expect(lost.health()).toBe('key_lost');
  const before = base.data.get('buddy.db.enc');
  await lost.setItem('buddy.db', '{}');
  expect(base.data.get('buddy.db.enc')).toBe(before);
  // Sin respaldo, se informa el error en vez de devolver "vacío".
  base.data.delete('buddy.db.bak');
  await expect(createEncryptedStorage(base, gcm(new Map())).getItem('buddy.db')).rejects.toBeInstanceOf(KeyMissingError);
});

it('interrupción a mitad de migración: al reabrir se recupera sin pérdida', async () => {
  const base = memory();
  base.data.set('buddy.db', DATA);
  const keys = new Map<string, Buffer>();
  // Falla después de escribir el cifrado y antes de borrar el original (se cae la app).
  const broken: TextStorage = { ...base, removeItem: async () => { throw new Error('[PRUEBA] corte'); } };
  expect(await createEncryptedStorage(broken, gcm(keys)).getItem('buddy.db')).toBe(DATA);
  expect(base.data.get('buddy.db')).toBe(DATA);
  // Reapertura normal: lee lo cifrado o el original, y termina la migración.
  const s = createEncryptedStorage(base, gcm(keys));
  expect(await s.getItem('buddy.db')).toBe(DATA);
  expect(base.data.has('buddy.db')).toBe(false);
});

it('reversión: si cifrar falla, sigue usando el original en claro', async () => {
  const base = memory();
  base.data.set('buddy.db', DATA);
  const failing: Cipher = { encrypt: async () => { throw new Error('[PRUEBA] sin cifrado'); }, decrypt: async () => '' };
  const s = createEncryptedStorage(base, failing);
  expect(await s.getItem('buddy.db')).toBe(DATA);
  expect(s.health()).toBe('fallback');
  await s.setItem('buddy.db', '{"v":2}');
  expect(base.data.get('buddy.db')).toBe('{"v":2}');
  expect(base.data.has('buddy.db.enc')).toBe(false);
});
