/**
 * RobotStage: una sola instancia del robot por encima de las pantallas. Persiste entre pantallas y vuela de un
 * ancla ("perch") a otra en lugar de aparecer y desaparecer.
 *
 * - Las pantallas reservan su sitio con `<RobotPerch name size />` (un View vacío medido con measureInWindow).
 * - `useRobot()` permite `flyTo(rect)` (visita temporal, p. ej. el botón que se pulsó), `goHome()`, `setMood()`,
 *   `shake()` y `celebrateAndLeave()`.
 * Vuelo en el hilo de UI: curva Bézier con dos progresos (x ease-out; y ease-in-out con sobreimpulso), inclinación en la
 * dirección del movimiento (±20°), escala .9→1.05, cometa menta de 3 estelas, propulsor encendido y aterrizaje con
 * squash & stretch, destello y háptico. Con "reducir movimiento": sin vuelos, solo un fundido.
 *
 * Límite: el ancla se mide al enfocar la pantalla; si la pantalla se desplaza, el robot no la sigue. Por eso las anclas
 * van en zonas fijas (cabeceras, héroes). Las pantallas con scroll usan un <BuddyRobot> local.
 */
import { useIsFocused } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type View as RNView, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { motion } from '@/theme';
import { tapHaptic } from '@/utils/haptics';

import { BuddyRobot, ROBOT_RATIO, SoftEllipse, type RobotMood } from './index';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PerchOptions {
  /** Alto del robot en esta ancla. */
  size: number;
  mood?: RobotMood;
  /** Primera aparición: vuela desde abajo a la derecha (bienvenida) o aparece con un fundido. */
  entrance?: 'fly' | 'fade';
  sparkles?: boolean;
  tapFlip?: boolean;
}

export interface VisitOptions {
  /** Alto del robot durante la visita (por defecto, el de su ancla). */
  size?: number;
  /** Dónde posarse respecto al elemento. */
  side?: 'above' | 'right' | 'left';
  mood?: RobotMood;
  look?: number;
}

interface RobotApi {
  perch: (name: string, rect: Rect, opts: PerchOptions) => void;
  release: (name: string) => void;
  flyTo: (rect: Rect, opts?: VisitOptions) => Promise<void>;
  goHome: () => Promise<void>;
  setMood: (mood: RobotMood, look?: number) => void;
  shake: () => void;
  celebrateAndLeave: () => Promise<void>;
}

const noop = async () => undefined;
const RobotContext = createContext<RobotApi>({
  perch: () => undefined,
  release: () => undefined,
  flyTo: noop,
  goHome: noop,
  setMood: () => undefined,
  shake: () => undefined,
  celebrateAndLeave: noop,
});

export function useRobot() {
  return useContext(RobotContext);
}

/** Centro (cx, cy) donde se posa el robot respecto a un elemento. */
function anchorPoint(rect: Rect, size: number, side: VisitOptions['side'] = 'above') {
  const w = size * ROBOT_RATIO;
  if (side === 'right') return { cx: rect.x + rect.width - w * 0.35, cy: rect.y - size * 0.32 };
  if (side === 'left') return { cx: rect.x + w * 0.35, cy: rect.y - size * 0.32 };
  return { cx: rect.x + rect.width / 2, cy: rect.y - size * 0.45 };
}

const COMET = [0.25, 0.15, 0.08];

export function RobotStageProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [size, setSize] = useState(140);
  const [mood, setMoodState] = useState<RobotMood>('idle');
  const [look, setLook] = useState(0);
  const [opts, setOpts] = useState<PerchOptions>({ size: 140 });
  const [flying, setFlying] = useState(false);
  const home = useRef<{ name: string; rect: Rect; opts: PerchOptions } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pos = useRef({ cx: 0, cy: 0, size: 140, shown: false });

  // Trayectoria
  const x0 = useSharedValue(0);
  const y0 = useSharedValue(0);
  const x1 = useSharedValue(0);
  const y1 = useSharedValue(0);
  const s0 = useSharedValue(1);
  const px = useSharedValue(1);
  const py = useSharedValue(1);
  const opacity = useSharedValue(0);
  const squash = useSharedValue(1);
  const flash = useSharedValue(0);
  const shakeV = useSharedValue(0);
  const spin = useSharedValue(0);

  const fly = useCallback(
    (cx: number, cy: number, nextSize: number, entrance?: PerchOptions['entrance']): Promise<void> => {
      const from = pos.current;
      setSize(nextSize);
      if (reduce || (!from.shown && entrance !== 'fly')) {
        // Sin vuelo: aparece en su sitio con un fundido.
        [px, py].forEach((v) => cancelAnimation(v));
        x0.set(cx);
        y0.set(cy);
        x1.set(cx);
        y1.set(cy);
        s0.set(1);
        px.set(1);
        py.set(1);
        opacity.set(withTiming(1, { duration: 320 }));
        pos.current = { cx, cy, size: nextSize, shown: true };
        return Promise.resolve();
      }
      const start = from.shown ? from : { cx: cx + 260, cy: cy + 520, size: nextSize * 0.6 };
      const dist = Math.hypot(cx - start.cx, cy - start.cy);
      const duration = Math.round(Math.min(1100, 700 + dist * 0.6));
      x0.set(start.cx);
      y0.set(start.cy);
      x1.set(cx);
      y1.set(cy);
      s0.set(start.size / nextSize);
      px.set(0);
      py.set(0);
      opacity.set(withTiming(1, { duration: 200 }));
      setFlying(true);
      px.set(withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
      py.set(withTiming(1, { duration, easing: Easing.bezier(0.45, 0, 0.3, 1.18) }));
      squash.set(withSequence(withTiming(1, { duration }), withTiming(0.94, { duration: 110 }), withTiming(1.04, { duration: 140 }), withSpring(1, motion.spring)));
      flash.set(withSequence(withTiming(0, { duration }), withTiming(1, { duration: 1 }), withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) })));
      pos.current = { cx, cy, size: nextSize, shown: true };
      return new Promise((resolve) =>
        setTimeout(() => {
          setFlying(false);
          tapHaptic();
          resolve();
        }, duration),
      );
    },
    [reduce, x0, y0, x1, y1, s0, px, py, opacity, squash, flash],
  );

  const api = useMemo<RobotApi>(
    () => ({
      perch: (name, rect, o) => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        home.current = { name, rect, opts: o };
        setOpts(o);
        setMoodState(o.mood ?? 'idle');
        setLook(0);
        setVisible(true);
        const { cx, cy } = { cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2 };
        fly(cx, cy, o.size, o.entrance);
      },
      release: (name) => {
        if (home.current?.name !== name) return;
        home.current = null;
        if (hideTimer.current) clearTimeout(hideTimer.current);
        // Si otra pantalla registra su ancla enseguida, el robot vuela hacia ella; si no, se desvanece.
        hideTimer.current = setTimeout(() => {
          opacity.set(withTiming(0, { duration: 200 }));
          pos.current.shown = false;
          setTimeout(() => setVisible(false), 220);
        }, 250);
      },
      flyTo: (rect, o = {}) => {
        const s = o.size ?? Math.min(pos.current.size, 120);
        const { cx, cy } = anchorPoint(rect, s, o.side);
        if (o.mood) setMoodState(o.mood);
        setLook(o.look ?? 0);
        return fly(cx, cy, s);
      },
      goHome: () => {
        const h = home.current;
        if (!h) return Promise.resolve();
        setMoodState(h.opts.mood ?? 'idle');
        setLook(0);
        return fly(h.rect.x + h.rect.width / 2, h.rect.y + h.rect.height / 2, h.opts.size);
      },
      setMood: (m, l = 0) => {
        setMoodState(m);
        setLook(l);
      },
      shake: () => {
        setMoodState('worry');
        if (!reduce) shakeV.set(withSequence(withTiming(-9, { duration: 70 }), withTiming(9, { duration: 90 }), withTiming(-6, { duration: 80 }), withTiming(0, { duration: 70 })));
      },
      celebrateAndLeave: async () => {
        setMoodState('celebrate');
        if (reduce) return;
        spin.set(withSequence(withTiming(360, { duration: 600, easing: Easing.inOut(Easing.cubic) }), withTiming(0, { duration: 0 })));
        await new Promise((r) => setTimeout(r, 600));
        await fly(pos.current.cx + 40, -pos.current.size, pos.current.size);
        opacity.set(withTiming(0, { duration: 150 }));
        pos.current.shown = false;
      },
    }),
    [fly, opacity, reduce, shakeV, spin],
  );

  const w = size * ROBOT_RATIO;
  const boxW = w * 1.5;
  const boxH = size * 1.18;

  const robotStyle = useAnimatedStyle(() => {
    const p = px.value;
    const q = py.value;
    const arc = Math.max(60, Math.min(220, Math.hypot(x1.value - x0.value, y1.value - y0.value) * 0.35));
    const cx = (x0.value + x1.value) / 2;
    const cy = Math.min(y0.value, y1.value) - arc;
    const bx = (1 - p) * (1 - p) * x0.value + 2 * (1 - p) * p * cx + p * p * x1.value;
    const by = (1 - q) * (1 - q) * y0.value + 2 * (1 - q) * q * cy + q * q * y1.value;
    const dx = x1.value - x0.value;
    const dir = Math.max(-1, Math.min(1, dx / 150));
    const scale = (s0.value + (1 - s0.value) * p) * (0.9 + 0.1 * p + 0.05 * Math.sin(Math.PI * p));
    return {
      opacity: opacity.value,
      transform: [
        { translateX: bx - boxW / 2 },
        { translateY: by - size / 2 },
        { rotate: `${dir * 20 * Math.sin(Math.PI * p) + shakeV.value + spin.value}deg` },
        { scaleX: scale * (2 - squash.value) },
        { scaleY: scale * squash.value },
      ],
    };
  });
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value * 0.8,
    transform: [{ translateX: x1.value - size * 0.7 }, { translateY: y1.value - size * 0.7 }, { scale: 1.6 - flash.value * 0.9 }],
  }));
  const thrustStyle = useAnimatedStyle(() => ({
    opacity: px.value < 1 ? 0.9 * Math.sin(Math.PI * px.value) : 0,
    transform: [{ translateY: size * 0.42 }, { scaleY: 1.4 }],
  }));

  return (
    <RobotContext.Provider value={api}>
      {children}
      {visible ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {!reduce
            ? COMET.map((a, i) => <Comet key={a} px={px} py={py} x0={x0} y0={y0} x1={x1} y1={y1} lag={(i + 1) * 0.07} alpha={a} size={size} />)
            : null}
          <Animated.View pointerEvents="none" style={[styles.abs, { width: size * 1.4, height: size * 1.4 }, flashStyle]}>
            <SoftEllipse color="#5ED9B5" opacity={0.9} />
          </Animated.View>
          <Animated.View style={[styles.abs, { width: boxW, height: boxH }, robotStyle]} pointerEvents="box-none">
            <Animated.View pointerEvents="none" style={[styles.abs, { left: boxW / 2 - w * 0.3, width: w * 0.6, height: size * 0.3, top: size * 0.62 }, thrustStyle]}>
              <SoftEllipse color="#5ED9B5" opacity={0.95} />
            </Animated.View>
            <BuddyRobot
              size={size}
              mood={mood}
              look={look}
              shadow={!flying}
              sparkles={!!opts.sparkles && !flying}
              tapFlip={opts.tapFlip}
              glow
            />
          </Animated.View>
        </View>
      ) : null}
    </RobotContext.Provider>
  );
}

function Comet({
  px,
  py,
  x0,
  y0,
  x1,
  y1,
  lag,
  alpha,
  size,
}: {
  px: SharedValue<number>;
  py: SharedValue<number>;
  x0: SharedValue<number>;
  y0: SharedValue<number>;
  x1: SharedValue<number>;
  y1: SharedValue<number>;
  lag: number;
  alpha: number;
  size: number;
}) {
  const d = size * (0.55 - lag);
  const style = useAnimatedStyle(() => {
    const p = Math.max(0, px.value - lag);
    const q = Math.max(0, py.value - lag);
    const arc = Math.max(60, Math.min(220, Math.hypot(x1.value - x0.value, y1.value - y0.value) * 0.35));
    const cx = (x0.value + x1.value) / 2;
    const cy = Math.min(y0.value, y1.value) - arc;
    const bx = (1 - p) * (1 - p) * x0.value + 2 * (1 - p) * p * cx + p * p * x1.value;
    const by = (1 - q) * (1 - q) * y0.value + 2 * (1 - q) * q * cy + q * q * y1.value;
    const on = px.value > lag && px.value < 1;
    return { opacity: on ? alpha * Math.sin(Math.PI * px.value) * 2.2 : 0, transform: [{ translateX: bx - d / 2 }, { translateY: by - d / 2 }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { width: d, height: d }, style]}>
      <SoftEllipse color="#5ED9B5" opacity={1} />
    </Animated.View>
  );
}

/**
 * Reserva el sitio del robot en una pantalla y lo registra como su ancla mientras la pantalla está enfocada.
 * Es un <View> vacío del tamaño del robot; el robot del escenario se dibuja encima.
 */
export function RobotPerch({ name, style, ...opts }: PerchOptions & { name: string; style?: StyleProp<ViewStyle> }) {
  const robot = useRobot();
  const focused = useIsFocused();
  const ref = useRef<RNView>(null);
  const { size, mood, entrance, sparkles, tapFlip } = opts;

  const measureSelf = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 || height > 0) robot.perch(name, { x, y, width, height }, { size, mood, entrance, sparkles, tapFlip });
    });
  }, [robot, name, size, mood, entrance, sparkles, tapFlip]);

  useEffect(() => {
    if (!focused) return;
    const id = setTimeout(measureSelf, 80);
    return () => {
      clearTimeout(id);
      robot.release(name);
    };
  }, [focused, measureSelf, robot, name]);

  return (
    <View
      ref={ref}
      onLayout={() => {
        if (focused) measureSelf();
      }}
      pointerEvents="none"
      style={[{ width: size * ROBOT_RATIO * 1.5, height: size * 1.18 }, style]}
    />
  );
}

/** Mide un elemento en coordenadas de ventana (para `flyTo`). */
export function measure(ref: React.RefObject<RNView | null>): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!ref.current) return resolve(null);
    ref.current.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0 },
});
