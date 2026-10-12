import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInRight, useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet } from '@/components/feedback';
import { Segmented } from '@/components/forms';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { BuddyRobot } from '@/components/robot';
import { ScreenContainer } from '@/components/screen-container';
import { EmptyState } from '@/components/states';
import { PreviewSheetButton } from '@/features/elder/phone-preview';
import { doseText, scheduleTimes } from '@/domain/schedule';
import { describeDays } from '@/domain/time';
import { formatPhone } from '@/domain/validation';
import { strings } from '@/i18n';
import { useActiveElder, useRecords } from '@/state/data';
import { useRecentAny } from '@/state/recent';
import { radius, spacing, touch, type Domain } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatClock } from '@/utils/dates';

const R = strings.routine;
type Seg = 'meds' | 'water' | 'meals' | 'activities' | 'more';
const SEGS: Seg[] = ['meds', 'water', 'meals', 'activities', 'more'];

/** Rutina del adulto mayor: todo lo programado, la vista previa de su pantalla y la entrega del teléfono. */
export default function Routine() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const elder = useActiveElder();
  const params = useLocalSearchParams<{ seg?: string }>();
  const asSeg = (v?: string): Seg => (v && SEGS.includes(v as Seg) ? (v as Seg) : 'meds');
  const [seg, setSeg] = useState<Seg>(asSeg(params.seg));
  // "Ver en Rutina" desde BUDDY abre la pestaña donde quedó lo nuevo (estado derivado del parámetro, sin efecto).
  const [fromParam, setFromParam] = useState(params.seg);
  if (params.seg !== fromParam) {
    setFromParam(params.seg);
    if (params.seg) setSeg(asSeg(params.seg));
  }
  const [addSheet, setAddSheet] = useState(false);
  const meds = useRecords('medications');
  const water = useRecords('waterPlans')[0];
  const meals = useRecords('meals');
  const activities = useRecords('activities');
  const contacts = useRecords('contacts');
  const appointments = useRecords('appointments');
  const reminders = useRecords('reminders');

  if (!elder?.setupDone) {
    return (
      <ScreenContainer insideTabs>
        <EmptyState title={strings.summary.emptyTitle} text={strings.summary.emptyBody} action={{ label: strings.summary.steps.register, onPress: () => router.push('/setup') }} />
      </ScreenContainer>
    );
  }

  const go = (section: string) => router.push({ pathname: '/routine/[section]', params: { section } } as unknown as Href);
  // Entregar, probar como o mirar en vivo: todo en la pantalla "Entregar a [nombre]" (con flecha atrás).
  const handOff = () => router.push('/handoff' as Href);

  const fab = () => {
    if (seg === 'meds') return setAddSheet(true);
    go(seg === 'more' ? 'contacts' : seg);
  };

  return (
    <ScreenContainer insideTabs>
      <View style={s.head}>
        <AppText variant="h1">{R.title}</AppText>
        <AppText variant="secondary" color={t.c.muted}>
          {strings.summary.caring(elder.firstName)}
        </AppText>
      </View>

      <Card variant="gradient" domain="activity" radius={radius.hero} style={s.preview}>
        <BuddyRobot size={96} mood="wave" shadow={false} style={s.previewRobot} />
        <AppText variant="h3" color={t.domains.activity.text} style={s.previewTitle}>
          {R.preview(elder.firstName)}
        </AppText>
        <AppText variant="secondary" color={t.domains.activity.muted}>
          {R.handoffBody}
        </AppText>
        <View style={s.row}>
          <PreviewSheetButton />
          <Button label={R.handoff(elder.firstName)} icon="lock" size="md" style={s.grow} onPress={handOff} />
        </View>
      </Card>

      <Segmented
        label={R.title}
        value={seg}
        onChange={setSeg}
        options={[
          { key: 'meds', label: R.sections.medications },
          { key: 'water', label: R.sections.water },
          { key: 'meals', label: R.sections.meals },
          { key: 'activities', label: 'Metas' },
          { key: 'more', label: 'Más' },
        ]}
      />

      <View style={s.list}>
        {seg === 'meds' ? (
          meds.length ? (
            meds.map((m) => (
              <Row
                key={m.id}
                ids={[m.id]}
                domain="medication"
                icon="meds"
                title={m.name}
                detail={`${doseText(m)} · ${m.schedule.kind === 'times' ? scheduleTimes(m.schedule).map(formatClock).join(', ') : R.every(m.schedule.everyHours, formatClock(m.schedule.from))}${m.paused ? ` · ${R.paused}` : ''}`}
                onPress={() => router.push({ pathname: '/medication/[id]', params: { id: m.id } })}
              />
            ))
          ) : (
            <EmptyState title={R.emptyMeds} text={R.emptyMedsBody} mood="look" action={{ label: R.addMed, onPress: () => setAddSheet(true) }} />
          )
        ) : null}
        {seg === 'water' ? (
          <Row ids={water ? [water.id] : []} domain="water" icon="drop" title={water ? R.glasses(water.glasses) : R.sections.water} detail={water ? water.times.map(formatClock).join(' · ') : R.emptyGeneric} onPress={() => go('water')} />
        ) : null}
        {seg === 'meals' ? (
          meals.length ? (
            meals
              .slice()
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((m) => <Row key={m.id} ids={[m.id]} domain="food" icon="food" title={strings.setup.food.mealNames[m.kind]} detail={formatClock(m.time)} onPress={() => go('meals')} />)
          ) : (
            <EmptyState title={R.emptyGeneric} mood="look" action={{ label: R.add, onPress: () => go('meals') }} />
          )
        ) : null}
        {seg === 'activities' ? (
          activities.length ? (
            activities.map((a) => <Row key={a.id} ids={[a.id]} domain="activity" icon="walk" title={a.title} detail={`${formatClock(a.time)} · ${describeDays(a.days)}${a.minutes ? ` · ${a.minutes} min` : ''}`} onPress={() => go('activities')} />)
          ) : (
            <EmptyState title={R.emptyGeneric} mood="look" action={{ label: R.add, onPress: () => go('activities') }} />
          )
        ) : null}
        {seg === 'more' ? (
          <>
            <Row ids={contacts.map((c) => c.id)} domain="contact" icon="phone" title={R.sections.contacts} detail={contacts.length ? contacts.map((c) => `${c.name} (${formatPhone(c.phone)})`).join(', ') : R.emptyGeneric} onPress={() => go('contacts')} />
            <Row ids={[elder.id]} domain="mood" icon="smile" title={R.sections.checkin} detail={elder.checkinTime ? formatClock(elder.checkinTime) : R.noCheckin} onPress={() => go('checkin')} />
            <Row ids={appointments.map((a) => a.id)} domain="followUp" icon="calendar" title={R.sections.appointments} detail={appointments.length ? `${appointments.length}` : R.emptyGeneric} onPress={() => go('appointments')} />
            <Row ids={reminders.map((r) => r.id)} domain="contact" icon="bell" title={R.sections.reminders} detail={reminders.length ? reminders.map((r) => r.title).join(', ') : R.emptyGeneric} onPress={() => go('reminders')} />
          </>
        ) : null}
      </View>

      <PressableScale haptic onPress={fab} accessibilityLabel={seg === 'meds' ? R.addMed : R.add} style={s.fab}>
        <Icon name="plus" size={32} color={t.hc ? t.c.bg : '#FFFFFF'} strokeWidth={2.4} />
      </PressableScale>

      <BottomSheet visible={addSheet} onClose={() => setAddSheet(false)} title={R.addHow}>
        <Button label={R.manual} icon="pencil" variant="tonal" tone="coral" size="elder" onPress={() => { setAddSheet(false); router.push({ pathname: '/medication/new', params: { mode: 'manual' } }); }} />
        <Button label={R.scan} icon="camera" variant="tonal" tone="coral" size="elder" onPress={() => { setAddSheet(false); router.push('/medication/scan'); }} />
        <Button label={R.withBuddy} icon="sparkle" variant="tonal" tone="mint" size="elder" onPress={() => { setAddSheet(false); router.push('/buddy' as Href); }} />
      </BottomSheet>

    </ScreenContainer>
  );
}

function Row({ ids, domain, icon, title, detail, onPress }: { ids: string[]; domain: Domain; icon: IconName; title: string; detail: string; onPress: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const recent = useRecentAny(ids);
  return (
    <RecentFrame recent={recent}>
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}${recent ? `. ${R.isNew}` : ''}`}
      style={({ pressed }) => [s.rowItem, recent && { borderColor: t.hc ? t.c.text : t.c.mintStrong, borderWidth: 2 }, pressed && { opacity: 0.85 }]}
    >
      <View style={[s.bar, { backgroundColor: t.domains[domain].accent }]} />
      <View style={[s.iconBox, { backgroundColor: t.tones[t.domains[domain].tone].bg }]}>
        <Icon name={icon} color={t.tones[t.domains[domain].tone].fg} />
      </View>
      <View style={s.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color={t.c.muted} numberOfLines={2}>
          {detail}
        </AppText>
      </View>
      {recent ? (
        <View style={[s.newBadge, { backgroundColor: t.hc ? t.c.text : t.c.mintStrong }]}>
          <AppText variant="meta" color={t.hc ? t.c.bg : '#FFFFFF'}>
            {R.isNew}
          </AppText>
        </View>
      ) : null}
      <Icon name="chevron" color={t.c.muted} />
    </Pressable>
    </RecentFrame>
  );
}

/** Entrada animada (deslizar y aparecer) solo para lo recién agregado; solo transform y opacidad. */
function RecentFrame({ recent, children }: { recent: boolean; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return recent && !reduce ? <Animated.View entering={FadeInRight.springify().damping(16)}>{children}</Animated.View> : <>{children}</>;
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    grow: { flexGrow: 1, flexBasis: 150 },
    head: { paddingTop: spacing.sm, marginBottom: spacing.xl },
    preview: { gap: spacing.xs, padding: spacing.lg, marginBottom: spacing.lg, marginTop: spacing.md },
    previewRobot: { position: 'absolute', top: -66, right: -14 },
    previewTitle: { paddingRight: 90 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
    list: { gap: spacing.sm, marginTop: spacing.md },
    rowItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: touch.timeRow + 16,
      paddingVertical: spacing.sm,
      paddingRight: spacing.md,
      borderRadius: radius.button,
      backgroundColor: t.c.surface,
      overflow: 'hidden',
      ...t.hairline,
    },
    bar: { width: 5, alignSelf: 'stretch' },
    newBadge: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.pill },
    iconBox: { width: 44, height: 44, borderRadius: radius.icon, alignItems: 'center', justifyContent: 'center' },
    // En el flujo, al final del contenido: con la barra flotante (V2.4) un botón absoluto quedaba sobre la barra.
    fab: {
      alignSelf: 'flex-end',
      marginTop: spacing.lg,
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.hc ? t.c.text : t.c.primary,
      ...t.shadow.glow.petrol,
    },
  }),
);
