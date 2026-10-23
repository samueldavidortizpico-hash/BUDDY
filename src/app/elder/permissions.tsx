import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { ElderLocation } from '@/features/elder/location';
import { notificationPermission, type PermissionState } from '@/infrastructure/notifications';
import { db, useDb } from '@/infrastructure/local/db';
import { beat } from '@/state/care';
import { useSession } from '@/state/session';
import { useUserId } from '@/state/data';
import { useTheme } from '@/theme/provider';
import { spacing } from '@/theme';

export default function ElderPermissionsScreen() {
  const theme = useTheme();
  const user = useSession((s) => s.user);
  const ownerId = useUserId();
  const handoffId = useDb((s) => s.handoff?.elderId ?? null);
  const elderId = user?.role === 'elder' ? user.elderId : handoffId;
  const elder = useDb((s) => (elderId ? s.elders[elderId] : undefined));
  const caregiver = user?.role === 'elder' ? '' : (user?.name.split(' ')[0] ?? '');
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [busy, setBusy] = useState(false);

  const recordState = useCallback((next: PermissionState) => {
    setPermission(next);
    if (!elder) return;
    beat(elder.id, 'permissions', next);
    if (!ownerId || next === 'unsupported') return;
    const key = `permissions.events.${elder.id}`;
    const events = useDb.getState().drafts[ownerId]?.[key] as { state: PermissionState; at: string }[] | undefined;
    if (events?.at(-1)?.state !== next) db.setDraft(ownerId, key, [...(events ?? []), { state: next, at: new Date().toISOString() }].slice(-100));
  }, [elder, ownerId]);
  useEffect(() => {
    const readCurrent = async () => {
      const next = await notificationPermission(false);
      recordState(next);
    };
    void readCurrent();
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') void notificationPermission(false).then(recordState); });
    return () => sub.remove();
  }, [elder, recordState]);

  const enable = async () => {
    setBusy(true);
    const result = await notificationPermission(true);
    recordState(result);
    setBusy(false);
    if (result === 'denied') Alert.alert('Avisos desactivados', 'Activa las notificaciones de BUDDY en los ajustes del celular.', [{ text: 'Ahora no', style: 'cancel' }, { text: 'Abrir ajustes del celular', onPress: () => { void Linking.openSettings(); } }]);
  };
  if (!elder) return null;
  const permissionLabel = permission === 'granted' ? 'Activadas' : permission === 'denied' ? 'Desactivadas' : permission === 'unsupported' ? 'No disponible en este dispositivo' : 'Aún no activadas';
  return (
    <ScreenContainer header={<ScreenHeader title="Permisos" fallback="/elder" />}>
      <AppText variant="secondary" color={theme.c.muted}>Estos permisos se cambian en este celular. BUDDY no puede modificar las alarmas desde otro teléfono.</AppText>
      <Card style={styles.card}>
        <AppText variant="h3">Notificaciones</AppText>
        <AppText variant="secondary" color={theme.c.muted} accessibilityLiveRegion="polite">Estado: {permissionLabel}</AppText>
        {permission === 'granted' ? null : <Button label={permission === 'denied' ? 'Abrir ajustes del celular' : 'Activar'} size="elder" loading={busy} onPress={permission === 'denied' ? () => { void Linking.openSettings(); } : enable} />}
      </Card>
      <Card style={styles.card}>
        <AppText variant="h3">Ubicación compartida con {caregiver || 'tu familia'}</AppText>
        <AppText variant="secondary" color={theme.c.muted}>La ubicación se comparte solo mientras BUDDY está abierto.</AppText>
        <ElderLocation elder={elder} caregiver={caregiver} preview={false} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ card: { gap: spacing.md }, });
