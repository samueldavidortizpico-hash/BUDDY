/**
 * BUDDY vectorial (V5.3). Calcado del logo y de `assets/branding/buddy-robot.png`: cabeza grande y redonda con el
 * visor petróleo que la llena, ojos en arco, la pieza de la antena que barre hacia la derecha con punta menta, orejas,
 * cuello y brazos menta, y el corazón coral. El vector queda nítido en cualquier fondo (el PNG traía un borde de
 * recorte claro que sobre los degradados oscuros parecía una calcomanía).
 *
 * Movimiento sereno (V5.3, pedido del dueño: "se ve muy animado"): respira despacio, parpadea cada pocos segundos y,
 * con `wave`, saluda UNA vez al aparecer. Sin latido, sin antena que se mece y sin saludo en bucle. Solo transform en
 * el hilo de UI. Con "reducir movimiento" o `active={false}` queda quieto en su pose.
 * Siempre decorativo: lo oculta al lector de pantalla quien lo usa (o `BuddyRobot` con etiqueta).
 */
import { useEffect, useId, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/** Lienzo de diseño: 200 × 220. `size` es el alto en dp. */
const VW = 200;
const VH = 220;
export const BUDDY_RATIO = VW / VH;

export type BuddyMood = 'happy' | 'open' | 'sleep';

const C = {
  shell: ['#FFFFFF', '#D3E0E5'],
  rim: ['#E4ECEF', '#C3D3D9'],
  visor: ['#1F5B67', '#09242D'],
  mint: ['#86EAD3', '#1E9A82'],
  eye: '#FFFFFF',
  heart: '#FF8478',
};

/** Inclinación de la cabeza, como en el logo. */
const TILT = -7;
const HEART = 'M112 200 C 99 191, 95 181, 101 176 C 105 172.5, 110 174.5, 112 178 C 114 174.5, 119 172.5, 123 176 C 129 181, 125 191, 112 200 Z';
const BODY = 'M100 140 C 132 140, 152 160, 152 184 C 152 206, 130 218, 100 218 C 70 218, 48 206, 48 184 C 48 160, 68 140, 100 140 Z';
const ANTENNA = 'M104 34 C 110 16, 132 6, 156 8 C 166 9, 170 16, 164 22 C 146 20, 128 26, 122 36 Z';
const ANTENNA_TIP = 'M150 8.5 C 160 6, 174 8, 173 15 C 172 21, 162 22, 155 21 C 149 19, 146 13, 150 8.5 Z';

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
  /** Saluda una vez con el brazo derecho cada vez que se activa. */
  wave?: boolean;
  /** Mueve sus bucles solo mientras se ve (p. ej. la página activa del carrusel). */
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

  useEffect(() => {
    const all = [blink, arm, bob];
    if (!live) {
      all.forEach((v) => cancelAnimation(v));
      blink.set(1);
      arm.set(0);
      bob.set(0);
      return;
    }
    const sine = Easing.inOut(Easing.sin);
    if (mood !== 'sleep') {
      blink.set(withRepeat(withSequence(withDelay(4200, withTiming(0.1, { duration: 80 })), withTiming(1, { duration: 140 })), -1));
    }
    if (wave) {
      const swing = (deg: number, ms: number) => withTiming(deg, { duration: ms, easing: sine });
      arm.set(withDelay(500, withSequence(swing(-16, 320), swing(4, 320), swing(-16, 320), swing(0, 420))));
    }
    const ms = mood === 'sleep' ? 3200 : 2600;
    if (float) bob.set(withRepeat(withSequence(withTiming(1, { duration: ms, easing: sine }), withTiming(0, { duration: ms, easing: sine })), -1));
    return () => all.forEach((v) => cancelAnimation(v));
  }, [live, mood, wave, float, blink, arm, bob]);

  const whole = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * k * bob.get() }] }));
  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.get() }] }));
  const rightArm = useAnimatedStyle(() => ({ transform: [{ rotate: `${arm.get()}deg` }] }));

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
  const tilt = `rotate(${TILT} 100 92)`;

  return (
    <View style={[{ width: w, height: h }, style]} pointerEvents="none">
      <Animated.View style={[box, whole]}>
        <View style={box}>{layer(<Limb id={`${id}l`} cx={50} cy={190} />)}</View>
        {/* Brazo derecho levantado, como en el logo: gira desde el hombro al saludar. */}
        <Animated.View style={[box, origin(150, 168), rightArm]}>{layer(<Limb id={`${id}r`} cx={168} cy={146} />)}</Animated.View>
        <View style={box}>
          {layer(
            <>
              <Grad id={`${id}s`} c={C.shell} />
              <Grad id={`${id}m`} c={C.mint} />
              <Path d={BODY} fill={`url(#${id}s)`} />
              {/* Luz del costado: da volumen sin sombras costosas. */}
              <Ellipse cx={78} cy={174} rx={16} ry={11} fill="#FFFFFF" opacity={0.85} />
              <Path d={HEART} fill={C.heart} />
              <Ellipse cx={100} cy={146} rx={30} ry={9} fill={`url(#${id}m)`} />
            </>,
          )}
        </View>
        <View style={box}>
          {layer(
            <>
              <Grad id={`${id}h`} c={C.shell} />
              <Grad id={`${id}e`} c={C.mint} />
              <Grad id={`${id}r`} c={C.rim} />
              <Grad id={`${id}v`} c={C.visor} x2="0.2" />
              <Path d={ANTENNA} fill={`url(#${id}h)`} transform={tilt} />
              <Path d={ANTENNA_TIP} fill={`url(#${id}e)`} transform={tilt} />
              <Rect x={2} y={68} width={24} height={54} rx={12} fill={`url(#${id}e)`} transform={tilt} />
              <Rect x={174} y={68} width={24} height={54} rx={12} fill={`url(#${id}e)`} transform={tilt} />
              <Rect x={10} y={28} width={180} height={130} rx={64} fill={`url(#${id}h)`} transform={tilt} />
              <Rect x={21} y={38} width={160} height={110} rx={54} fill={`url(#${id}r)`} transform={tilt} />
              <Rect x={26} y={42} width={152} height={102} rx={50} fill={`url(#${id}v)`} transform={tilt} />
              {/* Reflejo del visor. */}
              <Ellipse cx={74} cy={56} rx={32} ry={7} fill="#FFFFFF" opacity={0.1} transform={`${tilt} rotate(-8 74 56)`} />
            </>,
          )}
        </View>
        <Animated.View style={[box, origin(100, 94), eyes]}>{layer(<Eyes mood={mood} tilt={tilt} />)}</Animated.View>
      </Animated.View>
    </View>
  );
}

function Grad({ id, c, x2 = '0.35' }: { id: string; c: string[]; x2?: string }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2={x2} y2="1">
        <Stop offset="0" stopColor={c[0]} />
        <Stop offset="1" stopColor={c[1]} />
      </LinearGradient>
    </Defs>
  );
}

function Limb({ id, cx, cy }: { id: string; cx: number; cy: number }) {
  return (
    <>
      <Grad id={id} c={C.mint} />
      <Ellipse cx={cx} cy={cy} rx={15} ry={25} transform={`rotate(34 ${cx} ${cy})`} fill={`url(#${id})`} />
    </>
  );
}

function Eyes({ mood, tilt }: { mood: BuddyMood; tilt: string }) {
  const stroke = { stroke: C.eye, strokeLinecap: 'round' as const, fill: 'none', transform: tilt };
  if (mood === 'happy') {
    return (
      <>
        <Path d="M60 100 A14 14 0 0 1 88 100" {...stroke} strokeWidth={9} />
        <Path d="M114 100 A14 14 0 0 1 142 100" {...stroke} strokeWidth={9} />
      </>
    );
  }
  if (mood === 'sleep') {
    return (
      <>
        <Path d="M60 94 A14 14 0 0 0 88 94" {...stroke} strokeWidth={7} />
        <Path d="M114 94 A14 14 0 0 0 142 94" {...stroke} strokeWidth={7} />
      </>
    );
  }
  return (
    <>
      <Rect x={66} y={82} width={16} height={24} rx={8} fill={C.eye} transform={tilt} />
      <Rect x={120} y={82} width={16} height={24} rx={8} fill={C.eye} transform={tilt} />
    </>
  );
}
