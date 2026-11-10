/**
 * Presentaciones de la primera apertura (V4.4). Cada una es una ESCENA VIVA hecha con piezas reales de la app (tarjeta
 * de estado, recordatorio, botón de confirmar, aviso) dibujadas en vectores: nítidas en cualquier pantalla y con el
 * tema activo. Antes eran PNG de 146 px estirados a todo el ancho (borrosos) y en oscuro iban en cajas claras.
 *
 * Movimiento: cada escena corre su línea de tiempo SOLO mientras es la página activa y se repite; al deslizar, la
 * escena se desplaza con paralaje y el aura de color del fondo se funde con la siguiente. Solo transform y opacidad en
 * el hilo de UI. Con "reducir movimiento" (o fuera de pantalla) cada escena queda quieta en su estado final.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useId, type ComponentType } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { ROBOT_IMAGE, ROBOT_RATIO } from '@/components/robot';
import { strings } from '@/i18n';
import type { Domain, Theme, Tone } from '@/theme';
import { useTheme } from '@/theme/provider';

const D = strings.onboarding.demo;
const APP_ICON = require('../../../assets/branding/buddy-splash.png');
/** Lienzo de diseño de cada escena; se escala para caber en el alto disponible. */
const CANVAS = { w: 320, h: 300 };
/** Aura de cada presentación: tono principal y secundario. */
const AURA: [Tone, Tone][] = [['mint', 'sky'], ['coral', 'yellow'], ['sky', 'mint'], ['lavender', 'coral']];
const RING = 2 * Math.PI * 21;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

/** Flotación suave del robot (seno de 4,8 s). */
function useFloat(active: boolean) {
  const reduce = useReducedMotion();
  const f = useSharedValue(0);
  useEffect(() => {
    if (reduce || !active) {
      cancelAnimation(f);
      return;
    }
    const sine = Easing.inOut(Easing.sin);
    f.set(withRepeat(withSequence(withTiming(1, { duration: 2400, easing: sine }), withTiming(0, { duration: 2400, easing: sine })), -1));
    return () => cancelAnimation(f);
  }, [active, reduce, f]);
  return f;
}

const card = (t: Theme, r = 20): ViewStyle => ({ backgroundColor: t.c.surface, borderRadius: r, ...t.hairline, ...t.shadow.elevated });

// ── Fondo ────────────────────────────────────────────────────

/** Auras de color apiladas; cada una aparece según cuánto se ha deslizado hacia su página. */
export function SlideBackgrounds({ x, width, top, size }: { x: SharedValue<number>; width: number; top: number; size: number }) {
  const t = useTheme();
  if (t.hc) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {AURA.map(([a, b], i) => (
        <AuraLayer key={i} index={i} x={x} width={width} top={top} size={size} colors={[t.tones[a].solid, t.tones[b].solid]} alpha={t.dark ? 0.42 : 0.55} />
      ))}
    </View>
  );
}

function AuraLayer({ index, x, width, top, size, colors, alpha }: { index: number; x: SharedValue<number>; width: number; top: number; size: number; colors: [string, string]; alpha: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const style = useAnimatedStyle(() => ({ opacity: interpolate(Math.abs(x.get() / Math.max(1, width) - index), [0, 1], [1, 0], Extrapolation.CLAMP) }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={width} height={top + size * 1.2}>
        <Defs>
          <RadialGradient id={`a${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors[0]} stopOpacity={alpha} />
            <Stop offset="1" stopColor={colors[0]} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`b${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors[1]} stopOpacity={alpha * 0.75} />
            <Stop offset="1" stopColor={colors[1]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width * 0.42} cy={top + size * 0.55} rx={width * 0.7} ry={size * 0.62} fill={`url(#a${id})`} />
        <Ellipse cx={width * 0.9} cy={top + size * 0.12} rx={width * 0.45} ry={size * 0.4} fill={`url(#b${id})`} />
      </Svg>
    </Animated.View>
  );
}

// ── Escena ───────────────────────────────────────────────────

interface SceneProps {
  active: boolean;
  t: Theme;
}

/** Escena de la página `index`: se escala al alto disponible y se desplaza con paralaje al deslizar. */
export function Scene({ index, x, width, height, active }: { index: number; x: SharedValue<number>; width: number; height: number; active: boolean }) {
  const t = useTheme();
  const scale = Math.min(height / CANVAS.h, (width - 24) / CANVAS.w);
  const style = useAnimatedStyle(() => {
    const d = x.get() / Math.max(1, width) - index;
    return {
      opacity: interpolate(Math.abs(d), [0, 0.8], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: d * width * 0.35 }, { scale: scale * (1 - 0.08 * Math.min(1, Math.abs(d))) }],
    };
  });
  const Body = SCENES[index];
  return (
    <View style={[styles.stage, { width, height }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.canvas, style]}>
        <Body active={active} t={t} />
      </Animated.View>
    </View>
  );
}

// 1 · Sabes que está bien: BUDDY flota, sube la tarjeta de estado, el anillo se dibuja y entran los datos del día.
const CHIPS: { icon: IconName; domain: Domain }[] = [
  { icon: 'meds', domain: 'medication' },
  { icon: 'drop', domain: 'water' },
  { icon: 'smile', domain: 'mood' },
];

function StatusScene({ active, t }: SceneProps) {
  const p = useTimeline(active, 4800);
  const f = useFloat(active);
  const robot = useAnimatedStyle(() => ({ transform: [{ translateY: -7 * f.get() }] }));
  const box = useAnimatedStyle(() => {
    const v = easeOut(seg(p.get(), 0.04, 0.18));
    return { opacity: v * outro(p.get()), transform: [{ translateY: 28 * (1 - v) }] };
  });
  const ring = useAnimatedProps(() => ({ strokeDashoffset: RING * (1 - easeOut(seg(p.get(), 0.16, 0.32))) }));
  const tick = useAnimatedStyle(() => {
    const v = Math.max(0, backOut(seg(p.get(), 0.28, 0.4)));
    return { opacity: Math.min(1, v), transform: [{ scale: v }] };
  });
  const ok = t.status.ok;
  return (
    <>
      <Animated.View style={[styles.robotTop, robot]}>
        <Image source={ROBOT_IMAGE} style={{ width: 150 * ROBOT_RATIO, height: 150 }} contentFit="contain" accessible={false} />
      </Animated.View>
      <Animated.View style={[styles.statusCard, card(t), box]}>
        <View style={styles.ring}>
          <Svg width={48} height={48} style={[StyleSheet.absoluteFill, styles.ccw]}>
            <Circle cx={24} cy={24} r={21} stroke={ok.border} strokeWidth={4} fill={ok.bg} />
            <AnimatedCircle cx={24} cy={24} r={21} stroke={ok.accent} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={RING} animatedProps={ring} />
          </Svg>
          <Animated.View style={tick}>
            <Icon name="check" color={ok.accent} size={22} strokeWidth={3} />
          </Animated.View>
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" maxScale={1} numberOfLines={1}>
            {D.ok}
          </AppText>
          <AppText variant="caption" color={t.c.muted} maxScale={1} numberOfLines={1}>
            {D.okDetail}
          </AppText>
        </View>
      </Animated.View>
      <View style={styles.chips}>
        {CHIPS.map((c, i) => (
          <Chip key={c.domain} p={p} at={0.38 + i * 0.07} icon={c.icon} tile={t.tiles[c.domain]} label={D.chips[i]} t={t} />
        ))}
      </View>
    </>
  );
}

function Chip({ p, at, icon, tile, label, t }: { p: SharedValue<number>; at: number; icon: IconName; tile: { bg: string; fg: string }; label: string; t: Theme }) {
  const style = useAnimatedStyle(() => {
    const v = backOut(seg(p.get(), at, at + 0.1));
    return { opacity: seg(p.get(), at, at + 0.05) * outro(p.get()), transform: [{ translateY: 12 * (1 - v) }, { scale: 0.85 + 0.15 * v }] };
  });
  return (
    <Animated.View style={[styles.chip, { backgroundColor: t.c.surface }, t.hairline, t.shadow.soft, style]}>
      <View style={[styles.chipIcon, { backgroundColor: tile.bg }]}>
        <Icon name={icon} color={tile.fg} size={14} strokeWidth={2.4} />
      </View>
      <AppText variant="captionStrong" maxScale={1}>
        {label}
      </AppText>
    </Animated.View>
  );
}

// 2 · BUDDY le recuerda: ondas de voz junto al robot, el globo del recordatorio aparece y la campana suena.
function ReminderScene({ active, t }: SceneProps) {
  const p = useTimeline(active, 4400);
  const f = useFloat(active);
  const robot = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * f.get() }, { rotate: `${-3 + 3 * f.get()}deg` }] }));
  const bubble = useAnimatedStyle(() => {
    const v = backOut(seg(p.get(), 0.08, 0.24));
    return { opacity: seg(p.get(), 0.08, 0.14) * outro(p.get()), transform: [{ scale: 0.7 + 0.3 * v }] };
  });
  const bell = useAnimatedStyle(() => {
    const v = seg(p.get(), 0.24, 0.52);
    return { transform: [{ rotate: `${Math.sin(v * Math.PI * 7) * 16 * (1 - v)}deg` }] };
  });
  const tile = t.tiles.medication;
  return (
    <>
      <Animated.View style={[styles.robotLeft, robot]}>
        <Image source={ROBOT_IMAGE} style={{ width: 160 * ROBOT_RATIO, height: 160 }} contentFit="contain" accessible={false} />
      </Animated.View>
      <View style={styles.waves}>
        {[0, 1, 2].map((i) => (
          <Wave key={i} i={i} p={p} color={t.c.accent} />
        ))}
      </View>
      <Animated.View style={[styles.bubble, card(t, 22), bubble]}>
        <View style={[styles.tail, { backgroundColor: t.c.surface }]} />
        <Animated.View style={[styles.tile, { backgroundColor: tile.bg }, bell]}>
          <Icon name="bell" color={tile.fg} size={24} strokeWidth={2.4} />
        </Animated.View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" maxScale={1} numberOfLines={2}>
            {D.reminder}
          </AppText>
          <AppText variant="caption" color={t.c.muted} maxScale={1}>
            {D.reminderTime}
          </AppText>
        </View>
      </Animated.View>
    </>
  );
}

/** Arco de voz: late en secuencia hacia afuera. */
function Wave({ i, p, color }: { i: number; p: SharedValue<number>; color: string }) {
  const r = 12 + i * 11;
  const style = useAnimatedStyle(() => {
    const v = (((p.get() * 6 - i * 0.22) % 1) + 1) % 1;
    return { opacity: (0.25 + 0.75 * Math.sin(v * Math.PI)) * outro(p.get()) };
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

// 3 · Confirma con un toque: un dedo llega al botón, lo presiona, sale la onda y el botón pasa a "Tomada".
function ConfirmScene({ active, t }: SceneProps) {
  const p = useTimeline(active, 4200);
  const finger = useAnimatedStyle(() => {
    const inV = easeOut(seg(p.get(), 0.08, 0.26));
    const outV = seg(p.get(), 0.46, 0.6);
    const press = seg(p.get(), 0.28, 0.32) - seg(p.get(), 0.33, 0.38);
    return {
      opacity: Math.min(1, inV * 1.5) * (1 - outV),
      transform: [{ translateX: 60 * (1 - inV) + 30 * outV }, { translateY: 70 * (1 - inV) + 50 * outV }, { scale: 1 - 0.18 * press }],
    };
  });
  const ripple = useAnimatedStyle(() => {
    const v = seg(p.get(), 0.31, 0.52);
    return { opacity: v > 0 && v < 1 ? 0.7 * (1 - v) : 0, transform: [{ scale: 0.4 + 2.2 * v }] };
  });
  const button = useAnimatedStyle(() => {
    const press = seg(p.get(), 0.28, 0.32) - seg(p.get(), 0.33, 0.4);
    return { transform: [{ scale: 1 - 0.04 * press }] };
  });
  // "Tomada" se mantiene y, en el cierre, el botón vuelve a "Ya la tomé" para repetir.
  const done = useAnimatedStyle(() => ({ opacity: seg(p.get(), 0.32, 0.4) * outro(p.get()) }));
  const before = useAnimatedStyle(() => ({ opacity: 1 - seg(p.get(), 0.32, 0.38) * outro(p.get()) }));
  const after = useAnimatedStyle(() => {
    const v = backOut(seg(p.get(), 0.34, 0.46));
    return { opacity: seg(p.get(), 0.34, 0.4) * outro(p.get()), transform: [{ scale: 0.6 + 0.4 * v }] };
  });
  const success = t.hc ? ([t.c.text, t.c.text] as const) : t.dark ? (['#4AD395', '#2FB57A'] as const) : (['#2E9E64', '#1F7A4D'] as const);
  const onSuccess = t.hc ? t.c.bg : t.dark ? '#062A2A' : '#FFFFFF';
  const tile = t.tiles.medication;
  return (
    <>
      <View style={[styles.panel, card(t, 32)]}>
        <AppText variant="captionStrong" color={t.c.muted} maxScale={1}>
          {D.reminderTime}
        </AppText>
        <View style={[styles.medTile, { backgroundColor: tile.bg }]}>
          <Icon name="meds" color={tile.fg} size={32} strokeWidth={2.2} />
        </View>
        <AppText variant="h3" maxScale={1}>
          {D.med}
        </AppText>
        <Animated.View style={[styles.bigButton, button]}>
          <LinearGradient colors={t.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Animated.View style={[StyleSheet.absoluteFill, done]}>
            <LinearGradient colors={success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View style={[styles.center, before]}>
            <AppText variant="h3" color={t.c.onPrimary} maxScale={1}>
              {D.take}
            </AppText>
          </Animated.View>
          <Animated.View style={[styles.center, styles.row, after]}>
            <Icon name="check" color={onSuccess} size={24} strokeWidth={3} />
            <AppText variant="h3" color={onSuccess} maxScale={1}>
              {D.taken}
            </AppText>
          </Animated.View>
        </Animated.View>
      </View>
      <Animated.View style={[styles.ripple, ripple]} />
      {t.hc ? null : BURST.map((b, i) => <Confetti key={i} p={p} spec={b} color={t.tones[b.tone].solid} />)}
      <Animated.View style={[styles.finger, { backgroundColor: t.dark ? 'rgba(255,255,255,0.32)' : 'rgba(16,42,51,0.24)' }, finger]} />
    </>
  );
}

/** Confeti de la confirmación: ocho piezas de los colores de la marca salen del botón al quedar "Tomada". */
const BURST: { a: number; r: number; s: number; tone: Tone }[] = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
  a: (i / 8) * Math.PI * 2 + 0.3,
  r: 58 + (i % 3) * 18,
  s: 8 + (i % 3) * 3,
  tone: (['mint', 'coral', 'lavender', 'sky', 'yellow'] as const)[i % 5],
}));

function Confetti({ p, spec, color }: { p: SharedValue<number>; spec: (typeof BURST)[number]; color: string }) {
  const style = useAnimatedStyle(() => {
    const v = easeOut(seg(p.get(), 0.34, 0.62));
    return {
      opacity: v > 0 && v < 1 ? 1 - v * v : 0,
      transform: [{ translateX: Math.cos(spec.a) * spec.r * v }, { translateY: Math.sin(spec.a) * spec.r * v - 12 * v }, { scale: 1 - 0.4 * v }, { rotate: `${v * 200}deg` }],
    };
  });
  return <Animated.View style={[styles.confetti, { width: spec.s, height: spec.s, borderRadius: spec.s / 3, backgroundColor: color }, style]} />;
}

// 4 · Te enteras a tiempo: llega el aviso al celular del hijo, el ícono late y aparecen las acciones.
function AlertScene({ active, t }: SceneProps) {
  const p = useTimeline(active, 4600);
  const note = useAnimatedStyle(() => {
    const v = backOut(seg(p.get(), 0.08, 0.24));
    return { opacity: seg(p.get(), 0.08, 0.14) * outro(p.get()), transform: [{ translateY: -40 * (1 - v) }] };
  });
  const ping = useAnimatedStyle(() => {
    const a = seg(p.get(), 0.24, 0.46);
    const b = seg(p.get(), 0.5, 0.72);
    const v = a < 1 ? a : b;
    return { opacity: v > 0 && v < 1 ? 0.8 * (1 - v) : 0, transform: [{ scale: 1 + 0.7 * v }] };
  });
  const actions = useAnimatedStyle(() => {
    const v = easeOut(seg(p.get(), 0.3, 0.44));
    return { opacity: v * outro(p.get()), transform: [{ translateY: 14 * (1 - v) }] };
  });
  return (
    <>
      <View style={styles.clock}>
        <AppText variant="heroXL" align="center" color={t.c.text} maxScale={1}>
          {D.clock}
        </AppText>
      </View>
      <Animated.View style={[styles.note, card(t, 22), note]}>
        <Image source={APP_ICON} style={styles.appIcon} contentFit="cover" accessible={false} />
        <View style={styles.flex}>
          <View style={styles.noteHead}>
            <AppText variant="captionStrong" maxScale={1}>
              BUDDY
            </AppText>
            <AppText variant="meta" color={t.c.muted} maxScale={1}>
              {D.now}
            </AppText>
          </View>
          <AppText variant="secondary" maxScale={1} numberOfLines={2}>
            {D.alert}
          </AppText>
        </View>
      </Animated.View>
      <Animated.View style={[styles.ping, { borderColor: t.status.attention.accent }, ping]} />
      <Animated.View style={[styles.actions, actions]}>
        <View style={[styles.action, styles.row]}>
          <LinearGradient colors={t.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Icon name="phone" color={t.c.onPrimary} size={18} strokeWidth={2.4} />
          <AppText variant="secondaryStrong" color={t.c.onPrimary} maxScale={1}>
            {D.call}
          </AppText>
        </View>
        <View style={[styles.action, { backgroundColor: t.c.surface }, t.hairline]}>
          <AppText variant="secondaryStrong" color={t.hc ? t.c.text : t.ink.info} maxScale={1}>
            {D.view}
          </AppText>
        </View>
      </Animated.View>
    </>
  );
}

const SCENES: ComponentType<SceneProps>[] = [StatusScene, ReminderScene, ConfirmScene, AlertScene];

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center' },
  canvas: { width: CANVAS.w, height: CANVAS.h },
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ccw: { transform: [{ rotate: '-90deg' }] },
  // 1
  robotTop: { position: 'absolute', top: 0, left: (CANVAS.w - 150 * ROBOT_RATIO) / 2 },
  statusCard: { position: 'absolute', top: 142, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  ring: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  chips: { position: 'absolute', top: 240, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingLeft: 6, paddingRight: 10, borderRadius: 999 },
  chipIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  // 2
  robotLeft: { position: 'absolute', top: 4, left: 10 },
  waves: { position: 'absolute', top: 30, left: 160, width: 48, height: 80 },
  bubble: { position: 'absolute', top: 176, left: 22, right: 6, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, transformOrigin: 'top left' },
  tail: { position: 'absolute', top: -7, left: 44, width: 16, height: 16, transform: [{ rotate: '45deg' }], borderTopLeftRadius: 3 },
  tile: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  // 3 (botón centrado en x 160, y 250 del lienzo)
  panel: { position: 'absolute', top: 0, bottom: 0, left: 44, right: 44, alignItems: 'center', padding: 18, gap: 8 },
  medTile: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  bigButton: { position: 'absolute', left: 18, right: 18, bottom: 18, height: 64, borderRadius: 20, overflow: 'hidden' },
  ripple: { position: 'absolute', left: 140, top: 230, width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#FFFFFF' },
  finger: { position: 'absolute', left: 148, top: 236, width: 46, height: 46, borderRadius: 23, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.95)' },
  confetti: { position: 'absolute', left: 156, top: 246 },
  // 4
  clock: { position: 'absolute', top: 4, left: 0, right: 0 },
  note: { position: 'absolute', top: 92, left: 4, right: 4, flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  appIcon: { width: 42, height: 42, borderRadius: 11 },
  ping: { position: 'absolute', top: 106, left: 18, width: 42, height: 42, borderRadius: 13, borderWidth: 2.5 },
  actions: { position: 'absolute', top: 212, left: 4, right: 4, flexDirection: 'row', gap: 10 },
  action: { flex: 1, height: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
