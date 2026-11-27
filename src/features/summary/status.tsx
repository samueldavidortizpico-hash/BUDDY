/**
 * Vista de un segundo del Inicio (V4). El estado es el elemento más grande: "Todo bien" (menta), "Atención" (ámbar suave),
 * "Acción necesaria" (coral) o "Aún no hay registros" (gris, nunca "Todo bien" sin datos), con su icono, una frase con la
 * razón y, si no es "Todo bien", una sola acción: "Llamar a [nombre]". Debajo, "Hoy" en tres mosaicos y dos líneas
 * (próxima toma y última señal). Nunca solo color: cada nivel lleva icono y palabra.
 */
import { useEffect, useMemo } from 'react';
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn, useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon, type IconName } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { dailySummary, dayStatus, type StatusInput, type StatusLevel } from '@/domain/status';
import { dayDoses, effectiveTime, escalationOf } from '@/domain/schedule';
import type { Elder } from '@/domain/types';
import { verify, type Heartbeat } from '@/domain/verification';
import { useNow } from '@/hooks/use-now';
import { useDb } from '@/infrastructure/local/db';
import { heartbeatKey } from '@/infrastructure/local/heartbeats';
import { scheduleDailySummary } from '@/infrastructure/notifications';
import { strings } from '@/i18n';
import { useRecords, useUserId } from '@/state/data';
import { spacing, type StatusKind } from '@/theme';
import { makeStyles, useTextScaleFactor, useTheme } from '@/theme/provider';
import { formatClock, toClock, toISODate } from '@/utils/dates';

const S = strings.status;
const H = strings.summary.home;
const NO_BEATS: Heartbeat[] = [];
const LOOK: Record<StatusLevel, { kind: StatusKind; icon: IconName }> = {
  ok: { kind: 'ok', icon: 'check' },
  attention: { kind: 'attention', icon: 'warning' },
  action: { kind: 'action', icon: 'warning' },
  no_data: { kind: 'none', icon: 'clock' },
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
  const kind: StatusKind = st.help ? 'action' : look.kind;
  const tone = t.status[kind];
  const reduce = useReducedMotion();
  return (
    <Card variant="status" status={kind} style={s.hero}>
      <View accessible accessibilityRole="summary" accessibilityLabel={`${S.levels[st.level]}. ${st.reason}`} accessibilityLiveRegion="polite" style={s.heroBody}>
        {/* V5: al cambiar de estado el icono vuelve a entrar con un resorte corto: el hijo nota que algo cambió. */}
        <Animated.View key={kind} entering={reduce ? undefined : ZoomIn.springify().damping(13)} style={[s.heroIcon, { backgroundColor: t.hc ? t.c.bg : tone.accent }, t.hc && t.hairline]}>
          <Icon name={st.help ? 'shield' : look.icon} color={t.hc ? t.c.text : t.dark ? t.c.bg : '#FFFFFF'} size={30} strokeWidth={2.4} />
        </Animated.View>
        <AppText variant="display" color={tone.text} maxScale={1.4}>
          {S.levels[st.level]}
        </AppText>
        <AppText variant="body" color={tone.text}>
          {st.reason}
        </AppText>
      </View>
      {st.call && phone ? <Button label={strings.feed.callName(elder.firstName)} icon="phone" variant={st.help ? 'danger' : 'primary'} onPress={() => Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`)} /> : null}
      {st.call && !phone ? <AppText variant="caption" color={tone.muted}>{S.noPhone(elder.firstName)}</AppText> : null}
    </Card>
  );
}

/** "Hoy": medicinas, agua y ánimo en tres mosaicos (en columna con letra grande), más la próxima toma y la última señal. */
export function TodayTiles({ elder }: { elder: Elder }) {
  const t = useTheme();
  const s = useStyles();
  const input = useStatusInput(elder);
  const { width, fontScale } = useWindowDimensions();
  const column = width / (fontScale * useTextScaleFactor()) < 370;
  const facts = dayStatus(input).facts;
  const today = toISODate(input.now);
  const water = useRecords('water', { elderId: elder.id }).filter((w) => w.date === today).length;
  const plan = useRecords('waterPlans', { elderId: elder.id })[0];
  const checkin = input.checkins.find((c) => c.date === today);
  const clock = toClock(input.now);
  const next = dayDoses(input.meds, input.doses, today, input.now, escalationOf(elder.screen).unconfirmedAfterMin).find(
    (it) => (it.status === 'pending' || it.status === 'snoozed') && effectiveTime(it.dose) >= clock,
  );
  const goal = plan?.times.length ?? 0;
  const tiles: { key: string; icon: IconName; domain: 'medication' | 'water' | 'mood'; label: string; value: string }[] = [
    { key: 'meds', icon: 'meds', domain: 'medication', label: H.meds, value: facts.doses.total ? S.facts.dosesValue(facts.doses.taken, facts.doses.total) : H.none },
    { key: 'water', icon: 'drop', domain: 'water', label: H.water, value: goal ? S.facts.dosesValue(Math.min(water, goal), goal) : water ? String(water) : H.none },
    { key: 'mood', icon: 'smile', domain: 'mood', label: H.mood, value: checkin?.mood ? strings.answers[checkin.mood] : H.noMood },
  ];
  return (
    <View style={s.today}>
      <AppText variant="h2">{H.today}</AppText>
      <View style={[s.tiles, column && s.tilesColumn]}>
        {tiles.map((x) => (
          // V5: cada mosaico lleva el tinte de su dominio (coral, azul, lavanda) en vez de tres tarjetas blancas iguales.
          <Card key={x.key} variant="gradient" domain={x.domain} padding={spacing.md} style={[s.tile, column ? s.tileWide : s.tileThird]}>
            <View style={[column ? s.tileWideBody : s.tileBody]} accessible accessibilityLabel={`${x.label}: ${x.value}`}>
              <IconTile icon={x.icon} domain={x.domain} />
              <View style={column ? s.flex : null}>
                <AppText variant="h3" color={t.domains[x.domain].text} style={s.tabular}>{x.value}</AppText>
                <AppText variant="caption" color={t.domains[x.domain].muted}>{x.label}</AppText>
              </View>
            </View>
          </Card>
        ))}
      </View>
      <View style={s.lines}>
        <Line icon="clock" text={next ? H.next(next.medication.name, formatClock(effectiveTime(next.dose))) : facts.doses.total ? H.noNext : H.noMeds} />
        <Line icon="phone" text={facts.lastSignal ? H.signal(facts.lastSignal) : H.noSignal(elder.firstName)} />
      </View>
    </View>
  );
}

function Line({ icon, text }: { icon: IconName; text: string }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <View style={s.line}>
      <Icon name={icon} color={t.c.muted} size={20} />
      <AppText variant="secondary" color={t.c.text} style={s.flex}>{text}</AppText>
    </View>
  );
}

/**
 * Resumen diario de una línea, solo con registros reales, como notificación local de hoy a la hora que eligió el
 * administrador. Ya no ocupa una tarjeta del Inicio (V4): la vista de un segundo dice lo mismo.
 */
export function useDailySummaryNotice(elder: Elder) {
  const input = useStatusInput(elder);
  const line = dailySummary(input);
  const time = elder.summaryTime ?? '20:00';
  const asOf = formatClock(toClock(input.now));
  const body = line ? S.summaryBody(elder.firstName, asOf, line) : null;
  useEffect(() => {
    const [h, m] = time.split(':').map(Number);
    const when = new Date(input.now.getFullYear(), input.now.getMonth(), input.now.getDate(), h, m);
    scheduleDailySummary(body, when).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, time]);
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    tabular: { fontVariant: ['tabular-nums'] },
    hero: { gap: spacing.md, paddingVertical: spacing.xl },
    heroBody: { gap: spacing.sm },
    heroIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxs },
    today: { gap: spacing.sm },
    tiles: { flexDirection: 'row', gap: spacing.sm },
    tilesColumn: { flexDirection: 'column' },
    tile: { overflow: 'hidden' },
    tileBody: { gap: spacing.sm },
    tileWideBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    tileThird: { flex: 1, minWidth: 0 },
    tileWide: {},
    lines: { gap: spacing.xs, paddingHorizontal: spacing.xxs },
    line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  }),
);
