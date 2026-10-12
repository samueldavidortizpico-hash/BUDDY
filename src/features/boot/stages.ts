/**
 * Etapas REALES del arranque de BUDDY (puro). El progreso es la fracción de tareas terminadas, no un porcentaje
 * inventado; el mensaje bajo la barra es la tarea que se está haciendo de verdad.
 */
export type StageKey = 'appearance' | 'fonts' | 'data' | 'session';

export const STAGE_LABEL: Record<StageKey, string> = {
  appearance: 'Preparando tu tema',
  fonts: 'Cargando las letras',
  data: 'Abriendo tus datos guardados',
  session: 'Revisando tu sesión',
};

/** Pasado este tiempo sin terminar, se avisa que está tardando; pasado el límite, se ofrece reintentar. */
export const SLOW_MS = 4000;
export const FAIL_MS = 15000;

export type BootView =
  | { kind: 'loading'; progress: number; message: string; slow: boolean }
  | { kind: 'ready' }
  | { kind: 'failed' };

export function bootView(done: Record<StageKey, boolean>, elapsedMs: number): BootView {
  const keys = Object.keys(STAGE_LABEL) as StageKey[];
  const pending = keys.filter((k) => !done[k]);
  if (!pending.length) return { kind: 'ready' };
  if (elapsedMs >= FAIL_MS) return { kind: 'failed' };
  return { kind: 'loading', progress: (keys.length - pending.length) / keys.length, message: STAGE_LABEL[pending[0]], slow: elapsedMs >= SLOW_MS };
}
