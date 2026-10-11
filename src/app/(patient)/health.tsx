import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { DemoBadge, IconTile, Notice } from '@/components/blocks';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Sparkline } from '@/components/charts';
import { useToast } from '@/components/feedback';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { CountUp, ProgressBar } from '@/components/progress';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { formatVitalValue, useVitalCards, VITALS } from '@/features/vitals/hooks';
import { useWellnessDay, WATER_GOAL, wellbeingActions } from '@/features/wellbeing/hooks';
import { useNow } from '@/hooks/use-now';
import type { VitalType } from '@/types/domain';
import { ink, palette, shadow, spacing, tones, type Tone } from '@/theme';
import { formatAgo } from '@/utils/dates';
import { tapHaptic } from '@/utils/haptics';

const VISUAL: Record<VitalType, { icon: IconName; tone: Tone }> = {
  bloodPressure: { icon: 'heart', tone: 'coral' },
  glucose: { icon: 'plus', tone: 'sky' },
  pulse: { icon: 'heart', tone: 'lavender' },
  oxygen: { icon: 'care', tone: 'mint' },
  temperature: { icon: 'warning', tone: 'yellow' },
  weight: { icon: 'user', tone: 'petrol' },
};

const TREND_ICON: Record<string, IconName> = { up: 'arrow', down: 'arrow', same: 'check', first: 'plus' };

export default function Health() {
  const router = useRouter();
  const toast = useToast();
  const now = useNow();
  const { cards, todayCount, last } = useVitalCards(now);
  const { glasses } = useWellnessDay(now);

  return (
    <ScreenContainer
      header={
        <ScreenHeader
          title="Registros de salud"
          right={<IconButton icon="plus" label="Agregar" variant="mint" onPress={() => router.push('/modals/add-vital')} />}
        />
      }
    >
      <View style={styles.stack}>
        <Appear index={0}>
          <Card variant="gradient" gradient="petrolCard" elevation="elevated" style={styles.overview}>
            <View style={styles.ring} accessible accessibilityLabel={`${todayCount} registros hoy`}>
              <CountUp value={todayCount} variant="h2" color={ink.inverse} />
              <AppText variant="meta" color={palette.mint}>
                hoy
              </AppText>
            </View>
            <View style={styles.flex}>
              <AppText variant="eyebrow" color={palette.mint}>
                RESUMEN DE REGISTROS
              </AppText>
              <AppText variant="h3" color={ink.inverse}>
                {todayCount ? `Registraste ${todayCount} ${todayCount === 1 ? 'dato' : 'datos'} hoy` : 'Sin registros hoy'}
              </AppText>
              <AppText variant="caption" color={palette.nightText}>
                {last ? `Último registro ${formatAgo(new Date(last.recordedAt), now)}` : 'Agrega tu primer registro'}
              </AppText>
            </View>
          </Card>
        </Appear>
        <View style={styles.legend}>
          <Icon name="user" size={18} color={ink.muted} />
          <AppText variant="caption" color={ink.muted} style={styles.flex}>
            Registrado manualmente · sin dispositivos conectados
          </AppText>
          <DemoBadge />
        </View>

        <View style={styles.grid}>
          {cards.map((c, i) => {
            const meta = VITALS[c.type];
            const v = VISUAL[c.type];
            const value = c.last ? formatVitalValue(c.last) : '—';
            return (
              <Appear key={c.type} index={i + 1} style={styles.cell}>
                <PressableScale
                  onPress={() => router.push({ pathname: '/modals/add-vital', params: { type: c.type } })}
                  accessibilityLabel={`${meta.label}: ${c.last ? `${value} ${meta.unit}` : 'sin registros'}. ${c.trend.text}`}
                  accessibilityHint="Agregar un registro manual de este tipo"
                  style={styles.widget}
                >
                  <View style={styles.widgetHead}>
                    <IconTile icon={v.icon} tone={v.tone} size={36} />
                    <AppText variant="caption" color={ink.muted} style={styles.flex} numberOfLines={2}>
                      {meta.label}
                    </AppText>
                  </View>
                  <AppText variant="h2">
                    {value}{' '}
                    <AppText variant="meta" color={ink.muted}>
                      {meta.unit}
                    </AppText>
                  </AppText>
                  <Sparkline values={c.spark} color={tones[v.tone].solid} />
                  <View style={styles.trend}>
                    <View style={{ transform: [{ rotate: c.trend.word === 'up' ? '-90deg' : c.trend.word === 'down' ? '90deg' : '0deg' }] }}>
                      <Icon name={TREND_ICON[c.trend.word]} size={14} color={ink.muted} />
                    </View>
                    <AppText variant="meta" color={ink.muted}>
                      {c.trend.text}
                    </AppText>
                  </View>
                </PressableScale>
              </Appear>
            );
          })}
        </View>

        <Card variant="tint" tone="sky" style={styles.hydration}>
          <IconTile icon="care" tone="sky" />
          <View style={styles.flex}>
            <AppText variant="eyebrow" color={ink.sky}>
              HIDRATACIÓN
            </AppText>
            <AppText variant="bodyStrong">{`${glasses} de ${WATER_GOAL} vasos`}</AppText>
            <ProgressBar value={glasses / WATER_GOAL} gradient="water" track="#C5DDED" height={8} accessibilityLabel={`Hidratación: ${glasses} de ${WATER_GOAL} vasos`} />
          </View>
          <IconButton
            icon="plus"
            label="Vaso"
            variant="soft"
            accessibilityHint="Añadir un vaso de agua"
            onPress={() => {
              wellbeingActions.addWater(1);
              tapHaptic();
              toast({ message: 'Vaso de agua añadido.', icon: 'check' });
            }}
          />
        </Card>

        <Notice text="Los datos son orientativos y no sustituyen una valoración médica. BUDDY no interpreta tus valores." />
        <Button label="Ver historial y tendencias" variant="secondary" icon="calendar" onPress={() => router.push('/reports')} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  stack: { gap: spacing.md, paddingTop: spacing.xs },
  overview: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ring: { width: 72, height: 72, borderRadius: 36, borderWidth: 5, borderColor: palette.mint, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: '47%', flexGrow: 1 },
  widget: { minHeight: 176, borderRadius: 19, padding: spacing.sm, backgroundColor: palette.white, gap: spacing.xs, ...shadow.soft },
  widgetHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  trend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  hydration: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
