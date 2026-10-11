import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { DemoBadge, DoseStatusBadge, IconTile, ListItem } from '@/components/blocks';
import { PersonAvatar } from '@/components/buddy';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet } from '@/components/feedback';
import { Icon, type IconName } from '@/components/icon';
import { PillVisual } from '@/components/pill-visual';
import { PressableScale } from '@/components/pressable-scale';
import { CountUp, ProgressBar } from '@/components/progress';
import { ScreenContainer } from '@/components/screen-container';
import { doseLabel, effectiveTime, periodProgress, strengthLabel, useDayPlan } from '@/features/medications/hooks';
import { useSettings } from '@/features/profile/hooks';
import { useSleepSummary } from '@/features/sleep/hooks';
import { useVitalCards } from '@/features/vitals/hooks';
import { DAILY_GOALS, moodLabel, useTodayMood, useWellnessDay } from '@/features/wellbeing/hooks';
import { useNow } from '@/hooks/use-now';
import { ink, palette, radius, spacing, tones, type Tone } from '@/theme';
import { formatClock, formatDuration, formatLongDate, greetingFor } from '@/utils/dates';

const MENU: { icon: IconName; title: string; href: Href }[] = [
  { icon: 'user', title: 'Mi perfil y ajustes', href: '/settings' },
  { icon: 'calendar', title: 'Historial y reportes', href: '/reports' },
  { icon: 'shield', title: 'Seguridad de medicamentos', href: '/safety' },
  { icon: 'clock', title: 'Mi sueño', href: '/sleep' },
  { icon: 'heart', title: 'Registros de salud', href: '/health' },
];

function QuickTile({ icon, tone, title, value, onPress }: { icon: IconName; tone: Tone; title: string; value: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${title}: ${value}`} style={[styles.quick, { backgroundColor: tones[tone].bg }]}>
      <View style={[styles.quickIcon, { backgroundColor: tones[tone].soft }]}>
        <Icon name={icon} color={tones[tone].fg} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color={ink.muted}>
          {value}
        </AppText>
      </View>
    </PressableScale>
  );
}

export default function Home() {
  const router = useRouter();
  const now = useNow();
  const [menu, setMenu] = useState(false);
  const { userName } = useSettings();
  const plan = useDayPlan(now);
  const mood = useTodayMood(now);
  const sleep = useSleepSummary(now);
  const vitals = useVitalCards(now);
  const wellness = useWellnessDay(now);

  const ratio = plan.total ? plan.taken / plan.total : 0;
  const next = plan.next;
  const allGood = plan.unconfirmed === 0;
  const go = (href: Href) => router.push(href);

  return (
    <ScreenContainer insideTabs>
      <View style={styles.top}>
        <IconButton icon="menu" label="Menú" variant="soft" onPress={() => setMenu(true)} />
        <PressableScale onPress={() => go('/settings')} accessibilityLabel="Abrir mi perfil" style={styles.avatarBtn}>
          <PersonAvatar size={52} label="" />
        </PressableScale>
      </View>

      <Appear index={0} style={styles.greeting}>
        <AppText variant="eyebrow" color={ink.mint}>
          {formatLongDate(now).toUpperCase()}
        </AppText>
        <AppText variant="h1" color={ink.title}>
          {`¡${greetingFor(now)},\n${userName}!`}
        </AppText>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: allGood ? palette.success : palette.yellow }]} />
          <AppText variant="secondaryStrong" color={ink.muted}>
            {allGood
              ? 'Todo está en orden hoy'
              : `${plan.unconfirmed} ${plan.unconfirmed === 1 ? 'toma sin confirmar' : 'tomas sin confirmar'}`}
          </AppText>
          <DemoBadge style={styles.demo} />
        </View>
      </Appear>

      <Appear index={1}>
        <Card
          variant="gradient"
          gradient="nextMed"
          elevation="elevated"
          onPress={next ? () => go({ pathname: '/modals/reminder', params: { doseId: next.dose.id } }) : () => go('/medications')}
          accessibilityLabel={
            next
              ? `Tu próximo medicamento: ${next.medication.name}, ${strengthLabel(next.medication)}, ${doseLabel(next.medication)}, a las ${formatClock(effectiveTime(next.dose))}`
              : 'No tienes más tomas hoy'
          }
          accessibilityHint={next ? 'Abre el recordatorio para confirmar la toma' : 'Abre tus medicamentos'}
        >
          <AppText variant="eyebrow" color={ink.muted}>
            TU PRÓXIMO MEDICAMENTO
          </AppText>
          {next ? (
            <View style={styles.nextRow}>
              <PillVisual color={next.medication.color} />
              <View style={styles.flex}>
                <AppText variant="h3">{next.medication.name}</AppText>
                <AppText variant="secondary" color={ink.muted}>
                  {`${strengthLabel(next.medication)} · ${doseLabel(next.medication)}`}
                </AppText>
                <View style={styles.inline}>
                  <Icon name="clock" size={18} color={ink.muted} />
                  <AppText variant="secondaryStrong" color={ink.muted}>
                    {formatClock(effectiveTime(next.dose))}
                  </AppText>
                  {next.status !== 'pending' ? <DoseStatusBadge status={next.status} /> : null}
                </View>
              </View>
              <View style={styles.round}>
                <Icon name="chevron" />
              </View>
            </View>
          ) : (
            <View style={styles.nextRow}>
              <IconTile icon="check" tone="mint" />
              <AppText variant="bodyStrong" style={styles.flex}>
                No tienes más tomas pendientes hoy
              </AppText>
            </View>
          )}
        </Card>
      </Appear>

      <Appear index={2}>
        <Card style={styles.progressCard}>
          <View style={styles.progressHead}>
            <View style={styles.flex}>
              <AppText variant="eyebrow" color={ink.muted}>
                TU DÍA DE HOY
              </AppText>
              <AppText variant="bodyStrong">{`${plan.taken} de ${plan.total} confirmadas`}</AppText>
            </View>
            <CountUp value={Math.round(ratio * 100)} suffix="%" variant="h2" />
          </View>
          <ProgressBar value={ratio} accessibilityLabel={`Tomas confirmadas hoy: ${plan.taken} de ${plan.total}`} />
          <View style={styles.periods}>
            {periodProgress(plan.items).map((p) => {
              const done = p.taken === p.total;
              return (
                <View key={p.period} style={styles.inline} accessible accessibilityLabel={`${p.label}: ${done ? 'completa' : 'pendiente'}`}>
                  <Icon name={done ? 'check' : 'clock'} size={18} color={done ? ink.success : ink.muted} />
                  <AppText variant="captionStrong" color={done ? ink.success : ink.muted}>
                    {p.label}
                  </AppText>
                </View>
              );
            })}
          </View>
        </Card>
      </Appear>

      <Appear index={3}>
        <Card
          variant="gradient"
          gradient="feeling"
          onPress={() => go('/mood')}
          accessibilityLabel={mood ? `Tu ánimo de hoy: ${moodLabel(mood.mood)}. Registrar de nuevo` : '¿Cómo te sientes hoy? Cuéntaselo a BUDDY'}
          style={styles.feeling}
        >
          <IconTile icon="heart" tone="lavender" solid />
          <View style={styles.flex}>
            <AppText variant="eyebrow" color={ink.lavender}>
              ¿CÓMO TE SIENTES HOY?
            </AppText>
            <AppText variant="bodyStrong">{mood ? `Hoy te sientes: ${moodLabel(mood.mood)}` : 'Cuéntaselo a BUDDY'}</AppText>
          </View>
          <View style={styles.faces}>
            {[palette.yellow, palette.mint, palette.sky].map((c) => (
              <View key={c} style={[styles.face, { backgroundColor: c }]} />
            ))}
          </View>
          <Icon name="chevron" color={ink.muted} />
        </Card>
      </Appear>

      <Appear index={4} style={styles.grid}>
        <View style={styles.gridRow}>
          <QuickTile icon="meds" tone="coral" title="Medicamentos" value={`${plan.taken} de ${plan.total} tomadas`} onPress={() => go('/medications')} />
          <QuickTile
            icon="heart"
            tone="mint"
            title="Salud"
            value={vitals.todayCount ? `${vitals.todayCount} registros hoy` : 'Registros manuales'}
            onPress={() => go('/health')}
          />
        </View>
        <View style={styles.gridRow}>
          <QuickTile
            icon="clock"
            tone="lavender"
            title="Sueño"
            value={sleep.lastMinutes !== null ? formatDuration(sleep.lastMinutes) : 'Sin registro'}
            onPress={() => go('/sleep')}
          />
          <QuickTile icon="care" tone="yellow" title="Bienestar" value={`${wellness.goals} de ${DAILY_GOALS} metas`} onPress={() => go('/wellness')} />
        </View>
      </Appear>

      <Appear index={5} style={styles.actions}>
        <Button label="Hablar con BUDDY" icon="chat" onPress={() => go('/chat')} />
        <Button label="Emergencia" variant="danger" icon="shield" trailing="arrow" onPress={() => go('/modals/emergency')} />
      </Appear>

      <BottomSheet visible={menu} onClose={() => setMenu(false)} title="Menú">
        <View style={styles.menu}>
          {MENU.map((m) => (
            <ListItem
              key={m.title}
              icon={m.icon}
              title={m.title}
              onPress={() => {
                setMenu(false);
                go(m.href);
              }}
            />
          ))}
        </View>
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarBtn: { borderRadius: radius.pill },
  greeting: { gap: spacing.xs, marginTop: spacing.xs, marginBottom: spacing.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  demo: { marginLeft: 'auto' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexWrap: 'wrap' },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.slatePale, alignItems: 'center', justifyContent: 'center' },
  progressCard: { marginTop: spacing.sm, gap: spacing.sm },
  progressHead: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  periods: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs },
  feeling: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, boxShadow: '0px 5px 18px rgba(23, 74, 89, 0.08)' },
  faces: { flexDirection: 'row', gap: 3 },
  face: { width: 14, height: 14, borderRadius: 7 },
  grid: { gap: spacing.sm, marginTop: spacing.sm },
  gridRow: { flexDirection: 'row', gap: spacing.sm },
  quick: { flex: 1, minHeight: 96, borderRadius: radius.button, padding: spacing.sm, gap: spacing.xs },
  quickIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  menu: { gap: spacing.xs },
});
