import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Scene, SlideBackgrounds } from '@/features/onboarding/hero';
import { strings } from '@/i18n';
import { radius, spacing } from '@/theme';
import { makeStyles, useAppearanceStore, useTextScaleFactor, useTheme } from '@/theme/provider';

const S = strings.onboarding;
const TOP_BAR = 52;
const FOOTER = 96;

/**
 * Primera apertura (V4.4): la promesa de BUDDY en cuatro escenas vivas que se deslizan con el dedo (features/onboarding/
 * hero.tsx), cada una con un título y UNA línea. Arriba, una barra por paso que se llena siguiendo al dedo, y "Omitir";
 * abajo, "Siguiente" (en la última, "Empezar"). Al terminar se recuerda en el teléfono y no vuelve a aparecer sola.
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
  const n = S.slides.length;
  const last = i === n - 1;

  // La escena ocupa la parte superior; con letra grande cede espacio al texto (nunca se recorta).
  const free = height - insets.top - insets.bottom - TOP_BAR - FOOTER;
  const art = Math.round(Math.max(170, Math.min(width * 1.05, free * (big ? 0.4 : 0.6))));
  const top = insets.top + TOP_BAR;

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
    if (last) return finish();
    setI(i + 1);
    pager.current?.scrollTo({ x: (i + 1) * width, animated: true });
  };

  return (
    <View style={[s.root, { backgroundColor: t.c.bg }]}>
      <SlideBackgrounds x={x} width={width} top={top} size={art} />

      <View style={[s.top, { paddingTop: insets.top }]}>
        <View style={s.steps} accessible accessibilityRole="progressbar" accessibilityLabel={S.progress(i + 1, n)}>
          {S.slides.map((_, k) => (
            <Step key={k} index={k} x={x} width={width} />
          ))}
        </View>
        <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel={S.skip} hitSlop={8} style={s.skip}>
          <AppText variant="secondaryStrong" color={t.c.muted} maxScale={1.4}>
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
            <Scene index={k} x={x} width={width} height={art} active={k === i} />
            <Copy index={k} x={x} width={width} title={sl.title} body={sl.body} active={k === i} />
          </Animated.ScrollView>
        ))}
      </Animated.ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button label={last ? S.begin : strings.common.next} variant="primary" haptic shine={last} trailing={last ? undefined : 'chevron'} style={s.cta} onPress={next} />
      </View>
    </View>
  );
}

/** Título y línea: llegan con el dedo (la línea viaja más que el título). Solo transform y opacidad. */
function Copy({ index, x, width, title, body, active }: { index: number; x: SharedValue<number>; width: number; title: string; body: string; active: boolean }) {
  const t = useTheme();
  const s = useStyles();
  const head = useAnimatedStyle(() => {
    const d = x.get() / Math.max(1, width) - index;
    return { opacity: interpolate(Math.abs(d), [0, 0.6], [1, 0], Extrapolation.CLAMP), transform: [{ translateX: d * 50 }] };
  });
  const text = useAnimatedStyle(() => {
    const d = x.get() / Math.max(1, width) - index;
    return { opacity: interpolate(Math.abs(d), [0, 0.5], [1, 0], Extrapolation.CLAMP), transform: [{ translateX: d * 110 }] };
  });
  return (
    <View style={s.copy} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'} accessibilityElementsHidden={!active}>
      <Animated.View style={head}>
        <AppText variant="display" align="center" accessibilityRole="header">
          {title}
        </AppText>
      </Animated.View>
      <Animated.View style={text}>
        <AppText variant="body" align="center" color={t.c.muted}>
          {body}
        </AppText>
      </Animated.View>
    </View>
  );
}

/** Barra de un paso: se llena mientras el dedo llega a su página (escala horizontal desde la izquierda). */
function Step({ index, x, width }: { index: number; x: SharedValue<number>; width: number }) {
  const t = useTheme();
  const s = useStyles();
  const fill = useAnimatedStyle(() => ({
    transform: [{ scaleX: index === 0 ? 1 : interpolate(x.get() / Math.max(1, width), [index - 1, index], [0, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <View style={[s.step, { backgroundColor: t.hc ? t.c.surface2 : t.dark ? 'rgba(255,255,255,0.14)' : 'rgba(16,42,51,0.12)' }, t.hc && t.hairline]}>
      <Animated.View style={[s.stepFill, { backgroundColor: t.hc ? t.c.text : t.c.accent }, fill]} />
    </View>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    root: { flex: 1 },
    flex: { flex: 1 },
    top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
    steps: { flex: 1, flexDirection: 'row', gap: 6, minHeight: TOP_BAR, alignItems: 'center' },
    step: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
    stepFill: { width: '100%', height: '100%', borderRadius: 3, transformOrigin: 'left' },
    skip: { minHeight: TOP_BAR, minWidth: 64, justifyContent: 'center', alignItems: 'flex-end' },
    page: { flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.xl },
    copy: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.sm, alignItems: 'center' },
    footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
    cta: { borderRadius: radius.pill, minHeight: 60 },
  }),
);
