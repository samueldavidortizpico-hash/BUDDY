import { Redirect, useFocusEffect, useIsFocused, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { SoftEllipse } from '@/components/robot';
import { AuthRobot } from '@/components/robot/auth-robot';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenContainer } from '@/components/screen-container';
import type { Role } from '@/domain/types';
import { strings } from '@/i18n';
import { useHomeHref } from '@/state/nav';
import { useSession } from '@/state/session';
import { motion, radius, spacing, touch, type } from '@/theme';
import { makeStyles, useAppearanceStore, useTheme, type AppearanceMode } from '@/theme/provider';

/** La coreografía completa solo se ve la primera vez por sesión. */
let playedThisSession = false;
const ENTRANCE_DELAY = 300;
const R = strings.auth.roles;
const S = strings.welcome;
const NEXT_MODE: Record<AppearanceMode, AppearanceMode> = { auto: 'light', light: 'dark', dark: 'auto' };

/** Bienvenida: el robot llega volando; la idea central y las dos puertas de entrada (crear cuenta, iniciar sesión). */
export default function Welcome() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const status = useSession((x) => x.status);
  const home = useHomeHref();
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const mode = useAppearanceStore((x) => x.mode);
  const setAppearance = useAppearanceStore((x) => x.set);
  const [first] = useState(() => !playedThisSession && !reduce);
  const [skipped, setSkipped] = useState(false);
  const createRef = useRef<View>(null);
  const signInRef = useRef<View>(null);
  const robotRef = useRef<View>(null);
  const scrollY = useSharedValue(0);
  const fx = useSharedValue(0);
  const fy = useSharedValue(0);
  const fs = useSharedValue(1);
  const [landing, setLanding] = useState(false);
  const [role, setRole] = useState<Role | null>(null);

  // Al volver a la bienvenida el robot regresa a su sitio (no depende de medidas antiguas).
  useFocusEffect(
    useCallback(() => {
      [fx, fy, fs].forEach((v) => cancelAnimation(v));
      fx.set(0);
      fy.set(0);
      fs.set(1);
      setLanding(false);
    }, [fx, fy, fs]),
  );
  const flight = useAnimatedStyle(() => ({ transform: [{ translateX: fx.value }, { translateY: fy.value }, { scale: fs.value }] }));

  useEffect(() => {
    playedThisSession = true;
  }, []);

  if (status === 'signedIn') return <Redirect href={home} />;

  const base = first && !skipped ? ENTRANCE_DELAY : 0;
  const size = Math.round(Math.min(300, Math.max(200, height * 0.33)));
  const words = S.titleLines.flat();

  // El robot vuela hacia el botón pulsado, aterriza encima y después se ejecuta la acción.
  // Ambas posiciones se miden en el momento del toque, así que el scroll o el teclado no lo desubican.
  const go = async (ref: React.RefObject<View | null>, href: Href) => {
    if (landing) return;
    const [from, to] = await Promise.all([rectOf(robotRef), rectOf(ref)]);
    if (reduce || !from || !to) return router.push(href);
    setLanding(true);
    const scale = 0.42;
    const dx = to.x + to.width / 2 - (from.x + from.width / 2);
    const dy = to.y - (from.y + from.height / 2) - (from.height * scale) / 2 + 8;
    fx.set(withTiming(dx, { duration: 620, easing: Easing.out(Easing.cubic) }));
    fy.set(withSequence(withTiming(dy - 60, { duration: 420, easing: Easing.out(Easing.quad) }), withSpring(dy, motion.spring)));
    fs.set(withTiming(scale, { duration: 620, easing: Easing.inOut(Easing.cubic) }));
    setTimeout(() => router.push(href), 760);
  };

  return (
    <ScreenContainer gradient="welcome" contentStyle={s.content} scrollY={scrollY} background={<Orbs entrance={first} />}>
      <View style={s.root} onTouchStart={first && !skipped ? () => setSkipped(true) : undefined}>
        <View style={s.topBar}>
          <Pressable
            onPress={() => setAppearance({ mode: NEXT_MODE[mode] })}
            accessibilityRole="button"
            accessibilityLabel={`${S.appearance}. ${S.appearanceNow(S.modes[mode])}`}
            hitSlop={8}
            style={s.modeBtn}
          >
            <Icon name={mode === 'dark' ? 'moon' : mode === 'light' ? 'sun' : 'contrast'} color={t.c.text} size={22} />
          </Pressable>
        </View>

        <Animated.View ref={robotRef} collapsable={false} style={[s.stage, flight]}>
          <AuthRobot maxHeight={size} scrollY={scrollY} mood={landing ? 'look' : 'wave'} look={landing ? -1 : 0} sparkles={!landing} tapFlip />
        </Animated.View>

        <View style={s.copy}>
          <Appear delay={base}>
            <AppText variant="eyebrow" color={t.ink.mint}>
              {S.eyebrow}
            </AppText>
          </Appear>
          <View accessible accessibilityRole="header" accessibilityLabel={S.title}>
            {S.titleLines.map((line, row) => (
              <View key={row} style={s.titleRow}>
                {line.map((word, i) => (
                  <Appear key={`${row}-${word}`} delay={base + 80} index={S.titleLines.slice(0, row).flat().length + i}>
                    <AppText variant="display" accessibilityRole="none">
                      {word}
                    </AppText>
                  </Appear>
                ))}
              </View>
            ))}
            <Appear delay={base + 80} index={words.length}>
              <AppText variant="display" color={t.ink.mint} accessibilityRole="none">
                por ti
              </AppText>
            </Appear>
          </View>
          <Appear delay={base + 80 + (words.length + 1) * motion.stagger + 60}>
            <AppText variant="body" color={t.c.muted}>
              {S.body}
            </AppText>
          </Appear>
        </View>

        <Appear delay={base + 600} style={s.actions}>
          <AppText variant="h3" accessibilityRole="header">
            {R.title}
          </AppText>
          <View style={s.roles} accessibilityRole="radiogroup">
            <RoleCard icon="users" title={R.admin} detail={R.adminDetail} selected={role === 'caregiver'} onPress={() => setRole('caregiver')} />
            <RoleCard icon="heart" title={R.elder} detail={R.elderDetail} selected={role === 'elder'} onPress={() => setRole('elder')} />
          </View>
          {role === 'caregiver' ? (
            <Appear key="admin" style={s.actions}>
              <View ref={createRef} collapsable={false}>
                <Button label={S.createAccount} variant="coral" trailing="arrow" haptic shine style={s.cta} onPress={() => go(createRef, '/onboarding')} />
              </View>
              <View ref={signInRef} collapsable={false}>
                <Button label={S.signIn} variant="ghost" size="md" onPress={() => go(signInRef, { pathname: '/sign-in', params: { role: 'caregiver' } })} />
              </View>
            </Appear>
          ) : null}
          {role === 'elder' ? (
            <Appear key="elder" style={s.actions}>
              <AppText variant="secondary" color={t.c.muted}>
                {R.elderNote}
              </AppText>
              <View ref={signInRef} collapsable={false}>
                <Button label={S.signIn} variant="primary" size="elder" trailing="arrow" haptic onPress={() => go(signInRef, { pathname: '/sign-in', params: { role: 'elder' } })} />
              </View>
            </Appear>
          ) : null}
        </Appear>
      </View>
    </ScreenContainer>
  );
}

/** Opción grande del selector de rol (radio accesible). */
function RoleCard({ icon, title, detail, selected, onPress }: { icon: IconName; title: string; detail: string; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <PressableScale
      haptic
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${detail}`}
      style={[s.role, selected && s.roleOn]}
    >
      <View style={[s.roleIcon, { backgroundColor: selected ? (t.hc ? t.c.text : t.c.mintStrong) : t.c.surface2 }]}>
        <Icon name={icon} color={selected ? (t.hc ? t.c.bg : '#FFFFFF') : t.c.text} size={26} />
      </View>
      <View style={s.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color={t.c.muted}>
          {detail}
        </AppText>
      </View>
      <View style={[s.radio, selected && s.radioOn]}>{selected ? <View style={s.radioDot} /> : null}</View>
    </PressableScale>
  );
}

/** Tres orbes difuminados (degradado radial, sin blur) que derivan lentamente. */
function Orbs({ entrance }: { entrance: boolean }) {
  const reduce = useReducedMotion();
  const focused = useIsFocused();
  const t = useTheme();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  useEffect(() => {
    if (reduce || !focused) return;
    const loop = (v: SharedValue<number>, ms: number, delay = 0) =>
      v.set(
        withDelay(
          delay,
          withRepeat(
            withSequence(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: ms, easing: Easing.inOut(Easing.sin) })),
            -1,
          ),
        ),
      );
    loop(a, 9000);
    loop(b, 7000, 1200);
    return () => [a, b].forEach((v) => cancelAnimation(v));
  }, [reduce, focused, a, b]);
  const mint = useAnimatedStyle(() => ({ transform: [{ translateX: a.value * -26 }, { translateY: a.value * 18 }] }));
  const lav = useAnimatedStyle(() => ({ transform: [{ translateX: b.value * 20 }, { translateY: b.value * -16 }] }));
  const coral = useAnimatedStyle(() => ({ transform: [{ translateX: a.value * 14 }, { translateY: b.value * 22 }] }));
  if (t.hc) return null;
  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill} entering={entrance && !reduce ? FadeIn.duration(500) : undefined}>
      <Animated.View style={[styles.orb, { width: 416, height: 416, top: '10%', right: -190 }, mint]}>
        <SoftEllipse color={t.c.mint} opacity={t.dark ? 0.22 : 0.42} />
      </Animated.View>
      <Animated.View style={[styles.orb, { width: 192, height: 192, top: '6%', left: -40 }, lav]}>
        <SoftEllipse color={t.c.lavender} opacity={t.dark ? 0.28 : 0.32} />
      </Animated.View>
      <Animated.View style={[styles.orb, { width: 144, height: 144, top: '34%', right: 6 }, coral]}>
        <SoftEllipse color={t.c.coral} opacity={0.32} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ orb: { position: 'absolute' } });

function rectOf(ref: React.RefObject<View | null>): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!ref.current) return resolve(null);
    ref.current.measureInWindow((x, y, width, height) => resolve(width || height ? { x, y, width, height } : null));
  });
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    content: { flexGrow: 1 },
    root: { flexGrow: 1, gap: spacing.md },
    topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: spacing.xs },
    modeBtn: {
      width: touch.min,
      height: touch.min,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.c.surface,
      ...t.hairline,
    },
    stage: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    copy: { gap: spacing.sm },
    titleRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: type.display.fontSize * 0.28 },
    actions: { gap: spacing.sm, marginTop: spacing.xs },
    cta: { minHeight: touch.primary + 4 },
    flex: { flex: 1 },
    roles: { gap: spacing.sm },
    role: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: touch.elderMin + 12,
      padding: spacing.md,
      borderRadius: radius.card,
      backgroundColor: t.c.surface,
      ...t.hairline,
    },
    roleOn: { borderWidth: 2, borderColor: t.hc ? t.c.text : t.c.mintStrong },
    roleIcon: { width: 48, height: 48, borderRadius: radius.icon, alignItems: 'center', justifyContent: 'center' },
    radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: t.hc ? t.c.text : t.c.muted, alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: t.hc ? t.c.text : t.c.mintStrong },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: t.hc ? t.c.text : t.c.mintStrong },
  }),
);
