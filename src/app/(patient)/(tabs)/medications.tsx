import { useRouter } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { DoseStatusBadge, EmptyState, ListItem } from '@/components/blocks';
import { IconButton } from '@/components/button';
import { SegmentedControl } from '@/components/chip';
import { Icon } from '@/components/icon';
import { PillVisual } from '@/components/pill-visual';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import {
  doseLabel,
  effectiveTime,
  isOpen,
  strengthLabel,
  useDayPlan,
  useMedications,
  type DoseItem,
} from '@/features/medications/hooks';
import { useNow } from '@/hooks/use-now';
import type { DisplayDoseStatus, Medication } from '@/types/domain';
import { ink, palette, shadow, spacing } from '@/theme';
import { formatClock } from '@/utils/dates';

type Filter = 'all' | 'today' | 'upcoming';

interface Row {
  key: string;
  medication: Medication;
  when: string;
  status: DisplayDoseStatus | null;
  doseId: string | null;
}

const MedicationRow = memo(function MedicationRow({ row, onPress }: { row: Row; onPress: (row: Row) => void }) {
  const m = row.medication;
  return (
    <PressableScale
      onPress={() => onPress(row)}
      accessibilityLabel={`${m.name}, ${strengthLabel(m)}, ${doseLabel(m)}. ${row.when}`}
      accessibilityHint={row.doseId && row.status && isOpen(row.status) ? 'Abre el recordatorio de esta toma' : 'Abre el detalle'}
      style={styles.card}
    >
      <PillVisual color={m.color} size="sm" />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{m.name}</AppText>
        <AppText variant="secondary" color={ink.muted}>
          {`${strengthLabel(m)} · ${doseLabel(m)}`}
        </AppText>
        <View style={styles.inline}>
          <Icon name="clock" size={16} color={ink.muted} />
          <AppText variant="caption" color={ink.muted}>
            {row.when}
          </AppText>
        </View>
      </View>
      {row.status ? <DoseStatusBadge status={row.status} /> : null}
    </PressableScale>
  );
});

function rowsFor(filter: Filter, meds: Medication[], items: DoseItem[]): Row[] {
  const fromItem = (i: DoseItem): Row => ({
    key: i.dose.id,
    medication: i.medication,
    when: formatClock(effectiveTime(i.dose)),
    status: i.status,
    doseId: i.dose.id,
  });
  if (filter === 'today') return items.map(fromItem);
  if (filter === 'upcoming') return items.filter((i) => i.status === 'pending' || i.status === 'snoozed').map(fromItem);
  return meds.map((m) => {
    const mine = items.filter((i) => i.medication.id === m.id);
    const focus = mine.find((i) => isOpen(i.status)) ?? mine.at(-1) ?? null;
    return {
      key: m.id,
      medication: m,
      when: m.frequency === 'as_needed' ? 'Solo si lo necesitas' : m.times.map(formatClock).join(' · '),
      status: focus?.status ?? null,
      doseId: focus?.dose.id ?? null,
    };
  });
}

export default function Medications() {
  const router = useRouter();
  const now = useNow();
  const meds = useMedications();
  const plan = useDayPlan(now);
  const [filter, setFilter] = useState<Filter>('all');
  const rows = useMemo(() => rowsFor(filter, meds, plan.items), [filter, meds, plan.items]);

  const open = (row: Row) => {
    if (filter !== 'all' && row.doseId && row.status && isOpen(row.status)) {
      router.push({ pathname: '/modals/reminder', params: { doseId: row.doseId } });
    } else {
      router.push({ pathname: '/medication/[id]', params: { id: row.medication.id } });
    }
  };

  return (
    <ScreenContainer scroll={false} insideTabs contentStyle={styles.noPad}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={({ item }) => <MedicationRow row={item} onPress={open} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader
              title="Mis medicamentos"
              showBack={false}
              right={<IconButton icon="plus" label="Agregar" variant="mint" onPress={() => router.push('/modals/add-medication')} />}
            />
            <SegmentedControl
              accessibilityLabel="Filtrar medicamentos"
              options={[
                { key: 'all', label: `Todos (${meds.length})` },
                { key: 'today', label: 'Hoy' },
                { key: 'upcoming', label: 'Próximos' },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </View>
        }
        ListEmptyComponent={
          filter === 'all' ? (
            <EmptyState
              icon="meds"
              title="Aún no tienes medicamentos"
              text="Agrega el primero para recibir recordatorios en BUDDY."
              action={{ label: 'Agregar medicamento', onPress: () => router.push('/modals/add-medication') }}
            />
          ) : (
            <EmptyState icon="check" title="Nada pendiente" text="No tienes más tomas pendientes por hoy." />
          )
        }
        ListFooterComponent={
          <ListItem
            icon="shield"
            title="Seguridad de medicamentos"
            subtitle="Revisión farmacológica: próximamente"
            onPress={() => router.push('/safety')}
            style={styles.footer}
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  noPad: { paddingHorizontal: 0 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  gap: { height: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexWrap: 'wrap' },
  card: {
    minHeight: 92,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    ...shadow.soft,
  },
  footer: { marginTop: spacing.lg },
});
