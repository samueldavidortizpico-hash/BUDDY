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
import type { Role } from './types';

export type ElderAction =
  | 'answer_question'
  | 'confirm_dose'
  | 'request_help'
  | 'call_contact'
  | 'location_consent'
  | 'share_location';

/** Acciones de administración que no pasan por el asistente. */
export type AdminAction = 'edit_profile' | 'manage_access' | 'request_location' | 'settings' | 'use_assistant' | 'handoff';

export type Permission = ActionType | ElderAction | AdminAction;

const ELDER_ALLOWED: readonly Permission[] = ['answer_question', 'confirm_dose', 'request_help', 'call_contact', 'location_consent', 'share_location'];
/** La decisión sobre su ubicación es solo del adulto mayor: el administrador solicita, no acepta por él. */
const ELDER_ONLY: readonly Permission[] = ['location_consent', 'share_location'];

const NURSE_ALLOWED: readonly Permission[] = ['answer_question', 'confirm_dose', 'request_help', 'call_contact', 'update_stock'];

export function can(role: Role, action: Permission): boolean {
  if (role === 'caregiver') return !ELDER_ONLY.includes(action);
  if (role === 'nurse') return NURSE_ALLOWED.includes(action);
  return ELDER_ALLOWED.includes(action);
}

/** Cuentas que actúan sobre los datos de su administrador (adulto mayor y enfermera). */
export const isLinkedRole = (role: Role | undefined) => role === 'elder' || role === 'nurse';
