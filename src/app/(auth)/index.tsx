import { Redirect, useIsFocused, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
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
import { Icon } from '@/components/icon';
import { SoftEllipse } from '@/components/robot';
import { RobotPerch, measure, useRobot } from '@/components/robot/stage';
import { ScreenContainer } from '@/components/screen-container';
import { strings } from '@/i18n';
import { useHomeHref } from '@/state/nav';
import { useSession } from '@/state/session';
import { motion, radius, spacing, touch, type } from '@/theme';
import { makeStyles, useAppearanceStore, useTheme, type AppearanceMode } from '@/theme/provider';

/** La coreografía completa solo se ve la primera vez por sesión. */
let playedThisSession = false;
const LANDED_AT = 1900;
const S = strings.welcome;
const NEXT_MODE: Record<AppearanceMode, AppearanceMode> = { auto: 'light', light: 'dark', dark: 'auto' };

/** Bienvenida: el robot llega volando; la idea central y las dos puertas de entrada (crear cuenta, iniciar sesión). */
export default function Welcome() {
  const router = useRouter();
  const robot = useRobot();
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

  useEffect(() => {
    playedThisSession = true;
  }, []);

  if (status === 'signedIn') return <Redirect href={home} />;

  const base = first && !skipped ? LANDED_AT : 0;
  const size = Math.round(Math.min(330, Math.max(260, height * 0.36)));
  const words = S.titleLines.flat();

  // El robot vuela hacia el botón pulsado y después se ejecuta la acción.
  const go = async (ref: React.RefObject<View | null>, href: '/onboarding' | '/sign-in') => {
    const rect = await measure(ref);
    if (rect) await robot.flyTo(rect, { size: 110, side: 'right', mood: 'look', look: -1 });
    router.push(href);
  };

  return (
    <ScreenContainer gradient="welcome" contentStyle={s.content} background={<Orbs entrance={first} />}>
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

        <View style={[s.stage, { minHeight: size * 1.2 }]}>
          <RobotPerch name="welcome" size={size} entrance={first ? 'fly' : 'fade'} sparkles tapFlip />
        </View>

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

        <Appear delay={base + 700} style={s.actions}>
          <View ref={createRef} collapsable={false}>
            <Button label={S.createAccount} variant="coral" trailing="arrow" haptic shine style={s.cta} onPress={() => go(createRef, '/onboarding')} />
          </View>
          <View ref={signInRef} collapsable={false}>
            <Button label={S.signIn} variant="ghost" size="md" onPress={() => go(signInRef, '/sign-in')} />
          </View>
        </Appear>
      </View>
    </ScreenContainer>
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
    stage: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', marginBottom: -spacing.xl },
    copy: { gap: spacing.sm },
    titleRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: type.display.fontSize * 0.28 },
    actions: { gap: spacing.sm, marginTop: spacing.xs },
    cta: { minHeight: touch.primary + 4 },
  }),
);
