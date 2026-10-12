/**
 * Portada de carga de BUDDY (después del splash nativo). BUDDY duerme dentro de un halo y respira; la barra avanza
 * con las tareas REALES del arranque (stages.ts) y el mensaje dice qué se está haciendo. Al terminar despierta,
 * se acerca y la app aparece detrás con un desvanecido. No alarga la apertura a propósito: el despertar dura ~0,5 s.
 * Con "reducir movimiento": sin respiración, sin orbes en movimiento ni vuelo; solo un desvanecido corto.
 * La barra se mueve con translateX sobre su ancho medido (sin transformOrigin, que falló antes en Expo Go).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/button';
import { BuddyRobot } from '@/components/robot';

import { bootView, type StageKey } from './stages';

const PETROL = ['#0B2730', '#174A59', '#1D5E6C'] as const;
const MINT = '#5ED9B5';

export function BootScreen({ done, onDone, onRetry }: { done: Record<StageKey, boolean>; onDone: () => void; onRetry: () => void }) {
  const reduce = useReducedMotion();
  const [start, setStart] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const view = bootView(done, elapsed);
  const ready = view.kind === 'ready';
  /** Despierto = arranque terminado. */
  const awake = ready;

  // Reloj del arranque (4 veces por segundo, solo mientras carga) para avisar si tarda.
  useEffect(() => {
    if (ready) return;
    const id = setInterval(() => setElapsed(Date.now() - start), 250);
    return () => clearInterval(id);
  }, [ready, start]);

  const breathe = useSharedValue(1);
  const zz = useSharedValue(0);
  const drift = useSharedValue(0);
  const progress = useSharedValue(0);
  const trackW = useSharedValue(0);
  const lift = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    if (reduce) return;
    breathe.set(withRepeat(withSequence(withTiming(1.035, { duration: 1400, easing: Easing.inOut(Easing.sin) }), withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) })), -1));
    zz.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1));
    drift.set(withRepeat(withSequence(withTiming(1, { duration: 4000 }), withTiming(0, { duration: 4000 })), -1));
  }, [reduce, breathe, zz, drift]);

  const target = view.kind === 'loading' ? view.progress : 1;
  useEffect(() => {
    progress.set(reduce ? target : withTiming(target, { duration: 220 }));
  }, [target, reduce, progress]);

  // Listo: despierta, se acerca y la portada se desvanece revelando la app.
  useEffect(() => {
    if (!ready) return;
    if (reduce) {
      fade.set(withTiming(0, { duration: 200 }, (f) => f && runOnJS(onDone)()));
      return;
    }
    lift.set(withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    fade.set(withSequence(withTiming(1, { duration: 260 }), withTiming(0, { duration: 260 }, (f) => f && runOnJS(onDone)())));
  }, [ready, reduce, fade, lift, onDone]);

  const robotStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -40 * lift.get() }, { scale: breathe.get() * (1 + 0.25 * lift.get()) }] }));
  const zzStyle = useAnimatedStyle(() => ({ opacity: awake ? 0 : 1 - zz.get(), transform: [{ translateY: -24 * zz.get() }, { translateX: 8 * zz.get() }] }));
  const orbA = useAnimatedStyle(() => ({ transform: [{ translateX: 18 * drift.get() }, { translateY: -12 * drift.get() }] }));
  const orbB = useAnimatedStyle(() => ({ transform: [{ translateX: -14 * drift.get() }, { translateY: 16 * drift.get() }] }));
  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: -trackW.get() * (1 - Math.max(0.03, progress.get())) }] }));
  const root = useAnimatedStyle(() => ({ opacity: fade.get() }));

  const retry = () => {
    setStart(Date.now());
    setElapsed(0);
    onRetry();
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, root]} testID="boot-screen" pointerEvents={ready ? 'none' : 'auto'}>
      <LinearGradient colors={PETROL} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.orb, styles.orbMint, orbA]} />
      <Animated.View style={[styles.orb, styles.orbSky, orbB]} />

      <View style={styles.center}>
        <View style={styles.halo}>
          <Animated.View style={robotStyle}>
            <BuddyRobot size={168} mood={awake ? 'wave' : 'sleep'} shadow={false} flying={false} navigationIndependent />
          </Animated.View>
          <Animated.Text style={[styles.zz, zzStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            Zz
          </Animated.Text>
        </View>
        <Text style={styles.word} accessibilityRole="header">BUDDY</Text>
        <Text style={styles.tagline}>Siempre contigo</Text>
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
              <Animated.View style={[styles.fill, bar]} />
            </View>
            <Text style={styles.message} accessibilityLiveRegion="polite">
              {view.kind === 'loading' ? view.message : 'Listo'}
            </Text>
            {view.kind === 'loading' && view.slow ? <Text style={styles.slow}>Está tardando un poco más de lo normal…</Text> : null}
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute', width: 320, height: 320, borderRadius: 160, opacity: 0.22 },
  orbMint: { top: -60, right: -90, backgroundColor: MINT },
  orbSky: { bottom: 40, left: -120, backgroundColor: '#63B3FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  halo: { width: 240, height: 240, borderRadius: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(94,217,181,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  zz: { position: 'absolute', top: 34, right: 48, color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  word: { marginTop: 18, color: '#FFFFFF', fontSize: 40, fontWeight: '800', letterSpacing: 6 },
  tagline: { color: 'rgba(255,255,255,0.82)', fontSize: 17, fontWeight: '600' },
  bottom: { paddingHorizontal: 40, paddingBottom: 72, gap: 12, alignItems: 'center' },
  track: { width: '100%', maxWidth: 320, height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.18)' },
  fill: { width: '100%', height: '100%', borderRadius: 4, backgroundColor: MINT },
  message: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  slow: { color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center' },
  failed: { gap: 16, alignItems: 'center' },
});
