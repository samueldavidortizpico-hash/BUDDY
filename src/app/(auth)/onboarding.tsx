import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { BuddyAvatar } from '@/components/buddy';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenContainer } from '@/components/screen-container';
import { gradients, ink, palette, radius, shadow, spacing, touch, type GradientName } from '@/theme';

const SLIDES: { icon: IconName; gradient: GradientName; color: string; kicker: string; title: string; text: string; stat: string }[] = [
  {
    icon: 'meds',
    gradient: 'onboardingMint',
    color: ink.mint,
    kicker: 'MEDICAMENTOS',
    title: 'Cada toma,\nsiempre a tiempo',
    text: 'Recordatorios claros, horarios organizados y confirmación de cada toma.',
    stat: 'Recordatorios a tiempo',
  },
  {
    icon: 'heart',
    gradient: 'onboardingLavender',
    color: ink.lavender,
    kicker: 'TU BIENESTAR',
    title: 'Entiende cómo\nte sientes',
    text: 'Registra tu ánimo, sueño, síntomas y datos de salud de forma simple y visual.',
    stat: 'Ánimo, sueño y síntomas',
  },
  {
    icon: 'shield',
    gradient: 'onboardingCoral',
    color: ink.coral,
    kicker: 'SIEMPRE CERCA',
    title: 'Acompañamiento\nque da tranquilidad',
    text: 'BUDDY y tus personas de confianza pueden acompañarte, siempre con tu permiso.',
    stat: 'Solo con tu autorización',
  },
];

function Dot({ active, index, onPress }: { active: boolean; index: number; onPress: () => void }) {
  const reduceMotion = useReducedMotion();
  // Animación de ancho en un elemento diminuto y aislado (aceptable: no afecta a superficies grandes).
  const w = useSharedValue(active ? 26 : 8);
  useEffect(() => {
    w.set(reduceMotion ? (active ? 26 : 8) : withTiming(active ? 26 : 8, { duration: 200 }));
  }, [active, reduceMotion, w]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ir al paso ${index + 1} de ${SLIDES.length}`}
      accessibilityState={{ selected: active }}
      style={styles.dotHit}
    >
      <Animated.View style={[styles.dot, { backgroundColor: active ? palette.mintDeep : palette.dotIdle }, style]} />
    </Pressable>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;

  return (
    <ScreenContainer gradient="welcome" contentStyle={styles.content}>
      <View style={styles.top}>
        <View style={styles.brand}>
          <BuddyAvatar size="small" label="" />
          <AppText variant="h3">BUDDY</AppText>
        </View>
        <PressableScale onPress={() => router.push('/profile-choice')} accessibilityLabel="Omitir presentación" style={styles.skip}>
          <AppText variant="secondaryStrong" color={ink.muted}>
            Omitir
          </AppText>
        </PressableScale>
      </View>

      <Animated.View key={step} entering={FadeIn.duration(300)} style={styles.art}>
        <LinearGradient colors={gradients[slide.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.orbit, { width: 270, height: 270 }]} />
        <View style={[styles.orbit, { width: 210, height: 210 }]} />
        <View style={styles.feature}>
          <Icon name={slide.icon} size={52} color={slide.color} />
        </View>
        <View style={styles.buddy}>
          <BuddyAvatar size={100} label="" />
        </View>
        <View style={styles.stat}>
          <Icon name="check" size={18} color={ink.mint} />
          <AppText variant="captionStrong">{slide.stat}</AppText>
        </View>
      </Animated.View>

      <Animated.View key={`copy-${step}`} entering={FadeIn.duration(300)} style={styles.copy} accessibilityLiveRegion="polite">
        <AppText variant="eyebrow" color={ink.mint}>
          {slide.kicker}
        </AppText>
        <AppText variant="display" color={ink.title}>
          {slide.title}
        </AppText>
        <AppText variant="body" color={ink.muted}>
          {slide.text}
        </AppText>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <Dot key={s.kicker} index={i} active={i === step} onPress={() => setStep(i)} />
          ))}
        </View>
        <Button
          label={last ? 'Elegir mi perfil' : 'Continuar'}
          trailing="arrow"
          haptic
          onPress={() => (last ? router.push('/profile-choice') : setStep(step + 1))}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg },
  top: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  skip: { minHeight: touch.min, minWidth: touch.min, justifyContent: 'center', paddingHorizontal: spacing.xs },
  art: { height: 320, borderRadius: 34, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.72)' },
  feature: {
    width: 118,
    height: 118,
    borderRadius: 37,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
    boxShadow: '0px 18px 34px rgba(23, 74, 89, 0.10)',
  },
  buddy: { position: 'absolute', right: 24, bottom: 30, transform: [{ rotate: '8deg' }] },
  stat: {
    position: 'absolute',
    left: 16,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.glass,
    borderRadius: radius.pill,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    ...shadow.soft,
  },
  copy: { gap: spacing.sm },
  footer: { marginTop: 'auto', gap: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center' },
  dotHit: { minWidth: 40, minHeight: touch.min, alignItems: 'center', justifyContent: 'center' },
  dot: { height: 8, borderRadius: 4 },
});
