/**
 * Permisos por rol (matriz `can`). El administrador (familiar o cuidador) configura todo. El adulto mayor solo responde
 * (dosis, preguntas, agua, comidas, actividades), pide ayuda, llama a sus contactos y decide sobre el rastreo de su
 * ubicación (aceptar, rechazar o revocar: el consentimiento es suyo). No usa el asistente, no edita y no ve ajustes.
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

export function can(role: Role, action: Permission): boolean {
  if (role === 'caregiver') return !ELDER_ONLY.includes(action);
  return ELDER_ALLOWED.includes(action);
}
