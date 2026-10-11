import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { DemoBadge, IconTile, SectionHeader } from '@/components/blocks';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { BarChart } from '@/components/charts';
import { Chip } from '@/components/chip';
import { useToast } from '@/components/feedback';
import { TimeField } from '@/components/field';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { QUALITIES, qualityLabel, sleepActions, sleepMinutes, useSleepSummary } from '@/features/sleep/hooks';
import { useNow } from '@/hooks/use-now';
import type { SleepQuality } from '@/types/domain';
import { ink, palette, radius, shadow, spacing, touch } from '@/theme';
import { dayInitial, formatDuration, toISODate } from '@/utils/dates';
import { successHaptic } from '@/utils/haptics';

export default function Sleep() {
  const router = useRouter();
  const toast = useToast();
  const now = useNow();
  const summary = useSleepSummary(now);
  const last = summary.last;
  const [bedtime, setBedtime] = useState(last?.bedtime ?? '22:30');
  const [wakeTime, setWakeTime] = useState(last?.wakeTime ?? '06:30');
  const [quality, setQuality] = useState<SleepQuality>(last?.quality ?? 'good');
  const [nap, setNap] = useState(last?.napMinutes ?? 0);
  const minutes = sleepMinutes(bedtime, wakeTime);

  const save = () => {
    const r = sleepActions.save({ date: toISODate(new Date()), bedtime, wakeTime, quality, napMinutes: nap });
    if (!r.ok) {
      toast({ message: r.error, icon: 'warning' });
      return;
    }
    successHaptic();
    toast({ message: `Sueño guardado: ${formatDuration(minutes)}.`, icon: 'check' });
  };

  const delta = summary.delta;
  const deltaText =
    delta === null ? 'Registra tu sueño para ver tendencias' : delta === 0 ? 'Igual que tu promedio' : `${formatDuration(Math.abs(delta))} ${delta > 0 ? 'más' : 'menos'} que tu promedio`;

  return (
    <ScreenContainer
      header={
        <ScreenHeader title="Mi sueño" right={<IconButton icon="calendar" label="Historial" onPress={() => router.push('/reports')} />} />
      }
    >
      <View style={styles.stack}>
        <Appear index={0}>
          <Card variant="gradient" gradient="sleep" style={[styles.summary, shadow.night]}>
            <View style={styles.moon}>
              <Icon name="clock" size={30} color={palette.moon} />
            </View>
            <View style={styles.flex}>
              <AppText variant="eyebrow" color={palette.nightText}>
                ANOCHE
              </AppText>
              <AppText variant="h3" color={ink.inverse}>
                {summary.lastMinutes !== null ? `Dormiste ${formatDuration(summary.lastMinutes)}` : 'Sin registro de anoche'}
              </AppText>
              <AppText variant="caption" color={palette.nightText}>
                {deltaText}
              </AppText>
            </View>
            {last ? (
              <View style={styles.quality} accessible accessibilityLabel={`Calidad: ${qualityLabel(last.quality)}`}>
                <AppText variant="captionStrong" color={ink.inverse}>
                  {qualityLabel(last.quality)}
                </AppText>
              </View>
            ) : null}
          </Card>
        </Appear>
        <DemoBadge />

        <Card style={styles.times}>
          <TimeField label="Hora de dormir" value={bedtime} onChange={setBedtime} />
          <TimeField label="Hora de despertar" value={wakeTime} onChange={setWakeTime} />
          <AppText variant="secondaryStrong" color={ink.lavender} align="center" accessibilityLiveRegion="polite">
            {`Total: ${formatDuration(minutes)}`}
          </AppText>
        </Card>

        <SectionHeader title="Calidad del sueño" subtitle="¿Cómo descansaste?" />
        <View style={styles.qualities} accessibilityRole="radiogroup" accessibilityLabel="Calidad del sueño">
          {QUALITIES.map((q, i) => {
            const active = quality === q.key;
            return (
              <PressableScale
                key={q.key}
                haptic
                accessibilityRole="radio"
                accessibilityLabel={q.label}
                accessibilityState={{ checked: active }}
                onPress={() => setQuality(q.key)}
                style={[styles.qOption, active && styles.qActive]}
              >
                <IconTile icon={i === 0 ? 'clock' : 'heart'} tone={i === 0 ? 'slate' : i === 1 ? 'yellow' : 'lavender'} size={38} />
                <AppText variant="secondaryStrong" color={active ? ink.lavender : ink.text}>
                  {q.label}
                </AppText>
              </PressableScale>
            );
          })}
        </View>

        <Card>
          <View style={styles.chartHead}>
            <AppText variant="bodyStrong" style={styles.flex}>
              Últimos 7 días
            </AppText>
            <AppText variant="caption" color={ink.muted}>
              {summary.average !== null ? `Promedio: ${formatDuration(summary.average)}` : 'Sin datos'}
            </AppText>
          </View>
          <BarChart
            accessibilityLabel={`Horas de sueño de los últimos 7 días. Promedio ${summary.average !== null ? formatDuration(summary.average) : 'sin datos'}`}
            data={summary.days.map((d, i) => ({ label: dayInitial(d), value: summary.minutes[i] !== null ? Math.min(1, summary.minutes[i]! / 600) : null }))}
          />
        </Card>

        <View style={styles.nap}>
          <IconTile icon="clock" tone="sky" />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Siesta de hoy</AppText>
            <AppText variant="caption" color={ink.muted}>
              {nap ? formatDuration(nap) : 'Aún no has registrado una siesta'}
            </AppText>
          </View>
        </View>
        <View style={styles.napActions}>
          <Chip role="button" label="+15 min" icon="plus" onPress={() => setNap(Math.min(240, nap + 15))} />
          {nap ? <Chip role="button" label="Quitar siesta" icon="close" onPress={() => setNap(0)} /> : null}
        </View>

        <Button label="Guardar registro de sueño" icon="check" onPress={save} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  stack: { gap: spacing.md, paddingTop: spacing.xs },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 24 },
  moon: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.12)', alignItems: 'center', justifyContent: 'center' },
  quality: { minWidth: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: palette.mint, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  times: { gap: spacing.md },
  qualities: { flexDirection: 'row', gap: spacing.xs },
  qOption: {
    flex: 1,
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  qActive: { borderColor: palette.lavender, backgroundColor: palette.lavenderPale, borderWidth: 2 },
  chartHead: { flexDirection: 'row', alignItems: 'center' },
  nap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: palette.skyPale, borderRadius: 17, padding: spacing.sm, minHeight: touch.primary },
  napActions: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: -spacing.xs },
});
