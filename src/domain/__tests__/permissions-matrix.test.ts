/**
 * V5.3 — Roles y permisos como datos (auditoría de venta, spec access/roles-permissions, tareas 2.1 a 2.4).
 */
import { AuthError, dataOwnerId, isValidSessionUser, type AuthUser } from '@/domain/auth';
import type { Role } from '@/domain/types';
import { toUser } from '@/infrastructure/supabase/auth';

import { ACCOUNT_ACTIONS, ALL_PERMISSIONS, can, canAccessRecord, PERMISSION_MATRIX_VERSION, type Permission } from '../permissions';
import MATRIX from '../permissions-matrix.json';

jest.mock('react-native-purchases', () => ({ __esModule: true, default: {}, LOG_LEVEL: { WARN: 3 } }));

/** La regla anterior, escrita a mano (V4.3), para comprobar que la migración a datos no cambió ningún resultado. */
function legacyCan(role: 'caregiver' | 'elder' | 'nurse', action: Permission): boolean {
  const elder = ['answer_question', 'confirm_dose', 'request_help', 'call_contact', 'location_consent', 'share_location'];
  const nurse = ['answer_question', 'confirm_dose', 'request_help', 'call_contact', 'update_stock', 'manage_alerts'];
  if (role === 'caregiver') return !['location_consent', 'share_location'].includes(action);
  if (role === 'nurse') return nurse.includes(action);
  return elder.includes(action);
}

describe('matriz de permisos versionada', () => {
  it('tiene versión 1', () => {
    expect(PERMISSION_MATRIX_VERSION).toBe(1);
  });

  it('can() con la matriz da lo mismo que la regla anterior en todos los pares rol × acción', () => {
    const before = ALL_PERMISSIONS.filter((a) => !(ACCOUNT_ACTIONS as readonly string[]).includes(a));
    for (const role of ['caregiver', 'elder', 'nurse'] as const) {
      for (const action of before) expect([role, action, can(role, action)]).toEqual([role, action, legacyCan(role, action)]);
    }
  });

  it('cada acción que usa la app está en la matriz, y la matriz no tiene acciones que la app no use', () => {
    expect(Object.keys(MATRIX.actions).sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it('Acción nueva sin registrar: queda negada para todos los roles', () => {
    const ghost = 'accion_ficticia' as Permission;
    for (const role of ['caregiver', 'elder', 'nurse'] as Role[]) expect(can(role, ghost)).toBe(false);
    expect(can('family', ghost, 'admin')).toBe(false);
  });

  it('solo el adulto mayor decide sobre su ubicación (ni el titular ni el familiar administrador)', () => {
    for (const a of ['location_consent', 'share_location'] as Permission[]) {
      expect(can('elder', a)).toBe(true);
      expect(can('caregiver', a)).toBe(false);
      expect(can('family', a, 'admin')).toBe(false);
      expect(can('nurse', a)).toBe(false);
    }
  });
});

describe('familiar invitado', () => {
  it('Familiar que solo ve: no edita medicamentos ni nada más', () => {
    expect(can('family', 'update_medication', 'viewer')).toBe(false);
    expect(can('family', 'add_medication', 'viewer')).toBe(false);
    for (const a of ALL_PERMISSIONS) expect(can('family', a, 'viewer')).toBe(false);
  });

  it('Familiar administrador: cambia el horario de una toma como el titular', () => {
    expect(can('family', 'update_medication', 'admin')).toBe(true);
    expect(can('family', 'edit_routine', 'admin')).toBe(true);
    expect(can('family', 'manage_alerts', 'admin')).toBe(true);
  });

  it('Familiar administrador no toca la cuenta: ni eliminarla, ni el plan, ni los familiares, ni los accesos', () => {
    for (const a of ['delete_account', 'manage_plan', 'manage_members', 'manage_access'] as Permission[]) {
      expect(can('family', a, 'admin')).toBe(false);
      expect(can('caregiver', a)).toBe(true);
    }
  });

  it('administrador = titular salvo las acciones de la cuenta', () => {
    const ownerOnly = ['delete_account', 'manage_plan', 'manage_members', 'manage_access'];
    for (const a of ALL_PERMISSIONS) {
      if (ownerOnly.includes(a)) continue;
      expect([a, can('family', a, 'admin')]).toEqual([a, can('caregiver', a)]);
    }
  });

  it('un familiar sin nivel no puede nada (el nivel nunca se adivina)', () => {
    for (const a of ALL_PERMISSIONS) expect(can('family', a)).toBe(false);
  });
});

describe('alcance por persona', () => {
  const owner = 'titular-1';
  const nurse: AuthUser = { id: 'n1', email: 'n@x.co', name: 'Ana', createdAt: '', role: 'nurse', ownerId: owner, elderId: 'mama' };
  const viewer: AuthUser = { id: 'f1', email: 'f@x.co', name: 'Juan', createdAt: '', role: 'family', level: 'viewer', ownerId: owner, elderId: 'mama' };
  const admin: AuthUser = { ...viewer, id: 'f2', level: 'admin' };

  it('Pedir un registro de otra persona por su id: la enfermera no lo recibe', () => {
    expect(canAccessRecord(nurse, 'medications', { ownerUserId: owner, elderId: 'papa' }, 'read')).toBe(false);
    expect(canAccessRecord(nurse, 'medications', { ownerUserId: owner, elderId: 'mama' }, 'read')).toBe(true);
  });

  it('el familiar actúa sobre los datos del titular, solo de la persona compartida', () => {
    expect(dataOwnerId(viewer)).toBe(owner);
    expect(canAccessRecord(viewer, 'medications', { ownerUserId: owner, elderId: 'mama' }, 'read')).toBe(true);
    expect(canAccessRecord(viewer, 'medications', { ownerUserId: owner, elderId: 'papa' }, 'read')).toBe(false);
    expect(canAccessRecord(viewer, 'medications', { ownerUserId: 'otra-cuenta', elderId: 'mama' }, 'read')).toBe(false);
  });

  it('el familiar que solo ve no escribe; el administrador sí, en su persona', () => {
    expect(canAccessRecord(viewer, 'medications', { ownerUserId: owner, elderId: 'mama' }, 'write')).toBe(false);
    expect(canAccessRecord(admin, 'medications', { ownerUserId: owner, elderId: 'mama' }, 'write')).toBe(true);
    expect(canAccessRecord(admin, 'medications', { ownerUserId: owner, elderId: 'papa' }, 'write')).toBe(false);
    // Los ajustes de la cuenta del titular solo se leen.
    expect(canAccessRecord(admin, 'accounts', { ownerUserId: owner, elderId: null }, 'write')).toBe(false);
  });
});

describe('rol decidido por el servidor', () => {
  it('Cuenta anterior sin rol: se trata como titular', () => {
    expect(isValidSessionUser({ id: 'u', email: '', name: '', createdAt: '' })).toBe(true);
  });

  it('Rol desconocido: la sesión se rechaza', () => {
    expect(isValidSessionUser({ id: 'u', email: '', name: '', createdAt: '', role: 'superadmin' as Role })).toBe(false);
    expect(() => toUser({ id: 'u', created_at: '', app_metadata: { role: 'superadmin', owner_id: 'x', elder_id: 'y' } })).toThrow(AuthError);
  });

  it('un familiar sin nivel válido se rechaza', () => {
    expect(isValidSessionUser({ id: 'u', email: '', name: '', createdAt: '', role: 'family', ownerId: 'o', elderId: 'e' })).toBe(false);
    expect(() => toUser({ id: 'u', created_at: '', app_metadata: { role: 'family', level: 'dueño', owner_id: 'o', elder_id: 'e' } })).toThrow(AuthError);
  });

  it('el familiar sale de app_metadata con su nivel', () => {
    expect(toUser({ id: 'u', created_at: '', app_metadata: { role: 'family', level: 'viewer', owner_id: 'o', elder_id: 'e' } })).toMatchObject({ role: 'family', level: 'viewer', ownerId: 'o', elderId: 'e' });
  });

  it('Usuario edita sus metadatos: declararse titular o familiar desde user_metadata no cambia nada', () => {
    const forged = toUser({ id: 'u', created_at: '', user_metadata: { name: 'X', role: 'family', level: 'admin', owner_id: 'victima', elder_id: 'e1' } } as never);
    expect(forged).toMatchObject({ role: 'caregiver', ownerId: null, elderId: null });
    expect(forged.level).toBeUndefined();
  });
});
