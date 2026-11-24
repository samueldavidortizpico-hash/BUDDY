/**
 * Permisos por rol (matriz `can`). V5.3 (auditoría de venta, spec access/roles-permissions): la regla vive en DATOS,
 * `permissions-matrix.json` (versionada), una sola fuente que lee la app y que el servidor copiará a su tabla
 * `permission_matrix` para las políticas RLS. Lo que no está en la matriz se niega para todos.
 *
 * El titular (`caregiver`) configura todo. El familiar invitado (`family`) con nivel `admin` hace lo mismo que el
 * titular salvo crear o revocar accesos y familiares, cambiar el plan y eliminar la cuenta; con nivel `viewer` solo
 * ve. El adulto mayor solo responde
 * (dosis, preguntas, agua, comidas, actividades), pide ayuda, llama a sus contactos y decide sobre el rastreo de su
 * ubicación (aceptar, rechazar o revocar: el consentimiento es suyo). No usa el asistente, no edita y no ve ajustes.
 * La enfermera (V4.3, plan Salud) recibe los avisos, confirma las tomas que administra, registra cada día cómo se
 * siente la persona y lleva las existencias (compras y correcciones). No crea ni cambia medicamentos, horarios ni
 * accesos, no usa el chat y no decide sobre la ubicación de la persona.
 * Las políticas RLS de Supabase replicarán esta regla en el servidor (docs/SUPABASE_PLAN.md).
 */
import { TOOL_SCHEMAS, type ActionType } from './assistant/types';
import { dataOwnerId, LINKED_ROLES, type AuthUser } from './auth';
import MATRIX from './permissions-matrix.json';
import type { FamilyLevel, Role } from './types';

export const ELDER_ACTIONS = ['answer_question', 'confirm_dose', 'request_help', 'call_contact', 'location_consent', 'share_location'] as const;
export type ElderAction = (typeof ELDER_ACTIONS)[number];

/**
 * Acciones de administración que no pasan por el asistente. `edit_routine`: agua, comidas, actividades, citas,
 * recordatorios y contactos desde Rutina. `manage_alerts`: atender, reabrir o posponer una novedad.
 */
export const ADMIN_ACTIONS = ['edit_profile', 'manage_access', 'request_location', 'settings', 'use_assistant', 'handoff', 'edit_routine', 'manage_alerts'] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

/** Acciones de la cuenta del titular: nunca las hace una cuenta vinculada, ni un familiar administrador. */
export const ACCOUNT_ACTIONS = ['manage_members', 'manage_plan', 'delete_account'] as const;
export type AccountAction = (typeof ACCOUNT_ACTIONS)[number];

export type Permission = ActionType | ElderAction | AdminAction | AccountAction;

/** Todas las acciones que usa la app. Una prueba exige que cada una esté en la matriz (y que la matriz no sobre). */
export const ALL_PERMISSIONS: readonly Permission[] = [...(Object.keys(TOOL_SCHEMAS) as ActionType[]), ...ELDER_ACTIONS, ...ADMIN_ACTIONS, ...ACCOUNT_ACTIONS];

/** Clave de la matriz: el rol y, para el familiar, su nivel (`family:admin`, `family:viewer`). */
export type MatrixRole = 'caregiver' | 'family:admin' | 'family:viewer' | 'elder' | 'nurse';

export const PERMISSION_MATRIX_VERSION: number = MATRIX.version;
const ACTIONS = MATRIX.actions as Record<string, readonly string[]>;

export function matrixRole(role: Role, level?: FamilyLevel): MatrixRole | null {
  if (role !== 'family') return role;
  if (level === 'admin') return 'family:admin';
  if (level === 'viewer') return 'family:viewer';
  return null;
}

/** ¿Puede este rol (y nivel, si es familiar) hacer la acción? Lo que no está en la matriz se niega. */
export function can(role: Role, action: Permission, level?: FamilyLevel): boolean {
  const key = matrixRole(role, level);
  if (!key || !Object.prototype.hasOwnProperty.call(ACTIONS, action)) return false;
  return ACTIONS[action].includes(key);
}

/** Cuentas que actúan sobre los datos de su administrador (adulto mayor, enfermera y familiar invitado). */
export const isLinkedRole = (role: Role | undefined) => !!role && LINKED_ROLES.includes(role);

/**
 * AISLAMIENTO entre cuentas y personas (auditoría 2026-11-10, SEC-01 y SEC-02). Un registro es accesible solo si
 * pertenece a la cuenta dueña de los datos de la sesión; una cuenta vinculada (adulto mayor o enfermera) solo ve y
 * cambia lo de SU persona. De los ajustes de la cuenta (PIN del administrador, avisos) una cuenta vinculada solo lee.
 * Los borradores (`drafts`) son por cuenta. Sin sesión, nada. Nunca se confía en que un id sea difícil de adivinar.
 */
export function canAccessRecord(
  user: Pick<AuthUser, 'id' | 'role' | 'ownerId' | 'elderId' | 'level'> | null | undefined,
  coll: string,
  scope: { ownerUserId: string; elderId: string | null },
  mode: 'read' | 'write',
): boolean {
  if (!user || scope.ownerUserId !== dataOwnerId(user as AuthUser)) return false;
  if (!isLinkedRole(user.role) || coll === 'drafts') return true;
  if (coll === 'accounts') return mode === 'read';
  // V5.3: el familiar que solo ve no escribe nada de la persona compartida (sus borradores sí, arriba).
  if (user.role === 'family' && user.level !== 'admin' && mode === 'write') return false;
  return !!user.elderId && scope.elderId === user.elderId;
}
