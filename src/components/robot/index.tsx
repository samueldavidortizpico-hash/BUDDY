/**
 * BuddyRobot: el personaje de BUDDY con vuelo, sombra, propulsión, latido, destellos y estados de ánimo.
 * Todo el movimiento corre en el hilo de UI (Reanimated) y solo anima transform y opacidad.
 *
 * PUNTO ÚNICO DE REEMPLAZO: `ROBOT_SOURCE`, `ROBOT_RATIO` y `RobotArt`. Cuando exista una versión por capas
 * (ojos, brazos) o una animación Lottie/Rive, se sustituye `RobotArt` sin tocar pantallas.
 * El recurso actual es una imagen plana: se mueve el conjunto; ojos y brazos no se animan por separado.
 */
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useEffect, useId, useRef } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
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

import { isDark, motion, palette } from '@/theme';
import { successHaptic, tapHaptic } from '@/utils/haptics';

export const ROBOT_SOURCE = require('../../../assets/branding/buddy-robot.png');
/** Ancho / alto del recurso (896×1024). */
export const ROBOT_RATIO = 896 / 1024;
/** Corazón del pecho, relativo a la caja de la imagen (medido sobre buddy-robot.png). Ajustable. */
export const HEART = { x: 0.596, y: 0.756, r: 0.075 };

export type RobotMood = 'idle' | 'wave' | 'think' | 'talk' | 'celebrate' | 'worry';

export interface BuddyRobotProps {
  /** Alto del robot en dp. */
  size?: number;
  mood?: RobotMood;
  /** Vaivén volador continuo (si no, queda quieto salvo reacciones). */
  flying?: boolean;
  /** Halo menta detrás del robot. */
  glow?: boolean;
  /** Sombra elíptica en el suelo y propulsión menta. */
  shadow?: boolean;
  /** Destellos de cuatro puntas alrededor (máximo 6). */
  sparkles?: boolean;
  /** Coreografía de llegada (bienvenida): vuela desde abajo a la derecha. */
  entrance?: boolean;
  /** Al pasar a true salta la coreografía y deja el robot en reposo. */
  skipEntrance?: boolean;
  /** Voltereta al tocar (bienvenida); si no, saltito con destellos. */
  tapFlip?: boolean;
  onPress?: () => void;
  /** Etiqueta cuando el robot comunica algo (talk, worry). Sin ella es decorativo y se oculta al lector. */
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
const GHOSTS = [0.25, 0.15, 0.08];

/** Bucle ida y vuelta entre `from` y `to`. */
function pingPong(v: SharedValue<number>, from: number, to: number, duration: number, delay = 0) {
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

export function BuddyRobot({
  size = 160,
  mood = 'idle',
  flying = true,
  glow = false,
  shadow = true,
  sparkles = false,
  entrance = false,
  skipEntrance = false,
  tapFlip = false,
  onPress,
  accessibilityLabel,
  style,
}: BuddyRobotProps) {
  const reduce = useReducedMotion();
  const focused = useIsFocused();
  const w = size * ROBOT_RATIO;
  const animateEntrance = entrance && !reduce;

  // Bucles base
  const bob = useSharedValue(0); // −1 (arriba) … 1 (abajo)
  const drift = useSharedValue(0);
  const tilt = useSharedValue(0);
  const heart = useSharedValue(0);
  const ring = useSharedValue(0);
  const t0 = useSharedValue(0);
  const t1 = useSharedValue(0);
  const t2 = useSharedValue(0);
  const t3 = useSharedValue(0);
  const t4 = useSharedValue(0);
  const t5 = useSharedValue(0);
  const twinkles = [t0, t1, t2, t3, t4, t5];
  // Reacciones de una vez
  const hop = useSharedValue(0);
  const spin = useSharedValue(0);
  const burst = useSharedValue(0);
  const squash = useSharedValue(1);
  // Entrada
  const fly = useSharedValue(animateEntrance ? 0 : 1);
  const land = useSharedValue(animateEntrance ? 0 : 1);
  const flash = useSharedValue(0);
  const fade = useSharedValue(reduce ? 0 : 1);
  const landed = useRef(!animateEntrance);

  useEffect(() => {
    const loops = [bob, drift, tilt, heart, hop, spin, ring, ...twinkles];
    const stopAll = () => loops.forEach((v) => cancelAnimation(v));
    if (reduce) {
      // Sin vuelo ni bucles: aparición breve y un latido muy leve.
      fade.set(withTiming(1, { duration: 320 }));
      pingPong(heart, 0, 0.35, 2400);
      return () => cancelAnimation(heart);
    }
    if (!focused) {
      stopAll();
      return;
    }
    let delay = 0;
    if (!landed.current) {
      // 0.2–1.4 s vuelo curvo; 1.4–1.9 s aterrizaje con resorte, squash & stretch y destello.
      fly.set(withDelay(200, withTiming(1, { duration: 1200, easing: Easing.linear })));
      land.set(withDelay(1400, withSpring(1, motion.springSoft)));
      squash.set(withDelay(1400, withSequence(withTiming(0.94, { duration: 110 }), withTiming(1.04, { duration: 140 }), withSpring(1, motion.spring))));
      flash.set(withDelay(1400, withSequence(withTiming(1, { duration: 1 }), withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }))));
      landed.current = true;
      delay = 1900;
    }
    const slow = mood === 'worry' ? 1.6 : 1;
    if (flying) {
      pingPong(bob, -1, 1, 2800 * slow, delay);
      pingPong(drift, -1, 1, 5000 * slow, delay);
    }
    if (mood === 'think') pingPong(tilt, -4, 4, 3600, delay);
    else if (mood === 'worry') pingPong(tilt, -5, -2, 4800, delay);
    else pingPong(tilt, -2.5, 2.5, 4200, delay + 700);
    pingPong(heart, 0, 1, 1600, delay);
    if (sparkles) twinkles.forEach((t, i) => pingPong(t, 0, 1, SPARKLES[i].d, delay + i * 260));
    if (mood === 'talk') pingPong(ring, 0, 1, 1200, delay);
    // Saludo cada 7 s: inclinación −10°, 8°, −6°, 0° en 900 ms con un saltito.
    if (mood === 'idle' || mood === 'wave') {
      const first = delay + (mood === 'wave' ? 300 : 6100);
      const wave = withSequence(
        withTiming(-10, { duration: 220 }),
        withTiming(8, { duration: 240 }),
        withTiming(-6, { duration: 220 }),
        withTiming(0, { duration: 220 }),
        withDelay(6100, withTiming(0, { duration: 0 })),
      );
      spin.set(withDelay(first, withRepeat(wave, -1)));
      hop.set(withDelay(first, withRepeat(withSequence(withTiming(-8, { duration: 240 }), withSpring(0, motion.spring), withDelay(6300, withTiming(0, { duration: 0 }))), -1)));
    }
    return stopAll;
    // Los shared values son estables; solo se reinicia por foco, movimiento reducido o cambio de estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, reduce, mood, flying, sparkles]);

  // Saltar la coreografía
  useEffect(() => {
    if (!skipEntrance || reduce) return;
    [fly, land, squash, flash].forEach((v) => cancelAnimation(v));
    fly.set(1);
    land.set(1);
    squash.set(1);
    flash.set(0);
  }, [skipEntrance, reduce, fly, land, squash, flash]);

  // Celebración: salto, voltereta de 360° en 700 ms y estallido de destellos.
  useEffect(() => {
    if (mood !== 'celebrate') return;
    successHaptic();
    if (reduce) return;
    hop.set(withSequence(withTiming(-size * 0.22, { duration: 260, easing: Easing.out(Easing.quad) }), withSpring(0, motion.springSoft)));
    spin.set(withSequence(withTiming(360, { duration: 700, easing: Easing.inOut(Easing.cubic) }), withTiming(0, { duration: 0 })));
    burst.set(withSequence(withTiming(1, { duration: 200 }), withTiming(0, { duration: 700 })));
  }, [mood, reduce, size, hop, spin, burst]);

  const react = () => {
    tapHaptic();
    onPress?.();
    if (reduce) return;
    burst.set(withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 600 })));
    hop.set(withSequence(withTiming(-size * (tapFlip ? 0.18 : 0.1), { duration: 180, easing: Easing.out(Easing.quad) }), withSpring(0, motion.spring)));
    if (tapFlip) spin.set(withSequence(withTiming(360, { duration: 700, easing: Easing.inOut(Easing.cubic) }), withTiming(0, { duration: 0 })));
  };

  // Trayectoria del vuelo de entrada evaluada en p (las copias fantasma usan p con retraso).
  const startX = size * 1.4;
  const startY = size * 1.2;
  const flight = (p: number) => {
    'worklet';
    const out = 1 - (1 - p) * (1 - p) * (1 - p);
    const inOut = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    return {
      x: (1 - out) * startX,
      y: (1 - inOut) * startY - Math.sin(Math.PI * p) * size * 0.35,
      rot: 18 - 24 * out,
      scale: 0.6 + 0.45 * out,
    };
  };

  const body = useAnimatedStyle(() => {
    const f = flight(fly.value);
    const rot = f.rot * (1 - land.value) + tilt.value + spin.value;
    const scale = f.scale - 0.05 * land.value;
    return {
      opacity: fade.value,
      transform: [
        { translateX: f.x + drift.value * size * 0.09 },
        { translateY: f.y + bob.value * size * 0.065 + hop.value },
        { rotate: `${rot}deg` },
        { scaleX: scale * (2 - squash.value) },
        { scaleY: scale * squash.value },
      ],
    };
  });
  // Sombra: se achica y aclara cuando el robot sube.
  const ground = useAnimatedStyle(() => ({
    opacity: fly.value < 1 ? 0 : interpolate(bob.value, [-1, 1], [0.4, 0.75]) * interpolate(hop.value, [-size * 0.2, 0], [0.4, 1], 'clamp'),
    transform: [{ translateX: drift.value * size * 0.09 }, { scaleX: interpolate(bob.value, [-1, 1], [0.78, 1]) }],
  }));
  // Propulsión menta en sincronía con el vaivén.
  const thrust = useAnimatedStyle(() => ({
    opacity: fly.value < 1 ? 0.5 : interpolate(bob.value, [-1, 1], [0.6, 0.35]),
    transform: [{ translateX: drift.value * size * 0.09 }, { translateY: bob.value * size * 0.065 + hop.value }],
  }));
  const heartGlow = useAnimatedStyle(() => ({
    opacity: interpolate(heart.value, [0, 1], [0.6, 1]),
    transform: [{ scale: interpolate(heart.value, [0, 1], [1, 1.15]) }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.7, transform: [{ scale: 1.6 - flash.value * 0.9 }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: (1 - ring.value) * 0.55, transform: [{ scale: 0.9 + ring.value * 0.35 }] }));

  const decorative = !accessibilityLabel && !onPress;
  const boxW = w * 1.5;
  const left = (boxW - w) / 2;

  return (
    <View
      style={[{ width: boxW, height: size * 1.22 }, style]}
      pointerEvents="box-none"
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      accessible={!decorative && !onPress}
      accessibilityRole={!decorative && !onPress ? 'image' : undefined}
      accessibilityLabel={onPress ? undefined : accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    >
      {shadow ? (
        <>
          <Animated.View style={[styles.abs, { bottom: 0, left: left + w * 0.1, width: w * 0.8, height: size * 0.09 }, ground]}>
            <SoftEllipse color={isDark ? '#000000' : palette.petrol} opacity={isDark ? 0.6 : 0.3} />
          </Animated.View>
          <Animated.View style={[styles.abs, { top: size * 0.82, left: left + w * 0.05, width: w * 0.9, height: size * 0.24 }, thrust]}>
            <SoftEllipse color={palette.mint} opacity={0.8} />
          </Animated.View>
        </>
      ) : null}

      {/* Fantasmas de la estela de entrada (máximo 3) */}
      {animateEntrance ? GHOSTS.map((o, i) => <Ghost key={o} fly={fly} lag={(i + 1) * 0.07} alpha={o} flight={flight} w={w} size={size} left={left} />) : null}

      <Animated.View style={[styles.abs, { top: 0, left, width: w, height: size }, body]}>
        {glow ? (
          <View style={[styles.abs, { width: size * 1.3, height: size * 1.3, left: (w - size * 1.3) / 2, top: -size * 0.15 }]}>
            <SoftEllipse color={palette.mint} opacity={isDark ? 0.34 : 0.45} />
          </View>
        ) : null}
        {mood === 'talk' ? (
          <Animated.View style={[styles.ring, { width: size * 1.05, height: size * 1.05, borderRadius: size, left: (w - size * 1.05) / 2, top: -size * 0.02 }, ringStyle]} />
        ) : null}
        <Animated.View style={[styles.abs, { width: size * 1.1, height: size * 1.1, left: (w - size * 1.1) / 2, top: -size * 0.05 }, flashStyle]}>
          <SoftEllipse color={palette.mint} opacity={0.9} />
        </Animated.View>
        <Pressable
          onPress={react}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={onPress ? (accessibilityLabel ?? 'BUDDY') : undefined}
          style={StyleSheet.absoluteFill}
        >
          <RobotArt />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.abs,
              { width: w * HEART.r * 4, height: w * HEART.r * 4, left: w * HEART.x - w * HEART.r * 2, top: size * HEART.y - w * HEART.r * 2 },
              heartGlow,
            ]}
          >
            <SoftEllipse color={palette.coral} opacity={0.7} />
          </Animated.View>
        </Pressable>
        {mood === 'think' ? <ThinkingDots size={size} /> : null}
        {mood === 'talk' ? <Equalizer size={size} /> : null}
      </Animated.View>

      {sparkles || mood === 'celebrate'
        ? SPARKLES.map((s, i) => <Sparkle key={i} spec={s} twinkle={twinkles[i]} burst={burst} w={w} size={size} left={left} />)
        : null}
    </View>
  );
}

/** Arte del robot. Sustituir aquí por la versión por capas, Lottie o Rive. */
function RobotArt() {
  return <Image source={ROBOT_SOURCE} contentFit="contain" style={StyleSheet.absoluteFill} accessible={false} />;
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

type Flight = (p: number) => { x: number; y: number; rot: number; scale: number };

function Ghost({ fly, lag, alpha, flight, w, size, left }: { fly: SharedValue<number>; lag: number; alpha: number; flight: Flight; w: number; size: number; left: number }) {
  const style = useAnimatedStyle(() => {
    const f = flight(Math.max(0, fly.value - lag));
    return {
      opacity: fly.value <= lag || fly.value >= 1 ? 0 : alpha * interpolate(fly.value, [0, 0.85, 1], [1, 1, 0]),
      transform: [{ translateX: f.x }, { translateY: f.y }, { rotate: `${f.rot}deg` }, { scale: f.scale }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { top: 0, left, width: w, height: size }, style]}>
      <Image source={ROBOT_SOURCE} contentFit="contain" style={StyleSheet.absoluteFill} />
    </Animated.View>
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
        <Path d={STAR} fill={spec.s > 0.75 ? palette.mint : isDark ? '#FFFFFF' : palette.yellow} />
      </Svg>
    </Animated.View>
  );
}

function ThinkingDots({ size }: { size: number }) {
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);
  useEffect(() => {
    [a, b, c].forEach((d, i) => pingPong(d, 0, 1, 900, i * 150));
    return () => [a, b, c].forEach((d) => cancelAnimation(d));
  }, [a, b, c]);
  const d = size * 0.07;
  return (
    <View style={[styles.row, { top: -size * 0.04, right: -size * 0.12, gap: d * 0.5 }]} pointerEvents="none">
      {[a, b, c].map((v, i) => (
        <Dot key={i} v={v} d={d} />
      ))}
    </View>
  );
}

function Dot({ v, d }: { v: SharedValue<number>; d: number }) {
  const style = useAnimatedStyle(() => ({ opacity: 0.4 + v.value * 0.6, transform: [{ translateY: -v.value * d * 0.6 }] }));
  return <Animated.View style={[{ width: d, height: d, borderRadius: d, backgroundColor: palette.lavender }, style]} />;
}

function Equalizer({ size }: { size: number }) {
  const a = useSharedValue(0.3);
  const b = useSharedValue(0.3);
  const c = useSharedValue(0.3);
  const d = useSharedValue(0.3);
  useEffect(() => {
    [a, b, c, d].forEach((v, i) => pingPong(v, 0.3, 1, 520 + i * 90, i * 70));
    return () => [a, b, c, d].forEach((v) => cancelAnimation(v));
  }, [a, b, c, d]);
  const h = size * 0.14;
  return (
    <View style={[styles.row, styles.eq, { top: -h * 1.1, height: h, gap: h * 0.18 }]} pointerEvents="none">
      {[a, b, c, d].map((v, i) => (
        <Bar key={i} v={v} h={h} />
      ))}
    </View>
  );
}

function Bar({ v, h }: { v: SharedValue<number>; h: number }) {
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: v.value }] }));
  return <Animated.View style={[{ width: h * 0.22, height: h, borderRadius: h, backgroundColor: palette.mint }, style]} />;
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  ring: { position: 'absolute', borderWidth: 3, borderColor: palette.mint },
  row: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  eq: { alignSelf: 'center' },
});
