import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { DemoBadge, IconTile, StatusBadge } from '@/components/blocks';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { BarChart, Sparkline } from '@/components/charts';
import { SegmentedControl } from '@/components/chip';
import { useToast } from '@/components/feedback';
import { CountUp, ProgressRing } from '@/components/progress';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { PERIODS, useReport, type Period } from '@/features/reports/hooks';
import { useNow } from '@/hooks/use-now';
import { ink, palette, spacing } from '@/theme';
import { formatDuration } from '@/utils/dates';

export default function Reports() {
  const toast = useToast();
  const now = useNow();
  const { viewer } = useLocalSearchParams<{ viewer?: string }>();
  const isCaregiver = viewer === 'caregiver';
  const [period, setPeriod] = useState<Period>('week');
  const r = useReport(period, now);

  return (
    <ScreenContainer header={<ScreenHeader title={isCaregiver ? 'Reporte de Carmen' : 'Historial y reportes'} />}>
      <View style={styles.stack}>
        <SegmentedControl accessibilityLabel="Periodo del reporte" options={PERIODS} value={period} onChange={setPeriod} />

        <Appear index={0} key={`sum-${period}`}>
          <Card variant="gradient" gradient="petrolCard" elevation="elevated" style={styles.summary}>
            <View style={styles.flex}>
              <AppText variant="eyebrow" color={palette.mint}>
                {`RESUMEN ${r.name}`}
              </AppText>
              <AppText variant="h3" color={ink.inverse}>
                {r.title}
              </AppText>
              <AppText variant="caption" color={palette.nightText}>
                {r.text}
              </AppText>
            </View>
            <ProgressRing value={(r.adherence ?? 0) / 100} size={76} stroke={7} color={palette.mint} track="rgba(255, 255, 255, 0.16)" accessibilityLabel={`Tomas confirmadas: ${r.adherence ?? 0} por ciento`}>
              <CountUp value={r.adherence ?? 0} suffix="%" variant="captionStrong" color={ink.inverse} />
            </ProgressRing>
          </Card>
        </Appear>
        <DemoBadge />

        <Appear index={1} key={`meds-${period}`}>
          <Card>
            <View style={styles.head}>
              <IconTile icon="meds" tone="mint" />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">Medicamentos</AppText>
                <AppText variant="caption" color={ink.muted}>
                  Tomas confirmadas por ti
                </AppText>
              </View>
              <AppText variant="h3" color={ink.mint}>
                {r.adherence === null ? '—' : `${r.adherence}%`}
              </AppText>
            </View>
            {r.bars.length ? (
              <BarChart
                gradient="barsMint"
                height={90}
                accessibilityLabel={`Tomas confirmadas por ${period === 'day' ? 'toma' : period === 'week' ? 'día' : 'semana'}`}
                data={r.bars}
              />
            ) : (
              <AppText variant="secondary" color={ink.muted}>
                Sin tomas en este periodo.
              </AppText>
            )}
          </Card>
        </Appear>

        <Appear index={2} key={`mood-${period}`}>
          <Card>
            <View style={styles.head}>
              <IconTile icon="heart" tone="lavender" />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">Ánimo</AppText>
                <AppText variant="caption" color={ink.muted}>
                  {r.dominantMood ? `Mayormente: ${r.dominantMood}` : 'Sin registros de ánimo'}
                </AppText>
              </View>
              <StatusBadge label={`${r.moodSpark.length} registros`} tone="lavender" />
            </View>
            {r.moodSpark.length ? <Sparkline values={r.moodSpark} color={palette.lavender} height={56} /> : null}
          </Card>
        </Appear>

        <View style={styles.grid}>
          <Card style={styles.cell}>
            <IconTile icon="clock" tone="sky" size={40} />
            <AppText variant="caption" color={ink.muted}>
              Sueño promedio
            </AppText>
            <AppText variant="h3">{r.sleepAvg !== null ? formatDuration(r.sleepAvg) : '—'}</AppText>
            <AppText variant="meta" color={ink.muted}>
              {r.sleepDelta === null || r.sleepDelta === 0
                ? 'Sin comparación'
                : `${formatDuration(Math.abs(r.sleepDelta))} ${r.sleepDelta > 0 ? 'más' : 'menos'} que el periodo anterior`}
            </AppText>
          </Card>
          <Card style={styles.cell}>
            <IconTile icon="heart" tone="coral" size={40} />
            <AppText variant="caption" color={ink.muted}>
              Registros de salud
            </AppText>
            <AppText variant="h3">{`${r.vitalsCount}`}</AppText>
            <AppText variant="meta" color={ink.muted}>
              {`Manuales · ${r.symptomsCount} ${r.symptomsCount === 1 ? 'síntoma' : 'síntomas'}`}
            </AppText>
          </Card>
        </View>

        {isCaregiver ? null : (
          <Button
            label="Compartir con mi cuidador"
            variant="secondary"
            icon="care"
            onPress={() => toast({ message: 'Demostración: compartir con tu cuidador estará disponible próximamente.', icon: 'shield' })}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  stack: { gap: spacing.md, paddingTop: spacing.xs },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grid: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1, gap: spacing.xxs },
});
