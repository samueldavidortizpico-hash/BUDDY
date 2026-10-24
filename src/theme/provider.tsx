/**
 * Tema activo en tiempo de ejecución. La preferencia (automático, claro u oscuro; alto contraste; tamaño de texto)
 * se guarda en el dispositivo y se aplica al instante, incluidas la barra de estado y el fondo nativo.
 * La pantalla del adulto mayor puede forzar su propia apariencia con <ThemeOverride>.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { PixelRatio, useColorScheme } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { textScales, themes, type TextScale, type Theme, type ThemeName } from './index';

export type AppearanceMode = 'auto' | 'light' | 'dark';

export interface AppearancePrefs {
  mode: AppearanceMode;
  highContrast: boolean;
  textScale: TextScale;
  /** Deslizar el dedo sobre la barra de pestañas para cambiar de pestaña (se puede apagar). */
  barGestures: boolean;
}

export const DEFAULT_APPEARANCE: AppearancePrefs = { mode: 'auto', highContrast: false, textScale: 'normal', barGestures: true };

interface AppearanceStore extends AppearancePrefs {
  set: (patch: Partial<AppearancePrefs>) => void;
}

export const useAppearanceStore = create<AppearanceStore>()(
  persist((set) => ({ ...DEFAULT_APPEARANCE, set: (patch) => set(patch) }), {
    name: 'buddy.appearance',
    version: 1,
    storage: createJSONStorage(() => AsyncStorage),
    partialize: ({ mode, highContrast, textScale, barGestures }) => ({ mode, highContrast, textScale, barGestures }),
  }),
);

export function resolveThemeName(prefs: Pick<AppearancePrefs, 'mode' | 'highContrast'>, system: string | null | undefined): ThemeName {
  const dark = prefs.mode === 'dark' || (prefs.mode === 'auto' && system === 'dark');
  if (prefs.highContrast) return dark ? 'hcDark' : 'hcLight';
  return dark ? 'dark' : 'light';
}

interface ThemeValue {
  theme: Theme;
  textScale: number;
}

const ThemeContext = createContext<ThemeValue>({ theme: themes.light, textScale: 1 });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const mode = useAppearanceStore((s) => s.mode);
  const highContrast = useAppearanceStore((s) => s.highContrast);
  const scale = useAppearanceStore((s) => s.textScale);
  const theme = themes[resolveThemeName({ mode, highContrast }, system)];

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.c.bg).catch(() => undefined);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, textScale: textScales[scale] }}>{children}</ThemeContext.Provider>;
}

/** Fuerza un tema y un tamaño de texto (pantalla del adulto mayor, vista previa). */
export function ThemeOverride({ name, textScale, children }: { name: ThemeName; textScale?: TextScale; children: ReactNode }) {
  const parent = useContext(ThemeContext);
  return (
    <ThemeContext.Provider value={{ theme: themes[name], textScale: textScale ? textScales[textScale] : parent.textScale }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

/** Letra muy grande (app × sistema ≥ 1,6): los iconos decorativos ceden su espacio al texto. */
export function useBigText(): boolean {
  return useContext(ThemeContext).textScale * PixelRatio.getFontScale() >= 1.6;
}

export function useTextScaleFactor(): number {
  return useContext(ThemeContext).textScale;
}

export function useAppearanceReady(): boolean {
  return useAppearanceStore.persist.hasHydrated();
}

/** Estilos derivados del tema, calculados una vez por tema. */
export function makeStyles<T>(factory: (t: Theme) => T): () => T {
  const cache = new WeakMap<Theme, T>();
  return function useStyles() {
    const theme = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = factory(theme);
      cache.set(theme, styles);
    }
    return styles;
  };
}
