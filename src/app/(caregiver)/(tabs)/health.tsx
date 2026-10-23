import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Card } from '@/components/card';
import { Segmented } from '@/components/forms';
import { Icon } from '@/components/icon';
import { ScreenContainer } from '@/components/screen-container';
import { EmptyState } from '@/components/states';
import type { Period } from '@/domain/health';
import { METRICS, MetricBody, useHealth } from '@/features/health/metrics';
import { strings } from '@/i18n';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { PlusLock } from '@/components/plus-lock';
import { useIsPlus } from '@/state/entitlements';

const H = strings.health;

/** Salud: métricas descriptivas de lo que respondió y se registró. Sin datos, estado vacío; nunca valores inventados. */
export default function Health() {
  const router = useRouter();
  const t = useTheme();
  const isPlus = useIsPlus();
  const s = useStyles();
  const [period, setPeriod] = useState<Period>('day');
  const data = useHealth(period);

  if (!data.elder?.setupDone) {
    return (
      <ScreenContainer insideTabs>
        <EmptyState title={strings.summary.emptyTitle} text={strings.summary.emptyBody} action={{ label: strings.summary.steps.register, onPress: () => router.push('/setup') }} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer insideTabs>
      <View style={s.head}>
        <AppText variant="h1">{H.title}</AppText>
        <AppText variant="secondary" color={t.c.muted}>
          {strings.summary.caring(data.elder.firstName)}
        </AppText>
      </View>
      <Segmented label={H.title} value={period} onChange={setPeriod} options={(['day', 'week', 'month'] as Period[]).map((p) => ({ key: p, label: H.periods[p] }))} />
      <View style={s.grid}>
        {METRICS.map((m, i) => (
          <Appear key={m.key} index={i} style={m.key === 'mood' || m.key === 'sleep' ? s.full : s.half}>
            <Card variant="gradient" domain={m.domain} radius={radius.hero} style={m.key === 'mood' || m.key === 'sleep' ? s.trendCard : s.card} onPress={() => router.push({ pathname: '/health/[metric]', params: { metric: m.key } })} accessibilityLabel={m.title}>
              <View style={s.cardHead}>
                <AppText variant="h3" color={t.hc ? t.c.text : t.domains[m.domain].text} style={s.flex}>
                  {m.title}
                </AppText>
                <Icon name="chevron" color={t.domains[m.domain].muted} />
              </View>
              <MetricBody metric={m.key} data={data} />
            </Card>
          </Appear>
        ))}
      </View>
      {isPlus ? (
        <Card style={s.watch} onPress={() => router.push('/health/watch')} accessibilityLabel="Conectar reloj">
          <Icon name="watch" color={t.ink.lavender} size={28} />
          <View style={s.flex}><AppText variant="h3">Conectar reloj</AppText><AppText variant="caption" color={t.c.muted}>{H.watchBody}</AppText></View>
        </Card>
      ) : <PlusLock label="Conectar reloj · Disponible en BUDDY Plus" />}
      <AppText variant="caption" color={t.c.muted} align="center" style={s.note}>
        {H.disclaimer}
      </AppText>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    head: { paddingTop: spacing.sm, marginBottom: spacing.lg },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    full: { width: '100%' },
    half: { width: '48%' },
    card: { gap: spacing.sm, minHeight: 160 },
    trendCard: { gap: spacing.xs, minHeight: 0, paddingVertical: spacing.sm },
    cardHead: { flexDirection: 'row', alignItems: 'center' },
    watch: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.section },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
    badge: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: t.c.lavenderPale, ...t.hairline },
    note: { marginTop: spacing.md },
  }),
);
