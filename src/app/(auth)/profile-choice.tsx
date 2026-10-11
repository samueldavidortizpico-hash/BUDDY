import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { PersonAvatar } from '@/components/buddy';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { profileActions } from '@/features/profile/hooks';
import type { Role } from '@/types/domain';
import { gradients, ink, palette, shadow, spacing } from '@/theme';

function ProfileCard({
  title,
  text,
  art,
  badge,
  badgeBg,
  badgeColor,
  caregiver,
  onPress,
}: {
  title: string;
  text: string;
  art: ReactNode;
  badge: IconName;
  badgeBg: string;
  badgeColor: string;
  caregiver?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale haptic onPress={onPress} accessibilityLabel={`${title}. ${text}`} style={styles.card}>
      {caregiver ? (
        <LinearGradient colors={gradients.caregiverCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.radius]} />
      ) : null}
      <View style={[styles.art, { backgroundColor: caregiver ? palette.coralPale : palette.mintPale }]}>
        {art}
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Icon name={badge} size={18} color={badgeColor} />
        </View>
      </View>
      <View style={styles.copy}>
        <AppText variant="h3">{title}</AppText>
        <AppText variant="secondary" color={ink.muted}>
          {text}
        </AppText>
      </View>
      <View style={styles.arrow}>
        <Icon name="arrow" size={20} />
      </View>
    </PressableScale>
  );
}

export default function ProfileChoice() {
  const router = useRouter();

  const choose = (role: Role) => {
    profileActions.chooseRole(role);
    if (router.canDismiss()) router.dismissAll();
    router.replace(role === 'patient' ? '/home' : '/summary');
  };

  return (
    <ScreenContainer header={<ScreenHeader title="¿Cómo usarás BUDDY?" />}>
      <Appear index={0} style={styles.intro}>
        <AppText variant="h1" color={ink.title}>
          Una experiencia hecha para ti
        </AppText>
        <AppText variant="body" color={ink.muted}>
          Elige tu perfil. Podrás cambiarlo cuando quieras.
        </AppText>
      </Appear>

      <View style={styles.options}>
        <Appear index={1}>
          <ProfileCard
            title="Adulto mayor"
            text="Organiza tus medicamentos, tu bienestar y habla con BUDDY."
            art={<PersonAvatar size={72} label="" />}
            badge="heart"
            badgeBg={palette.mint}
            badgeColor={ink.text}
            onPress={() => choose('patient')}
          />
        </Appear>
        <Appear index={2}>
          <ProfileCard
            caregiver
            title="Familiar o cuidador"
            text="Acompaña, recibe avisos de seguimiento y mantente cerca."
            art={<Icon name="care" size={38} color={ink.text} />}
            badge="shield"
            badgeBg={ink.coral}
            badgeColor={ink.inverse}
            onPress={() => choose('caregiver')}
          />
        </Appear>
      </View>

      <Appear index={3} style={styles.privacy}>
        <Icon name="shield" size={20} color={ink.mint} />
        <AppText variant="caption" color={ink.muted} style={styles.flex}>
          Tu información está protegida y solo se comparte con tu autorización. En esta demostración todo se guarda solo en este teléfono.
        </AppText>
      </Appear>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { gap: spacing.xs, paddingVertical: spacing.md },
  options: { gap: spacing.md },
  radius: { borderRadius: 25 },
  card: {
    minHeight: 154,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.white,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.soft,
  },
  art: {
    width: 86,
    height: 110,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -6,
    bottom: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: spacing.xxs },
  arrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.slatePale, alignItems: 'center', justifyContent: 'center' },
  privacy: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl, paddingHorizontal: spacing.xs },
});
