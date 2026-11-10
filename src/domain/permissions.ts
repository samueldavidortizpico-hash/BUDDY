/**
 * Permisos por rol (matriz `can`). El administrador (familiar o cuidador) configura todo. El adulto mayor solo responde
 * (dosis, preguntas, agua, comidas, actividades), pide ayuda, llama a sus contactos y decide sobre el rastreo de su
 * ubicación (aceptar, rechazar o revocar: el consentimiento es suyo). No usa el asistente, no edita y no ve ajustes.
 * La enfermera (V4.3, plan Salud) recibe los avisos, confirma las tomas que administra, registra cada día cómo se
 * siente la persona y lleva las existencias (compras y correcciones). No crea ni cambia medicamentos, horarios ni
 * accesos, no usa el chat y no decide sobre la ubicación de la persona.
 * Las políticas RLS de Supabase replicarán esta regla en el servidor (docs/SUPABASE_PLAN.md).
 */
import type { ActionType } from './assistant/types';
import { dataOwnerId, type AuthUser } from './auth';
import type { Role } from './types';

export type ElderAction =
  | 'answer_question'
  | 'confirm_dose'
  | 'request_help'
  | 'call_contact'
  | 'location_consent'
  | 'share_location';

/**
 * Acciones de administración que no pasan por el asistente. `edit_routine`: agua, comidas, actividades, citas,
 * recordatorios y contactos desde Rutina. `manage_alerts`: atender, reabrir o posponer una novedad.
 */
export type AdminAction = 'edit_profile' | 'manage_access' | 'request_location' | 'settings' | 'use_assistant' | 'handoff' | 'edit_routine' | 'manage_alerts';

export type Permission = ActionType | ElderAction | AdminAction;

const ELDER_ALLOWED: readonly Permission[] = ['answer_question', 'confirm_dose', 'request_help', 'call_contact', 'location_consent', 'share_location'];
/** La decisión sobre su ubicación es solo del adulto mayor: el administrador solicita, no acepta por él. */
const ELDER_ONLY: readonly Permission[] = ['location_consent', 'share_location'];

const NURSE_ALLOWED: readonly Permission[] = ['answer_question', 'confirm_dose', 'request_help', 'call_contact', 'update_stock', 'manage_alerts'];

export function can(role: Role, action: Permission): boolean {
  if (role === 'caregiver') return !ELDER_ONLY.includes(action);
  if (role === 'nurse') return NURSE_ALLOWED.includes(action);
  return ELDER_ALLOWED.includes(action);
}

/** Cuentas que actúan sobre los datos de su administrador (adulto mayor y enfermera). */
export const isLinkedRole = (role: Role | undefined) => role === 'elder' || role === 'nurse';

/**
 * AISLAMIENTO entre cuentas y personas (auditoría 2026-11-10, SEC-01 y SEC-02). Un registro es accesible solo si
 * pertenece a la cuenta dueña de los datos de la sesión; una cuenta vinculada (adulto mayor o enfermera) solo ve y
 * cambia lo de SU persona. De los ajustes de la cuenta (PIN del administrador, avisos) una cuenta vinculada solo lee.
 * Los borradores (`drafts`) son por cuenta. Sin sesión, nada. Nunca se confía en que un id sea difícil de adivinar.
 */
export function canAccessRecord(
  user: Pick<AuthUser, 'id' | 'role' | 'ownerId' | 'elderId'> | null | undefined,
  coll: string,
  scope: { ownerUserId: string; elderId: string | null },
  mode: 'read' | 'write',
): boolean {
  if (!user || scope.ownerUserId !== dataOwnerId(user as AuthUser)) return false;
  if (!isLinkedRole(user.role) || coll === 'drafts') return true;
  if (coll === 'accounts') return mode === 'read';
  return !!user.elderId && scope.elderId === user.elderId;
}
