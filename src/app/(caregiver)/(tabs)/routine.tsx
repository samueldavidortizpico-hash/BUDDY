import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight, useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { BottomSheet } from '@/components/feedback';
import { Segmented } from '@/components/forms';
import { Icon, type IconName } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenContainer } from '@/components/screen-container';
import { EmptyState } from '@/components/states';
import { doseText, scheduleTimes } from '@/domain/schedule';
import { formatPhone } from '@/domain/validation';
import { strings } from '@/i18n';
import { useActiveElder, useRecords } from '@/state/data';
import { useRecentAny } from '@/state/recent';
import { motion, radius, spacing, touch, type Domain, type Tone } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatClock } from '@/utils/dates';

const R = strings.routine;
type Seg = 'meds' | 'water' | 'questions' | 'appointments' | 'contacts';
const SEGS: Seg[] = ['meds', 'water', 'questions', 'appointments', 'contacts'];
/** V5: "Agregar" toma el color de la sección (medicamentos coral, agua azul, preguntas lavanda, citas ámbar, contactos menta). */
const SEG_TONE: Record<Seg, Tone> = { meds: 'coral', water: 'sky', questions: 'lavender', appointments: 'yellow', contacts: 'mint' };

/** Rutina del adulto mayor: todo lo programado, la vista previa de su pantalla y la entrega del teléfono. */
export default function Routine() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const elder = useActiveElder();
  const params = useLocalSearchParams<{ seg?: string }>();
  // Enlaces anteriores a V4 ("Ver en Rutina" del chat): comidas y metas viven en Preguntas; "Más", en Contactos.
  const LEGACY: Record<string, Seg> = { meals: 'questions', activities: 'questions', more: 'contacts' };
  const asSeg = (v?: string): Seg => (v && SEGS.includes(v as Seg) ? (v as Seg) : v && LEGACY[v] ? LEGACY[v] : 'meds');
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

  const fab = () => {
    if (seg === 'meds') return setAddSheet(true);
    go(seg === 'questions' ? 'reminders' : seg);
  };

  return (
    <ScreenContainer insideTabs>
      <View style={s.head}>
        <AppText variant="h1">{R.title}</AppText>
        <AppText variant="secondary" color={t.c.muted}>
          {strings.summary.caring(elder.firstName)}
        </AppText>
      </View>

      <Segmented
        label={R.title}
        value={seg}
        onChange={setSeg}
        scroll
        options={[
          { key: 'meds', label: R.sections.medications },
          { key: 'water', label: R.sections.water },
          { key: 'questions', label: R.sections.questions },
          { key: 'appointments', label: R.sections.appointments },
          { key: 'contacts', label: R.sections.contacts },
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
                detail={`${doseText(m)}${m.paused ? ` · ${R.paused}` : ''}`}
                times={m.schedule.kind === 'times' ? scheduleTimes(m.schedule) : []}
                onPress={() => router.push({ pathname: '/medication/[id]', params: { id: m.id } })}
              />
            ))
          ) : (
            <EmptyState title={R.emptyMeds} text={R.emptyMedsBody} action={{ label: R.addMed, onPress: () => setAddSheet(true) }} />
          )
        ) : null}
        {seg === 'water' ? (
          water ? (
            <Row ids={[water.id]} domain="water" icon="drop" title={R.glasses(water.glasses)} detail={R.sections.water} times={water.times} onPress={() => go('water')} />
          ) : (
            <EmptyState title={R.emptyGeneric} action={{ label: R.add, onPress: () => go('water') }} />
          )
        ) : null}
        {seg === 'questions' ? (
          <>
            {reminders.filter((r) => r.automation).map((r) => (
              <Row key={r.id} ids={[r.id]} domain="mood" icon="chat" title={r.title} detail={r.automation?.enabled ? R.active : R.pausedQuestion} times={[r.time]} onPress={() => router.push('/routine/automations' as Href)} />
            ))}
            <Row ids={[elder.id]} domain="mood" icon="smile" title={R.sections.checkin} detail={elder.checkinTime ? R.daily : R.noCheckin} times={elder.checkinTime ? [elder.checkinTime] : []} onPress={() => go('checkin')} />
            <Row ids={meals.map((m) => m.id)} domain="food" icon="food" title={R.sections.meals} detail={meals.length ? meals.map((m) => strings.setup.food.mealNames[m.kind]).join(', ') : R.emptyGeneric} times={meals.map((m) => m.time).sort()} onPress={() => go('meals')} />
            <Row ids={activities.map((a) => a.id)} domain="activity" icon="walk" title={R.sections.activities} detail={activities.length ? activities.map((a) => a.title).join(', ') : R.emptyGeneric} times={activities.map((a) => a.time).sort()} onPress={() => go('activities')} />
            <Row ids={reminders.filter((r) => !r.automation).map((r) => r.id)} domain="contact" icon="bell" title={R.sections.reminders} detail={reminders.some((r) => !r.automation) ? reminders.filter((r) => !r.automation).map((r) => r.title).join(', ') : R.emptyGeneric} onPress={() => go('reminders')} />
          </>
        ) : null}
        {seg === 'appointments' ? (
          appointments.length ? (
            appointments.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((a) => (
              <Row key={a.id} ids={[a.id]} domain="followUp" icon="calendar" title={a.title} detail={a.date} times={[a.time]} onPress={() => go('appointments')} />
            ))
          ) : (
            <EmptyState title={R.emptyGeneric} action={{ label: R.add, onPress: () => go('appointments') }} />
          )
        ) : null}
        {seg === 'contacts' ? (
          contacts.length ? (
            contacts.map((c) => (
              <Row key={c.id} ids={[c.id]} domain="contact" icon="phone" title={c.name} detail={`${c.relation ? `${c.relation} · ` : ''}${formatPhone(c.phone)}${c.primary ? ` · ${R.primary}` : ''}`} onPress={() => go('contacts')} />
            ))
          ) : (
            <EmptyState title={R.emptyGeneric} action={{ label: R.add, onPress: () => go('contacts') }} />
          )
        ) : null}
      </View>

      {/* "+ Agregar" con palabra: un "+" solo no dice qué hace. Secundario: no pesa más que la lista. */}
      <Button label={seg === 'meds' ? R.addMed : R.add} icon="plus" variant="solid" tone={SEG_TONE[seg]} haptic="light" onPress={fab} style={s.add} />

      <BottomSheet visible={addSheet} onClose={() => setAddSheet(false)} title={R.addHow}>
        <Button label={R.manual} icon="pencil" variant="tonal" tone="coral" size="elder" onPress={() => { setAddSheet(false); router.push({ pathname: '/medication/new', params: { mode: 'manual' } }); }} />
        <Button label={R.scan} icon="camera" variant="tonal" tone="coral" size="elder" onPress={() => { setAddSheet(false); router.push('/medication/scan'); }} />
        <Button label={R.withBuddy} icon="sparkle" variant="tonal" tone="mint" size="elder" onPress={() => { setAddSheet(false); router.push('/buddy' as Href); }} />
      </BottomSheet>

    </ScreenContainer>
  );
}

function Row({ ids, domain, icon, title, detail, times = [], onPress }: { ids: string[]; domain: Domain; icon: IconName; title: string; detail: string; times?: string[]; onPress: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const recent = useRecentAny(ids);
  return (
    <RecentFrame recent={recent}>
    <PressableScale
      onPress={onPress}
      scaleTo={motion.pressScaleCard}
      dim={0.04}
      accessibilityLabel={`${title}. ${detail}${recent ? `. ${R.isNew}` : ''}`}
      style={[s.rowItem, recent && { borderColor: t.hc ? t.c.text : t.c.mintStrong, borderWidth: 2 }]}
    >
      {/* V5: franja del color del dominio en el borde: la lista se lee por colores sin teñir toda la fila. */}
      {t.hc ? null : <View pointerEvents="none" style={[s.rowAccent, { backgroundColor: t.domains[domain].accent }]} />}
      <IconTile icon={icon} domain={domain} />
      <View style={s.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color={t.c.muted} numberOfLines={2}>
          {detail}
        </AppText>
        {times.length ? (
          <View style={s.times}>
            {times.slice(0, 6).map((time, i) => (
              <View key={`${time}-${i}`} style={[s.timeChip, { backgroundColor: t.tones[t.domains[domain].tone].bg }]}>
                <AppText variant="captionStrong" color={t.tones[t.domains[domain].tone].fg} style={s.tabular}>{formatClock(time)}</AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {recent ? (
        <View style={[s.newBadge, { backgroundColor: t.hc ? t.c.text : t.c.mintStrong }]}>
          <AppText variant="meta" color={t.hc ? t.c.bg : '#FFFFFF'}>
            {R.isNew}
          </AppText>
        </View>
      ) : null}
      <Icon name="chevron" color={t.c.tertiary} size={20} />
    </PressableScale>
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
    flex: { flex: 1, minWidth: 0 },
    tabular: { fontVariant: ['tabular-nums'] },
    head: { paddingTop: spacing.sm, marginBottom: spacing.lg },
    times: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs, marginTop: spacing.xxs },
    timeChip: { minHeight: 26, justifyContent: 'center', paddingHorizontal: spacing.xs, borderRadius: radius.pill },
    list: { gap: spacing.sm, marginTop: spacing.md },
    rowItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: touch.timeRow + 16,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.card,
      backgroundColor: t.c.surface,
      overflow: 'hidden',
      ...t.hairline,
      ...t.shadow.soft,
    },
    rowAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
    newBadge: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.pill },
    // En el flujo, al final del contenido: con la barra flotante (V2.4) un botón absoluto quedaba sobre la barra.
    add: { marginTop: spacing.lg },
  }),
);
