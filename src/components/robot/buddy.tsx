/**
 * BUDDY vectorial y animado (V5.2). Mismo personaje que `assets/branding/buddy-robot.png` (cabeza blanca, visor
 * petróleo, orejas y brazos menta, corazón coral), dibujado en capas para que cada parte se mueva por separado:
 * parpadeo, saludo con el brazo, antena que se mece, corazón que late y un flotar suave. El PNG traía un borde claro
 * de recorte que sobre los degradados oscuros se veía como una calcomanía; el vector queda nítido en cualquier fondo.
 *
 * Solo transform y opacidad, en el hilo de UI. Con "reducir movimiento" o `active={false}` queda quieto en su pose.
 * Siempre decorativo: lo oculta al lector de pantalla quien lo usa (o `BuddyRobot` con etiqueta).
 */
import { useEffect, useId, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/** Lienzo de diseño: 200 × 220. `size` es el alto en dp. */
const VW = 200;
const VH = 220;
export const BUDDY_RATIO = VW / VH;

export type BuddyMood = 'happy' | 'open' | 'sleep';

const C = {
  shell: ['#FFFFFF', '#D6E4E9'],
  visor: ['#1D5A66', '#0A2730'],
  mint: ['#86EAD3', '#22A68B'],
  eye: '#FFFFFF',
  glow: '#8AF7E0',
  heart: '#FF7A70',
  cheek: '#FF8C82',
};

const HEART = 'M100 194 C 86 184, 82 173, 89 167 C 94 163, 99 166, 100 170 C 101 166, 106 163, 111 167 C 118 173, 114 184, 100 194 Z';

export function Buddy({
  size,
  mood = 'happy',
  wave = false,
  active = true,
  float = true,
  style,
}: {
  size: number;
  mood?: BuddyMood;
  /** Saluda con el brazo derecho en bucle (con pausas). */
  wave?: boolean;
  /** Corre sus bucles solo mientras se ve (p. ej. la página activa del carrusel). */
  active?: boolean;
  float?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const id = `b${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const reduce = useReducedMotion();
  const live = active && !reduce;
  const k = size / VH;

  const blink = useSharedValue(1);
  const arm = useSharedValue(0);
  const bob = useSharedValue(0);
  const beat = useSharedValue(0);

  useEffect(() => {
    const all = [blink, arm, bob, beat];
    if (!live) {
      all.forEach((v) => cancelAnimation(v));
      blink.set(1);
      arm.set(0);
      bob.set(0);
      beat.set(0);
      return;
    }
    const sine = Easing.inOut(Easing.sin);
    if (mood !== 'sleep') {
      // Parpadeo y, de vez en cuando, uno doble: rápido al cerrar, un poco más lento al abrir.
      const shut = () => withSequence(withTiming(0.08, { duration: 70 }), withTiming(1, { duration: 120 }));
      blink.set(withRepeat(withSequence(withDelay(2400, shut()), withDelay(2800, shut()), withDelay(90, shut())), -1));
    }
    if (wave) {
      const swing = (deg: number, ms = 190) => withTiming(deg, { duration: ms, easing: sine });
      arm.set(withRepeat(withSequence(withDelay(400, swing(-24)), swing(8), swing(-24), swing(8), swing(-24), swing(0, 280), withDelay(1600, swing(0, 1))), -1));
    }
    const ms = mood === 'sleep' ? 2600 : 1900;
    if (float) bob.set(withRepeat(withSequence(withTiming(1, { duration: ms, easing: sine }), withTiming(0, { duration: ms, easing: sine })), -1));
    // Latido doble (lub-dub) y pausa.
    beat.set(withRepeat(withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 160 }), withTiming(0.7, { duration: 120 }), withTiming(0, { duration: 420 }), withDelay(900, withTiming(0, { duration: 1 }))), -1));
    return () => all.forEach((v) => cancelAnimation(v));
  }, [live, mood, wave, float, blink, arm, bob, beat]);

  // Al flotar, la cabeza va un poco detrás del cuerpo y se inclina: se siente blanda, no rígida.
  const whole = useAnimatedStyle(() => ({ transform: [{ translateY: -7 * k * bob.get() }] }));
  const head = useAnimatedStyle(() => ({ transform: [{ translateY: 2 * k * bob.get() }, { rotate: `${(mood === 'sleep' ? 7 : -3) + 4 * bob.get()}deg` }] }));
  const antenna = useAnimatedStyle(() => ({ transform: [{ rotate: `${-8 + 16 * bob.get()}deg` }] }));
  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.get() }] }));
  const rightArm = useAnimatedStyle(() => ({ transform: [{ rotate: `${arm.get() - 4 * bob.get()}deg` }] }));
  const leftArm = useAnimatedStyle(() => ({ transform: [{ rotate: `${3 * bob.get()}deg` }] }));
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.14 * beat.get() }] }));

  const w = VW * k;
  const h = VH * k;
  const box = { position: 'absolute' as const, left: 0, top: 0, width: w, height: h };
  const origin = (x: number, y: number) => ({ transformOrigin: `${x * k}px ${y * k}px` });
  // Cada capa es su propio Svg: los degradados se resuelven por id dentro de cada uno, por eso se repiten.
  const layer = (children: ReactNode) => (
    <Svg width={w} height={h} viewBox={`0 0 ${VW} ${VH}`}>
      {children}
    </Svg>
  );

  return (
    <View style={[{ width: w, height: h }, style]} pointerEvents="none">
      <Animated.View style={[box, whole]}>
        <Animated.View style={[box, origin(66, 166), leftArm]}>{layer(<Limb id={`${id}l`} cx={50} cy={186} rot={24} />)}</Animated.View>
        {/* Brazo derecho levantado, listo para saludar: gira desde el hombro. */}
        <Animated.View style={[box, origin(140, 170), rightArm]}>{layer(<Limb id={`${id}r`} cx={166} cy={150} rot={38} />)}</Animated.View>
        <Animated.View style={box}>
          {layer(
            <>
              <Grad id={`${id}s`} c={C.shell} />
              <Grad id={`${id}m`} c={C.mint} />
              <Ellipse cx={100} cy={181} rx={47} ry={37} fill={`url(#${id}s)`} />
              {/* Luz del costado: da volumen sin sombras costosas. */}
              <Ellipse cx={82} cy={172} rx={20} ry={13} fill="#FFFFFF" opacity={0.75} />
              <Ellipse cx={100} cy={144} rx={30} ry={9} fill={`url(#${id}m)`} />
            </>,
          )}
        </Animated.View>
        <Animated.View style={[box, origin(100, 180), heart]}>{layer(<Path d={HEART} fill={C.heart} />)}</Animated.View>

        <Animated.View style={[box, origin(100, 142), head]}>
          <Animated.View style={[box, origin(102, 28), antenna]}>
            {layer(
              <>
                <Grad id={`${id}a`} c={C.mint} />
                <Path d="M102 30 C 101 17, 108 9, 120 9" stroke="#E6F0F2" strokeWidth={6} strokeLinecap="round" fill="none" />
                <Ellipse cx={130} cy={10} rx={15} ry={8} transform="rotate(-14 130 10)" fill={`url(#${id}a)`} />
              </>,
            )}
          </Animated.View>
          <Animated.View style={box}>
            {layer(
              <>
                <Grad id={`${id}h`} c={C.shell} />
                <Grad id={`${id}v`} c={C.visor} />
                <Grad id={`${id}e`} c={C.mint} />
                <Rect x={8} y={66} width={26} height={52} rx={13} fill={`url(#${id}e)`} />
                <Rect x={166} y={66} width={26} height={52} rx={13} fill={`url(#${id}e)`} />
                <Rect x={20} y={22} width={160} height={120} rx={58} fill={`url(#${id}h)`} />
                <Rect x={36} y={39} width={128} height={85} rx={41} fill={`url(#${id}v)`} />
                {/* Reflejo del visor. */}
                <Ellipse cx={76} cy={53} rx={26} ry={6.5} fill="#FFFFFF" opacity={0.12} transform="rotate(-9 76 53)" />
                {mood === 'sleep' ? null : (
                  <>
                    <Ellipse cx={58} cy={106} rx={8} ry={4.5} fill={C.cheek} opacity={0.55} />
                    <Ellipse cx={142} cy={106} rx={8} ry={4.5} fill={C.cheek} opacity={0.55} />
                  </>
                )}
              </>,
            )}
          </Animated.View>
          <Animated.View style={[box, origin(100, 84), eyes]}>{layer(<Eyes mood={mood} />)}</Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Grad({ id, c }: { id: string; c: string[] }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
        <Stop offset="0" stopColor={c[0]} />
        <Stop offset="1" stopColor={c[1]} />
      </LinearGradient>
    </Defs>
  );
}

function Limb({ id, cx, cy, rot }: { id: string; cx: number; cy: number; rot: number }) {
  return (
    <>
      <Grad id={id} c={C.mint} />
      <Ellipse cx={cx} cy={cy} rx={14} ry={24}transform={`rotate(${rot} ${cx} ${cy})`} fill={`url(#${id})`} />
    </>
  );
}

function Eyes({ mood }: { mood: BuddyMood }) {
  const stroke = { stroke: C.eye, strokeWidth: 8, strokeLinecap: 'round' as const, fill: 'none' };
  if (mood === 'happy') {
    return (
      <>
        <Path d="M60 90 Q74 72 88 90" {...stroke} />
        <Path d="M112 90 Q126 72 140 90" {...stroke} />
      </>
    );
  }
  if (mood === 'sleep') {
    return (
      <>
        <Path d="M60 84 Q74 96 88 84" {...stroke} strokeWidth={6} />
        <Path d="M112 84 Q126 96 140 84" {...stroke} strokeWidth={6} />
      </>
    );
  }
  return (
    <>
      <Rect x={64} y={70} width={18} height={26} rx={9} fill={C.glow} />
      <Rect x={118} y={70} width={18} height={26} rx={9} fill={C.glow} />
      <Circle cx={77} cy={77} r={3.5} fill="#FFFFFF" />
      <Circle cx={131} cy={77} r={3.5} fill="#FFFFFF" />
    </>
  );
}
