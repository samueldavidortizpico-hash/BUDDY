/**
 * "Vasos de agua hoy" (V4, Salud): un vaso por hora programada con chulo (registrado), X (sin registro) o reloj
 * (pendiente), sobre agua que se mueve. Cuenta registros reales; no confirma cuánto bebió.
 */
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { WaterFill } from '@/components/charts';
import { Icon } from '@/components/icon';
import { scheduledWaterStatus } from '@/domain/health';
import type { Elder } from '@/domain/types';
import { useNow } from '@/hooks/use-now';
import { useRecords } from '@/state/data';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { toISODate } from '@/utils/dates';

export function WaterToday({ elder }: { elder: Elder }) {
  const t = useTheme();
  const s = useStyles();
  const now = useNow(60_000);
  const today = toISODate(now);
  const water = useRecords('water', { elderId: elder.id });
  const plan = useRecords('waterPlans', { elderId: elder.id })[0];
  const glasses = water.filter((w) => w.date === today).length;
  const waterStatuses = plan?.times ? scheduledWaterStatus(plan.times, water.filter((w) => w.date === today), now) : [];
  return (
    <Card variant="gradient" domain="water" radius={radius.card} padding={0} style={s.waterHistory}>
      <WaterFill ratio={plan?.times.length ? glasses / plan.times.length : 0} height={88} />
      <View style={s.waterHistoryBody}>
        <View style={s.waterHead}>
          <Icon name="drop" color={t.domains.water.text} />
          <AppText variant="h3" color={t.domains.water.text} style={s.flex}>Vasos de agua hoy</AppText>
          <AppText variant="secondaryStrong" color={t.domains.water.text}>{plan?.times.length ? `${Math.min(glasses, plan.times.length)} de ${plan.times.length}` : 'Sin horario'}</AppText>
        </View>
        {plan?.times.length ? <View style={s.waterGlasses}>
          {plan.times.map((time, i) => {
            const status = waterStatuses[i];
            const label = status === 'taken' ? `Vaso ${i + 1}, ${time}, registrado` : status === 'missed' ? `Vaso ${i + 1}, ${time}, sin registro` : `Vaso ${i + 1}, ${time}, pendiente`;
            return <View key={`${time}-${i}`} accessible accessibilityLabel={label} style={s.waterGlass}>
              <Icon name="drop" size={20} color={status === 'taken' ? t.c.success : status === 'missed' ? t.c.danger : t.domains.water.muted} />
              <Icon name={status === 'taken' ? 'check' : status === 'missed' ? 'close' : 'clock'} size={15} color={status === 'taken' ? t.c.success : status === 'missed' ? t.c.danger : t.domains.water.muted} />
              <AppText variant="caption" color={t.domains.water.text} style={s.tabular} maxScale={1.4}>{time}</AppText>
            </View>;
          })}
        </View> : <AppText variant="secondary" color={t.domains.water.muted}>Aún no hay tomas de agua programadas.</AppText>}
        <AppText variant="caption" color={t.domains.water.muted}>Cuenta los registros; no confirma cuánto bebiste.</AppText>
      </View>
    </Card>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    tabular: { fontVariant: ['tabular-nums'] },
    waterHistory: { width: '100%', overflow: 'hidden' },
    waterHistoryBody: { padding: spacing.lg, gap: spacing.sm },
    waterHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
    waterGlasses: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    waterGlass: { minWidth: 72, alignItems: 'center', justifyContent: 'center', gap: 2, padding: spacing.xs, borderRadius: radius.md },
  }),
);
