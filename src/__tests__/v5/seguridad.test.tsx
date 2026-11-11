/**
 * Regresiones de la auditoría funcional y de seguridad del 2026-11-10 (docs/AUDITORIA_FUNCIONAL_SEGURIDAD_2026-11-10.md).
 * Cada prueba repite la reproducción original con datos SINTÉTICOS y exige lo contrario: rechazo o conservación correcta.
 * Las reproducciones originales (.audit-2026-11-10) afirmaban el defecto; se conservan como evidencia y Jest las ignora.
 */
import { renderHook } from '@testing-library/react-native';

import type { AuthUser } from '@/domain/auth';
import { EntitlementService } from '@/domain/entitlements';
import * as Crypto from 'expo-crypto';

import { createLocalAuthProvider, hashSecret, newSalt } from '@/infrastructure/local/auth';
import { secureStorage } from '@/infrastructure/secure-storage';
import { db, useDb } from '@/infrastructure/local/db';
import { applyPlan } from '@/infrastructure/notifications';
import { createSupabaseAuthProvider, toUser } from '@/infrastructure/supabase/auth';
import { getSupabase } from '@/infrastructure/supabase/client';
import { PAGE, syncAccount } from '@/infrastructure/supabase/sync';
import { elderActions, routineActions } from '@/state/actions';
import { alertActions, doseActions, elderAnswers, medicationActions } from '@/state/care';
import { useRecord, useRecords } from '@/state/data';
import { handoffActions } from '@/state/handoff';
import { locationActions } from '@/state/location';
import { sessionActions, useSession } from '@/state/session';
import { handPhoneTo, seedMedication, seedRenderData, testUser } from '@/testing/render-fixtures';

jest.mock('@/infrastructure/supabase/client', () => ({ supabaseConfigured: true, getSupabase: jest.fn() }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

const B = { id: 'audit-B', email: 'b@example.test', name: 'B [PRUEBA]', createdAt: '', role: 'caregiver' as const };
let elderId = '';
/** El almacén tal cual, sin la frontera: para comprobar que el dato de la otra cuenta NO cambió. */
const stored = (id: string) => useDb.getState().medications[id];
const as = (user: AuthUser) => useSession.setState({ status: 'signedIn', user });
const linked = (role: 'elder' | 'nurse', person = elderId) => as({ ...testUser, id: `audit-${role}`, role, ownerId: testUser.id, elderId: person });

beforeEach(async () => {
  elderId = (await seedRenderData()).id;
});

describe('SEC-01 · lectura entre cuentas', () => {
  it('otro administrador no lee un medicamento ajeno por su id, ni por hook ni por la base', async () => {
    const med = seedMedication(elderId);
    as(B);
    const one = await renderHook(() => useRecord('medications', med.id));
    expect(one.result.current).toBeNull();
    const many = await renderHook(() => useRecords('medications', { elderId }));
    expect(many.result.current).toHaveLength(0);
    expect(db.get('medications', med.id)).toBeUndefined();
    expect(db.list('medications', testUser.id, elderId)).toHaveLength(0);
  });

  it('una cuenta vinculada solo ve a SU persona, aunque pida toda la cuenta', async () => {
    const med = seedMedication(elderId);
    linked('elder', 'otra-persona');
    expect(db.get('medications', med.id)).toBeUndefined();
    const all = await renderHook(() => useRecords('medications', { scope: 'account' }));
    expect(all.result.current).toHaveLength(0);
    linked('elder');
    expect(db.get('medications', med.id)?.id).toBe(med.id);
  });
});

describe('SEC-02 · escritura entre cuentas y metadatos protegidos', () => {
  it('otro administrador no cambia existencias, nombre ni borra un medicamento ajeno', () => {
    const med = seedMedication(elderId);
    as(B);
    expect(medicationActions.setStock(med.id, 99)).toBeUndefined();
    expect(medicationActions.registerPurchase(med.id, { units: 5 })).toBeUndefined();
    expect(medicationActions.update(med.id, { name: 'Cambiado por B' }).med).toBeUndefined();
    expect(medicationActions.remove(med.id)).toBeUndefined();
    expect(db.update('medications', med.id, { name: 'Directo por B' })).toBeUndefined();
    expect(stored(med.id)).toMatchObject({ unitsOnHand: 30, name: med.name, ownerUserId: testUser.id, deletedAt: null });
    // Tampoco deja rastro en la cuenta de B ni en la de A.
    expect(Object.values(useDb.getState().stock)).toHaveLength(0);
  });

  it('no se puede insertar en la cuenta o la persona de otro', () => {
    as(B);
    expect(() => db.insert('water', { date: '2026-11-10', at: '2026-11-10T10:00:00.000Z' }, { userId: testUser.id, elderId })).toThrow();
    linked('elder', 'otra-persona');
    expect(() => db.insert('water', { date: '2026-11-10', at: '2026-11-10T10:00:00.000Z' }, { userId: testUser.id, elderId })).toThrow();
  });

  it('un caso de uso no puede cambiar el dueño, la persona ni el borrado de un registro', () => {
    const med = seedMedication(elderId);
    db.update('medications', med.id, { name: 'Nombre nuevo', ownerUserId: B.id, elderId: 'otra', deletedAt: '2026-01-01T00:00:00.000Z', version: 99 } as never);
    expect(stored(med.id)).toMatchObject({ name: 'Nombre nuevo', ownerUserId: testUser.id, elderId, deletedAt: null, version: 2 });
  });

  it('los borradores de una cuenta no se leen ni se escriben desde otra', () => {
    db.setDraft(testUser.id, 'nota', 'de A');
    as(B);
    expect(db.draft(testUser.id, 'nota')).toBeUndefined();
    db.setDraft(testUser.id, 'nota', 'de B');
    as(testUser);
    expect(db.draft(testUser.id, 'nota')).toBe('de A');
  });
});

describe('SEC-03 · la matriz de roles protege los casos de uso', () => {
  it('el adulto mayor responde, pero no configura la rutina ni su perfil', () => {
    const med = seedMedication(elderId);
    doseActions.sync(elderId, new Date());
    linked('elder');
    expect(medicationActions.update(med.id, { name: 'Cambiado por el adulto mayor' }).med).toBeUndefined();
    expect(medicationActions.remove(med.id)).toBeUndefined();
    expect(medicationActions.setStock(med.id, 1)).toBeUndefined();
    expect(() => medicationActions.add({ ...med, name: 'Otro [PRUEBA]' }, elderId)).toThrow();
    expect(() => routineActions.setWater(8, undefined, elderId)).toThrow();
    expect(elderActions.update(elderId, { firstName: 'Otra' })).toBeUndefined();
    expect(stored(med.id)).toMatchObject({ name: med.name, unitsOnHand: 30, deletedAt: null });
    expect(useDb.getState().elders[elderId].firstName).toBe('Rosa');
    // Lo suyo sí: confirmar una toma (queda a su nombre) y cambiar el tamaño de letra de su pantalla.
    const dose = db.list('doses', testUser.id, elderId)[0];
    expect(doseActions.confirm(dose.id)).toMatchObject({ status: 'taken', answeredBy: 'elder' });
    expect(elderActions.setLook(elderId, { textScale: 'huge' })?.screen.textScale).toBe('huge');
  });

  it('el adulto mayor no oculta los avisos de su administrador', () => {
    const alert = db.insert('alerts', { kind: 'help_requested', title: 'Pidió ayuda [PRUEBA]', detail: '', refId: 'h1', status: 'pending', snoozedUntil: null }, { userId: testUser.id, elderId });
    linked('elder');
    expect(alertActions.attend(alert.id)).toBeUndefined();
    expect(alertActions.snooze(alert.id)).toBeUndefined();
    expect(useDb.getState().alerts[alert.id]).toMatchObject({ status: 'pending', snoozedUntil: null });
  });

  it('la enfermera lleva existencias y confirma tomas, pero no cambia medicamentos ni el PIN', async () => {
    const med = seedMedication(elderId);
    doseActions.sync(elderId, new Date());
    linked('nurse');
    expect(medicationActions.setStock(med.id, 12)?.unitsOnHand).toBe(12);
    expect(medicationActions.update(med.id, { name: 'Cambiado por la enfermera' }).med).toBeUndefined();
    expect(doseActions.confirm(db.list('doses', testUser.id, elderId)[0].id)).toMatchObject({ answeredBy: 'nurse' });
    await expect(handoffActions.setPin('1234')).resolves.toBe(false);
    expect(stored(med.id).name).toBe(med.name);
  });
});

describe('SEC-04 · el consentimiento de ubicación no confía en quien llama', () => {
  it('el administrador no acepta por el adulto mayor; con el teléfono entregado la decisión es suya y queda trazada', () => {
    locationActions.request(elderId);
    expect(locationActions.decide(elderId, true)).toBeNull();
    expect(locationActions.revoke(elderId)).toBeNull();
    expect(useDb.getState().elders[elderId].locationConsent).toBe('requested');
    handPhoneTo(elderId);
    expect(locationActions.decide(elderId, true)).toMatchObject({ locationConsent: 'granted', locationDecidedBy: testUser.id, locationDecidedVia: 'handoff' });
  });

  it('la entrega a otra persona no vale, y con su propia cuenta queda como "account"', () => {
    locationActions.request(elderId);
    handPhoneTo('otra-persona');
    expect(locationActions.decide(elderId, true)).toBeNull();
    db.setHandoff(null);
    linked('elder');
    expect(locationActions.decide(elderId, true)).toMatchObject({ locationConsent: 'granted', locationDecidedBy: 'audit-elder', locationDecidedVia: 'account' });
  });

  it('una toma solo queda "confirmada por el adulto mayor" con su sesión o con el teléfono entregado', () => {
    seedMedication(elderId);
    doseActions.sync(elderId, new Date());
    const dose = db.list('doses', testUser.id, elderId)[0];
    expect(doseActions.confirm(dose.id)).toMatchObject({ answeredBy: 'caregiver' });
    doseActions.reset(dose.id);
    handPhoneTo(elderId);
    expect(doseActions.confirm(dose.id)).toMatchObject({ answeredBy: 'elder' });
    // Con el teléfono entregado no se administra: corregir la toma vuelve a ser posible al recuperarlo.
    expect(doseActions.reset(dose.id)).toBeUndefined();
  });
});

describe('SEC-05 · el plan de prueba no existe fuera de desarrollo', () => {
  it('en una compilación de tienda el plan guardado a mano se ignora', async () => {
    await expect(EntitlementService.getPlan(testUser.id, 'family', false)).resolves.toBe('free');
    // En desarrollo (herramientas activas) el selector de plan de prueba sigue funcionando.
    await expect(EntitlementService.getPlan(testUser.id, 'family', true)).resolves.toBe('family');
  });
});

describe('FUN-01 · responder dos veces una automatización de agua', () => {
  const water = () => db.list('water', testUser.id, elderId);
  it('repetir "Sí" no suma otro vaso; cambiar a "No" lo retira y volver a "Sí" lo repone', () => {
    const reminder = db.insert('reminders', { title: 'Agua [PRUEBA]', time: '09:00', days: [], date: null, automation: { kind: 'water', enabled: true } }, { userId: testUser.id, elderId });
    elderAnswers.automationResponse(reminder.id, 'Sí', elderId);
    elderAnswers.automationResponse(reminder.id, 'Sí', elderId);
    expect(water()).toHaveLength(1);
    expect(Object.keys(useDb.getState().checkins)).toHaveLength(1);
    elderAnswers.automationResponse(reminder.id, 'No', elderId);
    expect(water()).toHaveLength(0);
    elderAnswers.automationResponse(reminder.id, 'Sí', elderId);
    expect(water()).toHaveLength(1);
    // Un vaso voluntario aparte sigue contando: la automatización solo responde por el suyo.
    elderAnswers.addWater(elderId);
    elderAnswers.automationResponse(reminder.id, 'Sí', elderId);
    expect(water()).toHaveLength(2);
  });
});

describe('SEC-06 · los accesos vinculados no sobreviven a su administrador', () => {
  const password = 'AuditPassword123!';
  it('eliminar la cuenta elimina también el acceso del adulto mayor y el de la enfermera', async () => {
    const auth = createLocalAuthProvider();
    const owner = await auth.signUp({ name: 'Dueño [PRUEBA]', email: 'owner-1@example.test', password });
    await auth.createManagedAccount({ ownerId: owner.id, elderId: 'persona-1', name: 'Mayor [PRUEBA]', email: 'elder-1@example.test', password });
    await auth.createManagedAccount({ ownerId: owner.id, elderId: 'persona-1', name: 'Enfermera [PRUEBA]', email: 'nurse-1@example.test', password, role: 'nurse' });
    await auth.deleteAccount(password, { elderIds: ['persona-1'] });
    await expect(auth.signIn({ email: 'elder-1@example.test', password })).rejects.toMatchObject({ code: 'invalid_credentials' });
    await expect(auth.signIn({ email: 'nurse-1@example.test', password })).rejects.toMatchObject({ code: 'invalid_credentials' });
    await expect(auth.signIn({ email: 'owner-1@example.test', password })).rejects.toMatchObject({ code: 'invalid_credentials' });
  });

  it('un acceso que quedó huérfano no inicia sesión (defensa adicional)', async () => {
    const auth = createLocalAuthProvider();
    const owner = await auth.signUp({ name: 'Dueño [PRUEBA]', email: 'owner-2@example.test', password });
    await auth.createManagedAccount({ ownerId: owner.id, elderId: 'persona-2', name: 'Mayor [PRUEBA]', email: 'elder-2@example.test', password });
    await auth.deleteAccount(password); // sin la lista de personas (borrado parcial)
    await expect(auth.signIn({ email: 'elder-2@example.test', password })).rejects.toMatchObject({ code: 'revoked' });
  });

  it('una cuenta vinculada no se elimina a sí misma', async () => {
    const auth = createLocalAuthProvider();
    const owner = await auth.signUp({ name: 'Dueño [PRUEBA]', email: 'owner-3@example.test', password });
    await auth.createManagedAccount({ ownerId: owner.id, elderId: 'persona-3', name: 'Mayor [PRUEBA]', email: 'elder-3@example.test', password });
    await auth.signIn({ email: 'elder-3@example.test', password });
    await expect(auth.deleteAccount(password)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(auth.signIn({ email: 'owner-3@example.test', password })).resolves.toMatchObject({ id: owner.id });
  });
});

describe('SEC-09 · contraseñas con scrypt', () => {
  it('una cuenta con SHA-256 iterado sigue entrando y se migra a scrypt con sal nueva', async () => {
    const auth = createLocalAuthProvider();
    const email = 'legacy@example.test';
    const password = 'AuditPassword123!';
    const user = await auth.signUp({ name: 'Antigua [PRUEBA]', email, password });
    await auth.signOut();
    const key = `buddy.account.${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, email)}`;
    const stored = JSON.parse((await secureStorage.get(key))!);
    expect(stored.kdf).toBe('scrypt');
    const salt = await newSalt();
    await secureStorage.set(key, JSON.stringify({ ...stored, kdf: undefined, salt, hash: await hashSecret(password, salt) }));
    await expect(auth.signIn({ email, password: 'otra-clave-1A!' })).rejects.toMatchObject({ code: 'invalid_credentials' });
    await expect(auth.signIn({ email, password })).resolves.toMatchObject({ id: user.id });
    const migrated = JSON.parse((await secureStorage.get(key))!);
    expect(migrated).toMatchObject({ kdf: 'scrypt' });
    expect(migrated.salt).not.toBe(salt);
    await expect(auth.signIn({ email, password })).resolves.toMatchObject({ id: user.id });
  });
});

describe('SEC-07 · cerrar sesión no deja avisos del usuario anterior', () => {
  it('al terminar de cerrar sesión no queda ningún aviso programado', async () => {
    const notices = jest.requireMock('expo-notifications') as { __scheduled: unknown[] };
    await applyPlan([{ key: 'audit-aviso', title: 'Recordatorio [PRUEBA]', body: 'Sintético', trigger: { type: 'daily', hour: 9, minute: 0 } }]);
    expect(notices.__scheduled.length).toBeGreaterThan(0);
    await sessionActions.signOut();
    expect(useSession.getState().user).toBeNull();
    expect(notices.__scheduled).toHaveLength(0);
  });
});

describe('FUN-02 y FUN-03 · sincronización', () => {
  type Row = Record<string, unknown>;
  /** Cliente remoto simulado: registra lo que se sube y se borra, y sirve páginas por tabla. */
  function remote(opts: { onUpsert?: (table: string) => void; pages?: Record<string, Row[][]> } = {}) {
    const upserts: Record<string, Row[]> = {};
    const deletes: Record<string, string[]> = {};
    const calls: Record<string, number> = {};
    const client = {
      from: (table: string) => {
        const select = { eq: () => select, gt: () => select, order: () => select, range: async () => {
            const n = calls[table] ?? 0;
            calls[table] = n + 1;
            return { data: opts.pages?.[table]?.[n] ?? [], error: null };
          },
        };
        const del = { eq: () => del, in: async (_col: string, ids: string[]) => ((deletes[table] = ids), { error: null }) };
        return {
          upsert: async (rows: Row[]) => {
            upserts[table] = rows;
            opts.onUpsert?.(table);
            return { error: null };
          },
          select: () => select,
          delete: () => del,
        };
      },
    };
    (getSupabase as jest.Mock).mockReturnValue(client);
    return { upserts, deletes };
  }

  it('una edición hecha mientras subía se conserva y sigue pendiente', async () => {
    const med = seedMedication(elderId);
    remote({ onUpsert: (table) => table === 'medications' && db.update('medications', med.id, { name: 'Edición durante la subida' }) });
    await syncAccount(testUser.id);
    expect(stored(med.id)).toMatchObject({ name: 'Edición durante la subida', syncStatus: 'pending' });
    const second = remote();
    await syncAccount(testUser.id);
    expect(second.upserts.medications).toHaveLength(1);
    expect(stored(med.id)).toMatchObject({ name: 'Edición durante la subida', syncStatus: 'synced' });
  });

  it('lo purgado aquí (ubicación revocada) también se borra en el servidor', async () => {
    const fix = db.insert('locations', { lat: 1, lng: 1, accuracy: null, at: '2026-11-10T10:00:00.000Z' }, { userId: testUser.id, elderId });
    db.purge('locations', [fix.id]);
    const r = remote();
    await syncAccount(testUser.id);
    expect(r.deletes.location_fixes).toEqual([fix.id]);
    expect(db.pendingChanges(testUser.id).some((c) => c.entityId === fix.id)).toBe(false);
  });

  it('trae todas las páginas, no solo la primera', async () => {
    const row = (i: number): Row => ({ id: `w-${i}`, owner_user_id: testUser.id, elder_id: elderId, created_by: testUser.id, created_at: '2026-11-10T08:00:00.000Z', updated_at: '2026-11-10T08:00:00.000Z', deleted_at: null, version: 1, date: '2026-11-10', at: '2026-11-10T08:00:00.000Z' });
    remote({ pages: { water_entries: [Array.from({ length: PAGE }, (_, i) => row(i)), [row(PAGE)]] } });
    await syncAccount(testUser.id);
    expect(db.list('water', testUser.id, elderId)).toHaveLength(PAGE + 1);
  });

  it('dos sincronizaciones a la vez comparten una sola ejecución', async () => {
    const r = remote();
    seedMedication(elderId);
    const [a, b] = await Promise.all([syncAccount(testUser.id), syncAccount(testUser.id)]);
    expect(a).toBe(b);
    expect(r.upserts.medications).toHaveLength(1);
  });
});

describe('SEC-10 y FUN-04 · identidad remota', () => {
  it('el rol y el vínculo no salen de metadatos que el usuario puede editar', () => {
    const forged = toUser({ id: 'u1', created_at: '', user_metadata: { name: 'X', role: 'elder', owner_id: 'victima', elder_id: 'e1' } } as never);
    expect(forged).toMatchObject({ role: 'caregiver', ownerId: null, elderId: null });
    const real = toUser({ id: 'u2', created_at: '', app_metadata: { role: 'nurse', owner_id: 'admin', elder_id: 'e1' } });
    expect(real).toMatchObject({ role: 'nurse', ownerId: 'admin', elderId: 'e1' });
    // Un vínculo incompleto del servidor no da acceso a nadie más.
    expect(toUser({ id: 'u3', created_at: '', app_metadata: { role: 'elder' } })).toMatchObject({ role: 'caregiver', ownerId: null });
  });

  it('registrarse sin sesión (correo por confirmar) no entra a la app', async () => {
    (getSupabase as jest.Mock).mockReturnValue({ auth: { signUp: async () => ({ data: { user: { id: 'u1', created_at: '', email: 'nuevo@example.test' }, session: null }, error: null }) } });
    await expect(createSupabaseAuthProvider().signUp({ name: 'Nueva [PRUEBA]', email: 'nuevo@example.test', password: 'Segura123!' })).rejects.toMatchObject({ code: 'confirm_email' });
  });
});
