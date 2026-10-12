/**
 * Escenas animadas del onboarding (6). Cada una es un bucle de 3–4 s guiado por UN progreso `p` (0→1) en el hilo de UI
 * y solo anima transform y opacidad. Con "reducir movimiento" la escena queda quieta en un fotograma representativo.
 * El robot vectorial acompaña cada escena como guía.
 */
import { useIsFocused } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { BuddyRobot, type RobotMood } from '@/components/robot';
import { strings } from '@/i18n';
import { radius, spacing, type Domain } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const O = strings.onboarding;

/** Progreso en bucle de una escena (se detiene sin foco y con "reducir movimiento"). */
function useLoop(ms: number, still = 0.6): SharedValue<number> {
  const reduce = useReducedMotion();
  const focused = useIsFocused();
  const p = useSharedValue(reduce ? still : 0);
  useEffect(() => {
    if (reduce || !focused) {
      cancelAnimation(p);
      p.set(still);
      return;
    }
    p.set(0);
    p.set(withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1));
    return () => cancelAnimation(p);
  }, [reduce, focused, ms, still, p]);
  return p;
}

/** Ventana [a, b] del bucle → 0…1 (para escalonar). */
function seg(p: number, a: number, b: number) {
  'worklet';
  return interpolate(p, [a, b], [0, 1], Extrapolation.CLAMP);
}

function Stage({ children, robot, domain }: { children: ReactNode; robot: RobotMood; domain: Domain }) {
  const t = useTheme();
  const s = useStyles();
  const d = t.domains[domain];
  return (
    <View style={[s.stage, { backgroundColor: t.hc ? t.c.bg : d.gradient[0] }, t.hc && t.hairline]}>
      <View style={s.scene} pointerEvents="none">
        {children}
      </View>
      <View style={s.guide}>
        <BuddyRobot size={96} mood={robot} shadow={false} />
      </View>
    </View>
  );
}

// 1. Cuida a distancia: puntos de un mapa que se conectan (monitorear y cuidar).
const DOTS = [
  { x: 40, y: 70 },
  { x: 120, y: 30 },
  { x: 200, y: 80 },
  { x: 150, y: 150 },
  { x: 70, y: 140 },
];
export function CareScene() {
  const t = useTheme();
  const p = useLoop(3600);
  const accent = t.hc ? t.c.text : t.domains.activity.accent;
  return (
    <Stage robot="look" domain="activity">
      <View style={styles.map}>
        {DOTS.slice(1).map((d, i) => (
          <MapLine key={i} from={DOTS[i]} to={d} p={p} at={i * 0.15} color={accent} />
        ))}
        {DOTS.map((d, i) => (
          <MapDot key={i} x={d.x} y={d.y} p={p} at={i * 0.15} color={i === 2 ? t.c.coral : accent} home={i === 2} />
        ))}
      </View>
    </Stage>
  );
}
function MapLine({ from, to, p, at, color }: { from: { x: number; y: number }; to: { x: number; y: number }; p: SharedValue<number>; at: number; color: string }) {
  const style = useAnimatedStyle(() => ({ opacity: seg(p.value, at + 0.05, at + 0.2) * (1 - seg(p.value, 0.9, 1)) }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={240} height={180}>
        <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={3} strokeDasharray="6 6" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}
function MapDot({ x, y, p, at, color, home }: { x: number; y: number; p: SharedValue<number>; at: number; color: string; home: boolean }) {
  const style = useAnimatedStyle(() => {
    const v = seg(p.value, at, at + 0.12);
    return { opacity: 0.3 + v * 0.7 * (1 - seg(p.value, 0.9, 1)), transform: [{ scale: 0.6 + v * 0.4 + (home ? 0.15 * Math.sin(p.value * Math.PI * 4) : 0) }] };
  });
  const r = home ? 16 : 10;
  return <Animated.View style={[{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: color }, style]} />;
}

// 2. Recordatorios: campana que se balancea y gotas que caen.
export function RemindersScene() {
  const t = useTheme();
  const p = useLoop(3200);
  const bell = useAnimatedStyle(() => ({ transform: [{ rotate: `${Math.sin(p.value * Math.PI * 6) * 14 * (1 - seg(p.value, 0.5, 0.8))}deg` }] }));
  return (
    <Stage robot="wave" domain="medication">
      <View style={styles.row}>
        <Animated.View style={[styles.bubble, { backgroundColor: t.c.surface }, bell]}>
          <Icon name="bell" size={40} color={t.hc ? t.c.text : t.domains.medication.accent} />
        </Animated.View>
        <View style={styles.drops}>
          {[0, 1, 2].map((i) => (
            <Drop key={i} p={p} at={i * 0.25} x={10 + i * 28} color={t.hc ? t.c.text : t.domains.water.accent} />
          ))}
        </View>
        <View style={styles.col}>
          {(['meds', 'food', 'calendar'] as IconName[]).map((icon, i) => (
            <Pop key={icon} p={p} at={0.2 + i * 0.15}>
              <View style={[styles.mini, { backgroundColor: t.c.surface }, t.hairline]}>
                <Icon name={icon} size={22} color={t.c.text} />
              </View>
            </Pop>
          ))}
        </View>
      </View>
    </Stage>
  );
}
function Drop({ p, at, x, color }: { p: SharedValue<number>; at: number; x: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const v = seg(p.value, at, at + 0.45);
    return { opacity: v > 0 && v < 1 ? 1 - v * 0.6 : 0, transform: [{ translateY: v * 120 }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: 0 }, style]}>
      <Icon name="drop" size={24} color={color} />
    </Animated.View>
  );
}
function Pop({ p, at, children }: { p: SharedValue<number>; at: number; children: ReactNode }) {
  const style = useAnimatedStyle(() => {
    const v = seg(p.value, at, at + 0.12) * (1 - seg(p.value, 0.92, 1));
    return { opacity: v, transform: [{ scale: 0.7 + v * 0.3 }] };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}

// 3. Escanea medicamentos: marco de cámara, caja y línea que revisa.
const CORNERS = 'M10 30 V10 H30 M170 10 H190 V30 M10 120 V140 H30 M170 140 H190 V120';
export function ScanScene() {
  const t = useTheme();
  const p = useLoop(3400);
  const line = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(Math.sin(p.value * Math.PI * 2), [-1, 1], [0, 110]) }] }));
  const ok = useAnimatedStyle(() => ({ opacity: seg(p.value, 0.7, 0.8) * (1 - seg(p.value, 0.95, 1)) }));
  const frame = t.hc ? t.c.text : t.domains.medication.accent;
  return (
    <Stage robot="look" domain="followUp">
      <View style={styles.scan}>
        <Svg width={200} height={150} style={StyleSheet.absoluteFill}>
          <Path d={CORNERS} stroke={frame} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Rect x={55} y={35} width={90} height={80} rx={10} fill={t.c.surface} stroke={t.c.text} strokeWidth={2} />
          <Rect x={65} y={50} width={60} height={10} rx={3} fill={t.c.coral} />
          <Rect x={65} y={70} width={45} height={7} rx={3} fill={t.c.muted} />
          <Rect x={65} y={85} width={55} height={7} rx={3} fill={t.c.muted} />
        </Svg>
        <Animated.View style={[styles.scanLine, { backgroundColor: frame }, line]} />
        <Animated.View style={[styles.okBadge, { backgroundColor: t.hc ? t.c.text : t.c.mintStrong }, ok]}>
          <Icon name="check" size={18} color={t.hc ? t.c.bg : '#FFFFFF'} strokeWidth={3} />
        </Animated.View>
      </View>
    </Stage>
  );
}

// 4. Chatea con BUDDY: la orden se escribe sola y se convierte en tarjeta.
export function ChatScene() {
  const t = useTheme();
  const s = useStyles();
  const reduce = useReducedMotion();
  const focused = useIsFocused();
  const full = O.chatExample;
  const [n, setN] = useState(reduce ? full.length : 0);
  useEffect(() => {
    if (reduce || !focused) return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % (full.length + 22);
      setN(Math.min(i, full.length));
    }, 90);
    return () => clearInterval(id);
  }, [reduce, focused, full]);
  const done = n >= full.length;
  return (
    <Stage robot={done ? 'happy' : 'talk'} domain="mood">
      <View style={s.chat}>
        <View style={[s.bubbleUser, { backgroundColor: t.hc ? t.c.text : t.c.primary }]}>
          <AppText variant="secondaryStrong" color={t.hc ? t.c.bg : t.c.onPrimary}>
            {`${full.slice(0, n)}${done ? '' : '▍'}`}
          </AppText>
        </View>
        <View style={[s.card, { opacity: done ? 1 : 0 }, t.hairline]}>
          <Icon name="meds" color={t.hc ? t.c.text : t.domains.medication.accent} />
          <View style={styles.flex}>
            <AppText variant="secondaryStrong">{O.chatCardTitle}</AppText>
            <AppText variant="caption" color={t.c.muted}>
              {O.chatCardBody}
            </AppText>
          </View>
        </View>
      </View>
    </Stage>
  );
}

// 5. Tu familiar te cuenta cómo está: tarjetas que entran.
export function FamilyScene() {
  const t = useTheme();
  const s = useStyles();
  const p = useLoop(3600);
  const cards: { icon: IconName; text: string; domain: Domain }[] = [
    { icon: 'smile', text: O.familyCards[0], domain: 'mood' },
    { icon: 'bed', text: O.familyCards[1], domain: 'sleep' },
    { icon: 'meds', text: O.familyCards[2], domain: 'medication' },
  ];
  return (
    <Stage robot="happy" domain="mood">
      <View style={styles.col}>
        {cards.map((c, i) => (
          <Slide key={c.text} p={p} at={i * 0.18}>
            <View style={[s.card, t.hairline]}>
              <Icon name={c.icon} color={t.hc ? t.c.text : t.domains[c.domain].accent} />
              <AppText variant="secondaryStrong">{c.text}</AppText>
            </View>
          </Slide>
        ))}
      </View>
    </Stage>
  );
}
function Slide({ p, at, children }: { p: SharedValue<number>; at: number; children: ReactNode }) {
  const style = useAnimatedStyle(() => {
    const v = seg(p.value, at, at + 0.2) * (1 - seg(p.value, 0.9, 1));
    return { opacity: v, transform: [{ translateX: (1 - v) * 60 }] };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}

// 6. Seguridad y privacidad: candado que se cierra y permisos que se activan.
export function PrivacyScene() {
  const t = useTheme();
  const s = useStyles();
  const p = useLoop(3400);
  const shackle = useAnimatedStyle(() => ({ transform: [{ translateY: -14 + seg(p.value, 0.1, 0.3) * 14 }] }));
  return (
    <Stage robot="idle" domain="contact">
      <View style={styles.row}>
        <View style={styles.lock}>
          <Animated.View style={shackle}>
            <Svg width={56} height={44}>
              <Rect x={10} y={4} width={36} height={56} rx={18} fill="none" stroke={t.c.text} strokeWidth={7} />
            </Svg>
          </Animated.View>
          <View style={[s.lockBody, { backgroundColor: t.hc ? t.c.text : t.c.lavender }]}>
            <Svg width={14} height={20}>
              <Circle cx={7} cy={7} r={5} fill={t.hc ? t.c.bg : '#FFFFFF'} />
              <Rect x={5} y={9} width={4} height={9} rx={2} fill={t.hc ? t.c.bg : '#FFFFFF'} />
            </Svg>
          </View>
        </View>
        <View style={styles.col}>
          {O.privacyToggles.map((label, i) => (
            <Toggle key={label} label={label} p={p} at={0.35 + i * 0.15} />
          ))}
        </View>
      </View>
    </Stage>
  );
}
function Toggle({ label, p, at }: { label: string; p: SharedValue<number>; at: number }) {
  const t = useTheme();
  const s = useStyles();
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: seg(p.value, at, at + 0.08) * (1 - seg(p.value, 0.92, 1)) * 18 }] }));
  const on = useAnimatedStyle(() => ({ opacity: seg(p.value, at, at + 0.08) * (1 - seg(p.value, 0.92, 1)) }));
  return (
    <View style={styles.toggleRow}>
      <View style={[s.track, t.hairline]}>
        <Animated.View style={[StyleSheet.absoluteFill, s.trackOn, { backgroundColor: t.hc ? t.c.text : t.c.mintStrong }, on]} />
        <Animated.View style={[s.knob, knob]} />
      </View>
      <AppText variant="captionStrong">{label}</AppText>
    </View>
  );
}

export const SCENES = [CareScene, RemindersScene, ScanScene, ChatScene, FamilyScene, PrivacyScene];

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  col: { gap: spacing.xs },
  map: { width: 240, height: 180 },
  drops: { width: 90, height: 150 },
  scan: { width: 200, height: 150 },
  lock: { width: 80, height: 100, alignItems: 'center' },
  bubble: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  mini: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scanLine: { position: 'absolute', left: 20, right: 20, top: 20, height: 3, borderRadius: 2, opacity: 0.85 },
  okBadge: { position: 'absolute', right: 40, top: 26, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    stage: { borderRadius: radius.hero, minHeight: 250, padding: spacing.lg, justifyContent: 'center', overflow: 'hidden' },
    scene: { alignItems: 'center', justifyContent: 'center', minHeight: 190 },
    guide: { position: 'absolute', right: -12, bottom: -18 },
    chat: { gap: spacing.sm, alignSelf: 'stretch', paddingRight: 60 },
    bubbleUser: { alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 18, borderBottomRightRadius: 6, maxWidth: '100%' },
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingRight: spacing.md, borderRadius: radius.md, backgroundColor: t.c.surface, minWidth: 180 },
    lockBody: { width: 62, height: 50, borderRadius: 12, marginTop: -4, alignItems: 'center', justifyContent: 'center' },
    track: { width: 44, height: 26, borderRadius: 13, backgroundColor: t.c.surface2, overflow: 'hidden', justifyContent: 'center' },
    trackOn: { borderRadius: 13 },
    knob: { width: 20, height: 20, borderRadius: 10, marginLeft: 3, backgroundColor: '#FFFFFF' },
  }),
);
