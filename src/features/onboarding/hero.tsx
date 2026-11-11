/**
 * Presentaciones de la primera apertura (V5.1) — "Un día con BUDDY".
 *
 * Cada paso es una pantalla inmersiva a todo color (un degradado vivo de la marca que se funde con el siguiente al
 * deslizar) con una escena en capas: BUDDY grande con los datos del día girando a su alrededor, y un teléfono que gira
 * en 3D con el dedo mientras muestra lo que pasa de verdad en la app (recordar, confirmar, avisar). Todo es vectorial o
 * la imagen oficial del robot: nítido en cualquier pantalla.
 *
 * Movimiento (solo transform y opacidad, en el hilo de UI):
 *  - cada escena corre su línea de tiempo SOLO mientras es la página activa; fuera de pantalla queda en su estado final;
 *  - al deslizar, las capas se mueven a distinta velocidad (profundidad) y el teléfono gira;
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
import { ROBOT_IMAGE, ROBOT_RATIO } from '@/components/robot';
import { strings } from '@/i18n';
import type { Domain, Theme, Tone } from '@/theme';
import { useTheme } from '@/theme/provider';

const D = strings.onboarding.demo;
const APP_ICON = require('../../../assets/branding/buddy-splash.png');
/** Lienzo de diseño de cada escena; se escala para caber en el alto disponible. */
const CANVAS = { w: 320, h: 340 };
const PHONE = { w: 168, h: 300 };
const RING = 2 * Math.PI * 15;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Color de cada paso: degradado de arriba abajo (vivo → profundo) y el tono profundo para el texto del botón. El texto
 * blanco da ≥ 5,5:1 donde va el título y ≥ 6,7:1 donde va la frase (medido con las paradas en 0 · 0,34 · 0,76).
 */
export const SLIDES = [
  { colors: ['#22B8A9', '#0F8A8C', '#0A4660'], deep: '#0A4660' },
  { colors: ['#FF9E7A', '#E4573F', '#8E2B4E'], deep: '#8E2B4E' },
  { colors: ['#63B5FA', '#3A72E0', '#232F86'], deep: '#232F86' },
  { colors: ['#B49BFF', '#6C56E0', '#2A2168'], deep: '#2A2168' },
] as const;

/** Colores de las piezas de las escenas. En alto contraste todo sale del tema (sin transparencias ni degradados). */
function look(t: Theme) {
  return t.hc
    ? { screen: t.c.bg, card: t.c.bg, ink: t.c.text, muted: t.c.text, bezel: t.c.text, glass: t.c.bg, edge: t.c.text, onGlass: t.c.text, night: t.c.bg, onNight: t.c.text }
    : { screen: '#F4F8F7', card: '#FFFFFF', ink: '#102A33', muted: '#5B6B73', bezel: '#0A1A24', glass: 'rgba(255,255,255,0.2)', edge: 'rgba(255,255,255,0.5)', onGlass: '#FFFFFF', night: '#1B1640', onNight: '#FFFFFF' };
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

/** 0 → 1 en bucle mientras la página está activa; quieta en `still` (estado final) si no. */
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
    p.set(withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
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

/** Giro continuo 0 → 1 (una vuelta) mientras la página está activa. */
function useSpin(active: boolean, ms: number) {
  const reduce = useReducedMotion();
  const a = useSharedValue(0.08);
  useEffect(() => {
    if (reduce || !active) {
      cancelAnimation(a);
      return;
    }
    a.set(withRepeat(withTiming(a.get() + 1, { duration: ms, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(a);
  }, [active, reduce, ms, a]);
  return a;
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
function Orb({ size }: { size: number }) {
  const id = `o${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.26} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
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
    v.set(active ? withDelay(140, withTiming(1, { duration: 640, easing: Easing.out(Easing.cubic) })) : withTiming(0, { duration: 120 }));
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
    const k = easeOut(interpolate(v.get(), [at, at + 0.45], [0, 1], Extrapolation.CLAMP));
    return { opacity: k, transform: [{ translateY: 20 * (1 - k) }] };
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
    v.set(active ? withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })) : withTiming(0, { duration: 120 }));
  }, [active, reduce, delay, v]);
  const style = useAnimatedStyle(() => ({ opacity: v.get(), transform: [{ translateY: 12 * (1 - v.get()) }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// ── Escena ───────────────────────────────────────────────────

/** Escena de la página `index`: se escala al alto disponible y se desvanece al alejarse del centro. */
export function Scene({ index, x, width, height, active }: { index: number; x: SharedValue<number>; width: number; height: number; active: boolean }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const scale = Math.min(height / CANVAS.h, (width - 16) / CANVAS.w);
  const fade = useAnimatedStyle(() => ({
    opacity: reduce ? 1 : interpolate(Math.abs(x.get() / Math.max(1, width) - index), [0, 0.9], [1, 0], Extrapolation.CLAMP),
  }));
  const Body = SCENES[index];
  return (
    <View style={[styles.stage, { width, height }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.canvas, { transform: [{ scale }] }, fade]}>
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
function Star({ p, x, y, size, phase }: { p: SharedValue<number>; x: number; y: number; size: number; phase: number }) {
  const style = useAnimatedStyle(() => {
    const v = Math.abs((((p.get() * 3 + phase) % 1) + 1) % 1 * 2 - 1);
    return { opacity: 0.25 + 0.75 * v, transform: [{ scale: 0.6 + 0.5 * v }, { rotate: `${v * 24}deg` }] };
  });
  return (
    <Animated.View style={[styles.abs, { left: x - size / 2, top: y - size / 2 }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={STAR} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

/** Anillo que sale de un punto y se desvanece (dos por vuelta de la línea de tiempo). */
function Ping({ p, x, y, size, color, from, to }: { p: SharedValue<number>; x: number; y: number; size: number; color: string; from: number; to: number }) {
  const style = useAnimatedStyle(() => {
    const v = seg(p.get(), from, to);
    return { opacity: v > 0 && v < 1 ? 0.85 * (1 - v) : 0, transform: [{ scale: 1 + 1.1 * v }] };
  });
  return <Animated.View style={[styles.abs, { left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: color }, style]} />;
}

// 1 · Sabes que está bien: BUDDY flota sobre su plataforma, los datos del día giran a su alrededor y llega el estado.
const ORBIT: { icon: IconName; domain: Domain }[] = [
  { icon: 'meds', domain: 'medication' },
  { icon: 'drop', domain: 'water' },
  { icon: 'moon', domain: 'sleep' },
  { icon: 'smile', domain: 'mood' },
];

/** Un dato en órbita. Se dibuja dos veces (detrás y delante del robot) y cada copia solo se ve en su mitad de la vuelta. */
function Orbiter({ spin, i, front, icon, domain }: { spin: SharedValue<number>; i: number; front: boolean; icon: IconName; domain: Domain }) {
  const style = useAnimatedStyle(() => {
    const angle = spin.get() * Math.PI * 2 + (i * Math.PI) / 2;
    const s = Math.sin(angle);
    const depth = (s + 1) / 2;
    return {
      opacity: (front ? s >= 0 : s < 0) ? 0.6 + 0.4 * depth : 0,
      transform: [{ translateX: Math.cos(angle) * 136 }, { translateY: s * 30 }, { scale: 0.62 + 0.36 * depth }],
    };
  });
  return (
    <Animated.View style={[styles.orbiter, style]}>
      <IconTile icon={icon} domain={domain} size={46} />
    </Animated.View>
  );
}

function HeroScene(c: Ctx) {
  const { active, L } = c;
  const p = useTimeline(active, 5600);
  const f = useFloat(active);
  const spin = useSpin(active, 15000);
  const far = useDepth(c, 0.12);
  const mid = useDepth(c, 0.3);
  const near = useDepth(c, 0.6);
  const robot = useAnimatedStyle(() => ({ transform: [{ translateY: -9 * f.get() }] }));
  const shadow = useAnimatedStyle(() => ({ opacity: 0.55 - 0.2 * f.get(), transform: [{ scaleY: 0.22 }, { scale: 1 - 0.08 * f.get() }] }));
  const halo = useAnimatedStyle(() => {
    const v = (p.get() * 2) % 1;
    return { opacity: 0.7 * (1 - v), transform: [{ scaleY: 0.22 }, { scale: 0.7 + 0.75 * v }] };
  });
  const chip = useAnimatedStyle(() => {
    const v = backOut(seg(p.get(), 0.06, 0.2));
    return { opacity: seg(p.get(), 0.06, 0.12) * outro(p.get()), transform: [{ translateY: 26 * (1 - v) }, { scale: 0.86 + 0.14 * v }] };
  });
  const ring = useAnimatedProps(() => ({ strokeDashoffset: RING * (1 - easeOut(seg(p.get(), 0.18, 0.34))) }));
  const tick = useAnimatedStyle(() => {
    const v = Math.max(0, backOut(seg(p.get(), 0.3, 0.42)));
    return { opacity: Math.min(1, v), transform: [{ scale: v }] };
  });
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, far]}>
        <Star p={p} x={44} y={50} size={26} phase={0} />
        <Star p={p} x={282} y={34} size={16} phase={0.4} />
        <Star p={p} x={296} y={206} size={12} phase={0.7} />
        <Star p={p} x={22} y={212} size={14} phase={0.2} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, mid]}>
        <Animated.View style={[styles.platform, { borderColor: L.edge }, halo]} />
        <Animated.View style={[styles.platform, styles.platformFill, shadow]} />
        {ORBIT.map((o, i) => (
          <Orbiter key={`b${o.domain}`} spin={spin} i={i} front={false} icon={o.icon} domain={o.domain} />
        ))}
        <Animated.View style={[styles.heroRobot, robot]}>
          <Image source={ROBOT_IMAGE} style={{ width: 196 * ROBOT_RATIO, height: 196 }} contentFit="contain" accessible={false} />
        </Animated.View>
        {ORBIT.map((o, i) => (
          <Orbiter key={`f${o.domain}`} spin={spin} i={i} front icon={o.icon} domain={o.domain} />
        ))}
      </Animated.View>
      <Animated.View style={[styles.heroChipRow, near]}>
        <Animated.View style={chip}>
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

// 2 · BUDDY le recuerda: el teléfono muestra la toma, BUDDY habla, suena la campana y sale el recordatorio.
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
  const robot = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * f.get() }, { rotate: `${-4 + 4 * f.get()}deg` }] }));
  const bell = useAnimatedStyle(() => {
    const v = seg(p.get(), 0.1, 0.42);
    return { transform: [{ rotate: `${Math.sin(v * Math.PI * 8) * 18 * (1 - v)}deg` }, { translateY: -4 * f.get() }] };
  });
  const bubble = useAnimatedStyle(() => {
    const v = backOut(seg(p.get(), 0.2, 0.36));
    return { opacity: seg(p.get(), 0.2, 0.26) * outro(p.get()), transform: [{ scale: 0.6 + 0.4 * v }, { translateY: 10 * (1 - v) }] };
  });
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
        <Animated.View style={[styles.robotPeek, robot]}>
          <Image source={ROBOT_IMAGE} style={{ width: 150 * ROBOT_RATIO, height: 150 }} contentFit="contain" accessible={false} />
        </Animated.View>
        <View style={styles.waves}>
          {[0, 1, 2].map((i) => (
            <Wave key={i} i={i} p={p} color={t.hc ? t.c.text : '#12807F'} />
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

// 3 · Confirma con un toque: el dedo presiona, el botón pasa a "Tomada", sale confeti y el aviso llega a la familia.
const BURST: { a: number; r: number; s: number; tone: Tone }[] = Array.from({ length: 14 }, (_, i) => ({
  a: (i / 14) * Math.PI * 2 + 0.2,
  r: 70 + (i % 4) * 22,
  s: 7 + (i % 3) * 3,
  tone: (['mint', 'coral', 'lavender', 'sky', 'yellow'] as const)[i % 5],
}));

function Confetti({ p, spec, color }: { p: SharedValue<number>; spec: (typeof BURST)[number]; color: string }) {
  const style = useAnimatedStyle(() => {
    const v = easeOut(seg(p.get(), 0.34, 0.66));
    return {
      opacity: v > 0 && v < 1 ? 1 - v * v : 0,
      // Sube, se abre y cae un poco al final (gravedad).
      transform: [{ translateX: Math.cos(spec.a) * spec.r * v }, { translateY: Math.sin(spec.a) * spec.r * v - 46 * v + 60 * v * v }, { scale: 1 - 0.35 * v }, { rotate: `${v * 260}deg` }],
    };
  });
  return <Animated.View style={[styles.confetti, { width: spec.s, height: spec.s * 1.6, borderRadius: spec.s / 3, backgroundColor: color }, style]} />;
}

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
  const success = t.hc ? ([t.c.text, t.c.text] as const) : (['#2FB57A', '#1F8A57'] as const);
  const onSuccess = t.hc ? t.c.bg : '#FFFFFF';
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, far]}>
        <Animated.View style={[styles.familyAvatar, family]}>
          <Avatar letter="L" tone="yellow" t={t} size={52} />
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
        {t.hc ? null : BURST.map((b, i) => <Confetti key={i} p={p} spec={b} color={t.bright[b.tone][1]} />)}
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

// 4 · Te enteras a tiempo: el aviso llega al teléfono del hijo (vibra), y también a quien él elija.
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
            <Icon name="phone" color={t.hc ? t.c.text : SLIDES[3].deep} size={18} strokeWidth={2.6} />
            <AppText variant="secondaryStrong" color={t.hc ? t.c.text : SLIDES[3].deep} maxScale={1}>
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

const SCENES: ComponentType<Ctx>[] = [HeroScene, ReminderScene, ConfirmScene, AlertScene];

const PX = (CANVAS.w - PHONE.w) / 2;
const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center' },
  canvas: { width: CANVAS.w, height: CANVAS.h },
  abs: { position: 'absolute' },
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
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
  // 1
  platform: { position: 'absolute', left: 50, top: 126, width: 220, height: 220, borderRadius: 110, borderWidth: 4 },
  platformFill: { borderWidth: 0, backgroundColor: 'rgba(4, 24, 36, 0.5)' },
  heroRobot: { position: 'absolute', top: 30, left: (CANVAS.w - 196 * ROBOT_RATIO) / 2 },
  orbiter: { position: 'absolute', left: CANVAS.w / 2 - 23, top: 150 },
  heroChipRow: { position: 'absolute', left: 0, right: 0, top: 268, alignItems: 'center' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 8, paddingRight: 18, borderRadius: 999 },
  ring: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  // 2
  bellTile: { position: 'absolute', left: 26, top: 30 },
  phoneRight: { left: PX + 34, top: 18 },
  doseScreen: { flex: 1, alignItems: 'center', paddingTop: 34, paddingHorizontal: 8, paddingBottom: 10, gap: 8 },
  bigButton: { marginTop: 'auto', alignSelf: 'stretch', height: 54, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  robotPeek: { position: 'absolute', left: 0, top: 176 },
  waves: { position: 'absolute', left: 124, top: 178, width: 48, height: 80 },
  bubble: { position: 'absolute', left: 4, top: 86, width: 126, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18, borderBottomLeftRadius: 6, transformOrigin: 'bottom left', boxShadow: '0px 10px 22px rgba(0, 0, 0, 0.24)' },
  // 3 (botón centrado en x 160, y 281 del lienzo)
  phoneCenter: { left: PX, top: 14 },
  familyAvatar: { position: 'absolute', right: 14, top: 22 },
  ripple: { position: 'absolute', left: 140, top: 261, width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#FFFFFF' },
  confetti: { position: 'absolute', left: 156, top: 276 },
  finger: { position: 'absolute', left: 150, top: 268, width: 46, height: 46, borderRadius: 23, borderWidth: 2.5, borderColor: '#FFFFFF' },
  flyChip: { position: 'absolute', left: 162, top: 214 },
  smallChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  // 4
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
});
