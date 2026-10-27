import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { IconTile } from '@/components/icon-tile';
import { ScreenContainer } from '@/components/screen-container';
import { ElderScreen } from '@/features/elder/screen';
import { db, useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { sessionActions, useSession } from '@/state/session';
import { useUserId } from '@/state/data';
import { notificationPermission, notificationsSupported } from '@/infrastructure/notifications';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/provider';

/**
 * Pantalla del adulto mayor (sin pestañas, sin ajustes, sin chat). Con su propio acceso muestra SU perfil; con el
 * teléfono entregado, el de la entrega. Si en este celular aún no hay datos de su perfil, lo dice con honestidad.
 */
export default function ElderHome() {
  const user = useSession((s) => s.user);
  const ownerId = useUserId();
  const handoffElder = useDb((x) => x.handoff?.elderId ?? null);
  const elderId = user?.role === 'elder' ? (user.elderId ?? null) : handoffElder;
  const exists = useDb((x) => (elderId ? !!x.elders[elderId] && !x.elders[elderId].deletedAt : false));
  const [intro, setIntro] = useState<boolean | null>(user?.role === 'elder' && !!ownerId && notificationsSupported ? null : false);
  useEffect(() => {
    let active = true;
    if (!elderId || user?.role !== 'elder' || !ownerId || !notificationsSupported) return;
    const key = `permissions.introDone.${elderId}`;
    void (async () => {
      const permission = await notificationPermission(false);
      const done = db.draft<boolean>(ownerId, key) === true;
      if (active) setIntro(!done && permission !== 'granted' && permission !== 'unsupported');
    })();
    return () => { active = false; };
  }, [elderId, user?.role, ownerId]);
  if (elderId && exists && user?.role === 'elder' && intro === null) return null;
  if (elderId && exists && intro) return <NotificationIntro elderId={elderId} onContinue={() => setIntro(false)} />;
  if (elderId && exists) return <ElderScreen elderId={elderId} />;
  return user?.role === 'elder' ? <NoDataYet /> : null;
}

function NotificationIntro({ elderId, onContinue }: { elderId: string; onContinue: () => void }) {
  const t = useTheme();
  const ownerId = useUserId();
  const complete = () => { if (ownerId) db.setDraft(ownerId, `permissions.introDone.${elderId}`, true); onContinue(); };
  return <ScreenContainer>
    <View style={styles.body}>
      <IconTile icon="bell" domain="followUp" size={88} />
      <AppText variant="h1" align="center">Para que BUDDY te avise, permite las notificaciones</AppText>
      <AppText variant="body" color={t.c.muted} align="center">Así podrás recibir los recordatorios que tu familia preparó para ti.</AppText>
      <Button label="Activar avisos" size="elder" icon="bell" onPress={async () => { try { await notificationPermission(true); } finally { complete(); } }} />
      <Button label="Ahora no" size="elder" variant="ghost" onPress={complete} />
    </View>
  </ScreenContainer>;
}

function NoDataYet() {
  const router = useRouter();
  const t = useTheme();
  const E = strings.elder;
  return (
    <ScreenContainer>
      <View style={styles.body}>
        <IconTile icon="calendar" domain="activity" size={88} />
        <AppText variant="h1" align="center">
          {E.noDataTitle}
        </AppText>
        <AppText variant="body" color={t.c.muted} align="center">
          {E.noDataBody}
        </AppText>
        <Button
          label={E.signOut}
          variant="tonal"
          tone="mint"
          size="elder"
          onPress={async () => {
            await sessionActions.signOut();
            router.replace('/');
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ body: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl } });
