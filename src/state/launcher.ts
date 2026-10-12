/**
 * Preferencias del robot lanzador (por teléfono, no son datos de salud): posición por tamaño de pantalla, imán a los
 * bordes, "ocultar por hoy" y burbujas descartadas. Persisten en AsyncStorage como la apariencia.
 *
 * Geometría (pura): el robot se dibuja anclado abajo a la derecha y se mueve con un desplazamiento (x, y) ≤ 0.
 * `bounds` da cuánto puede subir y moverse a la izquierda sin salir de la pantalla ni tapar la barra de pestañas.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { toISODate } from '@/utils/dates';

export interface Pos {
  x: number;
  y: number;
}

interface LauncherStore {
  /** Posición por tamaño de pantalla ("390x844"). */
  positions: Record<string, Pos>;
  magnet: boolean;
  /** Oculto hasta esta fecha (YYYY-MM-DD, inclusive). */
  hiddenOn: string | null;
  /** Burbujas descartadas: clave de la novedad → versión (si la novedad cambia, vuelve a aparecer). */
  dismissed: Record<string, string>;
  setPos: (key: string, pos: Pos) => void;
  reset: () => void;
  setMagnet: (on: boolean) => void;
  hideToday: () => void;
  show: () => void;
  dismiss: (key: string, version: string) => void;
}

export const useLauncherStore = create<LauncherStore>()(
  persist(
    (set) => ({
      positions: {},
      magnet: true,
      hiddenOn: null,
      dismissed: {},
      setPos: (key, pos) => set((s) => ({ positions: { ...s.positions, [key]: pos } })),
      reset: () => set({ positions: {}, hiddenOn: null }),
      setMagnet: (magnet) => set({ magnet }),
      hideToday: () => set({ hiddenOn: toISODate(new Date()) }),
      show: () => set({ hiddenOn: null }),
      dismiss: (key, version) => set((s) => ({ dismissed: { ...s.dismissed, [key]: version } })),
    }),
    { name: 'buddy.launcher', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const sizeKey = (w: number, h: number) => `${Math.round(w)}x${Math.round(h)}`;
export const isHiddenToday = (hiddenOn: string | null) => hiddenOn === toISODate(new Date());

/** Cuánto puede moverse el robot (hacia la izquierda y hacia arriba) dentro del área segura. */
export function bounds(screenW: number, screenH: number, size: number, insetTop: number, bottomOffset: number, margin = 8): { maxLeft: number; maxUp: number } {
  'worklet';
  return { maxLeft: Math.max(0, screenW - size - margin * 2), maxUp: Math.max(0, screenH - insetTop - bottomOffset - size - margin) };
}

/** Mantiene la posición dentro de los límites (x e y van de −máximo a 0). */
export function clampPos(p: Pos, b: { maxLeft: number; maxUp: number }): Pos {
  'worklet';
  return { x: Math.min(0, Math.max(-b.maxLeft, p.x)), y: Math.min(0, Math.max(-b.maxUp, p.y)) };
}

/** Imán: al soltar, el robot va al borde lateral más cercano. */
export function snapX(x: number, maxLeft: number, magnet: boolean): number {
  'worklet';
  if (!magnet) return x;
  return -x < maxLeft / 2 ? 0 : -maxLeft;
}

/** Lado con espacio para las burbujas: si el robot está a la derecha, se abren hacia la izquierda, y viceversa. */
export function bubbleSide(p: Pos, b: { maxLeft: number; maxUp: number }): { align: 'right' | 'left'; below: boolean } {
  return { align: -p.x < b.maxLeft / 2 ? 'right' : 'left', below: -p.y > b.maxUp * 0.5 };
}
