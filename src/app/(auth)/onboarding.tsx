import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Illustration, SlideBackgrounds } from '@/features/onboarding/hero';
import { strings } from '@/i18n';
import { motion, radius, spacing } from '@/theme';
import { makeStyles, useAppearanceStore, useTextScaleFactor, useTheme } from '@/theme/provider';

const S = strings.onboarding;
const TOP_BAR = 52;
const FOOTER = 96;
/** En tablet y plegable abierto el contenido no pasa de este ancho y queda centrado. */
const MAX_CONTENT = 520;

/**
 * Primera apertura (V4.4, boceto Paso1–4): cuatro presentaciones que se deslizan con el dedo. Arriba, puntos y
 * "Paso n de 4" con "Omitir" (no aparece en la última); en cada página, la ilustración en su tarjeta con degradado,
 * la etiqueta de color, el título y el texto; abajo, "Siguiente". La cuarta y "Omitir" llevan a Bienvenido.
 * Al terminar se recuerda en el teléfono y no vuelve a aparecer sola.
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

  const content = Math.min(width, MAX_CONTENT);
  const cardWidth = content - spacing.lg * 2;
  // La tarjeta ocupa cerca de la mitad del alto libre; con letra grande cede espacio al texto (nunca se recorta).
  const free = height - insets.top - insets.bottom - TOP_BAR - FOOTER;
  const art = Math.round(Math.max(160, Math.min(cardWidth, free * (big ? 0.36 : 0.5))));

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
      <SlideBackgrounds x={x} width={width} />

      <View style={[s.top, { paddingTop: insets.top, width: content }]}>
        <View style={s.progress} accessible accessibilityLabel={S.progress(i + 1, n)}>
          <Dots x={x} width={width} count={n} />
          <AppText variant="secondaryStrong" color={t.c.muted} maxScale={1.4}>
            {S.progress(i + 1, n)}
          </AppText>
        </View>
        {last ? null : (
          <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel={S.skip} hitSlop={8} style={s.skip}>
            <AppText variant="bodyStrong" color={t.c.text} maxScale={1.4}>
              {S.skip}
            </AppText>
          </Pressable>
        )}
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
            <View style={{ width: content }}>
              <View style={s.cardWrap}>
                <Illustration index={k} x={x} width={width} cardWidth={cardWidth} height={art} />
              </View>
              <Copy index={k} x={x} width={width} eyebrow={sl.eyebrow} title={sl.title} body={sl.body} active={k === i} />
            </View>
          </Animated.ScrollView>
        ))}
      </Animated.ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md), width: content }]}>
        <Button label={strings.common.next} variant="mint" haptic shine style={s.cta} onPress={next} />
      </View>
    </View>
  );
}

/** Etiqueta, título y texto: entran escalonados al deslizar (el texto viaja más que el título; solo transform y opacidad). */
function Copy({ index, x, width, eyebrow, title, body, active }: { index: number; x: SharedValue<number>; width: number; eyebrow: string; title: string; body: string; active: boolean }) {
  const t = useTheme();
  const s = useStyles();
  const reduce = useReducedMotion();
  const [near, far] = reduce ? [0, 0] : [60, 120];
  const head = useAnimatedStyle(() => {
    const d = x.get() / Math.max(1, width) - index;
    return { opacity: interpolate(Math.abs(d), [0, 0.6], [1, 0], Extrapolation.CLAMP), transform: [{ translateX: d * near }] };
  });
  const text = useAnimatedStyle(() => {
    const d = x.get() / Math.max(1, width) - index;
    return { opacity: interpolate(Math.abs(d), [0, 0.5], [1, 0], Extrapolation.CLAMP), transform: [{ translateX: d * far }] };
  });
  return (
    <View style={s.copy} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'} accessibilityElementsHidden={!active}>
      <Animated.View style={[s.headGroup, head]}>
        <AppText variant="secondaryStrong" color={t.intro[index].eyebrow} maxScale={1.6} style={s.eyebrow}>
          {eyebrow}
        </AppText>
        <AppText variant="display" color={t.c.text} accessibilityRole="header" style={s.title}>
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

/** Puntos de progreso: el activo se alarga siguiendo al dedo (escala horizontal). Decorativos: el texto los nombra. */
function Dots({ x, width, count }: { x: SharedValue<number>; width: number; count: number }) {
  return (
    <View style={styles.dots} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
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
  return <Animated.View style={[styles.dot, { backgroundColor: t.hc ? t.c.text : t.dark ? '#2BC4B4' : '#139AA0' }, style]} />;
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

const useStyles = makeStyles(() =>
  StyleSheet.create({
    root: { flex: 1, alignItems: 'center' },
    flex: { flex: 1, alignSelf: 'stretch' },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
    progress: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: TOP_BAR, flexShrink: 1 },
    skip: { minHeight: TOP_BAR, minWidth: 64, justifyContent: 'center', alignItems: 'flex-end' },
    page: { flexGrow: 1, alignItems: 'center', paddingTop: spacing.xs, paddingBottom: spacing.md },
    cardWrap: { alignItems: 'center' },
    copy: { paddingHorizontal: spacing.lg, paddingTop: spacing.section, gap: spacing.sm },
    headGroup: { gap: spacing.sm },
    eyebrow: { letterSpacing: 0.4 },
    title: { fontSize: 34, lineHeight: 40 },
    footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
    cta: { borderRadius: radius.pill, minHeight: 62 },
  }),
);
