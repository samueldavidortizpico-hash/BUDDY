/**
 * Registros recién agregados por BUDDY: Rutina los marca "Nuevo" y los resalta unos segundos.
 * Solo en memoria (no se persiste): es una señal visual inmediata, no un dato.
 */
import { useEffect, useState } from 'react';
import { create } from 'zustand';

export const RECENT_MS = 8000;

const useRecentStore = create<{ ids: Record<string, number> }>(() => ({ ids: {} }));

export function markRecent(ids: string[]) {
  if (!ids.length) return;
  const at = Date.now();
  useRecentStore.setState((s) => ({ ids: { ...s.ids, ...Object.fromEntries(ids.map((id) => [id, at])) } }));
}

/** true mientras el registro sea "Nuevo" (se apaga solo a los 8 s). */
export function useIsRecent(id: string): boolean {
  const at = useRecentStore((s) => s.ids[id]);
  const [expired, setExpired] = useState<number | null>(null);
  useEffect(() => {
    if (!at) return;
    const t = setTimeout(() => setExpired(at), Math.max(0, at + RECENT_MS - Date.now()));
    return () => clearTimeout(t);
  }, [at]);
  return !!at && expired !== at;
}

/** true si alguno de los registros es "Nuevo" (filas que agrupan varios registros, p. ej. contactos). */
export function useRecentAny(ids: string[]): boolean {
  const at = useRecentStore((s) => Math.max(0, ...ids.map((id) => s.ids[id] ?? 0)));
  const [expired, setExpired] = useState<number | null>(null);
  useEffect(() => {
    if (!at) return;
    const t = setTimeout(() => setExpired(at), Math.max(0, at + RECENT_MS - Date.now()));
    return () => clearTimeout(t);
  }, [at]);
  return !!at && expired !== at;
}
