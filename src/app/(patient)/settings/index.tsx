import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PersonAvatar } from '@/components/buddy';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet, useToast } from '@/components/feedback';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { SettingsGroup, SettingsRow, TextScalePicker } from '@/components/settings';
import { DEMO_PROFILE, profileActions, useContacts } from '@/features/profile/hooks';
import { ink, palette, spacing } from '@/theme';

export default function Settings() {
  const router = useRouter();
  const toast = useToast();
  const contacts = useContacts();
  const [confirm, setConfirm] = useState(false);

  const signOut = () => {
    profileActions.signOut();
    setConfirm(false);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  return (
    <ScreenContainer header={<ScreenHeader title="Perfil y configuración" />}>
      <View style={styles.stack}>
        <Card variant="gradient" gradient="petrolCard" elevation="elevated" style={styles.summary}>
          <View>
            <PersonAvatar size={76} />
            <PressableScale
              onPress={() => toast({ message: 'Cambiar la foto estará disponible próximamente.', icon: 'camera' })}
              accessibilityLabel="Cambiar foto (próximamente)"
              style={styles.camera}
              hitSlop={10}
            >
              <Icon name="camera" size={16} color={ink.title} />
            </PressableScale>
          </View>
          <View style={styles.flex}>
            <AppText variant="h3" color={ink.inverse}>
              {DEMO_PROFILE.fullName}
            </AppText>
            <AppText variant="secondaryStrong" color={palette.mint}>
              Adulto mayor
            </AppText>
            <AppText variant="caption" color={palette.nightText}>
              {DEMO_PROFILE.memberSince}
            </AppText>
          </View>
        </Card>

        <SettingsGroup title="ACCESIBILIDAD">
          <TextScalePicker />
          <SettingsRow icon="heart" title="Más opciones de accesibilidad" subtitle="Voz, contraste y movimiento" onPress={() => router.push('/settings/accessibility')} />
        </SettingsGroup>

        <SettingsGroup title="MI INFORMACIÓN">
          <SettingsRow icon="user" title="Datos personales" subtitle="Nombre, edad e información básica" onPress={() => router.push('/settings/personal')} />
          <SettingsRow icon="care" title="Contactos autorizados" subtitle={`${contacts.length} personas pueden acompañarte`} onPress={() => router.push('/settings/contacts')} />
        </SettingsGroup>

        <SettingsGroup title="PRIVACIDAD Y AVISOS">
          <SettingsRow icon="shield" title="Permisos y privacidad" subtitle="Ubicación, datos y seguridad" onPress={() => router.push('/settings/privacy')} />
          <SettingsRow icon="bell" title="Notificaciones" subtitle="Recordatorios y avisos" onPress={() => router.push('/settings/notifications')} />
          <SettingsRow icon="warning" title="Configuración de emergencia" subtitle="Contactos y ayuda" onPress={() => router.push('/settings/emergency')} />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow icon="care" title="Cambiar tipo de perfil" subtitle="Entrar como familiar o cuidador" onPress={() => router.push('/profile-choice')} />
          {__DEV__ ? <SettingsRow icon="settings" title="Galería de componentes" subtitle="Solo en desarrollo" onPress={() => router.push('/dev/gallery')} /> : null}
        </SettingsGroup>

        <Button label="Cerrar sesión" variant="ghost" style={styles.logout} onPress={() => setConfirm(true)} />
        <AppText variant="meta" color={ink.muted} align="center">
          {`BUDDY versión ${Constants.expoConfig?.version ?? '1.0.0'} · Siempre contigo`}
        </AppText>
      </View>

      <BottomSheet visible={confirm} onClose={() => setConfirm(false)} title="¿Cerrar sesión?">
        <AppText variant="body" color={ink.muted}>
          Volverás a la bienvenida. Tus datos de ejemplo se conservan en este teléfono.
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
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 23 },
  camera: {
    position: 'absolute',
    right: -4,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: palette.white,
    backgroundColor: palette.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logout: { borderColor: palette.logoutBorder },
});
