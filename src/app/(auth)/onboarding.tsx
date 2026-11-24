import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Illustration, SlideBackgrounds } from '@/features/onboarding/hero';
import { strings } from '@/i18n';
import { motion, radius, spacing } from '@/theme';
import { makeStyles, useAppearanceStore, useTextScaleFactor, useTheme } from '@/theme/provider';

const S = strings.onboarding;
const TOP_BAR = 52;
const FOOTER = 128;

/**
 * Primera apertura (V4.2, referencias 02 a 05): cuatro presentaciones que se deslizan con el dedo. Cada una muestra SOLO
 * su ilustración en la mitad superior, el título y el texto abajo, y "Siguiente"; la cuarta lleva a Bienvenido.
 * "Omitir" también lleva a Bienvenido. Al terminar se recuerda en el teléfono y no vuelve a aparecer sola.
 */
export default function Onboarding() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const big = useTextScaleFactor() > 1.15;
  const setAppearance = useAppearanceStore((x) => x.set);
  const pager = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const [i, setI] = useState(0);
  const leaving = useRef(false);
  const slide = S.slides[i];
  const n = S.slides.length;

  // La ilustración ocupa la mitad superior; con letra grande cede espacio al texto (nunca se recorta).
  const free = height - insets.top - insets.bottom - TOP_BAR - FOOTER;
  const art = Math.round(Math.max(150, Math.min(width * 1.05, free * (big ? 0.36 : 0.52))));
  const illustrationEnd = (insets.top + TOP_BAR + art) / height;

  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });
  const finish = () => {
    if (leaving.current) return;
    leaving.current = true;
    setAppearance({ introSeen: true });
    router.replace('/');
  };
  const next = () => {
    if (i === n - 1) return finish();
    setI(i + 1);
    pager.current?.scrollTo({ x: (i + 1) * width, animated: true });
  };

  return (
    <View style={[s.root, { backgroundColor: t.c.bg }]}>
      <SlideBackgrounds x={x} width={width} illustrationEnd={illustrationEnd} />

      <View style={[s.top, { paddingTop: insets.top }]}>
        <View style={s.label} accessible accessibilityLabel={`${slide.eyebrow}. ${S.progress(i + 1, n)}`}>
          <AppText variant="secondaryStrong" color={t.c.text} numberOfLines={1} maxScale={1.4}>
            {slide.eyebrow}
          </AppText>
          <AppText variant="secondaryStrong" color={t.c.text} maxScale={1.4}>
            {S.counter(i + 1, n)}
          </AppText>
        </View>
        <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel={S.skip} hitSlop={8} style={s.skip}>
          <AppText variant="secondaryStrong" color={t.c.text} maxScale={1.4}>
            {S.skip}
          </AppText>
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={s.flex}
      >
        {S.slides.map((sl, k) => (
          <Animated.ScrollView key={k} style={{ width }} contentContainerStyle={s.page} showsVerticalScrollIndicator={false} bounces={false}>
            <Illustration index={k} x={x} width={width} height={art} />
            <Copy index={k} x={x} width={width} title={sl.title} body={sl.body} active={k === i} />
          </Animated.ScrollView>
        ))}
      </Animated.ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Dots x={x} width={width} count={n} label={S.progress(i + 1, n)} />
        <Cta last={i === n - 1} onPress={next} />
      </View>
    </View>
  );
}

/**
 * CTA del carrusel (V5): la flecha invita a seguir con un empujoncito cada pocos segundos; en la última presentación la
 * etiqueta pasa a "Empezar" con un pequeño rebote del botón (encoge 4 % y vuelve con resorte), para marcar el cambio.
 */
function Cta({ last, onPress }: { last: boolean; onPress: () => void }) {
  const s = useStyles();
  const reduce = useReducedMotion();
  const pop = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!reduce) pop.set(withSequence(withTiming(0.96, { duration: 90 }), withSpring(1, { damping: 10, stiffness: 260 })));
  }, [last, reduce, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  return (
    <Animated.View style={style}>
      <Button label={last ? S.begin : strings.common.next} trailing="arrow" nudge variant="mint" haptic shine style={s.cta} onPress={onPress} />
    </Animated.View>
  );
}

/** Título y texto: entran escalonados al deslizar (el texto viaja más que el título; solo transform y opacidad). */
function Copy({ index, x, width, title, body, active }: { index: number; x: SharedValue<number>; width: number; title: string; body: string; active: boolean }) {
  const t = useTheme();
  const s = useStyles();
  const head = useAnimatedStyle(() => {
    const d = x.get() / Math.max(1, width) - index;
    return { opacity: interpolate(Math.abs(d), [0, 0.6], [1, 0], Extrapolation.CLAMP), transform: [{ translateX: d * 60 }] };
  });
  const text = useAnimatedStyle(() => {
    const d = x.get() / Math.max(1, width) - index;
    return { opacity: interpolate(Math.abs(d), [0, 0.5], [1, 0], Extrapolation.CLAMP), transform: [{ translateX: d * 120 }] };
  });
  return (
    <View style={s.copy} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'} accessibilityElementsHidden={!active}>
      <Animated.View style={head}>
        <AppText variant="display" color={t.dark || t.hc ? t.c.text : '#174A59'} accessibilityRole="header" style={s.title}>
          {title}
        </AppText>
      </Animated.View>
      <Animated.View style={text}>
        <AppText variant="body" color={t.dark || t.hc ? t.c.muted : '#3E4F5C'}>
          {body}
        </AppText>
      </Animated.View>
    </View>
  );
}

/** Puntos de paginación: el activo se alarga siguiendo al dedo (escala horizontal). */
function Dots({ x, width, count, label }: { x: SharedValue<number>; width: number; count: number; label: string }) {
  return (
    <View style={styles.dots} accessible accessibilityLabel={label}>
      {Array.from({ length: count }, (_, k) => (
        <Dot key={k} index={k} x={x} width={width} />
      ))}
    </View>
  );
}

function Dot({ index, x, width }: { index: number; x: SharedValue<number>; width: number }) {
  const t = useTheme();
  const style = useAnimatedStyle(() => {
    const near = interpolate(Math.abs(x.get() / Math.max(1, width) - index), [0, 1], [1, 0], Extrapolation.CLAMP);
    return { opacity: 0.35 + 0.65 * near, transform: [{ scaleX: withSpring(1 + near * 1.6, motion.spring) }] };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: t.hc ? t.c.text : t.dark ? t.c.primary : '#1D6FB8' }, style]} />;
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingVertical: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

const useStyles = makeStyles(() =>
  StyleSheet.create({
    root: { flex: 1 },
    flex: { flex: 1 },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
    label: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: TOP_BAR, flexShrink: 1 },
    skip: { minHeight: TOP_BAR, minWidth: 64, justifyContent: 'center', alignItems: 'flex-end' },
    page: { flexGrow: 1 },
    copy: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
    title: { fontSize: 34, lineHeight: 40 },
    footer: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingTop: spacing.xs },
    cta: { borderRadius: radius.pill, minHeight: 60 },
  }),
);
