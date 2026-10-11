/**
 * BUDDY — tokens de diseño v2. Única fuente de color, tipografía, espaciado, radios, alturas, sombras y movimiento.
 * Ver docs/DESIGN_SYSTEM.md (tokens, decisiones y contrastes medidos).
 *
 * Modo oscuro: cada token tiene un valor oscuro DISEÑADO (no invertido). El esquema se lee del sistema al
 * arrancar, antes de que se creen los StyleSheet, así todas las pantallas lo heredan sin cambiar su código.
 * ponytail: el tema se fija al abrir la app; si el usuario cambia claro/oscuro con la app abierta se aplica
 * al volver a abrirla. Para cambio en caliente: migrar los StyleSheet a un hook useTheme().
 */
import { Appearance, type TextStyle, type ViewStyle } from 'react-native';

export const scheme: 'light' | 'dark' = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
export const isDark = scheme === 'dark';
const pick = <T,>(light: T, dark: T): T => (isDark ? dark : light);

const LIGHT = {
  petrol: '#174A59',
  petrolDeep: '#0D3946',
  petrolMid: '#0D5E6D',
  petrolSoft: '#236A78',
  mint: '#5ED9B5',
  mintDark: '#21AD8B',
  mintDeep: '#178C6F', // fondo de IconButton menta: icono blanco ≥ 3:1
  mintPale: '#E9FAF4',
  mintBorder: '#CCEFE4',
  warm: '#F8FAF8', // fondo
  white: '#FFFFFF', // superficie (en oscuro, superficie oscura)
  slate: '#64748B',
  slatePale: '#EEF3F3', // superficie 2
  coral: '#F28C7A',
  coralPale: '#FFF0EC',
  coralBorder: '#FFD7D0',
  lavender: '#8B7CF6',
  lavenderPale: '#F0EDFF',
  yellow: '#F4C95D',
  yellowPale: '#FFF5D7',
  sky: '#63B3FF',
  skyPale: '#EAF5FF',
  success: '#33C27F',
  successPale: '#E7F8F1',
  red: '#E86C6C',
  redPale: '#FFEDED',
  line: 'rgba(23, 74, 89, 0.08)',
  segment: '#EDF3F2',
  ghostBorder: '#A8BDC2',
  night: '#28245F',
  nightSoft: '#6257C7',
  nightText: '#C9C3FF',
  moon: '#F9DA72',
  map: '#E6F0E7',
  mapPark: '#D8ECDA',
  scrim: 'rgba(13, 57, 70, 0.45)',
  glass: 'rgba(255, 255, 255, 0.86)',
  orbMint: '#5ED9B5',
  orbLavender: '#8B7CF6',
  orbCoral: '#F28C7A',
  dotIdle: '#CDD9D6',
  timeline: '#C8D6D2',
  glassBorder: '#B9D9EF',
  waterTrack: '#C5DDED',
  logoutBorder: '#F1C2BD',
  levelIdle: '#DBE5E3',
  dashedMint: '#B7D2CB',
  notice: '#EEF5F3',
  pillWarm: '#FFF7F3',
  switchOff: '#C9D6D3',
  /** Sombras: siempre petróleo, nunca gris genérico. */
  shadowInk: '23, 74, 89',
};

const DARK: typeof LIGHT = {
  petrol: '#1F6E7E', // acción principal en oscuro: texto blanco 5.7:1
  petrolDeep: '#F2F8F7',
  petrolMid: '#13808F',
  petrolSoft: '#2A7F8E',
  mint: '#5ED9B5',
  mintDark: '#21AD8B',
  mintDeep: '#178C6F',
  mintPale: '#123F3D',
  mintBorder: 'rgba(94, 217, 181, 0.28)',
  warm: '#0A2630',
  white: '#103340',
  slate: '#A9C0C6',
  slatePale: '#16424F',
  coral: '#FF9C8A',
  coralPale: '#3A2420',
  coralBorder: '#5A3128',
  lavender: '#A99DFF',
  lavenderPale: '#2A2560',
  yellow: '#F6D27A',
  yellowPale: '#3B3216',
  sky: '#7CC2FF',
  skyPale: '#123A5C',
  success: '#4AD395',
  successPale: '#12402F',
  red: '#FF8585',
  redPale: '#4A2226',
  line: 'rgba(255, 255, 255, 0.08)',
  segment: '#16424F',
  ghostBorder: 'rgba(242, 248, 247, 0.32)',
  night: '#14123D',
  nightSoft: '#3B3391',
  nightText: '#C9C3FF',
  moon: '#F9DA72',
  map: '#163F3E',
  mapPark: '#1C4C47',
  scrim: 'rgba(2, 14, 18, 0.66)',
  glass: 'rgba(16, 51, 64, 0.88)',
  orbMint: '#5ED9B5',
  orbLavender: '#A99DFF',
  orbCoral: '#FF9C8A',
  dotIdle: '#3A5C66',
  timeline: '#2E5561',
  glassBorder: 'rgba(124, 194, 255, 0.3)',
  waterTrack: '#1E4A66',
  logoutBorder: '#5A3128',
  levelIdle: '#234E5A',
  dashedMint: '#2E6B5E',
  notice: '#16424F',
  pillWarm: '#3A2420',
  switchOff: '#3A5C66',
  shadowInk: '0, 0, 0',
};

export const palette = pick(LIGHT, DARK);

/** Colores de texto/icono con contraste ≥ 4.5:1 medido sobre su fondo pálido (ver DESIGN_SYSTEM.md). */
export const ink = pick(
  {
    text: '#0D3946',
    title: '#0D3946',
    muted: '#56657A', // slate oscurecido: ≥ 4.5:1 incluso sobre lavanda pálida
    inverse: '#FFFFFF',
    onCoral: '#0D3946', // texto sobre el CTA coral (el blanco no llega a 4.5:1)
    mint: '#127A62',
    coral: '#B9433D',
    lavender: '#5B4BD0',
    sky: '#1F6FAE',
    yellow: '#7A5A0C',
    success: '#0F7A55',
    red: '#C2413F',
    info: '#24778E',
  },
  {
    text: '#F2F8F7',
    title: '#F2F8F7',
    muted: '#A9C0C6',
    inverse: '#FFFFFF',
    onCoral: '#0D3946', // texto sobre el CTA coral (el blanco no llega a 4.5:1)
    mint: '#5ED9B5',
    coral: '#FF9C8A',
    lavender: '#B9AFFF',
    sky: '#7CC2FF',
    yellow: '#F6D27A',
    success: '#4AD395',
    red: '#FF8585',
    info: '#7FD3E3',
  },
);

export const colors = {
  ...palette,
  background: palette.warm,
  surface: palette.white,
  surface2: palette.slatePale,
  text: ink.text,
  textMuted: ink.muted,
  border: palette.line,
} as const;

/** Familias de tono reutilizadas por tarjetas, iconos, chips y estados. */
export type Tone = 'mint' | 'coral' | 'lavender' | 'sky' | 'yellow' | 'red' | 'petrol' | 'slate';

export const tones: Record<Tone, { bg: string; fg: string; solid: string; soft: string }> = {
  mint: { bg: palette.mintPale, fg: ink.mint, solid: palette.mint, soft: pick('#D2F5E9', '#1A5A50') },
  coral: { bg: palette.coralPale, fg: ink.coral, solid: palette.coral, soft: pick('#FFD8D0', '#5A3128') },
  lavender: { bg: palette.lavenderPale, fg: ink.lavender, solid: palette.lavender, soft: pick('#DDD8FF', '#3A3478') },
  sky: { bg: palette.skyPale, fg: ink.sky, solid: palette.sky, soft: pick('#D4EBFF', '#1B4E80') },
  yellow: { bg: palette.yellowPale, fg: ink.yellow, solid: palette.yellow, soft: pick('#FFEDAA', '#5A4A1C') },
  red: { bg: palette.redPale, fg: ink.red, solid: palette.red, soft: pick('#FFD6D6', '#5A2A2E') },
  petrol: { bg: pick('#E8F0F1', '#16424F'), fg: pick('#174A59', '#F2F8F7'), solid: palette.petrol, soft: pick('#D3E2E5', '#1F5563') },
  slate: { bg: palette.slatePale, fg: ink.muted, solid: palette.slate, soft: pick('#DBE5E3', '#234E5A') },
};

/**
 * Lenguaje de color por dominio: degradado de fondo, acento, texto sobre el degradado y botón tonal.
 * Agua azul, medicamento cálido, ánimo lavanda, sueño índigo, actividad menta, seguimiento ámbar.
 */
export type Domain = 'water' | 'medication' | 'mood' | 'sleep' | 'activity' | 'followUp';

export const domains: Record<Domain, { gradient: readonly [string, string, ...string[]]; accent: string; text: string; muted: string; tone: Tone }> = {
  water: {
    gradient: pick(['#BDE3FF', '#5BB2FF', '#1F6FC4'], ['#0E3F73', '#1B6DC4']),
    accent: pick('#1F6FC4', '#7CC2FF'),
    text: pick('#0B3A66', '#FFFFFF'),
    muted: pick('#174E80', '#D6EBFF'),
    tone: 'sky',
  },
  medication: {
    gradient: pick(['#FFF3EE', '#FFD9CF', '#F28C7A'], ['#3A2420', '#5A3128']),
    accent: pick('#F28C7A', '#FF9C8A'),
    text: pick('#4A1E16', '#FFF3EE'),
    muted: pick('#7A3326', '#FFD3C9'),
    tone: 'coral',
  },
  mood: {
    gradient: pick(['#F0EDFF', '#DCD6FF'], ['#2A2560', '#4A3FA8']),
    accent: pick('#8B7CF6', '#A99DFF'),
    text: pick('#2A2366', '#F4F2FF'),
    muted: pick('#4B3FB0', '#D9D3FF'),
    tone: 'lavender',
  },
  sleep: {
    gradient: pick(['#28245F', '#6257C7'], ['#14123D', '#3B3391']),
    accent: '#C9C3FF',
    text: '#FFFFFF',
    muted: '#DCD8FF',
    tone: 'lavender',
  },
  activity: {
    gradient: pick(['#E9FAF4', '#BDF0DF'], ['#0F4A44', '#17695F']),
    accent: pick('#21AD8B', '#5ED9B5'),
    text: pick('#0D3946', '#F2F8F7'),
    muted: pick('#155E4E', '#C4F2E3'),
    tone: 'mint',
  },
  followUp: {
    gradient: pick(['#FFF5D7', '#FFEDB8'], ['#3B3216', '#4A3E17']),
    accent: pick('#F4C95D', '#F6D27A'),
    text: pick('#7A5A0C', '#F6D27A'),
    muted: pick('#7A5A0C', '#E8CF8F'),
    tone: 'yellow',
  },
};

/** Degradados (inicio → fin). 135° = start {0,0} → end {1,1}. */
export const gradients = {
  primary: pick(['#174A59', '#0D5E6D'], ['#1F6E7E', '#13808F']),
  /**
   * CTA coral de la bienvenida: el coral de marca con texto petróleo profundo (5.1:1 en el extremo más claro).
   * El texto blanco sobre #F28C7A → #FF776B solo llega a 2.4:1, así que no se usa blanco.
   */
  coral: pick(['#F7A08F', '#FF776B'], ['#FF9C8A', '#FF8577']),
  petrolCard: [palette.petrol, palette.petrolSoft],
  welcome: pick(['#FBFDFB', '#E9FAF4'], ['#0A2630', '#0D3540']),
  screen: pick(['#FBFCFA', '#F8FAF8'], ['#0B2833', '#0A2630']),
  chat: pick(['#F3FBF8', '#F8FAF8'], ['#0D2F38', '#0A2630']),
  reminder: pick(['#FFF3EE', '#FFD9CF'], ['#3A2420', '#5A3128']),
  nextMed: [palette.white, pick('#F5FBF8', '#12394A')],
  feeling: [palette.lavenderPale, palette.white],
  mood: [palette.lavenderPale, pick('#FAF9FF', '#1E1F4A')],
  wellness: pick(['#DAF8EE', '#F4FFF9'], ['#0F4A44', '#0B3238']),
  hydration: pick(['#E9F5FF', '#F8FCFF'], ['#0E3F73', '#0D2F45']),
  achievement: pick(['#FFF3CF', '#FFFAF0'], ['#3B3216', '#2A2A1A']),
  sleep: [palette.night, palette.nightSoft],
  caregiverCard: [palette.white, pick('#FFF8F5', '#163A47')],
  voice: [palette.mintDark, palette.petrol],
  onboardingMint: pick(['#E9FAF4', '#BDF0DF'], ['#0F4A44', '#17695F']),
  onboardingLavender: pick(['#F0EDFF', '#DCD6FF'], ['#2A2560', '#4A3FA8']),
  onboardingCoral: pick(['#FFF1ED', '#FFDCD4'], ['#3A2420', '#5A3128']),
  water: pick(['#7BC8FF', '#63B3FF'], ['#1B6DC4', '#7CC2FF']),
  progress: [palette.mintDark, palette.mint],
  bars: [palette.lavender, pick('#C8C1FF', '#6A5FD0')],
  barsMint: [palette.mintDark, palette.mint],
  pillCoral: ['#FF756D', '#FFAB9D'],
  pillBlue: ['#3EB6E8', '#82DCF4'],
  pillYellow: ['#F3B427', '#FFDF75'],
} as const satisfies Record<string, readonly [string, string, ...string[]]>;

export type GradientName = keyof typeof gradients;

/** Base de 4 pt. `screen` = margen lateral; `section` = separación entre secciones. */
export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, screen: 24, section: 28 } as const;

export const radius = {
  sm: 12,
  icon: 16, // contenedor de icono de 48
  iconLg: 20, // contenedor de 56–64
  md: 16,
  input: 18,
  button: 20,
  card: 24,
  cardLg: 24,
  hero: 32,
  modal: 28, // hoja inferior (arriba)
  pill: 999,
} as const;

/** Alturas mínimas: crecen con el texto. `elder` = acciones del adulto mayor. */
export const touch = { min: 48, chip: 44, secondary: 52, primary: 60, elder: 72, timeRow: 56, tabBar: 72 } as const;

const ink8 = `rgba(${palette.shadowInk}, `;
/**
 * Sombras en petróleo. En Android `boxShadow` de color se ve distinto: por eso las superficies llevan además
 * el borde de 1 px (`border.hairline`) y no dependen de la sombra para separarse del fondo.
 */
export const shadow = {
  soft: { boxShadow: `0px 2px 6px ${ink8}${isDark ? 0.3 : 0.06}), 0px 10px 28px ${ink8}${isDark ? 0.35 : 0.1})` },
  elevated: { boxShadow: `0px 2px 6px ${ink8}${isDark ? 0.3 : 0.06}), 0px 14px 34px ${ink8}${isDark ? 0.4 : 0.12})` },
  hero: { boxShadow: `0px 18px 40px ${ink8}${isDark ? 0.45 : 0.18})` },
  petrol: { boxShadow: `0px 10px 20px rgba(23, 74, 89, ${isDark ? 0.5 : 0.28})` },
  coral: { boxShadow: '0px 10px 20px rgba(242, 140, 122, 0.28)' },
  mint: { boxShadow: '0px 10px 20px rgba(33, 173, 139, 0.28)' },
  sky: { boxShadow: '0px 10px 20px rgba(31, 111, 196, 0.28)' },
  lavender: { boxShadow: '0px 10px 20px rgba(139, 124, 246, 0.28)' },
  night: { boxShadow: '0px 15px 30px rgba(77, 67, 156, 0.28)' },
} as const satisfies Record<string, ViewStyle>;

export const border = {
  hairline: { borderWidth: 1, borderColor: palette.line },
} as const satisfies Record<string, ViewStyle>;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/**
 * Escala tipográfica (Manrope). Ningún texto esencial baja de 14; `eyebrow` y `meta` (12) solo para
 * información complementaria. `heroXL`/`heroL`: números protagonistas (hora, vasos, porcentajes).
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
  number: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] },
  button: { fontFamily: fonts.extrabold, fontSize: 18, lineHeight: 24 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Tope de escalado del sistema por variante: los números héroe no pueden romper su tarjeta. */
export const maxFontScale: Partial<Record<TypeVariant, number>> = { heroXL: 1.3, heroL: 1.4, display: 1.6 };

/** Tamaño de texto elegido en Perfil > Accesibilidad; se multiplica sobre la escala del sistema. */
export const textScales = { normal: 1, large: 1.15, xlarge: 1.3 } as const;
export type TextScale = keyof typeof textScales;

/**
 * Movimiento. Objetivos de diseño, no mediciones: feedback 120–180 ms, cambio de componente 220–360 ms,
 * celebraciones breves y no bloqueantes; bienvenida ≤ ~3 s y saltable.
 */
export const motion = {
  pressScale: 0.97,
  spring: { damping: 16, stiffness: 260, mass: 0.6 },
  /** Aterrizaje del robot y llenados con rebote. */
  springSoft: { damping: 11, stiffness: 140, mass: 1 },
  stagger: 60,
  enter: 320,
  feedback: 160,
  change: 280,
  countUp: 700,
} as const;
