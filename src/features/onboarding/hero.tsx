/**
 * Presentaciones de la primera apertura (V5.2) — "Un día con BUDDY", en seis pasos que recorren el ciclo del producto:
 * presentar → configurar → recordar → confirmar → avisar → tranquilizar.
 *
 * Cada paso es una pantalla inmersiva a todo color (un degradado de la marca que se funde con el siguiente al deslizar)
 * con una escena en capas. BUDDY es el vector de `components/robot/buddy.tsx`, calcado del logo (parpadea, saluda una
 * vez, duerme).
 *
 * Movimiento (solo transform y opacidad, en el hilo de UI). V5.3, más sereno: sin órbitas, confeti ni bucles que se
 * repiten; cada escena cuenta su historia UNA vez al quedar activa y luego descansa en su estado final.
 *  - fuera de pantalla, cada escena queda en su estado final;
 *  - al deslizar, las capas se mueven a distinta velocidad (profundidad), la escena se encoge un poco y el teléfono gira;
 *  - el título entra palabra por palabra cuando la página queda centrada.
 * Con "reducir movimiento": sin paralaje, sin giro, sin bucles; cada escena quieta y el texto ya visible.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useId, type ComponentProps, type ComponentType, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { Buddy } from '@/components/robot/buddy';
import { strings } from '@/i18n';
import type { Domain, Theme, Tone } from '@/theme';
import { useTheme } from '@/theme/provider';

const D = strings.onboarding.demo;
const FAMILY = strings.onboarding.familyCards;
const APP_ICON = require('../../../assets/branding/buddy-splash.png');
/** Lienzo de diseño de cada escena; se escala para caber en el alto disponible. */
const CANVAS = { w: 320, h: 340 };
const PHONE = { w: 168, h: 300 };
const RING = 2 * Math.PI * 15;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Color de cada paso: degradado de arriba abajo (vivo → profundo) y el tono profundo para el texto del botón. El texto
 * blanco va sobre la mitad baja (paradas 0,34 · 0,76), donde todos los pasos dan ≥ 5,5:1.
 */
export const SLIDES = [
  { colors: ['#22B8A9', '#0F8A8C', '#0A4660'], deep: '#0A4660' },
  { colors: ['#4FCB8E', '#168363', '#0A4A3E'], deep: '#0A4A3E' },
  { colors: ['#FF9E7A', '#E4573F', '#8E2B4E'], deep: '#8E2B4E' },
  { colors: ['#63B5FA', '#3A72E0', '#232F86'], deep: '#232F86' },
  { colors: ['#B49BFF', '#6C56E0', '#2A2168'], deep: '#2A2168' },
  { colors: ['#4A5BA8', '#252E72', '#0E1236'], deep: '#0E1236' },
] as const;

/** Colores de las piezas de las escenas. En alto contraste todo sale del tema (sin transparencias ni degradados). */
function look(t: Theme) {
  return t.hc
    ? { screen: t.c.bg, card: t.c.bg, ink: t.c.text, muted: t.c.text, bezel: t.c.text, glass: t.c.bg, edge: t.c.text, onGlass: t.c.text, night: t.c.bg, onNight: t.c.text, mint: t.c.text, onMint: t.c.bg }
    : { screen: '#F4F8F7', card: '#FFFFFF', ink: '#102A33', muted: '#5B6B73', bezel: '#0A1A24', glass: 'rgba(255,255,255,0.2)', edge: 'rgba(255,255,255,0.5)', onGlass: '#FFFFFF', night: '#1B1640', onNight: '#FFFFFF', mint: '#DDF6EF', onMint: '#0B5A4A' };
}
type Look = ReturnType<typeof look>;

// ── Línea de tiempo ──────────────────────────────────────────

function seg(p: number, a: number, b: number) {
  'worklet';
  return interpolate(p, [a, b], [0, 1], Extrapolation.CLAMP);
}
function easeOut(v: number) {
  'worklet';
  return 1 - (1 - v) ** 3;
}
/** Sobrepaso leve al llegar (resorte barato y determinista). */
function backOut(v: number) {
  'worklet';
  const c = 1.70158;
  return 1 + (c + 1) * (v - 1) ** 3 + c * (v - 1) ** 2;
}
/** Desvanecido de cierre antes de que la escena se repita. */
function outro(p: number) {
  'worklet';
  return 1 - seg(p, 0.93, 0.995);
}
/** Entra con rebote entre `a` y `b` (escala 0,6 → 1 y 10 px hacia arriba) y se va en el cierre. */
function pop(p: number, a: number, b: number) {
  'worklet';
  const v = backOut(seg(p, a, b));
  return { opacity: seg(p, a, a + (b - a) * 0.4) * outro(p), transform: [{ translateY: 10 * (1 - v) }, { scale: 0.6 + 0.4 * v }] };
}

/**
 * 0 → `still` UNA vez cada vez que la página queda activa, y ahí se queda (V5.3: la historia se cuenta y la escena
 * descansa; antes se repetía en bucle cada 5 s y se sentía agitada). Fuera de pantalla o con "reducir movimiento",
 * quieta en `still` (estado final).
 */
function useTimeline(active: boolean, duration: number, still = 0.85) {
  const reduce = useReducedMotion();
  const p = useSharedValue(still);
  useEffect(() => {
    if (reduce || !active) {
      cancelAnimation(p);
      p.set(still);
      return;
    }
    p.set(0);
    p.set(withTiming(still, { duration: duration * still, easing: Easing.linear }));
    return () => cancelAnimation(p);
  }, [active, reduce, duration, still, p]);
  return p;
}

/** Vaivén suave 0 ↔ 1 (flotar) mientras la página está activa. */
function useFloat(active: boolean, ms = 2400) {
  const reduce = useReducedMotion();
  const f = useSharedValue(0);
  useEffect(() => {
    if (reduce || !active) {
      cancelAnimation(f);
      return;
    }
    const sine = Easing.inOut(Easing.sin);
    f.set(withRepeat(withSequence(withTiming(1, { duration: ms, easing: sine }), withTiming(0, { duration: ms, easing: sine })), -1));
    return () => cancelAnimation(f);
  }, [active, reduce, ms, f]);
  return f;
}

interface Ctx {
  active: boolean;
  t: Theme;
  L: Look;
  x: SharedValue<number>;
  width: number;
  index: number;
  reduce: boolean;
}

/** Profundidad: cuánto se desplaza una capa al deslizar (las de adelante se mueven más). */
function useDepth({ x, width, index, reduce }: Ctx, factor: number) {
  return useAnimatedStyle(() => {
    const d = reduce ? 0 : x.get() / Math.max(1, width) - index;
    return { transform: [{ translateX: d * width * factor }] };
  });
}

/** El teléfono gira en 3D con el dedo y queda de frente (con su inclinación de reposo) al centrarse la página. */
function usePhoneTurn({ x, width, index, reduce }: Ctx, tilt: number) {
  return useAnimatedStyle(() => {
    const d = reduce ? 0 : x.get() / Math.max(1, width) - index;
    return { transform: [{ perspective: 900 }, { translateX: d * width * 0.28 }, { rotateY: `${d * -38}deg` }, { rotateZ: `${tilt + d * 6}deg` }] };
  });
}

// ── Fondo ────────────────────────────────────────────────────

/** Fondo a toda pantalla: el degradado de cada paso se funde con el siguiente y dos luces derivan despacio. */
export function Backdrop({ x, width }: { x: SharedValue<number>; width: number }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduce || t.hc) return;
    const sine = Easing.inOut(Easing.sin);
    drift.set(withRepeat(withSequence(withTiming(1, { duration: 7000, easing: sine }), withTiming(0, { duration: 7000, easing: sine })), -1));
    return () => cancelAnimation(drift);
  }, [reduce, t.hc, drift]);
  const orbA = useAnimatedStyle(() => ({ transform: [{ translateX: 34 * drift.get() }, { translateY: 26 * drift.get() }] }));
  const orbB = useAnimatedStyle(() => ({ transform: [{ translateX: -28 * drift.get() }, { translateY: -20 * drift.get() }] }));
  if (t.hc) return <View style={[StyleSheet.absoluteFill, { backgroundColor: t.c.bg }]} />;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {SLIDES.map((sl, i) => (
        <Tint key={i} index={i} x={x} width={width} colors={sl.colors} />
      ))}
      <Animated.View style={[styles.orbA, orbA]}>
        <Orb size={380} />
      </Animated.View>
      <Animated.View style={[styles.orbB, orbB]}>
        <Orb size={300} />
      </Animated.View>
      {/* Sombra muy suave abajo: asegura el contraste del texto sobre cualquier punto del degradado. */}
      <LinearGradient colors={['rgba(4,16,28,0)', 'rgba(4,16,28,0.24)']} style={styles.scrim} />
    </View>
  );
}

function Tint({ index, x, width, colors }: { index: number; x: SharedValue<number>; width: number; colors: readonly [string, string, string] }) {
  const style = useAnimatedStyle(() => ({
    opacity: index === 0 ? 1 : interpolate(x.get() / Math.max(1, width), [index - 1, index], [0, 1], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <LinearGradient colors={colors} locations={[0, 0.34, 0.76]} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

/** Luz difusa (degradado radial, sin blur). */
function Orb({ size, color = '#FFFFFF', opacity = 0.26 }: { size: number; color?: string; opacity?: number }) {
  const id = `o${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
    </Svg>
  );
}

// ── Texto ────────────────────────────────────────────────────

/** Título que entra palabra por palabra cuando la página queda centrada. Para el lector de pantalla es una sola frase. */
export function Words({ text, active, color }: { text: string; active: boolean; color: string }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return v.set(1);
    v.set(active ? withDelay(140, withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) })) : withTiming(0, { duration: 120 }));
  }, [active, reduce, v]);
  const words = text.split(' ');
  return (
    <View style={styles.words} accessible accessibilityRole="header" accessibilityLabel={text}>
      {words.map((w, i) => (
        <Word key={`${w}-${i}`} v={v} at={(i / words.length) * 0.55} text={w} color={color} />
      ))}
    </View>
  );
}

function Word({ v, at, text, color }: { v: SharedValue<number>; at: number; text: string; color: string }) {
  const style = useAnimatedStyle(() => {
    const k = interpolate(v.get(), [at, at + 0.45], [0, 1], Extrapolation.CLAMP);
    const e = easeOut(k);
    // Cada palabra sube un poco y aparece, sin rebote ni giro (V5.3: más sereno).
    return { opacity: e, transform: [{ translateY: 14 * (1 - e) }] };
  });
  return (
    <Animated.View style={style}>
      <AppText variant="display" color={color} accessibilityRole="text">
        {text}
      </AppText>
    </Animated.View>
  );
}

/** Aparece (opacidad y 12 px hacia arriba) cuando la página queda centrada. */
export function Reveal({ active, delay = 0, children }: { active: boolean; delay?: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return v.set(1);
    v.set(active ? withDelay(delay, withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) })) : withTiming(0, { duration: 120 }));
  }, [active, reduce, delay, v]);
  const style = useAnimatedStyle(() => ({ opacity: v.get(), transform: [{ translateY: 12 * (1 - v.get()) }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// ── Escena ───────────────────────────────────────────────────

/** Escena de la página `index`: se escala al alto disponible y, al alejarse del centro, se encoge y se desvanece. */
export function Scene({ index, x, width, height, active }: { index: number; x: SharedValue<number>; width: number; height: number; active: boolean }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const scale = Math.min(height / CANVAS.h, (width - 16) / CANVAS.w);
  const fit = useAnimatedStyle(() => {
    const d = reduce ? 0 : Math.abs(x.get() / Math.max(1, width) - index);
    return { opacity: interpolate(d, [0, 0.9], [1, 0], Extrapolation.CLAMP), transform: [{ scale: scale * interpolate(d, [0, 1], [1, 0.86], Extrapolation.CLAMP) }] };
  });
  const Body = SCENES[index];
  return (
    <View style={[styles.stage, { width, height }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.canvas, fit]}>
        <Body active={active} t={t} L={look(t)} x={x} width={width} index={index} reduce={reduce} />
      </Animated.View>
    </View>
  );
}

// ── Piezas ───────────────────────────────────────────────────

function Phone({ L, style, children }: { L: Look; style?: ComponentProps<typeof Animated.View>['style']; children: ReactNode }) {
  return (
    <Animated.View style={[styles.phone, { backgroundColor: L.bezel }, style]}>
      <View style={[styles.screen, { backgroundColor: L.screen }]}>{children}</View>
      <View style={[styles.notch, { backgroundColor: L.bezel }]} />
    </Animated.View>
  );
}

/** Pastilla de vidrio (blanco translúcido con borde claro) sobre el color del paso. */
function Glass({ L, style, children }: { L: Look; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return <View style={[styles.glass, { backgroundColor: L.glass, borderColor: L.edge }, style]}>{children}</View>;
}

function Avatar({ letter, tone, t, size = 46 }: { letter: string; tone: Tone; t: Theme; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.hc ? t.c.bg : t.bright[tone][1], borderColor: t.hc ? t.c.text : '#FFFFFF' }]}>
      <AppText variant="bodyStrong" color={t.hc ? t.c.text : t.onBright} maxScale={1}>
        {letter}
      </AppText>
    </View>
  );
}

const STAR = 'M12 0 C12.8 8 16 11.2 24 12 C16 12.8 12.8 16 12 24 C11.2 16 8 12.8 0 12 C8 11.2 11.2 8 12 0Z';

/** Destello de cuatro puntas que titila con la línea de tiempo. */
function Star({ p, x, y, size, phase, color = '#FFFFFF' }: { p: SharedValue<number>; x: number; y: number; size: number; phase: number; color?: string }) {
  const style = useAnimatedStyle(() => {
    const v = Math.abs(((((p.get() * 3 + phase) % 1) + 1) % 1) * 2 - 1);
    return { opacity: 0.25 + 0.75 * v, transform: [{ scale: 0.6 + 0.5 * v }, { rotate: `${v * 24}deg` }] };
  });
  return (
    <Animated.View style={[styles.abs, { left: x - size / 2, top: y - size / 2 }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={STAR} fill={color} />
      </Svg>
    </Animated.View>
  );
}

/** Anillo que sale de un punto y se desvanece. */
function Ping({ p, x, y, size, color, from, to }: { p: SharedValue<number>; x: number; y: number; size: number; color: string; from: number; to: number }) {
  const style = useAnimatedStyle(() => {
    const v = seg(p.get(), from, to);
    return { opacity: v > 0 && v < 1 ? 0.85 * (1 - v) : 0, transform: [{ scale: 1 + 1.1 * v }] };
  });
  return <Animated.View style={[styles.abs, { left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: color }, style]} />;
}

/** Sombra suave bajo BUDDY que respira con su flotar. */
function Platform({ f, left, top, size }: { f: SharedValue<number>; left: number; top: number; size: number }) {
  const shadow = useAnimatedStyle(() => ({ opacity: 0.45 - 0.1 * f.get(), transform: [{ scaleY: 0.2 }, { scale: 1 - 0.05 * f.get() }] }));
  return <Animated.View style={[styles.abs, { left, top, width: size, height: size, borderRadius: size / 2 }, styles.platformFill, shadow]} />;
}

/** Tres puntos que saltan: "BUDDY está escribiendo". */
function Typing({ p, from, to, color }: { p: SharedValue<number>; from: number; to: number; color: string }) {
  const box = useAnimatedStyle(() => ({ opacity: seg(p.get(), from, from + 0.03) * (1 - seg(p.get(), to - 0.03, to)) }));
  return (
    <Animated.View style={[styles.typing, { backgroundColor: color }, box]}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} p={p} i={i} />
      ))}
    </Animated.View>
  );
}
function Dot({ p, i }: { p: SharedValue<number>; i: number }) {
  const style = useAnimatedStyle(() => {
    const v = Math.sin(((p.get() * 14 - i * 0.18) % 1) * Math.PI * 2);
    return { transform: [{ translateY: -3 * Math.max(0, v) }], opacity: 0.5 + 0.5 * Math.max(0, v) };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

// 1 · Hola, soy BUDDY: saluda una vez sobre su sombra, aparece su globo y, debajo, lo que cuida cada día.
const DAY: { icon: IconName; domain: Domain }[] = [
  { icon: 'meds', domain: 'medication' },
  { icon: 'drop', domain: 'water' },
  { icon: 'moon', domain: 'sleep' },
  { icon: 'smile', domain: 'mood' },
];

function DayTile({ p, i, icon, domain }: { p: SharedValue<number>; i: number; icon: IconName; domain: Domain }) {
  const style = useAnimatedStyle(() => {
    const v = easeOut(seg(p.get(), 0.3 + i * 0.08, 0.5 + i * 0.08));
    return { opacity: v, transform: [{ translateY: 10 * (1 - v) }] };
  });
  return (
    <Animated.View style={style}>
      <IconTile icon={icon} domain={domain} size={44} />
    </Animated.View>
  );
}

function HelloScene(c: Ctx) {
  const { active, t, L } = c;
  const p = useTimeline(active, 3200);
  const f = useFloat(active, 2600);
  const mid = useDepth(c, 0.3);
  const near = useDepth(c, 0.6);
  const bubble = useAnimatedStyle(() => {
    const v = easeOut(seg(p.get(), 0.1, 0.3));
    return { opacity: v, transform: [{ translateY: 8 * (1 - v) }] };
  });
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, mid]}>
        <Platform f={f} left={70} top={150} size={180} />
        <View style={styles.helloRobot}>
          <Buddy size={226} wave active={active} />
        </View>
        <View style={styles.dayRow}>
          {DAY.map((o, i) => (
            <DayTile key={o.domain} p={p} i={i} icon={o.icon} domain={o.domain} />
          ))}
        </View>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, near]}>
        <Animated.View style={[styles.helloBubble, { backgroundColor: L.card }, t.hc && t.hairline, bubble]}>
          <AppText variant="bodyStrong" color={L.ink} maxScale={1}>
            {D.hello}
          </AppText>
        </Animated.View>
      </Animated.View>
    </>
  );
}

// 2 · Lo configuras en minutos: escribes la toma, BUDDY la entiende, la confirmas y queda en la rutina.
function SetupScene(c: Ctx) {
  const { active, t, L } = c;
  const p = useTimeline(active, 6000);
  const f = useFloat(active, 2200);
  const far = useDepth(c, 0.14);
  const near = useDepth(c, 0.62);
  const turn = usePhoneTurn(c, 4);
  const mine = useAnimatedStyle(() => {
    const v = easeOut(seg(p.get(), 0.04, 0.14));
    return { opacity: v * outro(p.get()), transform: [{ translateX: 40 * (1 - v) }] };
  });
  const card = useAnimatedStyle(() => pop(p.get(), 0.34, 0.46));
  const tap = useAnimatedStyle(() => {
    const v = seg(p.get(), 0.54, 0.6) - seg(p.get(), 0.6, 0.66);
    return { transform: [{ scale: 1 - 0.06 * v }] };
  });
  const added = useAnimatedStyle(() => ({ opacity: seg(p.get(), 0.6, 0.66) * outro(p.get()) }));
  const finger = useAnimatedStyle(() => {
    const inV = easeOut(seg(p.get(), 0.46, 0.56));
    const outV = seg(p.get(), 0.66, 0.76);
    const press = seg(p.get(), 0.56, 0.59) - seg(p.get(), 0.6, 0.64);
    return { opacity: Math.min(1, inV * 1.5) * (1 - outV), transform: [{ translateX: 60 * (1 - inV) + 30 * outV }, { translateY: 60 * (1 - inV) + 40 * outV }, { scale: 1 - 0.18 * press }] };
  });
  const chip = useAnimatedStyle(() => pop(p.get(), 0.68, 0.8));
  const tiles = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * f.get() }] }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, far]}>
        <Animated.View style={[styles.setupTileA, tiles]}>
          <IconTile icon="clock" domain="followUp" size={44} />
        </Animated.View>
        <Animated.View style={[styles.setupTileB, tiles]}>
          <IconTile icon="calendar" domain="water" size={38} />
        </Animated.View>
      </Animated.View>
      <Phone L={L} style={[styles.phoneRight, turn]}>
        <View style={styles.chat}>
          <View style={styles.chatHead}>
            <View style={[styles.chatAvatar, { backgroundColor: L.mint }]}>
              <Buddy size={24} float={false} active={active} />
            </View>
            <AppText variant="captionStrong" color={L.ink} maxScale={1}>
              BUDDY
            </AppText>
          </View>
          <Animated.View style={[styles.mine, { backgroundColor: t.hc ? t.c.text : '#1E9C86' }, mine]}>
            <AppText variant="caption" color={t.hc ? t.c.bg : '#FFFFFF'} maxScale={1}>
              {strings.onboarding.chatExample}
            </AppText>
          </Animated.View>
          <Typing p={p} from={0.16} to={0.34} color={t.hc ? t.c.bg : '#E6EEF0'} />
          <Animated.View style={[styles.medCard, { backgroundColor: L.card }, t.hc && t.hairline, card]}>
            <View style={styles.medRow}>
              <IconTile icon="meds" domain="medication" size={30} />
              <AppText variant="captionStrong" color={L.ink} maxScale={1} style={styles.flex} numberOfLines={2}>
                {strings.onboarding.chatCardTitle}
              </AppText>
            </View>
            <Animated.View style={[styles.cardButton, { backgroundColor: t.hc ? t.c.text : '#139AA0' }, tap]}>
              <AppText variant="meta" color={t.hc ? t.c.bg : '#FFFFFF'} maxScale={1} numberOfLines={1}>
                {strings.onboarding.chatCardBody}
              </AppText>
              <Animated.View style={[styles.center, styles.row, { backgroundColor: t.hc ? t.c.text : '#2FB57A' }, added]}>
                <Icon name="check" color={t.hc ? t.c.bg : '#FFFFFF'} size={14} strokeWidth={3} />
                <AppText variant="meta" color={t.hc ? t.c.bg : '#FFFFFF'} maxScale={1}>
                  {D.added}
                </AppText>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </View>
      </Phone>
      <Animated.View style={[StyleSheet.absoluteFill, near]}>
        <View style={styles.setupRobot}>
          <Buddy size={130} mood="open" active={active} />
        </View>
        <Animated.View style={[styles.setupFinger, { backgroundColor: 'rgba(255,255,255,0.4)' }, finger]} />
        <Animated.View style={[styles.setupChip, chip]}>
          <View style={[styles.smallChip, { backgroundColor: L.card }, t.hc && t.hairline]}>
            <Icon name="check" color={L.onMint} size={16} strokeWidth={3} />
            <AppText variant="captionStrong" color={L.onMint} maxScale={1}>
              {D.routineReady}
            </AppText>
          </View>
        </Animated.View>
      </Animated.View>
    </>
  );
}

// 3 · BUDDY le recuerda: el teléfono muestra la toma, BUDDY habla, suena la campana y sale el recordatorio.
function Wave({ i, p, color }: { i: number; p: SharedValue<number>; color: string }) {
  const r = 12 + i * 11;
  const style = useAnimatedStyle(() => {
    const v = (((p.get() * 6 - i * 0.22) % 1) + 1) % 1;
    return { opacity: (0.3 + 0.7 * Math.sin(v * Math.PI)) * outro(p.get()) };
  });
  const x = 0.64 * r;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={48} height={80}>
        <Path d={`M ${x} ${40 - 0.77 * r} A ${r} ${r} 0 0 1 ${x} ${40 + 0.77 * r}`} stroke={color} strokeWidth={4} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

/** Pantalla del adulto mayor dentro del teléfono: hora, medicamento y el botón grande. */
function DoseScreen({ t, L, children }: { t: Theme; L: Look; children?: ReactNode }) {
  return (
    <View style={styles.doseScreen}>
      <AppText variant="captionStrong" color={L.muted} maxScale={1}>
        {D.reminderTime}
      </AppText>
      <IconTile icon="meds" domain="medication" size={58} />
      <AppText variant="bodyStrong" color={L.ink} align="center" maxScale={1} numberOfLines={1}>
        {D.med}
      </AppText>
      {children ?? (
        <View style={styles.bigButton}>
          <LinearGradient colors={t.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <AppText variant="bodyStrong" color={t.c.onPrimary} maxScale={1}>
            {D.take}
          </AppText>
        </View>
      )}
    </View>
  );
}

function ReminderScene(c: Ctx) {
  const { active, t, L } = c;
  const p = useTimeline(active, 4800);
  const f = useFloat(active);
  const far = useDepth(c, 0.14);
  const near = useDepth(c, 0.62);
  const turn = usePhoneTurn(c, 5);
  const bell = useAnimatedStyle(() => {
    const v = seg(p.get(), 0.1, 0.42);
    return { transform: [{ rotate: `${Math.sin(v * Math.PI * 8) * 18 * (1 - v)}deg` }, { translateY: -4 * f.get() }] };
  });
  const bubble = useAnimatedStyle(() => pop(p.get(), 0.2, 0.36));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, far]}>
        <Ping p={p} x={52} y={56} size={52} color={L.onGlass} from={0.1} to={0.32} />
        <Ping p={p} x={52} y={56} size={52} color={L.onGlass} from={0.26} to={0.5} />
        <Animated.View style={[styles.bellTile, bell]}>
          <IconTile icon="bell" domain="followUp" size={52} />
        </Animated.View>
      </Animated.View>
      <Phone L={L} style={[styles.phoneRight, turn]}>
        <DoseScreen t={t} L={L} />
      </Phone>
      <Animated.View style={[StyleSheet.absoluteFill, near]}>
        <View style={styles.robotPeek}>
          <Buddy size={150} mood="open" active={active} />
        </View>
        <View style={styles.waves}>
          {[0, 1, 2].map((i) => (
            <Wave key={i} i={i} p={p} color={t.hc ? t.c.text : '#FFFFFF'} />
          ))}
        </View>
        {/* Globo sólido (no de vidrio): cruza sobre el teléfono y debe leerse encima de su pantalla. */}
        <Animated.View style={[styles.bubble, { backgroundColor: L.card }, t.hc && t.hairline, bubble]}>
          <AppText variant="secondaryStrong" color={L.ink} maxScale={1} numberOfLines={3}>
            {D.reminder}
          </AppText>
        </Animated.View>
      </Animated.View>
    </>
  );
}

// 4 · Confirma con un toque: el dedo presiona, el botón pasa a "Tomada" y el aviso llega a la familia.
function ConfirmScene(c: Ctx) {
  const { active, t, L } = c;
  const p = useTimeline(active, 4600);
  const far = useDepth(c, 0.14);
  const near = useDepth(c, 0.62);
  const turn = usePhoneTurn(c, 0);
  const finger = useAnimatedStyle(() => {
    const inV = easeOut(seg(p.get(), 0.08, 0.26));
    const outV = seg(p.get(), 0.44, 0.58);
    const press = seg(p.get(), 0.28, 0.32) - seg(p.get(), 0.33, 0.38);
    return { opacity: Math.min(1, inV * 1.5) * (1 - outV), transform: [{ translateX: 70 * (1 - inV) + 30 * outV }, { translateY: 70 * (1 - inV) + 50 * outV }, { scale: 1 - 0.18 * press }] };
  });
  const ripple = useAnimatedStyle(() => {
    const v = seg(p.get(), 0.31, 0.52);
    return { opacity: v > 0 && v < 1 ? 0.7 * (1 - v) : 0, transform: [{ scale: 0.4 + 2.4 * v }] };
  });
  const button = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.05 * (seg(p.get(), 0.28, 0.32) - seg(p.get(), 0.33, 0.4)) }] }));
  // "Tomada" se mantiene y, en el cierre, el botón vuelve a "Ya la tomé" para repetir.
  const done = useAnimatedStyle(() => ({ opacity: seg(p.get(), 0.32, 0.4) * outro(p.get()) }));
  const before = useAnimatedStyle(() => ({ opacity: 1 - seg(p.get(), 0.32, 0.38) * outro(p.get()) }));
  const after = useAnimatedStyle(() => {
    const v = backOut(seg(p.get(), 0.34, 0.46));
    return { opacity: seg(p.get(), 0.34, 0.4) * outro(p.get()), transform: [{ scale: 0.6 + 0.4 * v }] };
  });
  // El aviso "Tomada" viaja del teléfono a la familia.
  const fly = useAnimatedStyle(() => {
    const v = easeOut(seg(p.get(), 0.5, 0.74));
    return { opacity: seg(p.get(), 0.5, 0.56) * outro(p.get()), transform: [{ translateX: 62 * v }, { translateY: -132 * v }, { scale: 0.8 + 0.2 * v }] };
  });
  const family = useAnimatedStyle(() => {
    const v = backOut(seg(p.get(), 0.72, 0.84));
    return { transform: [{ scale: 1 + 0.16 * (v - seg(p.get(), 0.84, 0.92)) }] };
  });
  // BUDDY asiente: un salto pequeño cuando la toma queda confirmada.
  const hop = useAnimatedStyle(() => {
    const v = seg(p.get(), 0.36, 0.5);
    return { transform: [{ translateY: -8 * Math.sin(v * Math.PI) }] };
  });
  const success = t.hc ? ([t.c.text, t.c.text] as const) : (['#2FB57A', '#1F8A57'] as const);
  const onSuccess = t.hc ? t.c.bg : '#FFFFFF';
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, far]}>
        <Animated.View style={[styles.familyAvatar, family]}>
          <Avatar letter="L" tone="yellow" t={t} size={52} />
        </Animated.View>
        <Animated.View style={[styles.confirmRobot, hop]}>
          <Buddy size={96} active={active} />
        </Animated.View>
      </Animated.View>
      <Phone L={L} style={[styles.phoneCenter, turn]}>
        <DoseScreen t={t} L={L}>
          <Animated.View style={[styles.bigButton, button]}>
            <LinearGradient colors={t.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Animated.View style={[StyleSheet.absoluteFill, done]}>
              <LinearGradient colors={success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <Animated.View style={[styles.center, before]}>
              <AppText variant="bodyStrong" color={t.c.onPrimary} maxScale={1}>
                {D.take}
              </AppText>
            </Animated.View>
            <Animated.View style={[styles.center, styles.row, after]}>
              <Icon name="check" color={onSuccess} size={20} strokeWidth={3} />
              <AppText variant="bodyStrong" color={onSuccess} maxScale={1}>
                {D.taken}
              </AppText>
            </Animated.View>
          </Animated.View>
        </DoseScreen>
      </Phone>
      <Animated.View style={[StyleSheet.absoluteFill, near]}>
        <Animated.View style={[styles.ripple, ripple]} />
        <Animated.View style={[styles.flyChip, fly]}>
          <Glass L={L} style={styles.smallChip}>
            <Icon name="check" color={L.onGlass} size={16} strokeWidth={3} />
            <AppText variant="captionStrong" color={L.onGlass} maxScale={1}>
              {D.taken}
            </AppText>
          </Glass>
        </Animated.View>
        <Animated.View style={[styles.finger, { backgroundColor: 'rgba(255,255,255,0.4)' }, finger]} />
      </Animated.View>
    </>
  );
}

// 5 · Te enteras a tiempo: el aviso llega al teléfono del hijo (vibra), y también a quien él elija.
function AlertScene(c: Ctx) {
  const { active, t, L } = c;
  const p = useTimeline(active, 5000);
  const f = useFloat(active, 2000);
  const far = useDepth(c, 0.14);
  const near = useDepth(c, 0.62);
  const turn = usePhoneTurn(c, -4);
  const shake = useAnimatedStyle(() => {
    const v = seg(p.get(), 0.2, 0.34);
    return { transform: [{ rotate: `${Math.sin(v * Math.PI * 9) * 3.2 * (1 - v)}deg` }] };
  });
  const note = useAnimatedStyle(() => {
    const v = backOut(seg(p.get(), 0.08, 0.22));
    return { opacity: seg(p.get(), 0.08, 0.14) * outro(p.get()), transform: [{ translateY: -46 * (1 - v) }] };
  });
  const actions = useAnimatedStyle(() => {
    const v = easeOut(seg(p.get(), 0.34, 0.48));
    return { opacity: v * outro(p.get()), transform: [{ translateY: 18 * (1 - v) }] };
  });
  const left = useAnimatedStyle(() => ({ transform: [{ translateY: -5 * f.get() }] }));
  const right = useAnimatedStyle(() => ({ transform: [{ translateY: 5 * f.get() - 5 }] }));
  const badgeA = useAnimatedStyle(() => ({ transform: [{ scale: Math.max(0, backOut(seg(p.get(), 0.26, 0.38))) * outro(p.get()) }] }));
  const badgeB = useAnimatedStyle(() => ({ transform: [{ scale: Math.max(0, backOut(seg(p.get(), 0.4, 0.52))) * outro(p.get()) }] }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, far]}>
        <Ping p={p} x={160} y={150} size={120} color={L.onGlass} from={0.18} to={0.5} />
        <Animated.View style={[styles.avatarLeft, left]}>
          <Avatar letter="L" tone="yellow" t={t} />
          <Animated.View style={[styles.badge, { backgroundColor: t.hc ? t.c.text : '#FF6B5E' }, badgeA]}>
            <Icon name="bell" color={t.hc ? t.c.bg : '#FFFFFF'} size={12} strokeWidth={2.8} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.avatarRight, right]}>
          <Avatar letter="J" tone="mint" t={t} />
          <Animated.View style={[styles.badge, { backgroundColor: t.hc ? t.c.text : '#FF6B5E' }, badgeB]}>
            <Icon name="bell" color={t.hc ? t.c.bg : '#FFFFFF'} size={12} strokeWidth={2.8} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.phoneCenterWrap, shake]}>
        <Phone L={{ ...L, screen: L.night }} style={[styles.phoneStatic, turn]}>
          <View style={styles.lock}>
            <AppText variant="heroL" color={L.onNight} align="center" maxScale={1}>
              {D.clock}
            </AppText>
            <Animated.View style={[styles.note, { backgroundColor: L.card }, t.hc && t.hairline, note]}>
              <View style={styles.noteHead}>
                <Image source={APP_ICON} style={styles.appIcon} contentFit="cover" accessible={false} />
                <AppText variant="captionStrong" color={L.ink} maxScale={1} style={styles.flex}>
                  BUDDY
                </AppText>
                <AppText variant="meta" color={L.muted} maxScale={1}>
                  {D.now}
                </AppText>
              </View>
              <AppText variant="caption" color={L.ink} maxScale={1} numberOfLines={3}>
                {D.alert}
              </AppText>
            </Animated.View>
          </View>
        </Phone>
      </Animated.View>
      <Animated.View style={[styles.actionsRow, near]}>
        <Animated.View style={[styles.row, actions]}>
          <View style={[styles.action, { backgroundColor: L.card }, t.hc && t.hairline]}>
            <Icon name="phone" color={t.hc ? t.c.text : SLIDES[4].deep} size={18} strokeWidth={2.6} />
            <AppText variant="secondaryStrong" color={t.hc ? t.c.text : SLIDES[4].deep} maxScale={1}>
              {D.call}
            </AppText>
          </View>
          <Glass L={L} style={styles.action}>
            <AppText variant="secondaryStrong" color={L.onGlass} maxScale={1}>
              {D.view}
            </AppText>
          </Glass>
        </Animated.View>
      </Animated.View>
    </>
  );
}

// 6 · Sabes que está bien: de noche, BUDDY duerme y el resumen del día se llena con lo que pasó, renglón a renglón.
const SUMMARY: { icon: IconName; domain: Domain; text: string }[] = [
  { icon: 'smile', domain: 'mood', text: FAMILY[0] },
  { icon: 'moon', domain: 'sleep', text: FAMILY[1] },
  { icon: 'meds', domain: 'medication', text: FAMILY[2] },
];
const MOON = 'M40 4 A30 30 0 1 0 60 52 A24 24 0 1 1 40 4 Z';

function NightScene(c: Ctx) {
  const { active, t, L } = c;
  const p = useTimeline(active, 6000);
  const f = useFloat(active, 2600);
  const far = useDepth(c, 0.12);
  const mid = useDepth(c, 0.3);
  const near = useDepth(c, 0.6);
  const moon = useAnimatedStyle(() => ({ transform: [{ translateY: -4 * f.get() }, { rotate: `${-6 + 6 * f.get()}deg` }] }));
  const card = useAnimatedStyle(() => {
    const v = backOut(seg(p.get(), 0.04, 0.18));
    return { opacity: seg(p.get(), 0.04, 0.1) * outro(p.get()), transform: [{ translateY: 30 * (1 - v) }] };
  });
  const chip = useAnimatedStyle(() => pop(p.get(), 0.6, 0.72));
  const ring = useAnimatedProps(() => ({ strokeDashoffset: RING * (1 - easeOut(seg(p.get(), 0.62, 0.78))) }));
  const tick = useAnimatedStyle(() => {
    const v = Math.max(0, backOut(seg(p.get(), 0.74, 0.84)));
    return { opacity: Math.min(1, v), transform: [{ scale: v }] };
  });
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, far]}>
        <Star p={p} x={28} y={30} size={14} phase={0.1} />
        <Star p={p} x={150} y={14} size={10} phase={0.5} />
        <Star p={p} x={300} y={150} size={12} phase={0.8} />
        <Star p={p} x={20} y={150} size={18} phase={0.3} color="#FFE9A8" />
        <Animated.View style={[styles.moon, moon]}>
          <View style={styles.moonGlow}>
            <Orb size={130} color="#FFE9A8" opacity={0.4} />
          </View>
          <Svg width={64} height={64} viewBox="0 0 64 64">
            <Path d={MOON} fill={t.hc ? t.c.text : '#FFE9A8'} />
          </Svg>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, mid]}>
        <Animated.View style={[styles.summary, { backgroundColor: L.card }, t.hc && t.hairline, card]}>
          <AppText variant="captionStrong" color={L.muted} maxScale={1}>
            {D.summary}
          </AppText>
          {SUMMARY.map((r, i) => (
            <SummaryRow key={r.text} p={p} i={i} row={r} L={L} t={t} />
          ))}
        </Animated.View>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, near]}>
        <View style={styles.nightRobot}>
          <Buddy size={124} mood="sleep" active={active} />
        </View>
        {[0, 1, 2].map((i) => (
          <Zzz key={i} p={p} i={i} color={L.onGlass} />
        ))}
        <Animated.View style={[styles.nightChip, chip]}>
          <Glass L={L} style={styles.statusChip}>
            <View style={styles.ring}>
              <Svg width={36} height={36} style={[StyleSheet.absoluteFill, styles.ccw]}>
                <Circle cx={18} cy={18} r={15} stroke={L.edge} strokeWidth={3.5} fill="none" />
                <AnimatedCircle cx={18} cy={18} r={15} stroke={L.onGlass} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeDasharray={RING} animatedProps={ring} />
              </Svg>
              <Animated.View style={tick}>
                <Icon name="check" color={L.onGlass} size={18} strokeWidth={3.2} />
              </Animated.View>
            </View>
            <AppText variant="bodyStrong" color={L.onGlass} maxScale={1}>
              {D.ok}
            </AppText>
          </Glass>
        </Animated.View>
      </Animated.View>
    </>
  );
}

function SummaryRow({ p, i, row, L, t }: { p: SharedValue<number>; i: number; row: (typeof SUMMARY)[number]; L: Look; t: Theme }) {
  const a = 0.2 + i * 0.1;
  const style = useAnimatedStyle(() => {
    const v = easeOut(seg(p.get(), a, a + 0.1));
    return { opacity: v, transform: [{ translateX: -18 * (1 - v) }] };
  });
  const check = useAnimatedStyle(() => {
    const v = Math.max(0, backOut(seg(p.get(), a + 0.06, a + 0.14)));
    return { opacity: Math.min(1, v), transform: [{ scale: v }] };
  });
  return (
    <Animated.View style={[styles.summaryRow, style]}>
      <IconTile icon={row.icon} domain={row.domain} size={28} />
      <AppText variant="captionStrong" color={L.ink} maxScale={1} style={styles.flex} numberOfLines={1}>
        {row.text}
      </AppText>
      <Animated.View style={[styles.summaryCheck, { backgroundColor: t.hc ? t.c.text : '#2FB57A' }, check]}>
        <Icon name="check" color={t.hc ? t.c.bg : '#FFFFFF'} size={12} strokeWidth={3.4} />
      </Animated.View>
    </Animated.View>
  );
}

/** "Z" que sube desde BUDDY dormido, crece y se desvanece. */
function Zzz({ p, i, color }: { p: SharedValue<number>; i: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const v = (((p.get() * 2 - i * 0.33) % 1) + 1) % 1;
    return { opacity: Math.sin(v * Math.PI), transform: [{ translateX: 22 * v + Math.sin(v * 5) * 4 }, { translateY: -48 * v }, { scale: 0.6 + 0.7 * v }] };
  });
  return (
    <Animated.View style={[styles.zzz, style]}>
      <AppText variant="bodyStrong" color={color} maxScale={1}>
        z
      </AppText>
    </Animated.View>
  );
}

const SCENES: ComponentType<Ctx>[] = [HelloScene, SetupScene, ReminderScene, ConfirmScene, AlertScene, NightScene];

const PX = (CANVAS.w - PHONE.w) / 2;
const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center' },
  canvas: { width: CANVAS.w, height: CANVAS.h },
  abs: { position: 'absolute' },
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ccw: { transform: [{ rotate: '-90deg' }] },
  // Fondo
  orbA: { position: 'absolute', top: -120, left: -140 },
  orbB: { position: 'absolute', top: 180, right: -150 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '48%' },
  // Texto
  words: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 9, rowGap: 0 },
  // Piezas
  phone: { position: 'absolute', width: PHONE.w, height: PHONE.h, borderRadius: 32, padding: 6, boxShadow: '0px 22px 44px rgba(0, 0, 0, 0.34)' },
  screen: { flex: 1, borderRadius: 26, overflow: 'hidden' },
  notch: { position: 'absolute', top: 12, alignSelf: 'center', width: 46, height: 10, borderRadius: 5 },
  glass: { borderWidth: 1.5, borderRadius: 22 },
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, boxShadow: '0px 8px 18px rgba(0, 0, 0, 0.22)' },
  badge: { position: 'absolute', top: -4, right: -4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  platformFill: { backgroundColor: 'rgba(4, 24, 36, 0.5)' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 8, paddingRight: 18, borderRadius: 999 },
  ring: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  smallChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  // 1 (plataforma centrada en y 260; órbita a sus pies)
  helloRobot: { position: 'absolute', top: 26, left: (CANVAS.w - 226 * (200 / 220)) / 2 },
  dayRow: { position: 'absolute', left: 0, right: 0, top: 268, flexDirection: 'row', justifyContent: 'center', gap: 14 },
  helloBubble: { position: 'absolute', right: 4, top: 0, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderBottomLeftRadius: 6, transformOrigin: 'bottom left', boxShadow: '0px 10px 22px rgba(0, 0, 0, 0.22)' },
  // 2
  setupTileA: { position: 'absolute', left: 22, top: 26 },
  setupTileB: { position: 'absolute', left: 74, top: 90 },
  chat: { flex: 1, paddingTop: 30, paddingHorizontal: 8, gap: 8 },
  chatHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 6 },
  chatAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mine: { alignSelf: 'flex-end', maxWidth: '90%', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 14, borderBottomRightRadius: 4 },
  typing: { position: 'absolute', left: 8, top: 112, flexDirection: 'row', gap: 4, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 14, borderBottomLeftRadius: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7A8B92' },
  medCard: { borderRadius: 14, padding: 8, gap: 8, transformOrigin: 'top left', boxShadow: '0px 6px 14px rgba(0, 0, 0, 0.14)' },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardButton: { height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 6 },
  setupRobot: { position: 'absolute', left: -4, top: 200 },
  setupFinger: { position: 'absolute', left: 196, top: 210, width: 42, height: 42, borderRadius: 21, borderWidth: 2.5, borderColor: '#FFFFFF' },
  setupChip: { position: 'absolute', left: 6, top: 150, transformOrigin: 'bottom left' },
  // 3
  bellTile: { position: 'absolute', left: 26, top: 30 },
  phoneRight: { left: PX + 34, top: 18 },
  doseScreen: { flex: 1, alignItems: 'center', paddingTop: 34, paddingHorizontal: 8, paddingBottom: 10, gap: 8 },
  bigButton: { marginTop: 'auto', alignSelf: 'stretch', height: 54, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  robotPeek: { position: 'absolute', left: -6, top: 186 },
  waves: { position: 'absolute', left: 124, top: 196, width: 48, height: 80 },
  bubble: { position: 'absolute', left: 4, top: 86, width: 126, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18, borderBottomLeftRadius: 6, transformOrigin: 'bottom left', boxShadow: '0px 10px 22px rgba(0, 0, 0, 0.24)' },
  // 4 (botón centrado en x 160, y 281 del lienzo)
  phoneCenter: { left: PX, top: 14 },
  familyAvatar: { position: 'absolute', right: 14, top: 22 },
  confirmRobot: { position: 'absolute', left: 14, top: 18 },
  ripple: { position: 'absolute', left: 140, top: 261, width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#FFFFFF' },
  finger: { position: 'absolute', left: 150, top: 268, width: 46, height: 46, borderRadius: 23, borderWidth: 2.5, borderColor: '#FFFFFF' },
  flyChip: { position: 'absolute', left: 162, top: 214 },
  // 5
  phoneCenterWrap: { position: 'absolute', left: PX, top: 6, width: PHONE.w, height: PHONE.h },
  phoneStatic: { left: 0, top: 0 },
  lock: { flex: 1, paddingTop: 40, paddingHorizontal: 8, gap: 12 },
  note: { borderRadius: 16, padding: 10, gap: 4, boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.28)' },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appIcon: { width: 20, height: 20, borderRadius: 6 },
  avatarLeft: { position: 'absolute', left: 14, top: 70 },
  avatarRight: { position: 'absolute', right: 14, top: 150 },
  actionsRow: { position: 'absolute', left: 0, right: 0, top: 286, alignItems: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 112, height: 46, paddingHorizontal: 18, borderRadius: 999 },
  // 6
  moon: { position: 'absolute', right: 18, top: 10, width: 64, height: 64 },
  moonGlow: { position: 'absolute', left: -33, top: -33 },
  summary: { position: 'absolute', left: 14, top: 54, width: 246, borderRadius: 22, padding: 14, gap: 10, boxShadow: '0px 16px 32px rgba(0, 0, 0, 0.3)' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryCheck: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  nightRobot: { position: 'absolute', left: 4, top: 210 },
  zzz: { position: 'absolute', left: 92, top: 206 },
  nightChip: { position: 'absolute', right: 10, top: 270, transformOrigin: 'bottom right' },
});
