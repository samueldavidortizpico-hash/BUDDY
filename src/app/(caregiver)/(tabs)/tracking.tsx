import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActivityRow } from '@/components/activity-row';
import { AppText } from '@/components/app-text';
import { DemoBadge, EmptyState, IconTile, Notice, SectionHeader, StatusBadge } from '@/components/blocks';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SegmentedControl } from '@/components/chip';
import { BottomSheet, useToast } from '@/components/feedback';
import { Icon } from '@/components/icon';
import { MapIllustration } from '@/components/map-illustration';
import { CountUp, ProgressRing } from '@/components/progress';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { caregiverActions, useCaregiverOverview } from '@/features/caregiver/hooks';
import { DEMO_PROFILE } from '@/features/profile/hooks';
import { moodLabel, WATER_GOAL } from '@/features/wellbeing/hooks';
import { useNow } from '@/hooks/use-now';
import { ink, palette, radius, shadow, spacing } from '@/theme';
import { formatAgo, formatClock, formatDuration, toClock } from '@/utils/dates';
import { warningHaptic } from '@/utils/haptics';

type Tab = 'location' | 'wellbeing';

const FAKE_ADDRESS = 'Calle 00 # 00-00, Barrio Ejemplo (dirección ficticia)';

export default function CaregiverTracking() {
  const toast = useToast();
  const now = useNow();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'wellbeing' ? 'wellbeing' : 'location');
  const [confirm, setConfirm] = useState(false);
  const o = useCaregiverOverview(now);
  const sharing = o.locationSharing;
  const ratio = o.plan.total ? o.plan.taken / o.plan.total : 0;

  return (
    <ScreenContainer insideTabs header={<ScreenHeader title="Ubicación y bienestar" showBack={false} />}>
      <View style={styles.stack}>
        <SegmentedControl
          accessibilityLabel="Sección"
          options={[
            { key: 'location', label: 'Ubicación' },
            { key: 'wellbeing', label: 'Bienestar' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'location' ? (
          <>
            {sharing.enabled ? (
              <>
                <MapIllustration height={300} labels />
                <Card elevation="elevated" style={styles.sharing}>
                  <IconTile icon="shield" tone="mint" />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">Ubicación compartida activa</AppText>
                    <AppText variant="caption" color={ink.muted}>
                      {sharing.updatedAt
                        ? `Actualizada ${formatAgo(new Date(sharing.updatedAt), now)} (${formatClock(toClock(new Date(sharing.updatedAt)))})`
                        : 'Sin actualizar'}
                    </AppText>
                  </View>
                  <StatusBadge label="Ejemplo" tone="yellow" />
                </Card>
                <View style={styles.address} accessible accessibilityLabel={`Ubicación actual: en casa. ${FAKE_ADDRESS}`}>
                  <IconTile icon="home" tone="coral" />
                  <View style={styles.flex}>
                    <AppText variant="eyebrow" color={ink.muted}>
                      UBICACIÓN ACTUAL
                    </AppText>
                    <AppText variant="bodyStrong">En casa</AppText>
                    <AppText variant="caption" color={ink.muted}>
                      {FAKE_ADDRESS}
                    </AppText>
                  </View>
                </View>
              </>
            ) : (
              <EmptyState
                icon="location"
                title="Ubicación no compartida"
                text={`${DEMO_PROFILE.fullName} no está compartiendo su ubicación. Solo ella puede activarla desde su perfil.`}
                action={{ label: 'Simular que vuelve a compartir (demo)', onPress: caregiverActions.shareLocation }}
              />
            )}

            <SectionHeader title="Permisos" subtitle="Lo que puedes ver y cómo se controla" style={styles.section} />
            <Card style={styles.permissions}>
              {[
                `${DEMO_PROFILE.fullName} autorizó compartir su ubicación contigo.`,
                'Solo las personas autorizadas pueden verla.',
                'El acceso se puede revocar en cualquier momento.',
              ].map((t) => (
                <View key={t} style={styles.perm}>
                  <Icon name="check" size={18} color={ink.success} />
                  <AppText variant="secondary" style={styles.flex}>
                    {t}
                  </AppText>
                </View>
              ))}
            </Card>
            <Notice text="Vista de ejemplo: la app no usa el GPS ni un mapa real en esta fase. El permiso real de ubicación llegará próximamente." />
            {sharing.enabled ? (
              <Button label="Revocar acceso a la ubicación" variant="danger" icon="shield" onPress={() => setConfirm(true)} />
            ) : null}
          </>
        ) : (
          <>
            <Card style={styles.ringCard}>
              <ProgressRing value={ratio} size={120} stroke={12} accessibilityLabel={`Tomas confirmadas hoy: ${o.plan.taken} de ${o.plan.total}`}>
                <CountUp value={o.plan.taken} variant="h1" />
                <AppText variant="meta" color={ink.muted}>{`de ${o.plan.total} tomas`}</AppText>
              </ProgressRing>
              <AppText variant="h3" align="center">
                {`Resumen de hoy de ${DEMO_PROFILE.fullName.split(' ')[0]}`}
              </AppText>
              <AppText variant="secondary" color={ink.muted} align="center">
                Datos que ella registró en BUDDY. No son una valoración de salud.
              </AppText>
            </Card>
            <View style={styles.grid}>
              {[
                { icon: 'clock' as const, tone: 'sky' as const, value: o.sleep.lastMinutes !== null ? formatDuration(o.sleep.lastMinutes) : '—', label: 'Sueño' },
                { icon: 'heart' as const, tone: 'lavender' as const, value: o.mood ? moodLabel(o.mood.mood) : 'Sin registro', label: 'Ánimo' },
                { icon: 'care' as const, tone: 'mint' as const, value: `${o.wellness.glasses}/${WATER_GOAL}`, label: 'Vasos de agua' },
              ].map((m) => (
                <View key={m.label} style={styles.metric} accessible accessibilityLabel={`${m.label}: ${m.value}`}>
                  <IconTile icon={m.icon} tone={m.tone} size={36} />
                  <AppText variant="secondaryStrong" align="center">
                    {m.value}
                  </AppText>
                  <AppText variant="caption" color={ink.muted}>
                    {m.label}
                  </AppText>
                </View>
              ))}
            </View>
            <SectionHeader title="Registros de hoy" style={styles.section} />
            {o.activity.length ? (
              o.activity.map((a) => <ActivityRow key={a.id} item={a} />)
            ) : (
              <AppText variant="secondary" color={ink.muted}>
                Aún no hay registros hoy.
              </AppText>
            )}
          </>
        )}
        <DemoBadge />
        <View style={styles.row}>
          <Button label="Llamar ahora" icon="phone" size="md" style={styles.flex} onPress={() => toast({ message: 'Demostración: no se realizó ninguna llamada.', icon: 'phone' })} />
          <Button label="Enviar mensaje" icon="chat" variant="secondary" size="md" style={styles.flex} onPress={() => toast({ message: 'Los mensajes estarán disponibles próximamente.', icon: 'chat' })} />
        </View>
      </View>

      <BottomSheet visible={confirm} onClose={() => setConfirm(false)} title="¿Revocar el acceso?">
        <AppText variant="body" color={ink.muted}>
          Dejarás de ver la ubicación de {DEMO_PROFILE.fullName}. Para volver a verla, ella deberá compartirla de nuevo.
        </AppText>
        <Button
          label="Sí, revocar acceso"
          variant="danger"
          onPress={() => {
            caregiverActions.revokeLocation();
            warningHaptic();
            setConfirm(false);
            toast({ message: 'Acceso a la ubicación revocado.', icon: 'shield' });
          }}
        />
        <Button label="Cancelar" variant="secondary" onPress={() => setConfirm(false)} />
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  stack: { gap: spacing.md, paddingTop: spacing.xs },
  sharing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: -spacing.xl, marginHorizontal: spacing.xs },
  address: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xs },
  section: { marginTop: spacing.xs, marginBottom: 0 },
  permissions: { gap: spacing.sm },
  perm: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  ringCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  grid: { flexDirection: 'row', gap: spacing.xs },
  metric: { flex: 1, minHeight: 112, backgroundColor: palette.white, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: spacing.xxs, padding: spacing.xs, ...shadow.soft },
  row: { flexDirection: 'row', gap: spacing.sm },
});
