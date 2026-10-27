import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { ScreenContainer } from '@/components/screen-container';
import { Hero } from '@/features/onboarding/hero';
import { strings } from '@/i18n';
import { motion, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const S = strings.onboarding;

/** Cuatro presentaciones que explican qué es BUDDY: ilustración, título, texto y "Siguiente"; la última lleva a crear cuenta. */
export default function Onboarding() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const { height } = useWindowDimensions();
  const [i, setI] = useState(0);
  const slide = S.slides[i];
  const last = i === S.slides.length - 1;
  const finish = () => router.replace('/sign-up');

  return (
    <ScreenContainer
      gradient="welcome"
      header={
        <View style={s.top}>
          <AppText variant="secondaryStrong" style={s.side}>
            {slide.eyebrow}
          </AppText>
          <AppText variant="secondaryStrong" color={t.c.muted} accessibilityLabel={S.progress(i + 1, S.slides.length)}>
            {S.counter(i + 1, S.slides.length)}
          </AppText>
          <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel={S.skip} hitSlop={8} style={[s.skip, s.side]}>
            <AppText variant="secondaryStrong" color={t.ink.mint}>
              {S.skip}
            </AppText>
          </Pressable>
        </View>
      }
      footer={
        <View style={s.footer}>
          <Dots count={S.slides.length} index={i} />
          {last ? (
            <>
              <Button label={S.start} trailing="arrow" variant="coral" haptic onPress={finish} />
              <Button label={S.signIn} variant="ghost" size="md" onPress={() => router.replace({ pathname: '/sign-in', params: { role: 'caregiver' } })} />
            </>
          ) : (
            <Button label={strings.common.next} variant="mint" haptic onPress={() => setI(i + 1)} />
          )}
        </View>
      }
    >
      <Appear key={`art-${i}`} style={s.art}>
        <Hero index={i} height={Math.round(Math.min(340, Math.max(220, height * 0.36)))} />
      </Appear>

      <Appear key={`copy-${i}`} style={s.copy}>
        <AppText variant="display" accessibilityRole="header">
          {slide.title}
        </AppText>
        <AppText variant="body" color={t.c.muted}>
          {slide.body}
        </AppText>
      </Appear>
    </ScreenContainer>
  );
}

function Dots({ count, index }: { count: number; index: number }) {
  return (
    <View style={styles.dots} accessible accessibilityLabel={S.progress(index + 1, count)}>
      {Array.from({ length: count }, (_, k) => (
        <Dot key={k} on={k === index} />
      ))}
    </View>
  );
}

/** Punto que se ensancha al estar activo (solo transform: escala horizontal). */
function Dot({ on }: { on: boolean }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const w = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    w.set(reduce ? (on ? 1 : 0) : withSpring(on ? 1 : 0, motion.spring));
  }, [on, reduce, w]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + w.value * 2.2 }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: on ? t.c.mintStrong : t.hc ? t.c.text : t.c.surface2 }, style]} />;
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 22, paddingVertical: spacing.xs },
  dot: { width: 9, height: 9, borderRadius: 5 },
});

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: spacing.md },
    side: { minWidth: 96 },
    skip: { minHeight: 48, justifyContent: 'center', alignItems: 'flex-end' },
    art: { marginTop: spacing.xs },
    copy: { gap: spacing.sm, marginTop: spacing.lg },
    footer: { gap: spacing.sm },
  }),
);
