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
  /** Texto terciario: solo detalles no esenciales (2,9:1 en claro). */
  tertiary: string;
  border: string;
  /** Turquesa de marca (acento). */
  accent: string;
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
  /** Parada final (la más oscura) del degradado: sirve de fondo sólido. */
  bg: string;
  fg: string;
  /** V5: degradado vivo del dominio (el glifo blanco da ≥ 3:1 en ambas paradas; prueba en theme/__tests__). */
  gradient: Gradient;
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
  gradients: { primary: Gradient; coral: Gradient; welcome: Gradient; screen: Gradient; plus: Gradient };
  /** V5: degradados luminosos por tono para acciones de dominio (Button variant="solid"); texto `onBright` ≥ 4,5:1. */
  bright: Record<Tone, Gradient>;
  onBright: string;
  /** Elevación V4.3: `soft` = nivel 1 (tarjetas), `elevated` = nivel 2 (flotantes), `sheet` = nivel 3 (hojas y modales). */
  shadow: { soft: ViewStyle; elevated: ViewStyle; hero: ViewStyle; sheet: ViewStyle; glow: Record<Tone, ViewStyle> };
  borderWidth: number;
  /** Borde de 1 px (2 px en alto contraste) para que las superficies no dependan de la sombra (Android). */
  hairline: ViewStyle;
}

// ── Claro / oscuro ───────────────────────────────────────────

// V4.3: 60 % fondos neutros, 30 % superficies y texto, 10 % color de marca o de dominio. El color identifica el dato.
const LIGHT: Palette = {
  // V5: fondo con tinte menta (menos blanco); las tarjetas siguen blancas para que el texto respire.
  bg: '#EEF5F3',
  surface: '#FFFFFF',
  surface2: '#E4EEEC',
  text: '#102A33',
  muted: '#5B6B73',
  tertiary: '#8A99A0',
  border: '#DCE6E4',
  accent: '#1FA9A0',
  primary: '#174A59',
  primaryEnd: '#0D3946',
  onPrimary: '#FFFFFF',
  coralCta: '#F7A08F',
  coralCtaEnd: '#FF776B',
  onCoral: '#102A33', // el blanco sobre coral solo llega a 2.4:1
  mint: '#5ED9B5',
  mintStrong: '#1F9A7E',
  mintDeep: '#178C6F',
  mintPale: '#E5F7F1',
  coral: '#E8735F',
  coralPale: '#FDEDE9',
  lavender: '#7B6CF0',
  lavenderPale: '#EFEDFE',
  yellow: '#C98A12',
  yellowPale: '#FDF4DD',
  sky: '#3D9BEF',
  skyPale: '#E8F3FD',
  success: '#2E9E64',
  successPale: '#E6F5ED',
  danger: '#D64545',
  dangerPale: '#FCEAEC',
  night: '#5B63D6',
  nightSoft: '#ECEEFC',
  nightText: '#5860D0',
  scrim: 'rgba(16, 42, 51, 0.45)',
  glass: 'rgba(255, 255, 255, 0.9)',
  focus: '#1FA9A0',
  shadowInk: '23, 74, 89',
};

// V4.2: noche azul neutra (no petróleo ni verde). El turquesa es el acento principal y se usa con moderación;
// los fondos de tarjeta llevan el color de su dominio al 16 % sobre la superficie.
// V4.4: fondo más profundo (#08121B) para que las superficies se separen sin depender solo del borde.
const DARK: Palette = {
  bg: '#08121B',
  surface: '#132230',
  surface2: '#1B2D3E',
  text: '#F3F6F8',
  muted: '#A7B4C2',
  tertiary: '#7D8B98',
  border: 'rgba(255, 255, 255, 0.1)',
  accent: '#2BC4B4',
  primary: '#2BC4B4',
  primaryEnd: '#1FB5C8',
  onPrimary: '#062A2A', // el blanco sobre turquesa no llega a 4,5:1; petróleo casi negro da 7:1
  coralCta: '#FF9C8A',
  coralCtaEnd: '#FF8577',
  onCoral: '#0D3946',
  mint: '#5ED9B5',
  mintStrong: '#1F9E91', // fondo de iconos blancos (3,3:1)
  mintDeep: '#178C6F',
  mintPale: '#1F3E44',
  coral: '#FF9C8A',
  coralPale: '#3F2A2A',
  lavender: '#A99DFF',
  lavenderPale: '#2B354F',
  yellow: '#F6D27A',
  yellowPale: '#3B321C',
  sky: '#7CC2FF',
  skyPale: '#243B4F',
  success: '#4AD395',
  successPale: '#1C3D3E',
  danger: '#FF8585',
  dangerPale: '#40262B',
  night: '#1A1D45',
  nightSoft: '#3A3F9A',
  nightText: '#C9CCFF',
  scrim: 'rgba(3, 8, 14, 0.66)',
  glass: 'rgba(19, 33, 46, 0.9)',
  focus: '#2BC4B4',
  shadowInk: '0, 0, 0',
};

const INK_LIGHT: Ink = {
  mint: '#1A7D65',
  coral: '#A95445',
  lavender: '#695CCC',
  sky: '#2D71AE',
  yellow: '#95660D',
  success: '#1F7A4D',
  danger: '#B83B3B',
  info: '#177B75',
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
  // Brillos de color como sombra: fuera (el brillo no es una affordance); quedan como nivel 1 neutro.
  const glow = (_rgb: string): ViewStyle => (dark ? {} : { boxShadow: `${sh(1, 2, 0.04)}, ${sh(4, 12, 0.06)}` });
  return {
    name,
    dark,
    hc: false,
    c,
    ink,
    borderWidth: 1,
    hairline: { borderWidth: 1, borderColor: c.border },
    tones: {
      mint: { bg: c.mintPale, fg: ink.mint, solid: c.mint, soft: p('#D2F5E9', '#2C605C') },
      coral: { bg: c.coralPale, fg: ink.coral, solid: c.coral, soft: p('#FFD8D0', '#6B4440') },
      lavender: { bg: c.lavenderPale, fg: ink.lavender, solid: c.lavender, soft: p('#DDD8FF', '#464B75') },
      sky: { bg: c.skyPale, fg: ink.sky, solid: c.sky, soft: p('#D4EBFF', '#375875') },
      yellow: { bg: c.yellowPale, fg: ink.yellow, solid: c.yellow, soft: p('#FFEDAA', '#6E5A27') },
      red: { bg: c.dangerPale, fg: ink.danger, solid: c.danger, soft: p('#FFD6D6', '#6E3B42') },
      petrol: { bg: p('#E8F0F1', '#1B2B3A'), fg: p('#174A59', '#F3F6F8'), solid: c.primary, soft: p('#D3E2E5', '#2A3B4C') },
      slate: { bg: c.surface2, fg: c.muted, solid: p('#64748B', '#A7B4C2'), soft: p('#DBE5E3', '#2A3B4C') },
    },
    domains: {
      water: {
        gradient: p(['#E3F1FE', '#C9E4FD'], ['#1D3A54', '#16293D']),
        accent: p('#3D9BEF', '#7CC2FF'),
        text: p('#102A33', '#F3F6F8'),
        muted: p('#1F5C94', '#B9DBFA'),
        tone: 'sky',
      },
      medication: {
        gradient: p(['#FFEDE8', '#FFD9CF'], ['#43302F', '#2E2328']),
        accent: p('#E8735F', '#FF9C8A'),
        text: p('#102A33', '#F3F6F8'),
        muted: p('#8E3F31', '#FFC9BE'),
        tone: 'coral',
      },
      mood: {
        gradient: p(['#F1EEFF', '#DDD7FF'], ['#2E3358', '#22273F']),
        accent: p('#7B6CF0', '#A99DFF'),
        text: p('#102A33', '#F3F6F8'),
        muted: p('#5446B8', '#D3CCFF'),
        tone: 'lavender',
      },
      sleep: {
        gradient: p(['#EBEDFD', '#D5D9FB'], ['#272F58', '#1D2440']),
        accent: p('#5B63D6', '#8C93FF'),
        text: p('#102A33', '#F3F6F8'),
        muted: p('#454CB8', '#C9CCFF'),
        tone: 'lavender',
      },
      activity: {
        gradient: p(['#E2F8F0', '#C6F0E0'], ['#1B4443', '#152E33']),
        accent: p('#23A989', '#5ED9B5'),
        text: p('#102A33', '#F3F6F8'),
        muted: p('#146650', '#B4EEDC'),
        tone: 'mint',
      },
      food: {
        gradient: p(['#FFF5DB', '#FFE7AE'], ['#423A24', '#2E2A20']),
        accent: p('#C98A12', '#F6D27A'),
        text: p('#102A33', '#F3F6F8'),
        muted: p('#75500A', '#F2E2B0'),
        tone: 'yellow',
      },
      contact: {
        gradient: p(['#E0F6F3', '#C2ECE7'], ['#15434A', '#122E38']),
        accent: p('#1FA9A0', '#2BC4B4'),
        text: p('#102A33', '#F3F6F8'),
        muted: p('#126460', '#A8E6DE'),
        tone: 'mint',
      },
      followUp: {
        gradient: p(['#FFF5DB', '#FFE7AE'], ['#423A24', '#2E2A20']),
        accent: p('#C98A12', '#F6D27A'),
        text: p('#102A33', '#F3F6F8'),
        muted: p('#75500A', '#F2E2B0'),
        tone: 'yellow',
      },
    },
    // V5: mosaicos vivos (degradado del dominio con glifo blanco), iguales en claro y oscuro: el color ES el dominio.
    tiles: Object.fromEntries(
      Object.entries({
        water: ['#3792E6', '#2470D8'],
        medication: ['#EE6A55', '#D9483A'],
        mood: ['#8B7CF6', '#6A55E0'],
        sleep: ['#6B73E8', '#4347C4'],
        activity: ['#1FA385', '#0E8072'],
        food: ['#C97D0A', '#A86404'],
        contact: ['#1A9C94', '#0E7F86'],
        followUp: ['#C97D0A', '#A86404'],
        petrol: ['#236A78', '#174A59'],
        slate: ['#7C8B97', '#5B6B73'],
      } satisfies Record<Domain | 'petrol' | 'slate', [string, string]>).map(([k, g]) => [k, { bg: g[1], fg: '#FFFFFF', gradient: g }]),
    ) as unknown as Theme['tiles'],
    status: {
      ok: { bg: p('#E6F5ED', '#1B3A3C'), border: p('#BFE6D0', '#255A4F'), accent: p('#2E9E64', '#4AD395'), text: p('#102A33', '#F3F6F8'), muted: p('#1F5E40', '#B7E9CF') },
      attention: { bg: p('#FDF4DD', '#3B321C'), border: p('#F1DDA6', '#6E5A27'), accent: p('#C98A12', '#F6D27A'), text: p('#102A33', '#FFF4D6'), muted: p('#6B4E0A', '#EEDCA8') },
      action: { bg: p('#FDEDE9', '#40262B'), border: p('#F5C9BF', '#6E3B42'), accent: p('#D64545', '#FF9C8A'), text: p('#102A33', '#FFECE7'), muted: p('#8A3A2C', '#FFC9BD') },
      none: { bg: p('#EDF3F2', '#1B2B3A'), border: p('#DCE6E4', '#2A3B4C'), accent: p('#5B6B73', '#A7B4C2'), text: p('#102A33', '#F3F6F8'), muted: p('#5B6B73', '#A7B4C2') },
    },
    gradients: {
      // V4.4: turquesa → petróleo en claro (blanco 4,75 y 6,8:1); turquesa → cian en oscuro (texto petróleo ≥ 6:1).
      primary: p(['#12807F', '#0B5F73'], ['#3FD6C2', '#1FB5C8']),
      coral: [c.coralCta, c.coralCtaEnd],
      welcome: p(['#F6F9F8', '#E9F6F2'], ['#08121B', '#0D1B28']),
      screen: p(['#EEF7F4', '#F1F4FA'], ['#0B1825', '#08121B']),
      // V5: Plus gana una parada índigo (premium) antes del turquesa.
      plus: p(['#1F2A6B', '#16527A', '#1FA9A0'], ['#151B45', '#123D5A', '#1B8C86']),
    },
    bright: {
      mint: ['#7BE3C4', '#3CCBA0'],
      coral: ['#FFB3A4', '#FF8571'],
      lavender: ['#C2B8FF', '#9C8CF8'],
      sky: ['#9AD0FF', '#5FB0F7'],
      yellow: ['#FFDD85', '#F4BE3C'],
      red: ['#FFB0B0', '#F27C7C'],
      petrol: ['#7BE3C4', '#3CCBA0'],
      slate: ['#DDE7E5', '#C6D3D0'],
    },
    onBright: '#102A33',
    shadow: {
      // Oscuro (V4.4): sombras negras reales; sobre #08121B dan la profundidad que antes faltaba.
      soft: dark ? { boxShadow: `${sh(1, 2, 0.3)}, ${sh(4, 14, 0.28)}` } : { boxShadow: `${sh(1, 2, 0.04)}, ${sh(4, 12, 0.06)}` },
      elevated: dark ? { boxShadow: `${sh(2, 4, 0.3)}, ${sh(10, 28, 0.42)}` } : { boxShadow: `${sh(1, 2, 0.04)}, ${sh(8, 24, 0.1)}` },
      hero: dark ? { boxShadow: `${sh(2, 4, 0.3)}, ${sh(10, 28, 0.42)}` } : { boxShadow: `${sh(1, 2, 0.04)}, ${sh(8, 24, 0.1)}` },
      sheet: dark ? { boxShadow: sh(16, 40, 0.5) } : { boxShadow: `${sh(2, 6, 0.05)}, ${sh(16, 40, 0.14)}` },
      glow: {
        mint: glow('33, 173, 139'),
        coral: glow('242, 140, 122'),
        lavender: glow('139, 124, 246'),
        sky: glow('31, 111, 196'),
        yellow: glow('244, 201, 93'),
        red: glow('232, 108, 108'),
        petrol: dark ? {} : { boxShadow: `${sh(1, 2, 0.04)}, ${sh(4, 12, 0.06)}` },
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
    tertiary: fg,
    border: fg,
    accent: fg,
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
    tiles: Object.fromEntries((['water', 'medication', 'mood', 'sleep', 'activity', 'food', 'contact', 'followUp', 'petrol', 'slate'] as const).map((k) => [k, { bg, fg, gradient: flat(bg) }])) as Theme['tiles'],
    status: Object.fromEntries((['ok', 'attention', 'action', 'none'] as const).map((k) => [k, { bg, border: fg, accent: k === 'action' ? red : k === 'ok' ? green : fg, text: fg, muted: fg }])) as Theme['status'],
    gradients: { primary: flat(fg), coral: flat(fg), welcome: flat(bg), screen: flat(bg), plus: flat(bg) },
    bright: Object.fromEntries((['mint', 'coral', 'lavender', 'sky', 'yellow', 'red', 'petrol', 'slate'] as const).map((k) => [k, flat(fg)])) as Theme['bright'],
    onBright: bg,
    shadow: {
      soft: none,
      elevated: none,
      hero: none,
      sheet: none,
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
export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, screen: 20, section: 28 } as const;

/** V4.3: tarjeta 20, destacada 28, botón y campo 16, compacto 12, chip redondo, hoja 28 arriba. */
export const radius = {
  sm: 12,
  icon: 16,
  iconLg: 20,
  md: 16,
  input: 16,
  button: 16,
  compact: 12,
  tile: 12,
  card: 20,
  cardLg: 28,
  hero: 28,
  modal: 28,
  pill: 999,
} as const;

/**
 * Alturas MÍNIMAS (crecen con el texto). V4: todo botón estándar mide al menos 56; `compact` (44) solo para acciones
 * secundarias como Editar; `elder` = acciones del adulto mayor; `orb` = botón central de BUDDY en la barra.
 */
export const touch = { min: 48, chip: 44, compact: 40, secondary: 56, primary: 56, elder: 72, elderMin: 64, timeRow: 56, tabBar: 72, orb: 64, tile: 44 } as const;

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
  display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24 },
  secondary: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  secondaryStrong: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: fonts.extrabold, fontSize: 13, lineHeight: 18 },
  eyebrow: { fontFamily: fonts.extrabold, fontSize: 12, lineHeight: 16, letterSpacing: 1.4, textTransform: 'uppercase' },
  meta: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  /** Etiquetas de la barra inferior (V4: 13, siempre visibles). */
  tab: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16 },
  number: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] },
  button: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
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
  /** Tarjetas y filas. */
  pressScaleCard: 0.98,
  /** Resorte del toque (amortiguación 15, rigidez 300) y de lo que el usuario arrastra. */
  spring: { damping: 15, stiffness: 300, mass: 1 },
  springSoft: { damping: 11, stiffness: 140, mass: 1 },
  /** Entradas escalonadas: 40 ms entre elementos, máximo 6. */
  stagger: 40,
  staggerMax: 6,
  enter: 320,
  feedback: 160,
  change: 280,
  /** Pantallas 280, hojas 320, pestañas 180; con "reducir movimiento", solo fundidos de 150 ms. */
  screen: 280,
  sheet: 320,
  tab: 180,
  reduced: 150,
  countUp: 600,
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
  reminder: legacy.dark ? ['#36262A', '#55322F'] : ['#FFF3EE', '#FFD9CF'],
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
  onboardingCoral: legacy.dark ? ['#36262A', '#55322F'] : ['#FFF1ED', '#FFDCD4'],
  water: legacy.dark ? ['#1B6DC4', '#7CC2FF'] : ['#7BC8FF', '#63B3FF'],
  progress: [legacy.c.mintStrong, legacy.c.mint],
  bars: [legacy.c.lavender, legacy.dark ? '#6A5FD0' : '#C8C1FF'],
  barsMint: [legacy.c.mintStrong, legacy.c.mint],
  pillCoral: ['#FF756D', '#FFAB9D'],
  pillBlue: ['#3EB6E8', '#82DCF4'],
  pillYellow: ['#F3B427', '#FFDF75'],
} as const satisfies Record<string, Gradient>;
export type GradientName = keyof typeof gradients;
