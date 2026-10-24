/** Métricas de Salud por periodo, calculadas desde registros reales (src/domain/health.ts). */
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Bars, Face } from '@/components/charts';
import { activitySummary, adherence, answersBy, mealsSummary, moodTrend, periodDays, waterByDay, type Period } from '@/domain/health';
import type { Answer3 } from '@/domain/types';
import { strings } from '@/i18n';
import { useActiveElder, useRecords } from '@/state/data';
import { spacing, type Domain } from '@/theme';
import { useTheme } from '@/theme/provider';
import { dayInitial, lastDays, toISODate } from '@/utils/dates';

const H = strings.health;
export type MetricKey = 'meds' | 'sleep' | 'mood' | 'water' | 'food' | 'activity';
export const METRICS: { key: MetricKey; title: string; domain: Domain }[] = [
  { key: 'meds', title: H.meds, domain: 'medication' },
  { key: 'water', title: H.water, domain: 'water' },
  { key: 'mood', title: H.mood, domain: 'mood' },
  { key: 'sleep', title: H.sleep, domain: 'sleep' },
  { key: 'food', title: H.food, domain: 'food' },
  { key: 'activity', title: H.activity, domain: 'activity' },
];

export function useHealth(period: Period) {
  const now = new Date();
  const today = toISODate(now);
  const elder = useActiveElder();
  const doses = useRecords('doses');
  const water = useRecords('water');
  const plan = useRecords('waterPlans')[0];
  const mealLogs = useRecords('mealLogs');
  const activityLogs = useRecords('activityLogs');
  const checkins = useRecords('checkins');
  return useMemo(() => {
    const days = periodDays(period, today);
    // Ánimo y sueño: siempre los últimos 7 días, una barra por día (bien 3, regular 2, mal 1, sin respuesta 0).
    const week = lastDays(today, 7);
    const level = { good: 3, regular: 2, bad: 1 } as const;
    const series = (field: 'mood' | 'sleep') => week.map((d) => {
      const a = checkins.find((c) => c.date === d)?.[field];
      return a ? level[a] : 0;
    });
    return {
      week,
      moodWeek: series('mood'),
      sleepWeek: series('sleep'),
      days,
      elder,
      adherence: adherence(doses, days, now),
      water: waterByDay(water, days),
      waterGoal: plan?.glasses ?? 0,
      meals: mealsSummary(mealLogs, days),
      activity: activitySummary(activityLogs, days),
      mood: answersBy(checkins, days, 'mood'),
      sleep: answersBy(checkins, days, 'sleep'),
      trend: moodTrend(checkins, today),
    };
    // `now` cambia en cada render; el periodo y los registros definen el cálculo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, today, elder, doses, water, plan, mealLogs, activityLogs, checkins]);
}

export type HealthData = ReturnType<typeof useHealth>;

/** Número protagonista + gráfico de cada métrica. */
export function MetricBody({ metric, data, big = false }: { metric: MetricKey; data: HealthData; big?: boolean }) {
  const t = useTheme();
  const d = t.domains[METRICS.find((m) => m.key === metric)!.domain];
  const num = (n: string | number, sub: string) => (
    <View>
      <AppText variant={big ? 'heroXL' : 'heroL'} color={d.text}>
        {n}
      </AppText>
      <AppText variant="secondaryStrong" color={d.muted}>
        {sub}
      </AppText>
    </View>
  );
  const empty = (
    <AppText variant="secondary" color={d.muted}>
      {H.noData}
    </AppText>
  );
  switch (metric) {
    case 'meds': {
      const a = data.adherence;
      if (!a.total) return empty;
      const pct = Math.round((a.ratio ?? 0) * 100);
      return (
        <View style={styles.gap}>
          {num(`${a.taken} de ${a.total}`, `${H.taken} · ${pct} %`)}
          <View style={[styles.track, { backgroundColor: t.c.surface2 }]} accessible accessibilityLabel={`${pct} %`}>
            <View style={[styles.fill, { width: `${pct}%`, backgroundColor: t.hc ? t.c.text : d.accent }]} />
          </View>
          <AppText variant="caption" color={d.muted}>{`${a.snoozed} ${H.snoozed} · ${a.skipped} ${H.skipped} · ${a.unconfirmed} ${H.unconfirmed}`}</AppText>
        </View>
      );
    }
    case 'water': {
      const total = data.water.reduce((x, y) => x + y, 0);
      if (!total) return empty;
      return (
        <View style={styles.gap}>
          {num(data.days.length === 1 ? total : (total / data.days.length).toFixed(1).replace('.', ','), data.days.length === 1 ? `de ${data.waterGoal || '—'} vasos` : 'vasos por día en promedio')}
          {data.days.length > 1 ? <Bars values={data.water} max={Math.max(data.waterGoal, ...data.water)} color={d.accent} labels={data.days.length <= 7 ? data.days.map(dayInitial) : undefined} height={big ? 120 : 64} /> : null}
        </View>
      );
    }
    case 'mood':
    case 'sleep': {
      const r = metric === 'mood' ? data.mood : data.sleep;
      const week = metric === 'mood' ? data.moodWeek : data.sleepWeek;
      const top = r.answered ? (['good', 'regular', 'bad'] as Answer3[]).sort((a, b) => r[b] - r[a])[0] : null;
      return (
        <View style={styles.gap}>
          {top ? (
            <View style={styles.row}>
              <View style={styles.faceBox}>
                <Face kind={top} size={big ? 64 : 40} color={d.text} />
              </View>
              <View style={styles.textCol}>
                <AppText variant={big ? 'heroL' : 'h2'} color={d.text}>{strings.answers[top]}</AppText>
                <AppText variant="secondaryStrong" color={d.muted}>{H.answers(r.answered)}</AppText>
              </View>
            </View>
          ) : (
            <AppText variant="secondary" color={d.muted}>{H.noData}</AppText>
          )}
          {/* Barras de los últimos 7 días (se animan al aparecer). Sin respuesta, la barra queda vacía. */}
          <Bars values={week} max={3} color={d.accent} labels={data.week.map(dayInitial)} labelColor={d.muted} height={big ? 96 : 48} />
          {metric === 'mood' && data.trend ? <AppText variant="caption" color={d.muted}>{H.trend[data.trend]}</AppText> : null}
        </View>
      );
    }
    case 'food':
      return (
        <View style={styles.gap}>
          {data.meals.answered ? num(data.meals.yes, H.mealsYes(data.meals.yes).replace(/^\d+ /, '')) : empty}
          {data.elder?.dietRestrictions.length ? <AppText variant="caption" color={d.muted}>{`${H.restrictions}: ${data.elder.dietRestrictions.join(', ')}`}</AppText> : null}
        </View>
      );
    case 'activity':
      return (
        <View style={styles.gap}>
          {data.activity.done || data.activity.notDone ? num(data.activity.done, H.walks(data.activity.done).replace(/^\d+ /, '')) : empty}
          <AppText variant="caption" color={d.muted}>
            {H.stepsNote}
          </AppText>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gap: { gap: spacing.sm },
  faceBox: { flexShrink: 0 },
  textCol: { flex: 1, minWidth: 0 },
  track: { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { height: 12, borderRadius: 6 },
});
