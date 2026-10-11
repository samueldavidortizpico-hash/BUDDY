/**
 * Permisos por rol. El cuidador configura todo; el adulto mayor solo responde preguntas y pide ayuda (no usa el
 * asistente, no edita y no ve ajustes). Las políticas RLS de Supabase replican esta regla en el servidor.
 */
import type { ActionType } from './assistant/types';
import type { Role } from './types';

export type ElderAction = 'answer_question' | 'confirm_dose' | 'request_help' | 'call_contact';

const ELDER_ALLOWED: ElderAction[] = ['answer_question', 'confirm_dose', 'request_help', 'call_contact'];

export function can(role: Role, action: ActionType | ElderAction): boolean {
  if (role === 'caregiver') return true;
  return (ELDER_ALLOWED as string[]).includes(action);
}
