import { useCameraPermissions } from 'expo-camera';
import type { Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconTile } from '@/components/icon-tile';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { ElderLocation } from '@/features/elder/location';
import { notificationPermission, type PermissionState } from '@/infrastructure/notifications';
import { db, useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { beat, elderAnswers } from '@/state/care';
import { useSession } from '@/state/session';
import { useUserId } from '@/state/data';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/provider';

const P = strings.elderPermissions;

/**
 * Permisos del celular del adulto mayor (Opciones > Permisos): avisos, ubicación compartida y cámara, con su estado real
 * y "Activar" o "Abrir ajustes del celular". Cada cambio se registra y es una novedad para el administrador.
 */
export default function ElderPermissionsScreen() {
  const t = useTheme();
  const user = useSession((s) => s.user);
  const ownerId = useUserId();
  const handoffId = useDb((s) => s.handoff?.elderId ?? null);
  const elderId = user?.role === 'elder' ? user.elderId : handoffId;
  const elder = useDb((s) => (elderId ? s.elders[elderId] : undefined));
  const caregiver = user?.role === 'elder' ? '' : (user?.name.split(' ')[0] ?? '');
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [busy, setBusy] = useState(false);
  const [camera, requestCamera] = useCameraPermissions();
  const cameraBefore = useRef<boolean | null>(null);

  const recordState = useCallback((next: PermissionState) => {
    setPermission(next);
    if (!elder) return;
    beat(elder.id, 'permissions', next);
    if (!ownerId || next === 'unsupported') return;
    const key = `permissions.events.${elder.id}`;
    const events = useDb.getState().drafts[ownerId]?.[key] as { state: PermissionState; at: string }[] | undefined;
    const last = events?.at(-1)?.state;
    if (last === next) return;
    db.setDraft(ownerId, key, [...(events ?? []), { state: next, at: new Date().toISOString() }].slice(-100));
    // V4: cada cambio (no la primera lectura) es una novedad para el administrador.
    if (last && (last === 'granted') !== (next === 'granted')) elderAnswers.permissionChanged(elder.id, 'notifications', next === 'granted');
  }, [elder, ownerId]);
  useEffect(() => {
    void notificationPermission(false).then(recordState);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') void notificationPermission(false).then(recordState); });
    return () => sub.remove();
  }, [elder, recordState]);
  // Cámara: novedad solo cuando cambia después de la primera lectura.
  useEffect(() => {
    if (!camera || !elder) return;
    if (cameraBefore.current !== null && cameraBefore.current !== camera.granted) elderAnswers.permissionChanged(elder.id, 'camera', camera.granted);
    cameraBefore.current = camera.granted;
  }, [camera, elder]);

  const enable = async () => {
    setBusy(true);
    const result = await notificationPermission(true);
    recordState(result);
    setBusy(false);
    if (result === 'denied') Alert.alert(P.deniedTitle, P.deniedBody, [{ text: P.notNow, style: 'cancel' }, { text: P.openSettings, onPress: () => { void Linking.openSettings(); } }]);
  };
  if (!elder) return null;
  const notifLabel = permission === 'granted' ? P.on : permission === 'denied' ? P.off : permission === 'unsupported' ? P.unsupported : P.notYet;
  const camLabel = !camera ? P.notYet : camera.granted ? P.on : camera.canAskAgain ? P.notYet : P.off;
  return (
    <ScreenContainer header={<ScreenHeader title={P.title} fallback={"/elder/options" as Href} />}>
      <View style={styles.stack}>
        <AppText variant="secondary" color={t.c.muted}>{P.intro}</AppText>
        <Card style={styles.card}>
          <View style={styles.head}>
            <IconTile icon="bell" domain="followUp" />
            <View style={styles.flex}>
              <AppText variant="h3">{P.notifications}</AppText>
              <AppText variant="secondary" color={t.c.muted} accessibilityLiveRegion="polite">{`${P.state}: ${notifLabel}`}</AppText>
            </View>
          </View>
          {permission === 'granted' || permission === 'unsupported' ? null : (
            <Button label={permission === 'denied' ? P.openSettings : P.enable} size="elder" loading={busy} onPress={permission === 'denied' ? () => { void Linking.openSettings(); } : enable} />
          )}
        </Card>
        <Card style={styles.card}>
          <View style={styles.head}>
            <IconTile icon="location" domain="activity" />
            <View style={styles.flex}>
              <AppText variant="h3">{P.location(caregiver || strings.location.yourFamily)}</AppText>
              <AppText variant="secondary" color={t.c.muted}>{P.locationHint}</AppText>
            </View>
          </View>
          <ElderLocation elder={elder} caregiver={caregiver} preview={false} />
        </Card>
        <Card style={styles.card}>
          <View style={styles.head}>
            <IconTile icon="camera" domain="mood" />
            <View style={styles.flex}>
              <AppText variant="h3">{P.camera}</AppText>
              <AppText variant="secondary" color={t.c.muted}>{`${P.state}: ${camLabel}`}</AppText>
            </View>
          </View>
          {camera?.granted ? null : (
            <Button label={camera && !camera.canAskAgain ? P.openSettings : P.enable} size="elder" onPress={camera && !camera.canAskAgain ? () => { void Linking.openSettings(); } : () => { void requestCamera(); }} />
          )}
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  stack: { gap: spacing.md },
  card: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
