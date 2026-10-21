/**
 * Vista de un segundo del Inicio (V3.0): el estado es el héroe. Una palabra grande con su icono ("Todo bien",
 * "Atención", "Acción necesaria" o "Aún no hay registros"), la razón en una frase y, si hay algo que atender, una sola
 * acción principal: "Llamar a [nombre]". Debajo, lo de hoy en cuatro datos. Color por nivel con icono y texto (nunca
 * solo color): menta, ámbar suave y coral; rojo solo si pidió ayuda. El resumen diario de una línea va aparte.
 */
import { useEffect, useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon, type IconName } from '@/components/icon';
import { dailySummary, dayStatus, type DayFacts, type StatusInput, type StatusLevel } from '@/domain/status';
import type { Elder } from '@/domain/types';
import { verify, type Heartbeat } from '@/domain/verification';
import { useNow } from '@/hooks/use-now';
import { useDb } from '@/infrastructure/local/db';
import { heartbeatKey } from '@/infrastructure/local/heartbeats';
import { scheduleDailySummary } from '@/infrastructure/notifications';
import { strings } from '@/i18n';
import { useRecords, useUserId } from '@/state/data';
import { radius, spacing, type Tone } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatClock } from '@/utils/dates';

const S = strings.status;
const NO_BEATS: Heartbeat[] = [];
const LOOK: Record<StatusLevel, { tone: Tone; icon: IconName }> = {
  ok: { tone: 'mint', icon: 'check' },
  attention: { tone: 'yellow', icon: 'warning' },
  action: { tone: 'coral', icon: 'warning' },
  no_data: { tone: 'slate', icon: 'clock' },
};

/** Datos reales de hoy para la vista de un segundo y el resumen diario (null sin persona registrada). */
export function useStatusInput(elder: Elder): StatusInput;
export function useStatusInput(elder: Elder | undefined): StatusInput | null;
export function useStatusInput(elder: Elder | undefined): StatusInput | null {
  const now = useNow(60_000);
  const userId = useUserId() ?? '';
  const scope = { elderId: elder?.id ?? '' };
  const meds = useRecords('medications', scope);
  const doses = useRecords('doses', scope);
  const checkins = useRecords('checkins', scope);
  const alerts = useRecords('alerts', scope);
  const beats = useDb((x) => (elder ? (x.drafts[userId]?.[heartbeatKey(elder.id)] as Heartbeat[] | undefined) : undefined)) ?? NO_BEATS;
  return useMemo(
    () => !elder ? null : ({
      now,
      elderName: elder.firstName,
      meds,
      doses,
      checkins,
      alerts,
      checkinTime: elder.checkinTime,
      escalation: elder.screen,
      verification: verify({ heartbeats: beats, now, elderName: elder.firstName, maxSilenceHours: elder.screen.silenceHours }),
    }),
    [now, elder, meds, doses, checkins, alerts, beats],
  );
}

export function StatusHero({ elder, phone }: { elder: Elder; phone?: string }) {
  const t = useTheme();
  const s = useStyles();
  const input = useStatusInput(elder);
  const st = dayStatus(input);
  const look = LOOK[st.level];
  const tone = st.help ? t.tones.red : t.tones[look.tone];
  const fg = t.hc ? t.c.text : tone.fg;
  return (
    <View style={s.root}>
      <Card variant="tint" tone={st.help ? 'red' : look.tone} radius={radius.hero} style={s.hero} bordered={t.hc}>
        <View accessible accessibilityRole="summary" accessibilityLabel={`${S.levels[st.level]}. ${st.reason}`} accessibilityLiveRegion="polite" style={s.head}>
          <View style={[s.badge, { backgroundColor: t.hc ? t.c.bg : tone.soft }]}>
            <Icon name={st.help ? 'shield' : look.icon} color={fg} size={30} />
          </View>
          <View style={s.flex}>
            <AppText variant="display" color={fg} maxScale={1.4}>
              {S.levels[st.level]}
            </AppText>
            <AppText variant="body" color={t.c.text}>
              {st.reason}
            </AppText>
          </View>
        </View>
        {st.call && phone ? <Button label={strings.feed.callName(elder.firstName)} icon="phone" variant={st.help ? 'danger' : 'primary'} onPress={() => Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`)} /> : null}
        {st.call && !phone ? <AppText variant="caption" color={t.c.muted}>{S.noPhone(elder.firstName)}</AppText> : null}
      </Card>
      <Facts facts={st.facts} />
    </View>
  );
}

function Facts({ facts }: { facts: DayFacts }) {
  const t = useTheme();
  const s = useStyles();
  const items: { icon: IconName; label: string; value: string; warn: boolean }[] = [
    { icon: 'meds', label: S.facts.doses, value: facts.doses.total ? S.facts.dosesValue(facts.doses.taken, facts.doses.total) : S.facts.none, warn: false },
    { icon: 'smile', label: S.facts.checkin, value: S.facts.checkinValue[facts.checkin], warn: facts.checkin === 'missed' },
    { icon: 'box', label: S.facts.stock, value: facts.stock.level === 'out' ? S.facts.stockOut : facts.stock.level === 'low' ? S.facts.stockLow(facts.stock.daysLeft ?? 0) : facts.stock.level === 'ok' ? S.facts.stockOk : S.facts.none, warn: facts.stock.level === 'low' || facts.stock.level === 'out' },
    { icon: 'clock', label: S.facts.signal, value: facts.lastSignal ?? S.facts.noSignal, warn: !facts.lastSignal },
  ];
  return (
    <View style={s.facts}>
      {items.map((f) => (
        <View key={f.label} style={[s.fact, t.hairline]} accessible accessibilityLabel={`${f.label}: ${f.value}`}>
          <Icon name={f.icon} color={f.warn ? t.ink.coral : t.ink.mint} size={20} />
          <AppText variant="caption" color={t.c.muted}>{f.label}</AppText>
          <AppText variant="secondaryStrong">{f.value}</AppText>
        </View>
      ))}
    </View>
  );
}

/**
 * Resumen diario de una línea, solo con registros reales. También lo programa como notificación local de hoy a la hora
 * que eligió el administrador (con la hora hasta la que van los datos).
 */
export function DailySummaryCard({ elder }: { elder: Elder }) {
  const t = useTheme();
  const s = useStyles();
  const input = useStatusInput(elder);
  const line = dailySummary(input);
  const time = elder.summaryTime ?? '20:00';
  const [h, m] = time.split(':').map(Number);
  const when = new Date(input.now.getFullYear(), input.now.getMonth(), input.now.getDate(), h, m);
  const asOf = formatClock(`${String(input.now.getHours()).padStart(2, '0')}:${String(input.now.getMinutes()).padStart(2, '0')}`);
  const body = line ? S.summaryBody(elder.firstName, asOf, line) : null;
  useEffect(() => {
    scheduleDailySummary(body, when).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, time]);
  return (
    <Card style={s.summary}>
      <AppText variant="captionStrong" color={t.c.muted}>{S.summaryTitle(formatClock(time))}</AppText>
      <AppText variant="bodyStrong">{line ?? S.summaryEmpty(elder.firstName)}</AppText>
    </Card>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    root: { gap: spacing.sm, marginBottom: spacing.lg },
    hero: { gap: spacing.md, padding: spacing.lg },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    badge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    fact: { flexGrow: 1, flexBasis: '45%', gap: 2, padding: spacing.md, borderRadius: radius.card, backgroundColor: t.c.surface },
    summary: { gap: spacing.xs, marginBottom: spacing.lg },
  }),
);
