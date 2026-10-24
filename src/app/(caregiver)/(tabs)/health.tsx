import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Card } from '@/components/card';
import { Segmented } from '@/components/forms';
import { Icon, type IconName } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { ScreenContainer } from '@/components/screen-container';
import { EmptyState } from '@/components/states';
import type { Period } from '@/domain/health';
import { MetricBody, useHealth, type MetricKey } from '@/features/health/metrics';
import { WaterToday } from '@/features/health/water-today';
import { strings } from '@/i18n';
import { spacing, type Domain } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { PlusLock } from '@/components/plus-lock';
import { useIsPlus } from '@/state/entitlements';

const H = strings.health;
/** Orden de Salud (V4). Comidas no está en el brief: se ve en su detalle desde Rutina. */
const CARDS: { key: MetricKey; title: string; icon: IconName; domain: Domain }[] = [
  { key: 'meds', title: H.meds, icon: 'meds', domain: 'medication' },
  { key: 'mood', title: H.mood, icon: 'smile', domain: 'mood' },
  { key: 'sleep', title: H.sleep, icon: 'moon', domain: 'sleep' },
  { key: 'water', title: H.water, icon: 'drop', domain: 'water' },
];

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
      {/* V4: una tarjeta por fila, a todo el ancho y delgada: título, valor grande y minigráfico que no se corta. */}
      <View style={s.list}>
        {CARDS.map((m, i) => (
          <Appear key={m.key} index={i}>
            {m.key === 'water' && period === 'day' ? (
              <Pressable onPress={() => router.push({ pathname: '/health/[metric]', params: { metric: 'water' } })} accessibilityRole="button" accessibilityLabel={m.title}>
                <WaterToday elder={data.elder!} />
              </Pressable>
            ) : (
              <Card onPress={() => router.push({ pathname: '/health/[metric]', params: { metric: m.key } })} accessibilityLabel={m.title} style={s.card}>
                <View style={s.cardHead}>
                  <IconTile icon={m.icon} domain={m.domain} />
                  <AppText variant="h3" style={s.flex}>{m.title}</AppText>
                  <Icon name="chevron" color={t.c.muted} />
                </View>
                <MetricBody metric={m.key} data={data} />
              </Card>
            )}
          </Appear>
        ))}
        <Card style={s.card} onPress={isPlus ? () => router.push('/health/watch') : undefined} accessibilityLabel={H.stepsWatch}>
          <View style={s.cardHead}>
            <IconTile icon="watch" domain="activity" />
            <AppText variant="h3" style={s.flex}>{H.stepsWatch}</AppText>
            {isPlus ? <Icon name="chevron" color={t.c.muted} /> : null}
          </View>
          <MetricBody metric="activity" data={data} />
          {isPlus ? null : <PlusLock label={H.watchPlus} />}
        </Card>
      </View>
      <AppText variant="caption" color={t.c.muted} align="center" style={s.note}>
        {H.disclaimer}
      </AppText>
    </ScreenContainer>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    head: { paddingTop: spacing.sm, marginBottom: spacing.lg },
    list: { gap: spacing.md, marginTop: spacing.lg },
    card: { gap: spacing.sm, minHeight: 120 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    note: { marginTop: spacing.lg },
  }),
);
