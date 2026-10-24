/**
 * BUDDY — tokens de diseño. Única fuente de color, tipografía, espaciado, radios, alturas, sombras y movimiento.
 * Ver docs/DESIGN_SYSTEM.md (tokens, decisiones y contrastes medidos).
 *
 * Cuatro temas DISEÑADOS (no invertidos): claro, oscuro, alto contraste claro y alto contraste oscuro.
 * Las pantallas leen el tema activo con `useTheme()` / `makeStyles()` (src/theme/provider.tsx), así el cambio en
 * Ajustes > Apariencia se aplica al instante.
 */
import { Appearance, type TextStyle, type ViewStyle } from 'react-native';

export type ThemeName = 'light' | 'dark' | 'hcLight' | 'hcDark';
export type Tone = 'mint' | 'coral' | 'lavender' | 'sky' | 'yellow' | 'red' | 'petrol' | 'slate';
export type Domain = 'water' | 'medication' | 'mood' | 'sleep' | 'activity' | 'food' | 'contact' | 'followUp';

type Gradient = readonly [string, string, ...string[]];

export interface Palette {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryEnd: string;
  onPrimary: string;
  coralCta: string;
  coralCtaEnd: string;
  onCoral: string;
  mint: string;
  mintStrong: string;
  mintDeep: string;
  mintPale: string;
  coral: string;
  coralPale: string;
  lavender: string;
  lavenderPale: string;
  yellow: string;
  yellowPale: string;
  sky: string;
  skyPale: string;
  success: string;
  successPale: string;
  danger: string;
  dangerPale: string;
  night: string;
  nightSoft: string;
  nightText: string;
  scrim: string;
  glass: string;
  focus: string;
  shadowInk: string;
}

export interface Ink {
  mint: string;
  coral: string;
  lavender: string;
  sky: string;
  yellow: string;
  success: string;
  danger: string;
  info: string;
}

export interface DomainStyle {
  gradient: Gradient;
  accent: string;
  text: string;
  muted: string;
  tone: Tone;
}

/** Mosaico de icono (V4): fondo vivo del dominio y glifo con contraste ≥ 3:1 (prueba en theme/__tests__). */
export interface Tile {
  bg: string;
  fg: string;
}

export type StatusKind = 'ok' | 'attention' | 'action' | 'none';

/** Estado del Inicio (V4): "Todo bien" menta, "Atención" ámbar suave, "Acción necesaria" coral, sin datos gris. */
export interface StatusStyle {
  bg: string;
  border: string;
  accent: string;
  text: string;
  muted: string;
}

export interface Theme {
  name: ThemeName;
  dark: boolean;
  /** Alto contraste: sin degradados, sin transparencias, bordes de 2 px. */
  hc: boolean;
  c: Palette;
  ink: Ink;
  tones: Record<Tone, { bg: string; fg: string; solid: string; soft: string }>;
  domains: Record<Domain, DomainStyle>;
  tiles: Record<Domain | 'petrol' | 'slate', Tile>;
  status: Record<StatusKind, StatusStyle>;
  gradients: { primary: Gradient; coral: Gradient; welcome: Gradient; screen: Gradient };
  shadow: { soft: ViewStyle; elevated: ViewStyle; hero: ViewStyle; glow: Record<Tone, ViewStyle> };
  borderWidth: number;
  /** Borde de 1 px (2 px en alto contraste) para que las superficies no dependan de la sombra (Android). */
  hairline: ViewStyle;
}

// ── Claro / oscuro ───────────────────────────────────────────

const LIGHT: Palette = {
  bg: '#F8FAF8',
  surface: '#FFFFFF',
  surface2: '#EEF3F3',
  text: '#0D3946',
  muted: '#56657A', // #64748B no llega a 4.5:1 sobre lavanda pálida
  border: 'rgba(23, 74, 89, 0.08)',
  primary: '#174A59',
  primaryEnd: '#0D5E6D',
  onPrimary: '#FFFFFF',
  coralCta: '#F7A08F',
  coralCtaEnd: '#FF776B',
  onCoral: '#0D3946', // el blanco sobre coral solo llega a 2.4:1
  mint: '#5ED9B5',
  mintStrong: '#21AD8B',
  mintDeep: '#178C6F',
  mintPale: '#E9FAF4',
  coral: '#F28C7A',
  coralPale: '#FFF0EC',
  lavender: '#8B7CF6',
  lavenderPale: '#F0EDFF',
  yellow: '#F4C95D',
  yellowPale: '#FFF5D7',
  sky: '#63B3FF',
  skyPale: '#EAF5FF',
  success: '#33C27F',
  successPale: '#E7F8F1',
  danger: '#E86C6C',
  dangerPale: '#FFEDED',
  night: '#28245F',
  nightSoft: '#6257C7',
  nightText: '#C9C3FF',
  scrim: 'rgba(13, 57, 70, 0.45)',
  glass: 'rgba(255, 255, 255, 0.86)',
  focus: '#174A59',
  shadowInk: '23, 74, 89',
};

const DARK: Palette = {
  bg: '#0A2630',
  surface: '#103340',
  surface2: '#16424F',
  text: '#F2F8F7',
  muted: '#A9C0C6',
  border: 'rgba(255, 255, 255, 0.08)',
  primary: '#1F6E7E', // el petróleo del addendum desaparece sobre el fondo oscuro
  primaryEnd: '#13808F',
  onPrimary: '#FFFFFF',
  coralCta: '#FF9C8A',
  coralCtaEnd: '#FF8577',
  onCoral: '#0D3946',
  mint: '#5ED9B5',
  mintStrong: '#21AD8B',
  mintDeep: '#178C6F',
  mintPale: '#123F3D',
  coral: '#FF9C8A',
  coralPale: '#3A2420',
  lavender: '#A99DFF',
  lavenderPale: '#2A2560',
  yellow: '#F6D27A',
  yellowPale: '#3B3216',
  sky: '#7CC2FF',
  skyPale: '#123A5C',
  success: '#4AD395',
  successPale: '#12402F',
  danger: '#FF8585',
  dangerPale: '#4A2226',
  night: '#14123D',
  nightSoft: '#3B3391',
  nightText: '#C9C3FF',
  scrim: 'rgba(2, 14, 18, 0.66)',
  glass: 'rgba(16, 51, 64, 0.88)',
  focus: '#5ED9B5',
  shadowInk: '0, 0, 0',
};

const INK_LIGHT: Ink = {
  mint: '#127A62',
  coral: '#B9433D',
  lavender: '#5B4BD0',
  sky: '#1F6FAE',
  yellow: '#7A5A0C',
  success: '#0F7A55',
  danger: '#C2413F',
  info: '#24778E',
};

const INK_DARK: Ink = {
  mint: '#5ED9B5',
  coral: '#FF9C8A',
  lavender: '#B9AFFF',
  sky: '#7CC2FF',
  yellow: '#F6D27A',
  success: '#4AD395',
  danger: '#FF8585',
  info: '#7FD3E3',
};

function softTheme(name: 'light' | 'dark'): Theme {
  const dark = name === 'dark';
  const c = dark ? DARK : LIGHT;
  const ink = dark ? INK_DARK : INK_LIGHT;
  const p = <T,>(l: T, d: T) => (dark ? d : l);
  const sh = (y: number, blur: number, a: number) => `0px ${y}px ${blur}px rgba(${c.shadowInk}, ${a})`;
  const glow = (rgb: string): ViewStyle => ({ boxShadow: `0px 10px 20px rgba(${rgb}, 0.28)` });
  return {
    name,
    dark,
    hc: false,
    c,
    ink,
    borderWidth: 1,
    hairline: { borderWidth: 1, borderColor: c.border },
    tones: {
      mint: { bg: c.mintPale, fg: ink.mint, solid: c.mint, soft: p('#D2F5E9', '#1A5A50') },
      coral: { bg: c.coralPale, fg: ink.coral, solid: c.coral, soft: p('#FFD8D0', '#5A3128') },
      lavender: { bg: c.lavenderPale, fg: ink.lavender, solid: c.lavender, soft: p('#DDD8FF', '#3A3478') },
      sky: { bg: c.skyPale, fg: ink.sky, solid: c.sky, soft: p('#D4EBFF', '#1B4E80') },
      yellow: { bg: c.yellowPale, fg: ink.yellow, solid: c.yellow, soft: p('#FFEDAA', '#5A4A1C') },
      red: { bg: c.dangerPale, fg: ink.danger, solid: c.danger, soft: p('#FFD6D6', '#5A2A2E') },
      petrol: { bg: p('#E8F0F1', '#16424F'), fg: p('#174A59', '#F2F8F7'), solid: c.primary, soft: p('#D3E2E5', '#1F5563') },
      slate: { bg: c.surface2, fg: c.muted, solid: p('#64748B', '#A9C0C6'), soft: p('#DBE5E3', '#234E5A') },
    },
    domains: {
      water: {
        gradient: p(['#BDE3FF', '#5BB2FF', '#1F6FC4'], ['#0E3F73', '#1B6DC4']),
        accent: p('#1F6FC4', '#7CC2FF'),
        text: p('#0B3A66', '#FFFFFF'),
        muted: p('#174E80', '#D6EBFF'),
        tone: 'sky',
      },
      medication: {
        gradient: p(['#FFF3EE', '#FFD9CF', '#F28C7A'], ['#3A2420', '#5A3128']),
        accent: p('#F28C7A', '#FF9C8A'),
        text: p('#4A1E16', '#FFF3EE'),
        muted: p('#7A3326', '#FFD3C9'),
        tone: 'coral',
      },
      mood: {
        gradient: p(['#F0EDFF', '#DCD6FF'], ['#2A2560', '#4A3FA8']),
        accent: p('#8B7CF6', '#A99DFF'),
        text: p('#2A2366', '#F4F2FF'),
        muted: p('#4B3FB0', '#D9D3FF'),
        tone: 'lavender',
      },
      sleep: {
        gradient: p(['#28245F', '#6257C7'], ['#14123D', '#3B3391']),
        accent: '#C9C3FF',
        text: '#FFFFFF',
        muted: '#DCD8FF',
        tone: 'lavender',
      },
      activity: {
        gradient: p(['#E9FAF4', '#BDF0DF'], ['#0F4A44', '#17695F']),
        accent: p('#21AD8B', '#5ED9B5'),
        text: p('#0D3946', '#F2F8F7'),
        muted: p('#155E4E', '#C4F2E3'),
        tone: 'mint',
      },
      food: {
        gradient: p(['#FFF8E6', '#FFE7B3'], ['#3B3216', '#5A4A1C']),
        accent: p('#E0A82E', '#F6D27A'),
        text: p('#5A3E06', '#FFF5D7'),
        muted: p('#7A5A0C', '#F2E2B0'),
        tone: 'yellow',
      },
      contact: {
        gradient: p(['#F0EDFF', '#E4DFFF'], ['#2A2560', '#3A3478']),
        accent: p('#8B7CF6', '#A99DFF'),
        text: p('#2A2366', '#F4F2FF'),
        muted: p('#4B3FB0', '#D9D3FF'),
        tone: 'lavender',
      },
      followUp: {
        gradient: p(['#FFF5D7', '#FFEDB8'], ['#3B3216', '#4A3E17']),
        accent: p('#F4C95D', '#F6D27A'),
        text: p('#7A5A0C', '#F6D27A'),
        muted: p('#7A5A0C', '#E8CF8F'),
        tone: 'yellow',
      },
    },
    tiles: {
      water: { bg: '#1E7FD6', fg: '#FFFFFF' },
      medication: { bg: '#E2513B', fg: '#FFFFFF' },
      mood: { bg: '#6E56F0', fg: '#FFFFFF' },
      sleep: { bg: '#4338CA', fg: '#FFFFFF' },
      activity: { bg: '#0B9670', fg: '#FFFFFF' },
      food: { bg: '#F5A524', fg: '#3D2A00' },
      contact: { bg: '#8B4FE0', fg: '#FFFFFF' },
      followUp: { bg: '#F5A524', fg: '#3D2A00' },
      petrol: { bg: c.primary, fg: '#FFFFFF' },
      slate: { bg: p('#E4ECEB', '#234E5A'), fg: p('#2D4A55', '#E2EEEC') },
    },
    status: {
      ok: { bg: p('#DCF7EC', '#0F3F37'), border: p('#9FE6CB', '#1F6B5B'), accent: p('#0B9670', '#5ED9B5'), text: p('#0B3D31', '#E6FBF4'), muted: p('#1F5E4D', '#B9EBDA') },
      attention: { bg: p('#FFF1CF', '#3B3216'), border: p('#F8D57E', '#6B5A22'), accent: p('#B07800', '#F6D27A'), text: p('#4A3500', '#FFF4D6'), muted: p('#6B4E00', '#EEDCA8') },
      action: { bg: p('#FFE3DC', '#4A2420'), border: p('#F9B3A4', '#7A3A30'), accent: p('#C93D28', '#FF9C8A'), text: p('#5C1A0F', '#FFECE7'), muted: p('#7E2A1C', '#FFC9BD') },
      none: { bg: p('#EEF3F3', '#16424F'), border: p('#D3E0E0', '#28566A'), accent: p('#56657A', '#A9C0C6'), text: p('#0D3946', '#F2F8F7'), muted: p('#4A5A6B', '#A9C0C6') },
    },
    gradients: {
      primary: [c.primary, c.primaryEnd],
      coral: [c.coralCta, c.coralCtaEnd],
      welcome: p(['#FBFDFB', '#E9FAF4'], ['#0A2630', '#0D3540']),
      screen: p(['#FBFCFA', '#F8FAF8'], ['#0B2833', '#0A2630']),
    },
    shadow: {
      soft: { boxShadow: `${sh(2, 6, dark ? 0.3 : 0.06)}, ${sh(10, 28, dark ? 0.35 : 0.1)}` },
      elevated: { boxShadow: `${sh(2, 6, dark ? 0.3 : 0.06)}, ${sh(14, 34, dark ? 0.4 : 0.12)}` },
      hero: { boxShadow: sh(18, 40, dark ? 0.45 : 0.18) },
      glow: {
        mint: glow('33, 173, 139'),
        coral: glow('242, 140, 122'),
        lavender: glow('139, 124, 246'),
        sky: glow('31, 111, 196'),
        yellow: glow('244, 201, 93'),
        red: glow('232, 108, 108'),
        petrol: { boxShadow: `0px 10px 20px rgba(23, 74, 89, ${dark ? 0.5 : 0.28})` },
        slate: {},
      },
    },
  };
}

// ── Alto contraste (blanco y negro) ──────────────────────────

function hcTheme(name: 'hcLight' | 'hcDark'): Theme {
  const dark = name === 'hcDark';
  const bg = dark ? '#000000' : '#FFFFFF';
  const fg = dark ? '#FFFFFF' : '#000000';
  const blue = dark ? '#7FD4FF' : '#005A9C';
  const green = dark ? '#6BFFB0' : '#006B3C';
  const red = dark ? '#FF8A80' : '#B00020';
  const flat = (x: string): Gradient => [x, x];
  const c: Palette = {
    bg,
    surface: bg,
    surface2: bg,
    text: fg,
    muted: fg,
    border: fg,
    primary: fg,
    primaryEnd: fg,
    onPrimary: bg,
    coralCta: fg,
    coralCtaEnd: fg,
    onCoral: bg,
    mint: green,
    mintStrong: green,
    mintDeep: fg,
    mintPale: bg,
    coral: red,
    coralPale: bg,
    lavender: blue,
    lavenderPale: bg,
    yellow: fg,
    yellowPale: bg,
    sky: blue,
    skyPale: bg,
    success: green,
    successPale: bg,
    danger: red,
    dangerPale: bg,
    night: bg,
    nightSoft: bg,
    nightText: fg,
    scrim: dark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.6)',
    glass: bg,
    focus: blue,
    shadowInk: '0, 0, 0',
  };
  const ink: Ink = { mint: green, coral: red, lavender: blue, sky: blue, yellow: fg, success: green, danger: red, info: blue };
  const tone = (accent: string) => ({ bg, fg: accent, solid: accent, soft: bg });
  const dom = (accent: string, t: Tone): DomainStyle => ({ gradient: flat(bg), accent, text: fg, muted: fg, tone: t });
  const none: ViewStyle = {};
  return {
    name,
    dark,
    hc: true,
    c,
    ink,
    borderWidth: 2,
    hairline: { borderWidth: 2, borderColor: fg },
    tones: {
      mint: tone(green),
      coral: tone(red),
      lavender: tone(blue),
      sky: tone(blue),
      yellow: tone(fg),
      red: tone(red),
      petrol: tone(fg),
      slate: tone(fg),
    },
    domains: {
      water: dom(blue, 'sky'),
      medication: dom(red, 'coral'),
      mood: dom(blue, 'lavender'),
      sleep: dom(blue, 'lavender'),
      activity: dom(green, 'mint'),
      food: dom(fg, 'yellow'),
      contact: dom(blue, 'lavender'),
      followUp: dom(fg, 'yellow'),
    },
    tiles: Object.fromEntries((['water', 'medication', 'mood', 'sleep', 'activity', 'food', 'contact', 'followUp', 'petrol', 'slate'] as const).map((k) => [k, { bg, fg }])) as Theme['tiles'],
    status: Object.fromEntries((['ok', 'attention', 'action', 'none'] as const).map((k) => [k, { bg, border: fg, accent: k === 'action' ? red : k === 'ok' ? green : fg, text: fg, muted: fg }])) as Theme['status'],
    gradients: { primary: flat(fg), coral: flat(fg), welcome: flat(bg), screen: flat(bg) },
    shadow: {
      soft: none,
      elevated: none,
      hero: none,
      glow: { mint: none, coral: none, lavender: none, sky: none, yellow: none, red: none, petrol: none, slate: none },
    },
  };
}

export const themes: Record<ThemeName, Theme> = {
  light: softTheme('light'),
  dark: softTheme('dark'),
  hcLight: hcTheme('hcLight'),
  hcDark: hcTheme('hcDark'),
};

// ── Tokens independientes del tema ───────────────────────────

/** Base de 4 pt. `screen` = margen lateral; `section` = separación entre secciones. */
export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, screen: 20, section: 24 } as const;

export const radius = {
  sm: 12,
  icon: 16,
  iconLg: 20,
  md: 16,
  input: 18,
  button: 18,
  tile: 14,
  card: 24,
  cardLg: 24,
  hero: 32,
  modal: 28,
  pill: 999,
} as const;

/**
 * Alturas MÍNIMAS (crecen con el texto). V4: todo botón estándar mide al menos 56; `compact` (44) solo para acciones
 * secundarias como Editar; `elder` = acciones del adulto mayor; `orb` = botón central de BUDDY en la barra.
 */
export const touch = { min: 48, chip: 44, compact: 44, secondary: 56, primary: 56, elder: 72, elderMin: 64, timeRow: 56, tabBar: 72, orb: 64, tile: 44 } as const;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/**
 * Escala tipográfica (Manrope). Ningún texto esencial baja de 14; `eyebrow` y `meta` (12) solo para
 * información complementaria. `heroXL`/`heroL`: números protagonistas.
 */
export const type = {
  heroXL: { fontFamily: fonts.extrabold, fontSize: 56, lineHeight: 60, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  heroL: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 44, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  h1: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  body: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 26 },
  bodyStrong: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 26 },
  secondary: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  secondaryStrong: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  caption: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  captionStrong: { fontFamily: fonts.extrabold, fontSize: 14, lineHeight: 20 },
  eyebrow: { fontFamily: fonts.extrabold, fontSize: 12, lineHeight: 16, letterSpacing: 1.4, textTransform: 'uppercase' },
  meta: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  /** Etiquetas de la barra inferior (V4: 13, siempre visibles). */
  tab: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16 },
  number: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] },
  button: { fontFamily: fonts.extrabold, fontSize: 18, lineHeight: 24 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Tope de escalado del sistema por variante: los números héroe no pueden romper su tarjeta. */
export const maxFontScale: Partial<Record<TypeVariant, number>> = { heroXL: 1.3, heroL: 1.4, display: 1.6 };

/** Tamaño de texto elegido en Ajustes > Apariencia (multiplica la escala del sistema; tope total ×2). */
export const textScales = { normal: 1, large: 1.15, xlarge: 1.3, huge: 1.6, max: 2 } as const;
export type TextScale = keyof typeof textScales;

/**
 * Movimiento. Objetivos de diseño, no mediciones: feedback 120–180 ms, cambio de componente 220–360 ms,
 * vuelos del robot 700–1100 ms; celebraciones breves y no bloqueantes.
 */
export const motion = {
  pressScale: 0.97,
  spring: { damping: 16, stiffness: 260, mass: 0.6 },
  springSoft: { damping: 11, stiffness: 140, mass: 1 },
  stagger: 60,
  enter: 320,
  feedback: 160,
  change: 280,
  countUp: 700,
} as const;

// ── Compatibilidad con pantallas aún no migradas a useTheme() ──
// Se fijan con el esquema del sistema al arrancar. Se eliminan cuando todas las pantallas usan el proveedor.
const legacy = themes[Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'];
export const isDark = legacy.dark;
export const palette = {
  ...legacy.c,
  warm: legacy.c.bg,
  white: legacy.c.surface,
  slatePale: legacy.c.surface2,
  line: legacy.c.border,
  petrol: legacy.c.primary,
  petrolDeep: legacy.c.text,
  mintDark: legacy.c.mintStrong,
  red: legacy.c.danger,
  redPale: legacy.c.dangerPale,
  ghostBorder: legacy.dark ? 'rgba(242, 248, 247, 0.32)' : '#A8BDC2',
  mintBorder: legacy.dark ? 'rgba(94, 217, 181, 0.28)' : '#CCEFE4',
  coralBorder: legacy.dark ? '#5A3128' : '#FFD7D0',
  segment: legacy.c.surface2,
  timeline: legacy.dark ? '#2E5561' : '#C8D6D2',
  switchOff: legacy.dark ? '#3A5C66' : '#C9D6D3',
  dotIdle: legacy.dark ? '#3A5C66' : '#CDD9D6',
  waterTrack: legacy.dark ? '#1E4A66' : '#C5DDED',
  map: legacy.dark ? '#163F3E' : '#E6F0E7',
  mapPark: legacy.dark ? '#1C4C47' : '#D8ECDA',
  moon: '#F9DA72',
  notice: legacy.c.surface2,
  pillWarm: legacy.c.coralPale,
  levelIdle: legacy.dark ? '#234E5A' : '#DBE5E3',
  dashedMint: legacy.dark ? '#2E6B5E' : '#B7D2CB',
  glassBorder: legacy.dark ? 'rgba(124, 194, 255, 0.3)' : '#B9D9EF',
  logoutBorder: legacy.dark ? '#5A3128' : '#F1C2BD',
  orbMint: legacy.c.mint,
  orbLavender: legacy.c.lavender,
  orbCoral: legacy.c.coral,
  petrolMid: legacy.c.primaryEnd,
  petrolSoft: legacy.dark ? '#2A7F8E' : '#236A78',
};
export const ink = { ...legacy.ink, text: legacy.c.text, title: legacy.c.text, muted: legacy.c.muted, inverse: '#FFFFFF', onCoral: legacy.c.onCoral, red: legacy.ink.danger };
export const colors = { ...palette, background: legacy.c.bg, surface: legacy.c.surface, text: legacy.c.text, textMuted: legacy.c.muted, border: legacy.c.border };
export const tones = legacy.tones;
export const domains = legacy.domains;
export const shadow = {
  ...legacy.shadow,
  ...Object.fromEntries(Object.entries(legacy.shadow.glow).map(([k, v]) => [k, v])),
  night: { boxShadow: '0px 15px 30px rgba(77, 67, 156, 0.28)' },
} as Theme['shadow'] & Record<Tone | 'night', ViewStyle>;
export const border = { hairline: legacy.hairline };
export const gradients = {
  ...legacy.gradients,
  petrolCard: [legacy.c.primary, legacy.dark ? '#2A7F8E' : '#236A78'],
  chat: legacy.dark ? ['#0D2F38', '#0A2630'] : ['#F3FBF8', '#F8FAF8'],
  reminder: legacy.dark ? ['#3A2420', '#5A3128'] : ['#FFF3EE', '#FFD9CF'],
  nextMed: [legacy.c.surface, legacy.dark ? '#12394A' : '#F5FBF8'],
  feeling: [legacy.c.lavenderPale, legacy.c.surface],
  mood: [legacy.c.lavenderPale, legacy.dark ? '#1E1F4A' : '#FAF9FF'],
  wellness: legacy.dark ? ['#0F4A44', '#0B3238'] : ['#DAF8EE', '#F4FFF9'],
  hydration: legacy.dark ? ['#0E3F73', '#0D2F45'] : ['#E9F5FF', '#F8FCFF'],
  achievement: legacy.dark ? ['#3B3216', '#2A2A1A'] : ['#FFF3CF', '#FFFAF0'],
  sleep: [legacy.c.night, legacy.c.nightSoft],
  caregiverCard: [legacy.c.surface, legacy.dark ? '#163A47' : '#FFF8F5'],
  voice: [legacy.c.mintStrong, legacy.c.primary],
  onboardingMint: legacy.domains.activity.gradient,
  onboardingLavender: legacy.domains.mood.gradient,
  onboardingCoral: legacy.dark ? ['#3A2420', '#5A3128'] : ['#FFF1ED', '#FFDCD4'],
  water: legacy.dark ? ['#1B6DC4', '#7CC2FF'] : ['#7BC8FF', '#63B3FF'],
  progress: [legacy.c.mintStrong, legacy.c.mint],
  bars: [legacy.c.lavender, legacy.dark ? '#6A5FD0' : '#C8C1FF'],
  barsMint: [legacy.c.mintStrong, legacy.c.mint],
  pillCoral: ['#FF756D', '#FFAB9D'],
  pillBlue: ['#3EB6E8', '#82DCF4'],
  pillYellow: ['#F3B427', '#FFDF75'],
} as const satisfies Record<string, Gradient>;
export type GradientName = keyof typeof gradients;
