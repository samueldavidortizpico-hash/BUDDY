import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Segmented } from '@/components/forms';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import type { Period } from '@/domain/health';
import { METRICS, MetricBody, useHealth, type MetricKey } from '@/features/health/metrics';
import { strings } from '@/i18n';
import { useRecords } from '@/state/data';
import { radius, spacing } from '@/theme';
import { useTheme } from '@/theme/provider';
import { formatClock, formatRelativeDay, toISODate } from '@/utils/dates';

const H = strings.health;

export default function MetricDetail() {
  const t = useTheme();
  const { metric } = useLocalSearchParams<{ metric: MetricKey }>();
  const m = METRICS.find((x) => x.key === metric) ?? METRICS[0];
  const [period, setPeriod] = useState<Period>('week');
  const data = useHealth(period);
  const history = useHistory(m.key);
  return (
    <ScreenContainer header={<ScreenHeader title={m.title} fallback="/health" />}>
      <Segmented label={m.title} value={period} onChange={setPeriod} options={(['day', 'week', 'month'] as Period[]).map((p) => ({ key: p, label: H.periods[p] }))} />
      <Card variant="gradient" domain={m.domain} radius={radius.hero} style={styles.card}>
        <MetricBody metric={m.key} data={data} big />
      </Card>
      {m.key === 'food' ? (
        <Card style={styles.card}>
          <AppText variant="h3">{H.nutrition}</AppText>
          <AppText variant="secondary" color={t.c.muted}>{`${strings.common.soon}: análisis nutricional, recetas y fotos de comidas.`}</AppText>
        </Card>
      ) : null}
      <AppText variant="h3" style={styles.h}>
        {H.detailHistory}
      </AppText>
      <Card style={styles.list}>
        {history.length ? (
          history.slice(0, 30).map((h, i) => (
            <View key={i} style={styles.row}>
              <AppText variant="secondary" style={styles.flex}>
                {h.text}
              </AppText>
              <AppText variant="caption" color={t.c.muted}>
                {h.when}
              </AppText>
            </View>
          ))
        ) : (
          <AppText variant="secondary" color={t.c.muted}>
            {H.noData}
          </AppText>
        )}
      </Card>
    </ScreenContainer>
  );
}

/** Historial legible de los registros de una métrica (más reciente primero). */
function useHistory(metric: MetricKey): { text: string; when: string }[] {
  const today = toISODate(new Date());
  const doses = useRecords('doses');
  const meds = useRecords('medications', { scope: 'account' });
  const water = useRecords('water');
  const mealLogs = useRecords('mealLogs');
  const meals = useRecords('meals');
  const logs = useRecords('activityLogs');
  const acts = useRecords('activities');
  const checkins = useRecords('checkins');
  const when = (date: string, time?: string) => `${formatRelativeDay(date, today)}${time ? ` · ${formatClock(time)}` : ''}`;
  switch (metric) {
    case 'meds':
      return doses
        .filter((d) => d.status !== 'pending')
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
        .map((d) => ({ text: `${meds.find((m) => m.id === d.medicationId)?.name ?? ''}: ${strings.meds.statuses[d.status]}`, when: when(d.date, d.time) }));
    case 'water':
      return water.sort((a, b) => b.at.localeCompare(a.at)).map((w) => ({ text: 'Un vaso de agua', when: when(w.date, new Date(w.at).toTimeString().slice(0, 5)) }));
    case 'food':
      return mealLogs
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((l) => {
          const meal = meals.find((m) => m.id === l.mealId);
          return { text: `${meal ? strings.setup.food.mealNames[meal.kind] : 'Comida'}: ${l.answer === 'yes' ? 'Sí' : 'Todavía no'}`, when: when(l.date) };
        });
    case 'activity':
      return logs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((l) => ({ text: `${acts.find((a) => a.id === l.activityId)?.title ?? ''}: ${l.done ? 'Hecha' : 'Todavía no'}`, when: when(l.date) }));
    case 'mood':
    case 'sleep':
      return checkins
        .filter((c) => c[metric])
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((c) => ({ text: `${metric === 'mood' ? 'Ánimo' : 'Sueño'}: ${strings.answers[c[metric]!]}${metric === 'mood' && c.unwell ? ' · dijo tener malestar' : ''}`, when: when(c.date) }));
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { marginTop: spacing.md, gap: spacing.sm },
  h: { marginTop: spacing.section },
  list: { marginTop: spacing.sm, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
});
