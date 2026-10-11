import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { RobotPerch } from '@/components/robot/stage';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { strings } from '@/i18n';
import { motion, radius, spacing, type Domain } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const S = strings.onboarding;
const ART: { domain: Domain; icon: IconName; align: 'flex-start' | 'center' | 'flex-end' }[] = [
  { domain: 'activity', icon: 'users', align: 'flex-end' },
  { domain: 'medication', icon: 'bell', align: 'flex-start' },
  { domain: 'mood', icon: 'chart', align: 'flex-end' },
];

/** Tres pasos de la idea central. El robot viaja en arco entre diapositivas. */
export default function Onboarding() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const { height } = useWindowDimensions();
  const [i, setI] = useState(0);
  const slide = S.slides[i];
  const art = ART[i];
  const d = t.domains[art.domain];
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
          <Button label={last ? S.start : strings.common.continue} trailing="arrow" variant={last ? 'coral' : 'primary'} haptic onPress={() => (last ? finish() : setI(i + 1))} />
        </View>
      }
    >
      <View style={[s.art, { minHeight: Math.max(260, height * 0.42) }]}>
        {t.hc ? null : <LinearGradient colors={d.gradient} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={[StyleSheet.absoluteFill, s.artFill]} />}
        <Appear key={`icon-${i}`} style={s.iconWrap}>
          <View style={[s.iconBubble, { backgroundColor: t.hc ? t.c.bg : t.c.surface }]}>
            <Icon name={art.icon} size={44} color={t.hc ? t.c.text : d.accent} strokeWidth={2} />
          </View>
        </Appear>
        <View style={[s.perchRow, { justifyContent: art.align }]}>
          <RobotPerch key={i} name={`onboarding-${i}`} size={120} mood={i === 1 ? 'wave' : i === 2 ? 'look' : 'idle'} />
        </View>
      </View>

      <Appear key={`copy-${i}`} style={s.copy}>
        <AppText variant="eyebrow" color={t.ink.mint}>
          {slide.eyebrow}
        </AppText>
        <AppText variant="display">{slide.title}</AppText>
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
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 26, paddingVertical: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
});

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    skip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.xs },
    art: {
      marginHorizontal: -spacing.screen,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.screen,
      paddingVertical: spacing.xl,
      justifyContent: 'space-between',
      ...(t.hc ? { borderTopWidth: 2, borderBottomWidth: 2, borderColor: t.c.text } : {}),
    },
    artFill: { borderBottomLeftRadius: radius.hero, borderBottomRightRadius: radius.hero },
    iconWrap: { alignItems: 'center' },
    iconBubble: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center', ...t.shadow.elevated, ...(t.hc ? t.hairline : {}) },
    perchRow: { flexDirection: 'row' },
    copy: { gap: spacing.sm, marginTop: spacing.section },
    footer: { gap: spacing.md },
  }),
);
