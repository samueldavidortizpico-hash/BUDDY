import { Redirect, useIsFocused, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
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
import { useToast } from '@/components/feedback';
import { SoftEllipse } from '@/components/robot';
import { RobotPerch } from '@/components/robot/stage';
import { ScreenContainer } from '@/components/screen-container';
import { useSettings } from '@/features/profile/hooks';
import { ink, motion, palette, spacing, touch, type } from '@/theme';

/** La coreografía completa solo se ve la primera vez por sesión. */
let playedThisSession = false;
const LANDED_AT = 1900;
const TITLE = [['Tu', 'bienestar,'], ['siempre', 'acompañado']];
const WORDS = TITLE.flat();

/** Bienvenida: el robot BUDDY llega volando y es el protagonista (sin fotos de personas). */
export default function Welcome() {
  const router = useRouter();
  const toast = useToast();
  const { role } = useSettings();
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const [first] = useState(() => !playedThisSession && !reduce);
  const [skipped, setSkipped] = useState(false);
  const robot = Math.round(Math.min(320, Math.max(220, height * 0.34)));

  useEffect(() => {
    playedThisSession = true;
  }, []);

  if (role === 'patient') return <Redirect href="/home" />;
  if (role === 'caregiver') return <Redirect href="/summary" />;

  const choreo = first && !skipped;
  const base = choreo ? LANDED_AT : 0;

  return (
    <ScreenContainer gradient="welcome" contentStyle={styles.content} background={<Orbs entrance={first} />}>
      <View style={styles.root} onTouchStart={choreo ? () => setSkipped(true) : undefined}>
        <View style={[styles.stage, { minHeight: robot * 1.25 }]}>
          <RobotPerch name="welcome" size={robot} entrance={first ? 'fly' : 'fade'} sparkles tapFlip />
        </View>

        <View style={styles.copy}>
          <Appear delay={base}>
            <AppText variant="eyebrow" color={ink.mint}>
              BUDDY · Siempre contigo
            </AppText>
          </Appear>
          <View accessible accessibilityRole="header" accessibilityLabel={WORDS.join(' ')}>
            {TITLE.map((line, row) => (
              <View key={row} style={styles.title}>
                {line.map((word, i) => (
                  <Appear key={word} delay={base + 80} index={row * 2 + i}>
                    <AppText variant="display" color={ink.title} accessibilityRole="none">
                      {word}
                    </AppText>
                  </Appear>
                ))}
              </View>
            ))}
          </View>
          <Appear delay={base + 80 + WORDS.length * motion.stagger + 80}>
            <AppText variant="body" color={ink.muted}>
              Tus medicamentos, tu ánimo y tu familia, en un solo lugar y a tu ritmo.
            </AppText>
          </Appear>
        </View>

        <Appear delay={base + 640} style={styles.actions}>
          <Button label="Comenzar" variant="coral" trailing="arrow" haptic shine style={styles.cta} onPress={() => router.push('/onboarding')} />
          <Button
            label="Ya tengo cuenta"
            variant="ghost"
            size="md"
            accessibilityHint="Las cuentas reales llegarán próximamente; abre la elección de perfil de la demostración"
            onPress={() => {
              toast({ message: 'El inicio de sesión real llegará próximamente. Elige un perfil para ver la demostración.', icon: 'shield' });
              router.push('/profile-choice');
            }}
          />
          <AppText variant="meta" color={ink.muted} align="center">
            Versión de demostración con datos de ejemplo
          </AppText>
        </Appear>
      </View>
    </ScreenContainer>
  );
}

/** Tres orbes difuminados (degradado radial, sin blur) que derivan lentamente. */
function Orbs({ entrance }: { entrance: boolean }) {
  const reduce = useReducedMotion();
  const focused = useIsFocused();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  useEffect(() => {
    if (reduce || !focused) return;
    const loop = (v: SharedValue<number>, ms: number, delay = 0) =>
      v.set(
        withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }),
              withTiming(0, { duration: ms, easing: Easing.inOut(Easing.sin) }),
            ),
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
  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill} entering={entrance && !reduce ? FadeIn.duration(500) : undefined}>
      <Animated.View style={[styles.orb, { width: 416, height: 416, top: '12%', right: -190 }, mint]}>
        <SoftEllipse color={palette.orbMint} opacity={0.42} />
      </Animated.View>
      <Animated.View style={[styles.orb, { width: 192, height: 192, top: '6%', left: -40 }, lav]}>
        <SoftEllipse color={palette.orbLavender} opacity={0.32} />
      </Animated.View>
      <Animated.View style={[styles.orb, { width: 144, height: 144, top: '36%', right: 6 }, coral]}>
        <SoftEllipse color={palette.orbCoral} opacity={0.36} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  root: { flexGrow: 1, gap: spacing.lg, paddingTop: spacing.xxxl },
  stage: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', marginBottom: -spacing.xxl },
  copy: { gap: spacing.sm },
  title: { flexDirection: 'row', flexWrap: 'wrap', columnGap: type.display.fontSize * 0.28 },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  cta: { minHeight: touch.primary + 4 },
  orb: { position: 'absolute' },
});
