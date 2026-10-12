/**
 * Panel "Hoy" del Resumen: línea de tiempo de lo registrado, bento asimétrico (agua, medicamentos, ánimo, sueño),
 existencias. "BUDDY te sugiere" vive aparte (src/features/feed). Todo sale de registros reales; sin datos, estados vacíos.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Card } from '@/components/card';
import { Face, ProgressRing, WaterFill } from '@/components/charts';
import { Icon, type IconName } from '@/components/icon';
import { adherence, answersBy } from '@/domain/health';
import { dayDoses, effectiveTime, stockUnit } from '@/domain/schedule';
import { estimateStock } from '@/domain/stock';
import type { Elder } from '@/domain/types';
import { strings } from '@/i18n';
import { doseActions, evaluateAlerts } from '@/state/care';
import { useRecords } from '@/state/data';
import { useNow } from '@/hooks/use-now';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatAgo, formatClock, toISODate } from '@/utils/dates';

const S = strings.summary;

interface TimelineEvent {
  at: string;
  icon: IconName;
  tone: 'coral' | 'sky' | 'yellow' | 'lavender' | 'mint' | 'red';
  text: string;
}

export function TodayPanel({ elder }: { elder: Elder }) {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const now = useNow(60_000);
  const today = toISODate(now);
  const meds = useRecords('medications', { elderId: elder.id });
  const doses = useRecords('doses', { elderId: elder.id });
  const water = useRecords('water', { elderId: elder.id });
  const plan = useRecords('waterPlans', { elderId: elder.id })[0];
  const meals = useRecords('meals', { elderId: elder.id });
  const mealLogs = useRecords('mealLogs', { elderId: elder.id });
  const checkins = useRecords('checkins', { elderId: elder.id });
  const alerts = useRecords('alerts', { elderId: elder.id });

  // Tomas de hoy y avisos pendientes (sin confirmar, existencias) cada vez que cambia la hora.
  useEffect(() => {
    doseActions.sync(elder.id, now);
    evaluateAlerts(elder.id, now);
  }, [elder.id, now]);

  const items = useMemo(() => dayDoses(meds, doses, today, now), [meds, doses, today, now]);
  const adh = adherence(doses, [today], now);
  const glasses = water.filter((w) => w.date === today).length;
  const goal = plan?.glasses ?? 0;
  const checkin = checkins.find((c) => c.date === today);
  const mood = answersBy(checkins, [today], 'mood');

  const events: TimelineEvent[] = useMemo(() => {
    const list: TimelineEvent[] = [];
    for (const it of items) {
      if (it.dose.respondedAt && it.dose.status === 'taken') list.push({ at: it.dose.respondedAt, icon: 'meds', tone: 'coral', text: `Tomó ${it.medication.name}` });
      if (it.dose.respondedAt && it.dose.status === 'skipped') list.push({ at: it.dose.respondedAt, icon: 'meds', tone: 'yellow', text: `No tomó ${it.medication.name}` });
      if (it.dose.respondedAt && it.dose.status === 'snoozed') list.push({ at: it.dose.respondedAt, icon: 'clock', tone: 'yellow', text: `Pospuso ${it.medication.name}` });
    }
    water.filter((w) => w.date === today).forEach((w) => list.push({ at: w.at, icon: 'drop', tone: 'sky', text: 'Tomó un vaso de agua' }));
    mealLogs.filter((m) => m.date === today).forEach((m) => {
      const meal = meals.find((x) => x.id === m.mealId);
      const name = meal ? strings.setup.food.mealNames[meal.kind].toLowerCase() : 'comida';
      list.push({ at: m.updatedAt, icon: 'food', tone: 'yellow', text: m.answer === 'yes' ? `Confirmó ${name}` : `Dijo que no ha comido (${name})` });
    });
    if (checkin) list.push({ at: checkin.updatedAt, icon: 'smile', tone: 'lavender', text: 'Respondió el chequeo' });
    alerts.filter((a) => a.kind === 'help_requested' && a.createdAt.startsWith(today)).forEach((a) => list.push({ at: a.createdAt, icon: 'shield', tone: 'red', text: 'Pidió ayuda' }));
    return list.sort((a, b) => b.at.localeCompare(a.at));
  }, [items, water, mealLogs, meals, checkin, alerts, today]);

  const lowStock = meds
    .map((m) => ({ m, e: estimateStock(m, today) }))
    .filter((x) => x.e.level !== 'none')
    .sort((a, b) => (a.e.daysLeft ?? 999) - (b.e.daysLeft ?? 999));
  const next = items.find((i) => i.status === 'pending' || i.status === 'snoozed');

  return (
    <View style={s.root}>
      <View style={s.sectionHead}>
        <AppText variant="h2">{S.today}</AppText>
        <AppText variant="caption" color={t.c.muted}>
          {events[0] ? S.lastUpdate(formatAgo(new Date(events[0].at), now)) : S.noRecords}
        </AppText>
      </View>

      {/* Bento asimétrico */}
      <View style={s.bento}>
        <Card variant="gradient" domain="water" radius={radius.hero} padding={0} style={s.waterCard} onPress={() => router.push('/routine/water' as Href)} accessibilityLabel={`Agua: ${glasses} de ${goal || '—'} vasos`}>
          <WaterFill ratio={goal ? glasses / goal : 0} />
          <View style={s.waterBody}>
            <Icon name="drop" color={t.domains.water.text} />
            <AppText variant="heroXL" color={t.domains.water.text}>
              {glasses}
            </AppText>
            <AppText variant="secondaryStrong" color={t.domains.water.muted}>
              {goal ? `de ${goal} vasos` : 'Sin meta de agua'}
            </AppText>
          </View>
        </Card>
        <View style={s.bentoCol}>
          <Card style={s.smallCard} onPress={() => router.push('/routine' as Href)} accessibilityLabel={`Medicamentos: ${adh.taken} de ${adh.total} confirmados`}>
            <ProgressRing size={64} ratio={adh.total ? adh.taken / adh.total : 0} color={t.domains.medication.accent} label={`${adh.taken}/${adh.total}`} />
            <AppText variant="captionStrong">Medicamentos</AppText>
          </Card>
          <Card variant="gradient" domain="mood" style={s.smallCard} accessibilityLabel={checkin?.mood ? `Ánimo: ${strings.answers[checkin.mood]}` : 'Ánimo sin respuesta hoy'}>
            {checkin?.mood ? <Face kind={checkin.mood} size={44} color={t.domains.mood.text} /> : <Icon name="smile" size={36} color={t.domains.mood.accent} />}
            <AppText variant="captionStrong" color={t.domains.mood.text}>
              {checkin?.mood ? strings.answers[checkin.mood] : mood.answered ? '' : 'Ánimo: sin respuesta'}
            </AppText>
          </Card>
        </View>
      </View>
      <View style={[s.sleepCard, t.hc && t.hairline]} accessible accessibilityLabel={checkin?.sleep ? `Sueño: durmió ${strings.answers[checkin.sleep].toLowerCase()}` : 'Sueño sin respuesta hoy'}>
        {t.hc ? null : <LinearGradient colors={t.domains.sleep.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, s.round]} />}
        <Icon name="moon" color={t.hc ? t.c.text : t.domains.sleep.accent} size={28} />
        <View style={s.flex}>
          <AppText variant="captionStrong" color={t.hc ? t.c.text : t.domains.sleep.muted}>
            Sueño
          </AppText>
          <AppText variant="h3" color={t.hc ? t.c.text : t.domains.sleep.text}>
            {checkin?.sleep ? `Durmió ${strings.answers[checkin.sleep].toLowerCase()}` : 'Aún no responde cómo durmió'}
          </AppText>
        </View>
      </View>

      {/* Próxima toma */}
      {next ? (
        <Card variant="tint" tone="coral" style={s.nextCard}>
          <Icon name="clock" color={t.ink.coral} />
          <AppText variant="secondaryStrong" style={s.flex}>{`Próxima toma: ${next.medication.name} a las ${formatClock(effectiveTime(next.dose))}`}</AppText>
        </Card>
      ) : null}

      {/* Línea de tiempo */}
      <Card style={s.timeline}>
        {events.length ? (
          events.slice(0, 8).map((e, i) => (
            <Appear key={`${e.at}-${i}`} index={i} style={s.event}>
              <View style={[s.dot, { backgroundColor: t.tones[e.tone].solid }]} />
              <Icon name={e.icon} color={t.tones[e.tone].fg} size={20} />
              <AppText variant="secondary" style={s.flex}>
                {e.text}
              </AppText>
              <AppText variant="caption" color={t.c.muted} style={s.tabular}>
                {formatClock(new Date(e.at).toTimeString().slice(0, 5))}
              </AppText>
            </Appear>
          ))
        ) : (
          <AppText variant="secondary" color={t.c.muted}>
            {S.noRecords}
          </AppText>
        )}
      </Card>

      {/* Existencias */}
      {lowStock.length ? (
        <Card style={s.stock}>
          <AppText variant="h3">{S.stock}</AppText>
          {lowStock.slice(0, 4).map(({ m, e }) => (
            <View key={m.id} style={s.stockRow}>
              <View style={[s.dot, { backgroundColor: e.level === 'ok' ? t.c.success : t.c.yellow }]} />
              <AppText variant="secondaryStrong" style={s.flex}>
                {m.name}
              </AppText>
              <AppText variant="caption" color={e.level === 'ok' ? t.c.muted : t.ink.yellow}>
                {e.level === 'out' ? 'Agotado' : e.daysLeft !== null ? `~${e.daysLeft} días (estimado)` : `${m.unitsOnHand} ${stockUnit(m)}`}
              </AppText>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    tabular: { fontVariant: ['tabular-nums'] },
    round: { borderRadius: radius.card },
    root: { gap: spacing.md },
    sectionHead: { gap: 2 },
    bento: { flexDirection: 'row', gap: spacing.sm },
    waterCard: { flex: 1.15, minHeight: 236, overflow: 'hidden' },
    waterBody: { flex: 1, padding: spacing.lg, justifyContent: 'flex-end', gap: 2 },
    bentoCol: { flex: 1, gap: spacing.sm },
    smallCard: { flex: 1, padding: spacing.md, gap: spacing.xs, justifyContent: 'center', alignItems: 'flex-start' },
    sleepCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.card, backgroundColor: t.c.night, overflow: 'hidden' },
    nextCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
    timeline: { gap: spacing.sm },
    event: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    stock: { gap: spacing.sm },
    stockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  }),
);
