import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { SCENES } from '@/features/onboarding/scenes';
import { strings } from '@/i18n';
import { motion, radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const S = strings.onboarding;

/** Seis diapositivas que explican qué es BUDDY, cada una con su escena animada; al final, crear cuenta o entrar. */
export default function Onboarding() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const slide = S.slides[i];
  const Scene = SCENES[i];
  const last = i === S.slides.length - 1;
  const finish = () => router.replace('/sign-up');

  return (
    <ScreenContainer
      header={
        <ScreenHeader
          title={S.progress(i + 1, S.slides.length)}
          onBack={() => (i > 0 ? setI(i - 1) : router.back())}
          right={
            <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel={strings.common.skip} hitSlop={8} style={s.skip}>
              <AppText variant="secondaryStrong" color={t.ink.mint}>
                {strings.common.skip}
              </AppText>
            </Pressable>
          }
        />
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
            <Button label={strings.common.continue} trailing="arrow" haptic onPress={() => setI(i + 1)} />
          )}
        </View>
      }
    >
      <Animated.View key={`scene-${i}`} entering={reduce ? undefined : FadeIn.duration(260)} exiting={reduce ? undefined : FadeOut.duration(160)} style={s.art}>
        <Scene />
      </Animated.View>

      <Appear key={`copy-${i}`} style={s.copy}>
        <AppText variant="eyebrow" color={t.ink.mint}>
          {slide.eyebrow}
        </AppText>
        <AppText variant="display" accessibilityRole="header">
          {slide.title}
        </AppText>
        <AppText variant="body" color={t.c.muted}>
          {slide.body}
        </AppText>
        {i === 2 ? (
          <View style={s.key}>
            <AppText variant="secondaryStrong">{S.scanKey}</AppText>
            <View style={s.soon}>
              <AppText variant="meta" color={t.ink.lavender}>{`${S.pharmaSoon}: ${strings.common.soon}`}</AppText>
            </View>
          </View>
        ) : null}
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
    skip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.xs },
    art: { marginTop: spacing.xs },
    copy: { gap: spacing.sm, marginTop: spacing.lg },
    key: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: t.c.surface, ...t.hairline },
    soon: { alignSelf: 'flex-start', paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: t.c.lavenderPale, ...t.hairline },
    footer: { gap: spacing.sm },
  }),
);
