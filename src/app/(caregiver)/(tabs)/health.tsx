import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { FEATURES } from '@/config/features';
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
import { makeStyles, useTextScaleFactor, useTheme } from '@/theme/provider';

const H = strings.health;

/** Salud: métricas descriptivas de lo que respondió y se registró. Sin datos, estado vacío; nunca valores inventados. */
export default function Health() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const [period, setPeriod] = useState<Period>('day');
  const data = useHealth(period);
  const scale = useTextScaleFactor();

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
          // Solo ánimo y sueño comparten fila, y solo con texto de tamaño normal; con texto grande todo va a lo ancho.
          <Appear key={m.key} index={i} style={(m.key === 'mood' || m.key === 'sleep') && scale < 1.3 ? s.half : s.full}>
            <Card variant="gradient" domain={m.domain} radius={radius.hero} style={s.card} onPress={() => router.push({ pathname: '/health/[metric]', params: { metric: m.key } })} accessibilityLabel={m.title}>
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
      {/* Reloj: Futuro en V3.0 (FEATURES.watch). */}
      {FEATURES.watch ? (
      <Card style={s.watch} onPress={() => router.push('/health/watch')} accessibilityLabel={H.watch}>
        <Icon name="watch" color={t.ink.lavender} size={28} />
        <View style={s.flex}>
          <View style={s.badgeRow}>
            <AppText variant="h3">{H.watch}</AppText>
            <View style={s.badge}>
              <AppText variant="meta" color={t.ink.lavender}>{strings.common.premium}</AppText>
            </View>
          </View>
          <AppText variant="caption" color={t.c.muted}>
            {H.watchBody}
          </AppText>
        </View>
      </Card>
      ) : null}
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
    half: { flexGrow: 1, flexBasis: 150 },
    card: { gap: spacing.sm, minHeight: 160 },
    cardHead: { flexDirection: 'row', alignItems: 'center' },
    watch: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.section },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
    badge: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: t.c.lavenderPale, ...t.hairline },
    note: { marginTop: spacing.md },
  }),
);
