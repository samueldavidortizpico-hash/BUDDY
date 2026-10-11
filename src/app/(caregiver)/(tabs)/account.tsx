import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { StatusBadge } from '@/components/blocks';
import { InitialsAvatar } from '@/components/buddy';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet } from '@/components/feedback';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { SettingsGroup, SettingsRow, SwitchRow, TextScalePicker } from '@/components/settings';
import { DEMO_CAREGIVER } from '@/features/caregiver/hooks';
import { DEMO_PROFILE, profileActions, useSettings } from '@/features/profile/hooks';
import { ink, palette, spacing } from '@/theme';

function PermissionRow({ label, granted }: { label: string; granted: boolean }) {
  return (
    <View style={styles.perm} accessible accessibilityLabel={`${label}: ${granted ? 'autorizado' : 'no autorizado'}`}>
      <AppText variant="bodyStrong" style={styles.flex}>
        {label}
      </AppText>
      <StatusBadge label={granted ? 'Autorizado' : 'No autorizado'} tone={granted ? 'mint' : 'slate'} icon={granted ? 'check' : 'close'} />
    </View>
  );
}

export default function CaregiverAccount() {
  const router = useRouter();
  const { notifications, locationSharing } = useSettings();
  const [confirm, setConfirm] = useState(false);

  const signOut = () => {
    profileActions.signOut();
    setConfirm(false);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  return (
    <ScreenContainer insideTabs header={<ScreenHeader title="Cuenta" showBack={false} />}>
      <View style={styles.stack}>
        <Card variant="gradient" gradient="petrolCard" elevation="elevated" style={styles.summary}>
          <InitialsAvatar initials={DEMO_CAREGIVER.initials} size={68} label="" />
          <View style={styles.flex}>
            <AppText variant="h3" color={ink.inverse}>
              {DEMO_CAREGIVER.name}
            </AppText>
            <AppText variant="secondaryStrong" color={palette.mint}>
              Familiar o cuidador
            </AppText>
            <AppText variant="caption" color={palette.nightText}>
              {`Acompañas a ${DEMO_PROFILE.fullName} · demostración`}
            </AppText>
          </View>
        </Card>

        <SettingsGroup title={`LO QUE ${DEMO_PROFILE.fullName.split(' ')[0].toUpperCase()} COMPARTE CONTIGO`}>
          <PermissionRow label="Resumen del día" granted />
          <PermissionRow label="Tomas sin confirmar" granted />
          <PermissionRow label="Ubicación" granted={locationSharing.enabled} />
        </SettingsGroup>
        <AppText variant="caption" color={ink.muted}>
          Solo ella puede cambiar estos permisos desde su perfil.
        </AppText>

        <SettingsGroup title="ACCESIBILIDAD">
          <TextScalePicker />
        </SettingsGroup>

        <SettingsGroup title="AVISOS">
          <SwitchRow
            title="Avisos de seguimiento"
            subtitle="Notificaciones del teléfono: próximamente"
            value={notifications.caregiverAlerts}
            onValueChange={() => profileActions.toggleNotification('caregiverAlerts')}
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow icon="user" title="Cambiar tipo de perfil" subtitle="Entrar como adulto mayor" onPress={() => router.push('/profile-choice')} />
        </SettingsGroup>

        <Button label="Cerrar sesión" variant="ghost" onPress={() => setConfirm(true)} />
        <AppText variant="meta" color={ink.muted} align="center">
          {`BUDDY versión ${Constants.expoConfig?.version ?? '1.0.0'} · Siempre contigo`}
        </AppText>
      </View>

      <BottomSheet visible={confirm} onClose={() => setConfirm(false)} title="¿Cerrar sesión?">
        <AppText variant="body" color={ink.muted}>
          Volverás a la bienvenida.
        </AppText>
        <Button label="Sí, cerrar sesión" variant="danger" onPress={signOut} />
        <Button label="Cancelar" variant="secondary" onPress={() => setConfirm(false)} />
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  stack: { gap: spacing.lg, paddingTop: spacing.xs },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  perm: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, flexWrap: 'wrap' },
});
