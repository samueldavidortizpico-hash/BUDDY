/**
 * BUDDY — tokens de diseño. Única fuente de color, tipografía, espaciado, radios, sombras y movimiento.
 * Paleta del documento + derivados del prototipo de Figma (docs/figma-referencia/src/index.css).
 * Los tonos de `ink` son variantes oscurecidas para alcanzar contraste AA (ver docs/ACCESSIBILITY_AUDIT.md).
 */
import type { TextStyle, ViewStyle } from 'react-native';

export const palette = {
  petrol: '#174A59',
  petrolDeep: '#0D3946',
  petrolMid: '#0D5E6D',
  petrolSoft: '#236A78',
  mint: '#5ED9B5',
  mintDark: '#21AD8B',
  mintDeep: '#178C6F', // fondo de IconButton menta: icono blanco ≥ 3:1
  mintPale: '#E9FAF4',
  mintBorder: '#CCEFE4',
  warm: '#F8FAF8',
  white: '#FFFFFF',
  slate: '#64748B',
  slatePale: '#EEF3F3',
  coral: '#F28C7A',
  coralPale: '#FFF0EC',
  coralBorder: '#FFD7D0',
  lavender: '#8B7CF6',
  lavenderPale: '#F0EDFF',
  yellow: '#F4C95D',
  yellowPale: '#FFF5D3',
  sky: '#63B3FF',
  skyPale: '#EAF5FF',
  success: '#33C27F',
  successPale: '#E7F8F1',
  red: '#E86C6C',
  redPale: '#FFEDED',
  line: '#E4ECE9',
  segment: '#EDF3F2',
  ghostBorder: '#A8BDC2',
  night: '#28245F',
  nightSoft: '#6257C7',
  nightText: '#C9C3FF',
  moon: '#F9DA72',
  map: '#E6F0E7',
  mapPark: '#D8ECDA',
  scrim: 'rgba(13, 57, 70, 0.45)',
  glass: 'rgba(255, 255, 255, 0.92)',
} as const;

/** Colores de texto/icono con contraste verificado sobre su fondo pálido correspondiente. */
export const ink = {
  text: palette.petrol,
  title: palette.petrolDeep,
  muted: '#56657A', // slate oscurecido: ≥ 4.5:1 incluso sobre lavanda pálida
  inverse: palette.white,
  mint: '#127A62',
  coral: '#B9433D',
  lavender: '#5B4BD0',
  sky: '#1F6FAE',
  yellow: '#86620C',
  success: '#0F7A55',
  red: '#C2413F',
  info: '#24778E',
} as const;

export const colors = {
  ...palette,
  background: palette.warm,
  surface: palette.white,
  text: ink.text,
  textMuted: ink.muted,
  border: palette.line,
} as const;

/** Familias de tono reutilizadas por tarjetas, iconos, chips y estados. */
export type Tone = 'mint' | 'coral' | 'lavender' | 'sky' | 'yellow' | 'red' | 'petrol' | 'slate';

export const tones: Record<Tone, { bg: string; fg: string; solid: string; soft: string }> = {
  mint: { bg: palette.mintPale, fg: ink.mint, solid: palette.mint, soft: '#D2F5E9' },
  coral: { bg: palette.coralPale, fg: ink.coral, solid: palette.coral, soft: '#FFD8D0' },
  lavender: { bg: palette.lavenderPale, fg: ink.lavender, solid: palette.lavender, soft: '#DDD8FF' },
  sky: { bg: palette.skyPale, fg: ink.sky, solid: palette.sky, soft: '#D4EBFF' },
  yellow: { bg: palette.yellowPale, fg: ink.yellow, solid: palette.yellow, soft: '#FFEDAA' },
  red: { bg: palette.redPale, fg: ink.red, solid: palette.red, soft: '#FFD6D6' },
  petrol: { bg: '#E8F0F1', fg: palette.petrol, solid: palette.petrol, soft: '#D3E2E5' },
  slate: { bg: palette.slatePale, fg: ink.muted, solid: palette.slate, soft: '#DBE5E3' },
};

/** Degradados (inicio → fin). 135° = start {0,0} → end {1,1}. */
export const gradients = {
  primary: [palette.petrol, palette.petrolMid],
  // CTA coral oscurecido: el coral del Figma (#F28C7A → #FF776B) da 2.4:1 con texto blanco.
  coral: ['#C24E3B', '#B84A3A'],
  petrolCard: [palette.petrol, palette.petrolSoft],
  welcome: ['#FBFDFB', '#F5FBF8'],
  screen: ['#FBFCFA', palette.warm],
  chat: ['#F3FBF8', palette.warm],
  reminder: ['#E5FAF3', palette.warm],
  nextMed: [palette.white, '#F5FBF8'],
  feeling: ['#F1EEFF', palette.white],
  mood: [palette.lavenderPale, '#FAF9FF'],
  wellness: ['#DAF8EE', '#F4FFF9'],
  hydration: ['#E9F5FF', '#F8FCFF'],
  achievement: ['#FFF3CF', '#FFFAF0'],
  sleep: [palette.night, palette.nightSoft],
  caregiverCard: [palette.white, '#FFF8F5'],
  voice: [palette.mintDark, palette.petrol],
  onboardingMint: ['#DFF9F1', '#BDF0DF'],
  onboardingLavender: ['#F0EDFF', '#DCD6FF'],
  onboardingCoral: ['#FFF1ED', '#FFDCD4'],
  water: ['#7BC8FF', palette.sky],
  progress: [palette.mintDark, palette.mint],
  bars: [palette.lavender, '#C8C1FF'],
  barsMint: [palette.mintDark, palette.mint],
  pillCoral: ['#FF756D', '#FFAB9D'],
  pillBlue: ['#3EB6E8', '#82DCF4'],
  pillYellow: ['#F3B427', '#FFDF75'],
} as const satisfies Record<string, readonly [string, string]>;

export type GradientName = keyof typeof gradients;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 } as const;

export const radius = { sm: 12, md: 16, button: 18, card: 22, cardLg: 25, modal: 28, pill: 999 } as const;

export const touch = { min: 48, primary: 56 } as const;

export const shadow = {
  soft: { boxShadow: '0px 5px 18px rgba(23, 74, 89, 0.08)' },
  elevated: { boxShadow: '0px 12px 34px rgba(23, 74, 89, 0.10)' },
  petrol: { boxShadow: '0px 10px 20px rgba(23, 74, 89, 0.24)' },
  coral: { boxShadow: '0px 10px 20px rgba(194, 78, 59, 0.28)' },
  mint: { boxShadow: '0px 7px 16px rgba(33, 173, 139, 0.24)' },
  hero: { boxShadow: '0px 28px 60px rgba(23, 74, 89, 0.20)' },
  night: { boxShadow: '0px 15px 30px rgba(77, 67, 156, 0.22)' },
} as const satisfies Record<string, ViewStyle>;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/**
 * Escala tipográfica con mínimos para adultos mayores (el Figma usa 7–12 px en muchos textos).
 * Ningún texto esencial baja de 14; `meta` (12) solo para horas de mensajes y metadatos.
 */
export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -1 },
  h1: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.8 },
  h2: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  h3: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  body: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 26 },
  bodyStrong: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 26 },
  secondary: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23 },
  secondaryStrong: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 23 },
  caption: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  captionStrong: { fontFamily: fonts.extrabold, fontSize: 14, lineHeight: 20 },
  eyebrow: { fontFamily: fonts.extrabold, fontSize: 12, lineHeight: 16, letterSpacing: 1.4 },
  meta: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  number: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] },
  button: { fontFamily: fonts.extrabold, fontSize: 18, lineHeight: 24 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Tamaño de texto elegido en Perfil > Accesibilidad; se multiplica sobre la escala del sistema. */
export const textScales = { normal: 1, large: 1.15, xlarge: 1.3 } as const;
export type TextScale = keyof typeof textScales;

export const motion = {
  pressScale: 0.97,
  spring: { damping: 16, stiffness: 260, mass: 0.6 },
  stagger: 60,
  enter: 320,
} as const;
