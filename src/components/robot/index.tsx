/**
 * BuddyRobot: el personaje de BUDDY con vuelo en reposo, sombra, propulsor, latido, destellos, estados de ánimo y
 * reacción al toque. Todo el movimiento corre en el hilo de UI (Reanimated) y solo anima transform y opacidad.
 *
 * Arte: si existe un PNG nítido (≥ 1000 px, exportado a 4x desde Figma) se registra en `HIGH_RES_PNG` y se usa;
 * si no, se usa el robot vectorial por capas (vector.tsx), que es nítido a cualquier tamaño y anima ojos y brazos.
 * Ya no hay robot en capa global: cada pantalla dibuja el suyo dentro de su contenido (ver auth-robot.tsx).
 */
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { motion } from '@/theme';
import { useTheme } from '@/theme/provider';
import { softHaptic, successHaptic, tapHaptic } from '@/utils/haptics';

import { BuddyRobotVector, VECTOR_RATIO, type RobotMood } from './vector';

export type { RobotMood } from './vector';

/**
 * PNG de alta resolución con fondo transparente. `null` mientras el dueño no aporte la exportación a 4x:
 * el PNG actual del logo mide 112×128 px y se vería pixelado.
 */
const HIGH_RES_PNG: number | null = null;
const PNG_RATIO = 896 / 1024;

export const ROBOT_RATIO = HIGH_RES_PNG ? PNG_RATIO : VECTOR_RATIO;
/** Alto mínimo del robot en cualquier pantalla (el encabezado del chat usa `compact`, 56). */
export const ROBOT_MIN = 96;

export interface BuddyRobotProps {
  /** Fallbacks fuera del navegador: anima sin suscribirse al foco de una ruta. */
  navigationIndependent?: boolean;
  /** Alto del robot en dp (mínimo 96 salvo `compact`). */
  size?: number;
  mood?: RobotMood;
  /** −1…1: hacia dónde mira. */
  look?: number;
  /** Vaivén volador continuo. */
  flying?: boolean;
  /** Halo menta detrás del robot (siempre en oscuro para que no se pierda). */
  glow?: boolean;
  /** Sombra elíptica en el suelo y propulsor menta. */
  shadow?: boolean;
  /** Destellos de cuatro puntas alrededor (máximo 6). */
  sparkles?: boolean;
  /** Voltereta al tocar (bienvenida); si no, saltito con destellos. */
  tapFlip?: boolean;
  /** Permite tamaños menores de 96 (encabezado del chat). */
  compact?: boolean;
  /** Pulso de reacción externo: al cambiar, el robot da un saltito (p. ej., al enviar en el chat). */
  bump?: number;
  /** Bolita roja con el número de novedades sin leer (lanzador). */
  badge?: number;
  onPress?: () => void;
  /** Etiqueta cuando el robot comunica algo. Sin ella es decorativo y se oculta al lector. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const sine = Easing.inOut(Easing.sin);
const SPARKLES = [
  { x: -0.12, y: 0.12, s: 1, d: 1600 },
  { x: 0.98, y: 0.04, s: 0.8, d: 2000 },
  { x: 1.08, y: 0.5, s: 0.65, d: 2400 },
  { x: -0.18, y: 0.6, s: 0.7, d: 1800 },
  { x: 0.5, y: -0.1, s: 0.55, d: 2200 },
  { x: 0.86, y: 0.86, s: 0.6, d: 1700 },
];

export function pingPong(v: SharedValue<number>, from: number, to: number, duration: number, delay = 0) {
  v.set(from);
  v.set(
    withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(to, { duration: duration / 2, easing: sine }), withTiming(from, { duration: duration / 2, easing: sine })),
        -1,
      ),
    ),
  );
}

/** Arte del robot: PNG nítido si existe, si no el vector por capas. */
export function RobotArt({ size, mood, look, animated = true }: { size: number; mood: RobotMood; look: number; animated?: boolean }) {
  if (HIGH_RES_PNG) {
    return <Image source={HIGH_RES_PNG} contentFit="contain" style={{ width: size * PNG_RATIO, height: size }} accessible={false} />;
  }
  return <BuddyRobotVector size={size} mood={mood} look={look} animated={animated} />;
}

export function BuddyRobot({ navigationIndependent = false, ...props }: BuddyRobotProps) {
  return navigationIndependent ? <RobotBody {...props} focused /> : <FocusedRobot {...props} />;
}

function FocusedRobot(props: BuddyRobotProps) {
  const focused = useIsFocused();
  return <RobotBody {...props} focused={focused} />;
}

function RobotBody({
  size = 160,
  mood = 'idle',
  look = 0,
  flying = true,
  glow = false,
  shadow = true,
  sparkles = false,
  tapFlip = false,
  compact = false,
  bump,
  badge,
  onPress,
  accessibilityLabel,
  style,
  focused,
}: BuddyRobotProps & { focused: boolean }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const h = compact ? size : Math.max(size, ROBOT_MIN);
  const w = h * ROBOT_RATIO;
  const [reaction, setReaction] = useState<RobotMood | null>(null);
  const [asleep, setAsleep] = useState(false);
  const [petting, setPetting] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const touch = useRef({ x: 0, y: 0, moved: 0, lastTap: 0 });
  const petHaptic = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bob = useSharedValue(0);
  const drift = useSharedValue(0);
  const tilt = useSharedValue(0);
  const hop = useSharedValue(0);
  const spin = useSharedValue(0);
  const burst = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const fade = useSharedValue(reduce ? 0 : 1);
  const gazeX = useSharedValue(0);
  const gazeY = useSharedValue(0);
  const t0 = useSharedValue(0);
  const t1 = useSharedValue(0);
  const t2 = useSharedValue(0);
  const t3 = useSharedValue(0);
  const t4 = useSharedValue(0);
  const t5 = useSharedValue(0);
  const twinkles = [t0, t1, t2, t3, t4, t5];

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Reposo: tras 20 s sin tocarlo bosteza (sorprendido) y se duerme; despierta al tocarlo o al cambiar de estado.
  const scheduleIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (reduce || !focused || mood !== 'idle') return;
    idleTimer.current = setTimeout(() => {
      setReaction('surprised');
      idleTimer.current = setTimeout(() => {
        setReaction(null);
        setAsleep(true);
      }, 1200);
    }, IDLE_SLEEP_MS);
  }, [reduce, focused, mood]);
  useEffect(() => {
    scheduleIdle();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [scheduleIdle]);
  const armIdle = () => {
    setAsleep(false);
    scheduleIdle();
  };

  useEffect(
    () => () => {
      clearTimers();
      if (petHaptic.current) clearInterval(petHaptic.current);
    },
    [clearTimers],
  );

  useEffect(() => {
    const loops = [bob, drift, tilt, hop, spin, burst, wiggle, fade, ...twinkles];
    const stopAll = () => loops.forEach((v) => cancelAnimation(v));
    if (reduce) {
      stopAll();
      [bob, drift, tilt, hop, spin, burst, wiggle, ...twinkles].forEach((v) => v.set(0));
      fade.set(withTiming(1, { duration: 320 }));
      return stopAll;
    }
    if (!focused) {
      stopAll();
      return;
    }
    const slow = mood === 'worry' || mood === 'sleep' || asleep ? 1.6 : 1;
    if (flying) {
      pingPong(bob, -1, 1, 2800 * slow);
      pingPong(drift, -1, 1, 5000 * slow);
      pingPong(tilt, -2.5, 2.5, 4200 * slow, 700);
    }
    if (sparkles) twinkles.forEach((v, i) => pingPong(v, 0, 1, SPARKLES[i].d, i * 260));
    // Saludo cada 7 s: −10°, 8°, −6°, 0° en 900 ms.
    if (flying && !asleep && (mood === 'idle' || mood === 'wave')) {
      const wave = withSequence(
        withTiming(-10, { duration: 220 }),
        withTiming(8, { duration: 240 }),
        withTiming(-6, { duration: 220 }),
        withTiming(0, { duration: 220 }),
        withDelay(6100, withTiming(0, { duration: 0 })),
      );
      spin.set(withDelay(6100, withRepeat(wave, -1)));
    }
    return stopAll;
    // Los shared values son estables; solo se reinicia por foco, movimiento reducido o cambio de estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, reduce, mood, flying, sparkles, asleep]);

  // Celebración: salto, voltereta de 360° en 700 ms y estallido de destellos.
  useEffect(() => {
    if (mood !== 'celebrate') return;
    successHaptic();
    if (reduce) return;
    hop.set(withSequence(withTiming(-h * 0.22, { duration: 260, easing: Easing.out(Easing.quad) }), withSpring(0, motion.springSoft)));
    spin.set(withSequence(withTiming(360, { duration: 700, easing: Easing.inOut(Easing.cubic) }), withTiming(0, { duration: 0 })));
    burst.set(withSequence(withTiming(1, { duration: 200 }), withTiming(0, { duration: 700 })));
  }, [mood, reduce, h, hop, spin, burst]);

  // Pulso externo (chat: al enviar).
  useEffect(() => {
    if (bump === undefined || bump === 0 || reduce) return;
    hop.set(withSequence(withTiming(-h * 0.14, { duration: 160, easing: Easing.out(Easing.quad) }), withSpring(0, motion.spring)));
    burst.set(withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 500 })));
  }, [bump, reduce, h, hop, burst]);

  const react = (next: RobotMood, ms: number) => {
    clearTimers();
    setReaction(next);
    later(() => setReaction(null), ms);
  };

  /** Toque: saltito con ojos felices; doble toque: voltereta con guiño. */
  const onTap = () => {
    armIdle();
    tapHaptic();
    const now = Date.now();
    const double = now - touch.current.lastTap < 320;
    touch.current.lastTap = double ? 0 : now;
    if (double) {
      react('wink', 1300);
      if (!reduce) spin.set(withSequence(withTiming(360, { duration: 650, easing: Easing.inOut(Easing.cubic) }), withTiming(0, { duration: 0 })));
    } else {
      react('happy', 1100);
      if (!reduce) {
        burst.set(withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 600 })));
        hop.set(withSequence(withTiming(-h * (tapFlip ? 0.18 : 0.12), { duration: 180, easing: Easing.out(Easing.quad) }), withSpring(0, motion.spring)));
        if (tapFlip) spin.set(withSequence(withTiming(360, { duration: 700, easing: Easing.inOut(Easing.cubic) }), withTiming(0, { duration: 0 })));
      }
    }
    onPress?.();
  };

  /** Caricia (arrastrar sobre el robot o mantener 600 ms): ojos de corazón, meneo, corazones y vibración suave. */
  const startPet = () => {
    if (petting) return;
    clearTimers();
    armIdle();
    setPetting(true);
    setReaction('love');
    if (!reduce) wiggle.set(withRepeat(withSequence(withTiming(-6, { duration: 160 }), withTiming(6, { duration: 160 })), -1, true));
    softHaptic();
    if (petHaptic.current) clearInterval(petHaptic.current);
    petHaptic.current = setInterval(softHaptic, 450);
  };
  const endPet = () => {
    if (petHaptic.current) clearInterval(petHaptic.current);
    petHaptic.current = null;
    gazeX.set(withSpring(0, motion.spring));
    gazeY.set(withSpring(0, motion.spring));
    later(() => {
      setPetting(false);
      setReaction(null);
      cancelAnimation(wiggle);
      wiggle.set(withSpring(0, motion.spring));
    }, PET_LINGER_MS);
  };

  const touchHandlers = {
    onTouchStart: (e: GestureResponderEvent) => {
      touch.current = { ...touch.current, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, moved: 0 };
      if (asleep) setAsleep(false);
    },
    onTouchMove: (e: GestureResponderEvent) => {
      const dx = e.nativeEvent.pageX - touch.current.x;
      const dy = e.nativeEvent.pageY - touch.current.y;
      touch.current.moved = Math.max(touch.current.moved, Math.hypot(dx, dy));
      // Los ojos siguen al dedo.
      gazeX.set(Math.max(-1, Math.min(1, dx / (w * 0.5))));
      gazeY.set(Math.max(-1, Math.min(1, dy / (h * 0.5))));
      if (touch.current.moved > 24) startPet();
    },
    onTouchEnd: () => {
      if (petting || touch.current.moved > 24) endPet();
      else {
        gazeX.set(withSpring(0, motion.spring));
        gazeY.set(withSpring(0, motion.spring));
      }
    },
  };

  const body = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateX: drift.value * h * 0.06 },
      { translateY: bob.value * h * 0.045 + hop.value },
      { rotate: `${tilt.value + spin.value + wiggle.value}deg` },
    ],
  }));
  const ground = useAnimatedStyle(() => ({
    opacity: interpolate(bob.value, [-1, 1], [0.45, 0.8]) * interpolate(hop.value, [-h * 0.2, 0], [0.4, 1], 'clamp'),
    transform: [{ translateX: drift.value * h * 0.06 }, { scaleX: interpolate(bob.value, [-1, 1], [0.78, 1]) }],
  }));
  const thrust = useAnimatedStyle(() => ({
    opacity: interpolate(bob.value, [-1, 1], [0.65, 0.35]),
    transform: [{ translateX: drift.value * h * 0.06 }, { translateY: bob.value * h * 0.045 + hop.value }, { scaleY: interpolate(bob.value, [-1, 1], [1.15, 0.9]) }],
  }));

  const shown: RobotMood = reaction ?? (asleep && mood === 'idle' ? 'sleep' : mood);
  const decorative = !accessibilityLabel && !onPress;
  const boxW = w * 1.5;
  const left = (boxW - w) / 2;
  const showGlow = (glow || t.dark) && !t.hc;

  return (
    <View
      style={[{ width: boxW, height: h * 1.18 }, style]}
      pointerEvents="box-none"
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      accessible={!decorative && !onPress}
      accessibilityRole={!decorative && !onPress ? 'image' : undefined}
      accessibilityLabel={onPress ? undefined : accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    >
      {shadow && !t.hc ? (
        <>
          <Animated.View style={[styles.abs, { bottom: 0, left: left + w * 0.12, width: w * 0.76, height: h * 0.08 }, ground]}>
            <SoftEllipse color={t.dark ? '#000000' : '#174A59'} opacity={t.dark ? 0.6 : 0.3} />
          </Animated.View>
          <Animated.View style={[styles.abs, { top: h * 0.84, left: left + w * 0.18, width: w * 0.64, height: h * 0.2 }, thrust]}>
            <SoftEllipse color="#5ED9B5" opacity={0.85} />
          </Animated.View>
        </>
      ) : null}

      <Animated.View style={[styles.abs, { top: 0, left, width: w, height: h }, body]} {...touchHandlers}>
        {showGlow ? (
          <View style={[styles.abs, { width: h * 1.3, height: h * 1.3, left: (w - h * 1.3) / 2, top: -h * 0.15 }]}>
            <SoftEllipse color="#5ED9B5" opacity={t.dark ? 0.38 : 0.4} />
          </View>
        ) : null}
        <Pressable
          onPress={onTap}
          onLongPress={startPet}
          onPressOut={() => {
            if (petting) endPet();
          }}
          delayLongPress={600}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={onPress ? (accessibilityLabel ?? 'BUDDY') : undefined}
          style={StyleSheet.absoluteFill}
        >
          <BuddyRobotVector size={h} mood={shown} look={look} animated={focused} gazeX={gazeX} gazeY={gazeY} />
        </Pressable>
        {shown === 'think' ? <ThinkingDots size={h} /> : null}
      </Animated.View>

      {petting && !reduce ? HEARTS.map((spec, i) => <FloatingHeart key={i} spec={spec} w={w} size={h} left={left} />) : null}

      {sparkles || mood === 'celebrate' || bump || reaction === 'happy' ? (
        SPARKLES.map((s, i) => <Sparkle key={i} spec={s} twinkle={twinkles[i]} burst={burst} w={w} size={h} left={left} />)
      ) : null}

      {badge ? <Badge count={badge} size={h} right={left - w * 0.05} /> : null}
    </View>
  );
}

const IDLE_SLEEP_MS = 20_000;
const PET_LINGER_MS = 2000;
const HEARTS = [
  { x: 0.1, d: 1400, delay: 0 },
  { x: 0.82, d: 1600, delay: 350 },
  { x: 0.48, d: 1500, delay: 700 },
];

/** Corazón que sube y se desvanece mientras lo acarician (máx. 3, solo transform y opacidad). */
function FloatingHeart({ spec, w, size, left }: { spec: (typeof HEARTS)[number]; w: number; size: number; left: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withDelay(spec.delay, withRepeat(withTiming(1, { duration: spec.d, easing: Easing.out(Easing.quad) }), -1)));
    return () => cancelAnimation(v);
  }, [v, spec]);
  const px = size * 0.16;
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.15, 0.75, 1], [0, 1, 1, 0]),
    transform: [{ translateY: -v.value * size * 0.45 }, { scale: 0.6 + v.value * 0.5 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: left + spec.x * w - px / 2, top: size * 0.15, width: px, height: px }, style]}>
      <Svg width={px} height={px} viewBox="0 0 24 24">
        <Path d="M12 21 C 5 16 2 12.5 2 8.5 C 2 5.5 4.3 3.5 7 3.5 C 9 3.5 11 4.8 12 6.6 C 13 4.8 15 3.5 17 3.5 C 19.7 3.5 22 5.5 22 8.5 C 22 12.5 19 16 12 21 Z" fill="#FF8FA3" />
      </Svg>
    </Animated.View>
  );
}

/** Bolita roja con el número de novedades sin leer; late suavemente. */
function Badge({ count, size, right }: { count: number; size: number; right: number }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    pingPong(v, 1, 1.18, 1200);
    return () => cancelAnimation(v);
  }, [reduce, v]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: v.value }] }));
  const d = Math.max(22, size * 0.3);
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, styles.badge, { top: size * 0.02, right, minWidth: d, height: d, borderRadius: d / 2 }, style]}>
      <Text style={[styles.badgeText, { fontSize: d * 0.55 }]} allowFontScaling={false}>
        {count > 9 ? '9+' : String(count)}
      </Text>
    </Animated.View>
  );
}

/** Elipse con degradado radial: brillo suave sin animar desenfoques. */
export function SoftEllipse({ color, opacity }: { color: string; opacity: number }) {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.45} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="50" rx="50" ry="50" fill={`url(#${id})`} />
    </Svg>
  );
}

const STAR = 'M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z';

function Sparkle({
  spec,
  twinkle,
  burst,
  w,
  size,
  left,
}: {
  spec: (typeof SPARKLES)[number];
  twinkle: SharedValue<number>;
  burst: SharedValue<number>;
  w: number;
  size: number;
  left: number;
}) {
  const t = useTheme();
  const px = size * 0.13 * spec.s;
  const style = useAnimatedStyle(() => {
    const v = Math.max(twinkle.value, burst.value);
    const out = burst.value * 0.35;
    return {
      opacity: v,
      transform: [
        { translateX: (spec.x - 0.5) * w * out },
        { translateY: (spec.y - 0.5) * size * out },
        { scale: 0.5 + v * 0.6 },
        { rotate: `${v * 25}deg` },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: left + spec.x * w - px / 2, top: spec.y * size - px / 2, width: px, height: px }, style]}>
      <Svg width={px} height={px} viewBox="0 0 24 24">
        <Path d={STAR} fill={spec.s > 0.75 ? t.c.mint : t.dark ? '#FFFFFF' : t.c.yellow} />
      </Svg>
    </Animated.View>
  );
}

function ThinkingDots({ size }: { size: number }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);
  useEffect(() => {
    if (reduce) {
      [a, b, c].forEach((d) => { cancelAnimation(d); d.set(0); });
      return;
    }
    [a, b, c].forEach((d, i) => pingPong(d, 0, 1, 900, i * 150));
    return () => [a, b, c].forEach((d) => cancelAnimation(d));
  }, [a, b, c, reduce]);
  const d = size * 0.07;
  return (
    <View style={[styles.row, { top: -size * 0.04, right: -size * 0.12, gap: d * 0.5 }]} pointerEvents="none">
      {[a, b, c].map((v, i) => (
        <Dot key={i} v={v} d={d} color={t.c.lavender} />
      ))}
    </View>
  );
}

function Dot({ v, d, color }: { v: SharedValue<number>; d: number; color: string }) {
  const style = useAnimatedStyle(() => ({ opacity: 0.4 + v.value * 0.6, transform: [{ translateY: -v.value * d * 0.6 }] }));
  return <Animated.View style={[{ width: d, height: d, borderRadius: d, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  row: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  badge: { backgroundColor: '#D93B3B', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: '#FFFFFF' },
  badgeText: { color: '#FFFFFF', fontFamily: 'Manrope_800ExtraBold' },
});
