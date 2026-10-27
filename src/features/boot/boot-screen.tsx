/**
 * Portada de carga de BUDDY (V4.2, referencia 01-carga), después del splash nativo, que muestra el mismo ícono sobre el
 * mismo petróleo oscuro para que el paso sea continuo. El ícono entra con escala y un rebote leve, los destellos de
 * cuatro puntas titilan y la barra avanza con las tareas REALES del arranque (stages.ts); al terminar el ícono crece un
 * poco y la portada se desvanece revelando la app. Con "reducir movimiento": sin rebote ni titileo, solo fundidos.
 * Solo se animan transform y opacidad; la barra se mueve con translateX sobre su ancho medido.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';

import { bootView, type StageKey } from './stages';

const ICON = require('../../../assets/branding/buddy-splash.png');
/** Medido en la referencia: verde azulado arriba a la derecha que se hunde en petróleo casi negro. */
const PETROL = ['#3F8676', '#174B55', '#082C3E', '#052338'] as const;
const STAR = 'M12 0 C12.8 8 16 11.2 24 12 C16 12.8 12.8 16 12 24 C11.2 16 8 12.8 0 12 C8 11.2 11.2 8 12 0Z';
const SPARKS = [
  { x: 16, y: 13, s: 12, d: 1700 },
  { x: 83, y: 9, s: 22, d: 2300 },
  { x: 90, y: 34, s: 10, d: 1900 },
  { x: 9, y: 40, s: 9, d: 2100 },
  { x: 74, y: 62, s: 12, d: 2500 },
  { x: 20, y: 74, s: 8, d: 1800 },
  { x: 60, y: 22, s: 7, d: 2000 },
  { x: 86, y: 80, s: 9, d: 2200 },
];

export function BootScreen({ done, onDone, onRetry }: { done: Record<StageKey, boolean>; onDone: () => void; onRetry: () => void }) {
  const reduce = useReducedMotion();
  const [start, setStart] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const view = bootView(done, elapsed);
  const ready = view.kind === 'ready';

  // Reloj del arranque (4 veces por segundo, solo mientras carga) para avisar si tarda.
  useEffect(() => {
    if (ready) return;
    const id = setInterval(() => setElapsed(Date.now() - start), 250);
    return () => clearInterval(id);
  }, [ready, start]);

  const enter = useSharedValue(reduce ? 1 : 0);
  const progress = useSharedValue(0);
  const trackW = useSharedValue(0);
  const exit = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    enter.set(reduce ? 1 : withSpring(1, { damping: 11, stiffness: 140, mass: 0.8 }));
  }, [reduce, enter]);

  const target = view.kind === 'loading' ? view.progress : 1;
  useEffect(() => {
    progress.set(reduce ? target : withTiming(target, { duration: 260, easing: Easing.out(Easing.cubic) }));
  }, [target, reduce, progress]);

  // Listo: el ícono crece un poco y la portada se desvanece revelando la app.
  useEffect(() => {
    if (!ready) return;
    if (reduce) {
      fade.set(withTiming(0, { duration: 220 }, (f) => f && runOnJS(onDone)()));
      return;
    }
    exit.set(withTiming(1, { duration: 420, easing: Easing.inOut(Easing.cubic) }));
    fade.set(withDelay(180, withTiming(0, { duration: 300 }, (f) => f && runOnJS(onDone)())));
  }, [ready, reduce, fade, exit, onDone]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.get() * 1.4),
    transform: [{ scale: 0.82 + 0.18 * enter.get() + 0.08 * exit.get() }],
  }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: enter.get(), transform: [{ translateY: 12 * (1 - enter.get()) }] }));
  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: -trackW.get() * (1 - Math.max(0.04, progress.get())) }] }));
  const root = useAnimatedStyle(() => ({ opacity: fade.get() }));

  const retry = () => {
    setStart(Date.now());
    setElapsed(0);
    onRetry();
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, root]} testID="boot-screen" pointerEvents={ready ? 'none' : 'auto'}>
      <LinearGradient colors={PETROL} locations={[0, 0.32, 0.62, 1]} start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 1 }} style={StyleSheet.absoluteFill} />
      {SPARKS.map((p, i) => (
        <Sparkle key={i} spec={p} still={reduce} index={i} />
      ))}

      <View style={styles.center}>
        <Animated.View style={[styles.iconWrap, iconStyle]}>
          <Image source={ICON} style={styles.icon} contentFit="contain" accessible={false} />
        </Animated.View>
        <Animated.View style={[styles.words, wordStyle]}>
          <Text style={styles.word} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
            BUDDY
          </Text>
          <Text style={styles.tagline} maxFontSizeMultiplier={1.6}>
            Siempre contigo
          </Text>
        </Animated.View>
      </View>

      <View style={styles.bottom}>
        {view.kind === 'failed' ? (
          <View style={styles.failed} accessibilityRole="alert">
            <Text style={styles.message}>No pudimos abrir BUDDY. Tus datos siguen guardados en el teléfono.</Text>
            <Button label="Reintentar" icon="arrow" variant="white" onPress={retry} />
          </View>
        ) : (
          <>
            <View
              style={styles.track}
              onLayout={(e) => trackW.set(e.nativeEvent.layout.width)}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Abriendo BUDDY"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
            >
              <Animated.View style={[styles.fill, bar]}>
                <LinearGradient colors={['#1E9FA6', '#2BC4B4', '#5ED9B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                {/* Punta brillante: el extremo del avance se ilumina. */}
                <LinearGradient colors={['rgba(201,255,240,0)', '#D9FFF4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tip} />
              </Animated.View>
            </View>
            <Text style={styles.stage} accessibilityLiveRegion="polite">
              {view.kind === 'loading' ? view.message : 'Listo'}
            </Text>
            {view.kind === 'loading' && view.slow ? <Text style={styles.message}>Está tardando un poco más de lo normal…</Text> : null}
          </>
        )}
      </View>
    </Animated.View>
  );
}

/** Destello de cuatro puntas que titila (opacidad y escala). */
function Sparkle({ spec, still, index }: { spec: (typeof SPARKS)[number]; still: boolean; index: number }) {
  const v = useSharedValue(still ? 0.7 : 0.2);
  useEffect(() => {
    if (still) return;
    twinkle(v, spec.d, index * 230);
  }, [still, v, spec.d, index]);
  const style = useAnimatedStyle(() => ({ opacity: v.get(), transform: [{ scale: 0.6 + 0.5 * v.get() }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.spark, { left: `${spec.x}%`, top: `${spec.y}%`, width: spec.s, height: spec.s }, style]}>
      <Svg width={spec.s} height={spec.s} viewBox="0 0 24 24">
        <Path d={STAR} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

function twinkle(v: SharedValue<number>, ms: number, delay: number) {
  v.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: ms / 2, easing: Easing.inOut(Easing.sin) }), withTiming(0.15, { duration: ms / 2, easing: Easing.inOut(Easing.sin) })), -1)));
}

const styles = StyleSheet.create({
  spark: { position: 'absolute' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 24 },
  iconWrap: { borderRadius: 43, boxShadow: '0 18px 40px rgba(0, 0, 0, 0.38)' },
  icon: { width: 188, height: 188 },
  words: { alignItems: 'center', marginTop: 28, gap: 4 },
  // La portada se dibuja ANTES de que carguen las fuentes de la app: letra del sistema, en negrita.
  word: { color: '#FFFFFF', fontSize: 42, lineHeight: 48, fontWeight: '800' },
  tagline: { color: 'rgba(255,255,255,0.82)', fontSize: 19, lineHeight: 24, fontWeight: '500' },
  bottom: { paddingHorizontal: 48, paddingBottom: 64, gap: 10, alignItems: 'center' },
  track: { width: '100%', maxWidth: 300, height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.16)' },
  fill: { width: '100%', height: '100%', borderRadius: 3, overflow: 'hidden' },
  tip: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 36 },
  stage: { color: 'rgba(255,255,255,0.62)', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  message: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  failed: { gap: 16, alignItems: 'center' },
});
