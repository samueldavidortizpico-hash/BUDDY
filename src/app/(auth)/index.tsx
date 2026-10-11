import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { BrandMark, BuddyHero } from '@/components/buddy';
import { Button } from '@/components/button';
import { useToast } from '@/components/feedback';
import { Icon } from '@/components/icon';
import { ScreenContainer } from '@/components/screen-container';
import { useSettings } from '@/features/profile/hooks';
import { ink, palette, radius, shadow, spacing } from '@/theme';

/** Bienvenida: el robot BUDDY es el protagonista (sin fotos de personas). */
export default function Welcome() {
  const router = useRouter();
  const toast = useToast();
  const { role } = useSettings();
  const { width } = useWindowDimensions();

  if (role === 'patient') return <Redirect href="/home" />;
  if (role === 'caregiver') return <Redirect href="/summary" />;

  const heroSize = Math.min(238, width * 0.58);

  return (
    <ScreenContainer gradient="welcome" contentStyle={styles.content}>
      <View style={[styles.orb, styles.orbOne]} />
      <View style={[styles.orb, styles.orbTwo]} />

      <Appear index={0}>
        <BrandMark size={44} />
      </Appear>

      <Appear index={1} style={styles.copy}>
        <AppText variant="eyebrow" color={ink.mint}>
          BIENESTAR QUE TE ACOMPAÑA
        </AppText>
        <AppText variant="display" color={ink.title}>
          {'Tu bienestar,\nsiempre acompañado'}
        </AppText>
        <AppText variant="body" color={ink.muted}>
          Medicamentos, salud, ánimo, sueño y acompañamiento en un solo lugar.
        </AppText>
      </Appear>

      <View style={styles.visual}>
        <BuddyHero size={heroSize} />
        <View style={styles.trustPill} accessible accessibilityLabel="Cuidado inteligente">
          <Icon name="shield" size={18} color={ink.mint} />
          <AppText variant="captionStrong">Cuidado inteligente</AppText>
        </View>
      </View>

      <Appear index={2} style={styles.actions}>
        <Button label="Comenzar" variant="coral" trailing="arrow" haptic onPress={() => router.push('/onboarding')} />
        <Button
          label="Iniciar sesión"
          variant="ghost"
          accessibilityHint="Las cuentas reales llegarán próximamente; abre la elección de perfil de la demostración"
          onPress={() => {
            toast({ message: 'El inicio de sesión real llegará próximamente. Elige un perfil para ver la demostración.', icon: 'shield' });
            router.push('/profile-choice');
          }}
        />
        <AppText variant="meta" color={ink.muted} align="center">
          Versión de demostración con datos de ejemplo
        </AppText>
      </Appear>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: spacing.sm, gap: spacing.lg },
  copy: { gap: spacing.sm },
  orb: { position: 'absolute', borderRadius: radius.pill },
  orbOne: { width: 240, height: 240, backgroundColor: '#E5F8F1', top: 140, right: -150 },
  orbTwo: { width: 180, height: 180, backgroundColor: '#FFF0E9', top: 360, left: -120 },
  visual: { flexGrow: 1, justifyContent: 'center', minHeight: 260 },
  trustPill: {
    position: 'absolute',
    right: 0,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.glass,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    ...shadow.soft,
  },
  actions: { gap: spacing.sm },
});
