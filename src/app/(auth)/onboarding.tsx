import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Backdrop, Reveal, Scene, SLIDES, Words } from '@/features/onboarding/hero';
import { strings } from '@/i18n';
import { radius, spacing } from '@/theme';
import { makeStyles, useAppearanceStore, useTextScaleFactor, useTheme } from '@/theme/provider';

const S = strings.onboarding;
const TOP_BAR = 52;
const FOOTER = 96;

/**
 * Primera apertura (V5.1): la promesa de BUDDY en cuatro pantallas inmersivas a todo color que se deslizan con el dedo
 * (features/onboarding/hero.tsx), cada una con su escena, un título que entra palabra por palabra y UNA línea. Arriba,
 * una barra por paso y "Omitir"; abajo, "Siguiente" (en la última, "Empezar").
 *
 * Una sola fuente de verdad para el paso (auditoría UI, UX-04 y UX-05): la página CENTRADA según el desplazamiento
 * real, venga del dedo o del botón. La escena activa, la barra, el texto accesible y el botón salen de ahí; al rotar o
 * cambiar el ancho, la página elegida vuelve a quedar centrada. Con "reducir movimiento" (UX-06) el botón cambia de
 * página sin animación y no hay paralaje.
 */
export default function Onboarding() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const big = useTextScaleFactor() > 1.15;
  const setAppearance = useAppearanceStore((x) => x.set);
  const pager = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const [i, setI] = useState(0);
  const page = useRef(0);
  const leaving = useRef(false);
  const n = S.slides.length;
  const last = i === n - 1;
  const ink = t.hc ? t.c.text : '#FFFFFF';
  const soft = t.hc ? t.c.text : 'rgba(255,255,255,0.9)';

  // La escena ocupa la parte superior; con letra grande cede espacio al texto (nunca se recorta).
  const free = height - insets.top - insets.bottom - TOP_BAR - FOOTER;
  const art = Math.round(Math.max(180, Math.min(width * 1.12, free * (big ? 0.42 : 0.62))));

  const settle = useCallback(
    (p: number) => {
      const centered = Math.max(0, Math.min(n - 1, p));
      page.current = centered;
      setI(centered);
    },
    [n],
  );
  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });
  useAnimatedReaction(
    () => Math.round(x.get() / Math.max(1, width)),
    (now, before) => {
      if (now !== before) runOnJS(settle)(now);
    },
    [width, settle],
  );
  // Rotar el teléfono o cambiar el ancho: la página en la que estaba vuelve a quedar centrada, sin animación.
  useEffect(() => {
    x.set(page.current * width);
    pager.current?.scrollTo({ x: page.current * width, animated: false });
  }, [width, pager, x]);

  const finish = () => {
    if (leaving.current) return;
    leaving.current = true;
    setAppearance({ introSeen: true });
    router.replace('/');
  };
  const next = () => {
    if (last) return finish();
    pager.current?.scrollTo({ x: (i + 1) * width, animated: !reduce });
  };

  return (
    <View style={[s.root, { backgroundColor: t.hc ? t.c.bg : SLIDES[0].deep }]}>
      {t.hc ? null : <StatusBar style="light" />}
      <Backdrop x={x} width={width} />

      <View style={[s.top, { paddingTop: insets.top }]}>
        <View style={s.steps} accessible accessibilityRole="progressbar" accessibilityLabel={S.progress(i + 1, n)} accessibilityValue={{ min: 1, max: n, now: i + 1 }}>
          {S.slides.map((_, k) => (
            <Step key={k} index={k} x={x} width={width} />
          ))}
        </View>
        <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel={S.skip} hitSlop={8} style={s.skip}>
          <AppText variant="secondaryStrong" color={ink} maxScale={1.4}>
            {S.skip}
          </AppText>
        </Pressable>
      </View>

      <Animated.ScrollView ref={pager} horizontal pagingEnabled bounces={false} showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} style={s.flex}>
        {S.slides.map((sl, k) => (
          <ScrollView key={k} style={{ width }} contentContainerStyle={s.page} showsVerticalScrollIndicator={false} bounces={false}>
            <Scene index={k} x={x} width={width} height={art} active={k === i} />
            <View style={s.copy} importantForAccessibility={k === i ? 'auto' : 'no-hide-descendants'} accessibilityElementsHidden={k !== i}>
              <Words text={sl.title} active={k === i} color={ink} />
              <Reveal active={k === i} delay={420}>
                <AppText variant="body" align="center" color={soft}>
                  {sl.body}
                </AppText>
              </Reveal>
            </View>
          </ScrollView>
        ))}
      </Animated.ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {/* Botón blanco con el texto del color profundo del paso: la única acción y siempre la misma posición. */}
        <Button label={last ? S.begin : strings.common.next} variant="white" textColor={SLIDES[i].deep} trailing={last ? undefined : 'chevron'} haptic="light" style={s.cta} onPress={next} />
      </View>
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
    <View style={[s.step, { backgroundColor: t.hc ? t.c.surface2 : 'rgba(255,255,255,0.3)' }, t.hc && t.hairline]}>
      <Animated.View style={[s.stepFill, { backgroundColor: t.hc ? t.c.text : '#FFFFFF' }, fill]} />
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
    page: { flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.lg },
    copy: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.sm, alignItems: 'center' },
    footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
    cta: { borderRadius: radius.pill, minHeight: 60 },
  }),
);
