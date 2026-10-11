import { FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { AlertStatusBadge, DemoBadge, EmptyState, IconTile, Notice, SectionHeader } from '@/components/blocks';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useToast } from '@/components/feedback';
import type { IconName } from '@/components/icon';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { ALERT_STATUS_LABEL, caregiverActions, useCaregiverAlerts } from '@/features/caregiver/hooks';
import { useNow } from '@/hooks/use-now';
import type { AlertKind } from '@/types/domain';
import { ink, palette, spacing, type Tone } from '@/theme';
import { formatAgo, formatLongDate } from '@/utils/dates';
import { successHaptic } from '@/utils/haptics';

const KIND_VISUAL: Record<AlertKind, { icon: IconName; tone: Tone }> = {
  dose_unconfirmed: { icon: 'bell', tone: 'coral' },
  symptom: { icon: 'warning', tone: 'yellow' },
  dose_confirmed: { icon: 'check', tone: 'mint' },
  mood: { icon: 'heart', tone: 'mint' },
  vital_reminder: { icon: 'warning', tone: 'yellow' },
};

export default function CaregiverAlerts() {
  const toast = useToast();
  const now = useNow();
  const { alerts, counts } = useCaregiverAlerts(now);

  return (
    <ScreenContainer scroll={false} insideTabs contentStyle={styles.noPad} header={<ScreenHeader title="Alertas y seguimiento" showBack={false} />}>
      <FlatList
        data={alerts}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.head}>
            <Card variant="gradient" gradient="petrolCard" elevation="elevated" style={styles.summary}>
              {[
                { n: counts.pending, label: 'Pendientes' },
                { n: counts.important, label: 'Importantes' },
                { n: counts.closed, label: 'Atendidas' },
              ].map((c, i) => (
                <View key={c.label} style={[styles.count, i < 2 && styles.countBorder]} accessible accessibilityLabel={`${c.n} ${c.label}`}>
                  <AppText variant="h1" color={ink.inverse}>
                    {c.n}
                  </AppText>
                  <AppText variant="caption" color={palette.nightText}>
                    {c.label}
                  </AppText>
                </View>
              ))}
            </Card>
            <Notice text="Son alertas de seguimiento, no emergencias. Una toma “sin confirmar” solo significa que no hubo respuesta en BUDDY." />
            <DemoBadge />
            <SectionHeader title="Actividad reciente" subtitle={`Hoy, ${formatLongDate(now)}`} style={styles.section} />
          </View>
        }
        renderItem={({ item, index }) => {
          const v = KIND_VISUAL[item.kind];
          const open = item.status === 'pending' || item.status === 'important';
          return (
            <View style={styles.event}>
              <View style={styles.rail}>
                <IconTile icon={v.icon} tone={v.tone} size={42} />
                {index < alerts.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View
                style={styles.body}
                accessible={!open}
                accessibilityLabel={`${item.title}. ${item.detail}. ${formatAgo(new Date(item.at), now)}. Estado: ${ALERT_STATUS_LABEL[item.status]}`}
              >
                <View style={styles.titleRow}>
                  <AppText variant="bodyStrong" style={styles.flex}>
                    {item.title}
                  </AppText>
                  <AlertStatusBadge status={item.status} />
                </View>
                <AppText variant="secondary" color={ink.muted}>
                  {item.detail}
                </AppText>
                <AppText variant="meta" color={ink.muted}>
                  {formatAgo(new Date(item.at), now)}
                </AppText>
                {open ? (
                  <Button
                    label="Marcar como atendida"
                    icon="check"
                    variant="secondary"
                    size="md"
                    style={styles.attend}
                    onPress={() => {
                      caregiverActions.markAttended(item.id);
                      successHaptic();
                      toast({ message: 'Alerta marcada como atendida.', icon: 'check' });
                    }}
                  />
                ) : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="bell" title="Sin alertas" text="No hay nada pendiente por revisar." />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  noPad: { paddingHorizontal: 0 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  head: { gap: spacing.md, marginBottom: spacing.sm },
  summary: { flexDirection: 'row', paddingVertical: spacing.lg, paddingHorizontal: spacing.xs },
  count: { flex: 1, alignItems: 'center', gap: 2 },
  countBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255, 255, 255, 0.17)' },
  section: { marginBottom: 0 },
  event: { flexDirection: 'row', gap: spacing.sm, minHeight: 96 },
  rail: { alignItems: 'center' },
  line: { flex: 1, width: 0, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: '#C8D6D2', marginVertical: 4 },
  body: { flex: 1, gap: 2, paddingBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, flexWrap: 'wrap' },
  attend: { alignSelf: 'flex-start', marginTop: spacing.xs },
});
