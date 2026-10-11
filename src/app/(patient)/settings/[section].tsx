import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { DemoBadge, IconTile, Notice } from '@/components/blocks';
import { InitialsAvatar } from '@/components/buddy';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ComingSoon } from '@/components/coming-soon';
import { BottomSheet, useToast } from '@/components/feedback';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { SettingsGroup, SwitchRow, TextScalePicker } from '@/components/settings';
import { caregiverActions } from '@/features/caregiver/hooks';
import { DEMO_PROFILE, profileActions, useContacts, useSettings } from '@/features/profile/hooks';
import { useNow } from '@/hooks/use-now';
import { ink, spacing } from '@/theme';
import { formatAgo } from '@/utils/dates';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ScreenContainer header={<ScreenHeader title={title} />}>
      <View style={styles.stack}>{children}</View>
    </ScreenContainer>
  );
}

function Personal() {
  const toast = useToast();
  return (
    <Section title="Datos personales">
      <DemoBadge />
      <Card style={styles.card}>
        {[
          ['Nombre', DEMO_PROFILE.fullName],
          ['Tipo de perfil', 'Adulto mayor'],
          ['Cuenta', DEMO_PROFILE.memberSince],
        ].map(([k, v]) => (
          <View key={k} style={styles.info} accessible accessibilityLabel={`${k}: ${v}`}>
            <AppText variant="secondary" color={ink.muted}>
              {k}
            </AppText>
            <AppText variant="bodyStrong">{v}</AppText>
          </View>
        ))}
      </Card>
      <Button label="Editar mis datos" variant="secondary" icon="user" onPress={() => toast({ message: 'Editar tus datos estará disponible próximamente.', icon: 'user' })} />
    </Section>
  );
}

function Contacts() {
  const contacts = useContacts();
  const toast = useToast();
  return (
    <Section title="Contactos autorizados">
      <Notice text="Solo las personas que autorices pueden ver tu resumen. Puedes revocar el acceso cuando quieras." />
      <DemoBadge label="Contactos de demostración" />
      {contacts.map((c) => (
        <Card key={c.id} style={styles.contact}>
          <InitialsAvatar initials={c.name.split(' ').map((p) => p[0]).join('').slice(0, 2)} label="" />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{c.name}</AppText>
            <AppText variant="caption" color={ink.muted}>{`${c.relation} · ${c.phone} (ficticio)`}</AppText>
          </View>
        </Card>
      ))}
      <Button label="Invitar a alguien" variant="secondary" icon="plus" onPress={() => toast({ message: 'Invitar contactos estará disponible próximamente.', icon: 'care' })} />
    </Section>
  );
}

function Privacy() {
  const now = useNow();
  const toast = useToast();
  const { locationSharing } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <Section title="Permisos y privacidad">
      <SettingsGroup title="UBICACIÓN">
        <SwitchRow
          title="Compartir mi ubicación con mis contactos"
          subtitle={
            locationSharing.enabled
              ? `Activa · ${locationSharing.updatedAt ? `actualizada ${formatAgo(new Date(locationSharing.updatedAt), now)}` : ''} (demostración)`
              : 'Desactivada: nadie ve tu ubicación'
          }
          value={locationSharing.enabled}
          onValueChange={(v) => (v ? caregiverActions.shareLocation() : caregiverActions.revokeLocation())}
        />
      </SettingsGroup>
      <Notice text="En esta demostración no se usa el GPS del teléfono: la ubicación es un ejemplo. El permiso real de ubicación llegará próximamente y siempre podrás revocarlo." />
      <SettingsGroup title="TUS DATOS">
        <View style={styles.pad}>
          <AppText variant="secondary" color={ink.muted}>
            Todo se guarda solo en este teléfono. No se envía a ningún servidor ni a servicios de inteligencia artificial.
          </AppText>
        </View>
      </SettingsGroup>
      <Button label="Restablecer datos de ejemplo" variant="danger" icon="warning" onPress={() => setConfirmReset(true)} />
      <BottomSheet visible={confirmReset} onClose={() => setConfirmReset(false)} title="¿Restablecer datos?">
        <AppText variant="body" color={ink.muted}>
          Se borrarán tus registros en este teléfono y volverán los datos de ejemplo. No se puede deshacer.
        </AppText>
        <Button
          label="Sí, restablecer"
          variant="danger"
          onPress={() => {
            profileActions.resetDemoData();
            setConfirmReset(false);
            toast({ message: 'Datos de ejemplo restablecidos.', icon: 'check' });
          }}
        />
        <Button label="Cancelar" variant="secondary" onPress={() => setConfirmReset(false)} />
      </BottomSheet>
    </Section>
  );
}

function Notifications() {
  const { notifications } = useSettings();
  return (
    <Section title="Notificaciones">
      <Notice icon="bell" text="Las notificaciones del teléfono llegarán próximamente. Tus preferencias se guardan desde ya." />
      <SettingsGroup>
        <SwitchRow title="Recordatorios de medicamentos" value={notifications.reminders} onValueChange={() => profileActions.toggleNotification('reminders')} />
        <SwitchRow title="Avisos a mis contactos" subtitle="Solo con tu autorización" value={notifications.caregiverAlerts} onValueChange={() => profileActions.toggleNotification('caregiverAlerts')} />
        <SwitchRow
          title="Ocultar el nombre del medicamento"
          subtitle="En la pantalla de bloqueo"
          value={notifications.hideNameOnLockScreen}
          onValueChange={() => profileActions.toggleNotification('hideNameOnLockScreen')}
        />
      </SettingsGroup>
    </Section>
  );
}

function Accessibility() {
  return (
    <Section title="Accesibilidad">
      <SettingsGroup>
        <TextScalePicker />
      </SettingsGroup>
      <Card style={styles.card}>
        <IconTile icon="heart" />
        <AppText variant="bodyStrong">Movimiento reducido</AppText>
        <AppText variant="secondary" color={ink.muted}>
          Si activas “Reducir movimiento” en tu teléfono, BUDDY detiene las animaciones en bucle y los desplazamientos.
        </AppText>
      </Card>
      <Card style={styles.card}>
        <IconTile icon="mic" />
        <AppText variant="bodyStrong">Lectura por voz y lector de pantalla</AppText>
        <AppText variant="secondary" color={ink.muted}>
          Todos los botones tienen nombre para TalkBack y VoiceOver. Hablarle a BUDDY por voz estará disponible próximamente.
        </AppText>
      </Card>
    </Section>
  );
}

function Emergency() {
  const router = useRouter();
  return (
    <Section title="Configuración de emergencia">
      <Notice icon="phone" text="El botón Emergencia del Inicio muestra tus contactos. En esta demostración no se realizan llamadas." />
      <Button label="Ver hoja de emergencia" variant="danger" icon="shield" trailing="arrow" onPress={() => router.push('/modals/emergency')} />
      <Button label="Contactos autorizados" variant="secondary" icon="care" onPress={() => router.push('/settings/contacts')} />
    </Section>
  );
}

const SECTIONS: Record<string, () => React.ReactElement> = {
  personal: Personal,
  contacts: Contacts,
  privacy: Privacy,
  notifications: Notifications,
  accessibility: Accessibility,
  emergency: Emergency,
};

export default function SettingsSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const Screen = SECTIONS[section ?? ''];
  return Screen ? <Screen /> : <ComingSoon title="Ajustes" />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  stack: { gap: spacing.md, paddingTop: spacing.xs },
  card: { gap: spacing.xs },
  info: { gap: 2, paddingVertical: spacing.xxs },
  contact: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pad: { padding: spacing.md },
});
