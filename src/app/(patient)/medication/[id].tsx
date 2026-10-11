import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { DemoBadge, DoseStatusBadge, EmptyState, Notice, SectionHeader } from '@/components/blocks';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { PillVisual } from '@/components/pill-visual';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import {
  doseLabel,
  FREQUENCIES,
  isOpen,
  strengthLabel,
  useDayPlan,
  useMedication,
} from '@/features/medications/hooks';
import { useNow } from '@/hooks/use-now';
import { ink, palette, spacing } from '@/theme';
import { formatClock, formatRelativeDay, MONTHS, parseISODate, toClock, toISODate } from '@/utils/dates';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="secondary" color={ink.muted} style={styles.infoLabel}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={styles.flex}>
        {value}
      </AppText>
    </View>
  );
}

const longDate = (iso: string) => {
  const d = parseISODate(iso);
  return d ? `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}` : iso;
};

export default function MedicationDetail() {
  const router = useRouter();
  const now = useNow();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { medication: m, history } = useMedication(id);
  const plan = useDayPlan(now);
  const today = toISODate(now);

  if (!m) {
    return (
      <ScreenContainer header={<ScreenHeader title="Medicamento" />}>
        <EmptyState icon="meds" title="No encontramos este medicamento" text="Puede que se haya eliminado." action={{ label: 'Volver', onPress: () => router.back() }} />
      </ScreenContainer>
    );
  }

  const openToday = plan.items.find((i) => i.medication.id === m.id && isOpen(i.status));

  return (
    <ScreenContainer scroll={false} contentStyle={styles.noPad} header={<ScreenHeader title={m.name} />}>
      <FlatList
        data={history}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Card style={styles.hero}>
              <PillVisual color={m.color} size="lg" />
              <View style={styles.flex}>
                <AppText variant="h2">{m.name}</AppText>
                <AppText variant="body" color={ink.muted}>{`${strengthLabel(m)} · ${doseLabel(m)}`}</AppText>
                {m.demo ? <DemoBadge /> : null}
              </View>
            </Card>
            <Card style={styles.infoCard}>
              <InfoRow label="Concentración" value={strengthLabel(m)} />
              <InfoRow label="Dosis por toma" value={doseLabel(m)} />
              <InfoRow label="Presentación" value={m.form} />
              <InfoRow label="Frecuencia" value={FREQUENCIES.find((f) => f.key === m.frequency)?.label ?? ''} />
              <InfoRow label="Horarios" value={m.times.length ? m.times.map(formatClock).join(' · ') : 'Sin horario fijo'} />
              <InfoRow label="Indicaciones" value={m.instructions || 'Sin indicaciones'} />
              <InfoRow label="Inicio" value={longDate(m.startDate)} />
              <InfoRow label="Fin" value={m.endDate ? longDate(m.endDate) : 'Sin fecha de fin'} />
            </Card>
            {openToday ? (
              <Button
                label="Registrar la toma de hoy"
                icon="check"
                onPress={() => router.push({ pathname: '/modals/reminder', params: { doseId: openToday.dose.id } })}
              />
            ) : null}
            <Notice text="BUDDY no modifica tu tratamiento. Para cualquier cambio, consulta con tu médico o farmacéutico. Editar o eliminar: próximamente." />
            <SectionHeader title="Historial de tomas" subtitle="Lo que registraste en BUDDY" style={styles.section} />
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => {
          const status = item.status === 'pending' && (item.date < today || plan.items.some((i) => i.dose.id === item.id && i.status === 'unconfirmed')) ? 'unconfirmed' : item.status;
          return (
            <View style={styles.row} accessible accessibilityLabel={`${formatRelativeDay(item.date, today)}, ${formatClock(item.time)}`}>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{`${formatRelativeDay(item.date, today)} · ${formatClock(item.time)}`}</AppText>
                {item.confirmedByUser && item.respondedAt ? (
                  <AppText variant="caption" color={ink.muted}>
                    {`Confirmada por ti a las ${formatClock(toClock(new Date(item.respondedAt)))}`}
                  </AppText>
                ) : null}
              </View>
              <DoseStatusBadge status={status} />
            </View>
          );
        }}
        ListEmptyComponent={<AppText variant="secondary" color={ink.muted}>Aún no hay tomas registradas.</AppText>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  noPad: { paddingHorizontal: 0 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  headerBlock: { gap: spacing.md, marginBottom: spacing.sm },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  infoCard: { gap: spacing.sm },
  info: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  infoLabel: { width: 128 },
  section: { marginTop: spacing.sm, marginBottom: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.line,
  },
  sep: { height: spacing.xs },
});
