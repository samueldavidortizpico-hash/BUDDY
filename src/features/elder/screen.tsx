import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { Face } from '@/components/charts';
import { BottomSheet, useToast } from '@/components/feedback';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { type IconName } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { ScreenContainer } from '@/components/screen-container';
import { planNotifications } from '@/domain/notifications';
import { estimateStock } from '@/domain/stock';
import { applyPlan } from '@/infrastructure/notifications';
import { appointmentSeenKey, elderNow, reminderSeenKey, type ElderItem } from '@/domain/now';
import { directionsUrl } from '@/utils/maps';
import { dayDoses, doseText, effectiveTime, escalationOf } from '@/domain/schedule';
import { appointmentAddress, type Answer3 } from '@/domain/types';
import { db, useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { beat, doseActions, elderAnswers, notifyLog } from '@/state/care';
import { handoffActions } from '@/state/handoff';
import { useRecords, useUserId } from '@/state/data';
import { useSession } from '@/state/session';
import { useNow } from '@/hooks/use-now';
import { radius, spacing, touch, type Domain } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatClock, formatLongDate, greetingFor, toISODate } from '@/utils/dates';
import { successHaptic } from '@/utils/haptics';

const E = strings.elder;
const AP = strings.appointments;
const EMPTY_SEEN: string[] = [];

function domainOf(item: ElderItem): Domain {
  switch (item.kind) {
    case 'stock':
      return 'followUp';
    case 'dose':
      return item.item.status === 'unconfirmed' ? 'followUp' : 'medication';
    case 'checkin':
      return item.step === 'sleep' ? 'sleep' : 'mood';
    case 'meal':
      return 'food';
    case 'activity':
      return 'activity';
    case 'water':
      return 'water';
    case 'reminder':
      return 'contact';
    case 'appointment':
      return 'followUp';
    default:
      return 'activity';
  }
}

/**
 * Pantalla única del adulto mayor: una cosa a la vez, botones enormes y ayuda siempre a mano.
 * `preview`: la ve el cuidador en Rutina exactamente igual, pero sin poder tocar nada.
 */
/** Icono de la tarea del momento (V4.2: sin robot decorativo en la pantalla del adulto mayor). */
const ITEM_ICON: Record<ElderItem['kind'], IconName> = { stock: 'box', dose: 'meds', checkin: 'smile', meal: 'food', activity: 'walk', water: 'drop', reminder: 'bell', appointment: 'calendar', done: 'check' };

export function ElderScreen({ elderId, preview = false }: { elderId: string; preview?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const t = useTheme();
  const s = useStyles();
  const now = useNow(30_000);
  const { height } = useWindowDimensions();
  const userId = useUserId() ?? '';
  const caregiver = useSession((x) => (x.user?.role === 'elder' ? '' : (x.user?.name.split(' ')[0] ?? '')));
  const testMode = useDb((x) => x.handoff?.mode === 'test' && x.handoff.elderId === elderId);
  const elder = useDb((x) => (elderId ? x.elders[elderId] : undefined));
  const scope = { elderId };
  const meds = useRecords('medications', scope);
  const doses = useRecords('doses', scope);
  const meals = useRecords('meals', scope);
  const mealLogs = useRecords('mealLogs', scope);
  const activities = useRecords('activities', scope);
  const activityLogs = useRecords('activityLogs', scope);
  const checkins = useRecords('checkins', scope);
  const water = useRecords('waterPlans', scope)[0] ?? null;
  const waterEntries = useRecords('water', scope);
  const reminders = useRecords('reminders', scope);
  const appointments = useRecords('appointments', scope);
  const alerts = useRecords('alerts', scope);
  const contacts = useRecords('contacts', scope);
  const seen = useDb((x) => x.drafts[userId]?.['elder.seen'] as string[] | undefined) ?? EMPTY_SEEN;
  const [help, setHelp] = useState(false);
  const thanksTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = toISODate(now);

  useEffect(() => () => {
    if (thanksTimer.current) clearTimeout(thanksTimer.current);
  }, []);

  useEffect(() => {
    if (elderId && !preview) doseActions.sync(elderId, now);
  }, [elderId, now, preview]);

  // Señal de vida: la pantalla del adulto mayor está abierta (como mucho una cada 5 min).
  useEffect(() => {
    if (elderId && !preview) beat(elderId, 'app_open');
  }, [elderId, now, preview]);

  // NotificationScheduler: este teléfono programa sus avisos locales con los datos del perfil y los reprograma cuando
  // cambian (applyPlan no hace nada si el plan es el mismo). La vista previa del administrador no programa nada.
  const lowStock = useMemo(() => meds.filter((m) => ['low', 'out'].includes(estimateStock(m, today).level)), [meds, today]);
  useEffect(() => {
    if (preview || !elder) return;
    const plan = planNotifications({
      now: new Date(),
      meds,
      water,
      meals,
      checkinTime: reminders.some((r) => r.automation?.enabled && ['mood', 'sleep', 'emotional'].includes(r.automation.kind)) ? null : elder.checkinTime,
      appointments,
      automations: reminders.filter((r) => !!r.automation),
      lowStock,
      apptNoticeTime: elder.screen.apptNoticeTime,
      showMedName: elder.screen.showMedName,
      // Las tomas respondidas salen del plan: al reprogramar se cancelan sus avisos pendientes (aviso escalonado).
      doses: doses.filter((d) => d.date >= today),
      escalation: elder.screen,
    });
    // Qué aceptó el sistema del celular (aviso "entregado al sistema", que no es "visto" ni "tomado"). Sin permiso o en
    // web no se programa nada y la app lo dice; todo sigue visible dentro de BUDDY.
    applyPlan(plan)
      .then((r) => {
        notifyLog.record(elder.id, r.state, r.state === 'granted' ? plan.map((n) => n.key) : []);
        // Señal de vida con el permiso leído en este celular (detección de silencio).
        beat(elder.id, 'permissions', r.state);
      })
      .catch(() => undefined);
  }, [preview, elder, meds, water, meals, appointments, reminders, lowStock, doses, today]);

  const items = useMemo(() => dayDoses(meds, doses, today, now, escalationOf(elder?.screen).unconfirmedAfterMin), [meds, doses, today, now, elder?.screen]);
  const { now: item, later } = elderNow({
    now,
    doses: items,
    stockAlerts: alerts.filter((a) => (a.kind === 'stock_low' || a.kind === 'stock_out') && a.status === 'pending'),
    seenAlerts: seen,
    checkinTime: reminders.some((r) => r.automation?.enabled && ['mood', 'sleep', 'emotional'].includes(r.automation.kind)) ? null : (elder?.checkinTime ?? null),
    checkin: checkins.find((c) => c.date === today) ?? null,
    meals,
    mealLogs: mealLogs.filter((l) => l.date === today),
    activities,
    activityLogs: activityLogs.filter((l) => l.date === today),
    water,
    glassesToday: waterEntries.filter((w) => w.date === today).length,
    lastGlassAt: waterEntries.filter((w) => w.date === today).reduce<string | null>((m, w) => (!m || w.at > m ? w.at : m), null),
    reminders,
    seenReminders: seen,
    appointments,
    apptNoticeTime: elder?.screen.apptNoticeTime ?? '18:00',
  });

  const primary = contacts.find((c) => c.primary) ?? contacts[0];
  const permissionState = useDb((x) => (x.drafts[userId]?.[notifyLog.key(elderId)] as { state?: string } | undefined)?.state);
  const needsPermission = permissionState === 'denied' || permissionState === 'undetermined';
  const question = questionText(item);

  // Voz: lee la pregunta si el familiar la activó; el robot "habla" mientras suena.
  useEffect(() => {
    if (preview || !elder?.screen.voice || !question) return;
    Speech.stop();
    Speech.speak(question, { language: 'es-CO', rate: elder.screen.voiceRate });
    return () => {
      Speech.stop();
    };
  }, [question, elder?.screen.voice, elder?.screen.voiceRate, preview]);

  if (!elder) return null;

  const markSeen = (id: string) => {
    if (!preview) db.setDraft(userId, 'elder.seen', [...seen, id]);
  };
  const thanks = () => {
    if (preview) return;
    successHaptic();
    toast({ message: E.thanks, icon: 'check' });
  };
  const d = t.domains[domainOf(item)];

  return (
    <ScreenContainer
      header={
        testMode && !preview ? (
          <View style={s.testBanner} accessibilityRole="alert">
            <Icon name="play" color={t.hc ? t.c.bg : '#FFFFFF'} size={18} />
            <AppText variant="secondaryStrong" color={t.hc ? t.c.bg : '#FFFFFF'} style={s.flex}>
              {strings.handoff.testBanner}
            </AppText>
            <Button
              label={strings.handoff.testExit}
              accessibilityHint={strings.handoff.testExitHint}
              style={s.testExit}
              icon="close"
              size="sm"
              variant="white"
              onPress={() => {
                if (handoffActions.exitTest()) router.replace('/handoff');
              }}
            />
          </View>
        ) : undefined
      }
      footer={
        <View style={s.help} pointerEvents={preview ? 'none' : 'auto'}>
          <Button
            label={primary ? E.call(primary.name.split(' ')[0]) : E.callNoContact}
            variant="tonal"
            tone="mint"
            icon="phone"
            stacked
            disabled={preview || !primary}
            style={s.helpBtn}
            onPress={() => !preview && primary && Linking.openURL(`tel:${primary.phone.replace(/\s/g, '')}`)}
          />
          <Button
            label={E.help}
            variant="tonal"
            tone="red"
            icon="shield"
            stacked
            style={s.helpBtn}
            disabled={preview}
            onPress={() => {
              if (preview) return;
              elderAnswers.requestHelp(elder.id);
              setHelp(true);
            }}
          />
        </View>
      }
    >
      <View style={s.top}>
        <View style={s.flex}>
          <AppText variant="h1" accessibilityRole="header">{E.greeting(greetingFor(now), elder.firstName)}</AppText>
          <AppText variant="secondary" color={t.c.muted}>{formatLongDate(now)}</AppText>
        </View>
        {/* Visible y etiquetado (antes: gesto oculto de 2 s). Discreto para no competir con la tarea del momento. */}
        {preview ? null : <OptionsButton onPress={() => router.push('/elder/options' as never)} />}
      </View>

      {/* Solo informa: los permisos se cambian en Opciones > Permisos, nunca desde aquí. */}
      {elder.locationConsent === 'granted' ? (
        <View accessible accessibilityLabel={E.sharingLocation} style={[s.locationChip, t.hairline]}>
          <Icon name="location" color={t.ink.mint} size={16} />
          <AppText variant="caption" color={t.c.text}>{E.sharingLocation}</AppText>
        </View>
      ) : null}

      <Appear key={JSON.stringify(item).slice(0, 80)} style={preview ? s.noTouch : undefined}>
        <View style={[s.card, { minHeight: Math.max(400, height * 0.56) }, t.hc ? t.hairline : t.shadow.hero]} accessibilityLabel={E.now}>
          {t.hc ? null : <LinearGradient colors={[d.gradient[0], d.gradient[1]]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={[StyleSheet.absoluteFill, s.round]} />}
          <IconTile icon={ITEM_ICON[item.kind]} domain={domainOf(item)} size={72} />
          <View style={s.cardBody}>
            {item.kind === 'done' && !preview && needsPermission ? (
              <PermissionState onPress={() => router.push('/elder/permissions' as never)} />
            ) : (
              <ItemView item={item} caregiver={caregiver} onThanks={thanks} onSeen={markSeen} maxSnoozes={elder.screen.maxSnoozes} elderId={elder.id} preview={preview} />
            )}
          </View>
        </View>
      </Appear>

      <View style={s.later}>
        <AppText variant="h3">{E.later}</AppText>
        {later.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipsScroll}>
            {later.map((l, i) => (
              <View key={`${l.time}-${i}`} style={s.chip} accessible accessibilityLabel={`${formatClock(l.time)}, ${laterLabel(l.label, l.kind)}`}>
                <View style={[s.bar, { backgroundColor: t.domains[l.kind === 'dose' ? 'medication' : l.kind === 'meal' ? 'food' : l.kind === 'checkin' ? 'mood' : 'activity'].accent }]} />
                <View>
                  <AppText variant="bodyStrong" style={s.tabular}>
                    {formatClock(l.time)}
                  </AppText>
                  <AppText variant="secondary" color={t.c.muted}>
                    {laterLabel(l.label, l.kind)}
                  </AppText>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <AppText variant="secondary" color={t.c.muted}>
            {E.nothingLater}
          </AppText>
        )}
      </View>

      <BottomSheet visible={help} onClose={() => setHelp(false)} title={E.helpTitle}>
        <AppText variant="body">{E.helpBody}</AppText>
        {contacts.map((c) => (
          <Button key={c.id} label={E.call(c.name)} icon="phone" variant="tonal" tone="mint" size="elder" onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, '')}`)} />
        ))}
        <Button label={E.helpEmergency} icon="phone" variant="danger" size="elder" onPress={() => Linking.openURL('tel:123')} />
      </BottomSheet>
    </ScreenContainer>
  );
}

function laterLabel(label: string, kind: ElderItem['kind']) {
  if (kind === 'meal') return strings.setup.food.mealNames[label as keyof typeof strings.setup.food.mealNames] ?? label;
  if (kind === 'checkin') return 'Preguntas de BUDDY';
  return label;
}

function questionText(item: ElderItem): string | null {
  switch (item.kind) {
    case 'stock':
      return E.stockTitle(item.alert.detail.split(':')[0]);
    case 'dose':
      return E.doseTitle(item.item.medication.name);
    case 'checkin':
      return item.step === 'mood' ? E.moodQ : item.step === 'sleep' ? E.sleepQ : E.unwellQ;
    case 'meal':
      return E.mealQ[item.meal.kind];
    case 'activity':
      return item.activity.kind === 'walk' ? E.walkQ : E.activityQ(item.activity.title);
    case 'water':
      return E.waterQ;
    case 'reminder':
      return `${E.reminder}: ${item.reminder.title}`;
    case 'appointment':
      return (item.when === 'tomorrow' ? AP.elderTomorrow : AP.elderToday)(formatClock(item.appointment.time));
    default:
      return null;
  }
}

function ItemView({
  item,
  caregiver,
  onThanks,
  onSeen,
  maxSnoozes,
  elderId,
  preview,
}: {
  item: ElderItem;
  caregiver: string;
  onThanks: () => void;
  onSeen: (id: string) => void;
  maxSnoozes: number;
  elderId: string;
  preview: boolean;
}) {
  const t = useTheme();
  const s = useStyles();
  const d = t.domains[domainOf(item)];
  const title = (text: string) => (
    <AppText variant="h1" color={d.text} align="center" accessibilityRole="header">
      {text}
    </AppText>
  );

  switch (item.kind) {
    case 'stock':
      return (
        <View style={s.itemBody}>
          {title(questionText(item)!)}
          <AppText variant="body" color={d.muted}>
            {E.stockBody(caregiver || 'tu familiar')}
          </AppText>
          <Button label={E.ok} size="elder" disabled={preview} onPress={() => !preview && onSeen(item.alert.id)} />
        </View>
      );
    case 'dose': {
      const { dose, medication } = item.item;
      const snoozesLeft = dose.snoozeCount < maxSnoozes;
      return (
        <View style={s.itemBody}>
          {title(E.doseTitle(medication.name))}
          <AppText variant="heroL" color={d.text} align="center" style={s.tabular}>
            {formatClock(effectiveTime(dose))}
          </AppText>
          <AppText variant="h3" color={d.text} align="center">
            {doseText(medication)}
          </AppText>
          {medication.instructions ? (
            <AppText variant="body" color={d.muted} align="center">
              {medication.instructions}
            </AppText>
          ) : null}
          <View style={s.actions}>
            <Button label={E.taken} icon="check" size="elder" disabled={preview} onPress={() => { if (preview) return; doseActions.confirm(dose.id, 'elder'); onThanks(); }} />
            {snoozesLeft ? <Button label={E.snooze} icon="clock" variant="white" disabled={preview} onPress={() => !preview && doseActions.snooze(dose.id, 'elder')} /> : null}
            <Button label={E.notTaken} variant="ghost" disabled={preview} onPress={() => !preview && doseActions.skip(dose.id, 'elder')} />
          </View>
        </View>
      );
    }
    case 'checkin': {
      const step = item.step;
      const n = step === 'mood' ? 1 : step === 'sleep' ? 2 : 3;
      return (
        <View style={s.itemBody}>
          <AppText variant="captionStrong" color={d.muted}>
            {E.progress(n, 3)}
          </AppText>
          {title(questionText(item)!)}
          {step === 'unwell' ? (
            <View style={s.twoCol}>
              <Button label={E.yes} size="elder" variant="white" style={s.flex} disabled={preview} onPress={() => { if (preview) return; elderAnswers.checkin({ unwell: true }, elderId); onThanks(); }} />
              <Button label={E.no} size="elder" style={s.flex} disabled={preview} onPress={() => { if (preview) return; elderAnswers.checkin({ unwell: false }, elderId); onThanks(); }} />
            </View>
          ) : (
            <View style={s.faces}>
              {(['good', 'regular', 'bad'] as Answer3[]).map((a) => (
                <FaceButton key={a} kind={a} disabled={preview} onPress={() => { if (preview) return; elderAnswers.checkin({ [step]: a }, elderId); onThanks(); }} />
              ))}
            </View>
          )}
        </View>
      );
    }
    case 'meal':
      return (
        <View style={s.itemBody}>
          {title(E.mealQ[item.meal.kind])}
          <AppText variant="h3" color={d.muted}>
            {formatClock(item.meal.time)}
          </AppText>
          <Button label={E.yes} icon="check" size="elder" disabled={preview} onPress={() => { if (preview) return; elderAnswers.meal(item.meal.id, 'yes', elderId); onThanks(); }} />
          <Button label={E.notYet} variant="white" size="elder" disabled={preview} onPress={() => !preview && elderAnswers.meal(item.meal.id, 'no', elderId)} />
        </View>
      );
    case 'activity':
      return (
        <View style={s.itemBody}>
          {title(item.activity.kind === 'walk' ? E.walkQ : item.activity.title)}
          {item.activity.minutes ? (
            <AppText variant="h3" color={d.muted}>
              {`${item.activity.minutes} min · ${formatClock(item.activity.time)}`}
            </AppText>
          ) : null}
          <Button label={E.yes} icon="check" size="elder" disabled={preview} onPress={() => { if (preview) return; elderAnswers.activity(item.activity.id, true, elderId); onThanks(); }} />
          <Button label={E.notYet} variant="white" size="elder" disabled={preview} onPress={() => !preview && elderAnswers.activity(item.activity.id, false, elderId)} />
        </View>
      );
    case 'water':
      return (
        <View style={s.itemBody}>
          {title(E.waterQ)}
          <AppText variant="heroL" color={d.text} style={s.tabular}>
            {E.waterProgress(item.glasses, item.goal)}
          </AppText>
          <Button label={E.waterBtn} icon="drop" size="elder" variant={t.dark ? 'primary' : 'white'} disabled={preview} onPress={() => { if (preview) return; elderAnswers.addWater(elderId); onThanks(); }} />
        </View>
      );
    case 'appointment': {
      const ap = item.appointment;
      const where = appointmentAddress(ap);
      return (
        <View style={s.itemBody}>
          {title(questionText(item)!)}
          <AppText variant="h3" color={d.text}>
            {ap.title}
          </AppText>
          {where ? (
            <AppText variant="body" color={d.muted}>
              {AP.elderWhere(where)}
            </AppText>
          ) : null}
          <Button label={E.ok} size="elder" disabled={preview} onPress={() => !preview && onSeen(appointmentSeenKey(ap.id, item.when))} />
          {where ? <Button label={AP.directions} icon="location" variant="white" size="elder" disabled={preview} onPress={() => !preview && Linking.openURL(directionsUrl(where))} /> : null}
          {ap.phone ? <Button label={AP.callOffice} icon="phone" variant="ghost" size="elder" textColor={d.text} disabled={preview} onPress={() => !preview && Linking.openURL(`tel:${ap.phone}`)} /> : null}
        </View>
      );
    }
    case 'reminder':
      if (item.reminder.automation) {
        const automation = item.reminder.automation;
        const todayKey = toISODate(new Date());
        const answer = (value: string) => {
          if (preview) return;
          elderAnswers.automationResponse(item.reminder.id, value, elderId);
          onSeen(reminderSeenKey(item.reminder.id, todayKey));
          onThanks();
        };
        if (automation.kind === 'medication_alert') return (
          <View style={s.itemBody}>
            {title(item.reminder.title)}
            <AppText variant="body" color={d.muted}>Revisa en Rutina si la toma quedó confirmada. BUDDY no sabe si la persona tomó el medicamento.</AppText>
            <Button label={E.ok} size="elder" disabled={preview} onPress={() => !preview && onSeen(reminderSeenKey(item.reminder.id, todayKey))} />
          </View>
        );
        const options = automation.kind === 'mood' ? ['Excelente', 'Bien', 'Regular', 'Mal'] : automation.kind === 'sleep' ? ['Bien', 'Regular', 'Mal'] : automation.kind === 'emotional' ? [E.yes, E.no] : automation.kind === 'water' ? [E.waterBtn, E.notYet] : [E.yes, E.notYet];
        return (
          <View style={s.itemBody}>
            {title(item.reminder.title)}
            <View style={s.autoAnswers}>
              {options.map((value) => <Button key={value} label={value} size="elder" variant={value === 'Mal' ? 'white' : 'primary'} style={s.full} disabled={preview} onPress={() => answer(value)} />)}
            </View>
          </View>
        );
      }
      return (
        <View style={s.itemBody}>
          {title(item.reminder.title)}
          <Button label={E.ok} size="elder" disabled={preview} onPress={() => !preview && onSeen(reminderSeenKey(item.reminder.id, toISODate(new Date())))} />
        </View>
      );
    default:
      return (
        <View style={s.itemBody}>
          {title(E.done)}
          <AppText variant="body" color={d.muted} align="center">
            {E.doneBody}
          </AppText>
        </View>
      );
  }
}

/** "Opciones": engranaje en un círculo de 48 con la palabra debajo. Discreto, pero visible y con nombre. */
function OptionsButton({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={strings.adminAccess.button} hitSlop={6} style={s.optionsBtn}>
      <View style={s.optionsCircle}>
        <Icon name="settings" color={t.c.text} size={24} />
      </View>
      <AppText variant="caption" color={t.c.text} maxScale={1.3}>{strings.adminAccess.button}</AppText>
    </PressableScale>
  );
}

/** Nada pendiente y los avisos apagados: lo dice y lleva a Permisos (nunca falla en silencio). */
function PermissionState({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const d = t.domains.followUp;
  return (
    <View style={s.itemBody}>
      <AppText variant="h1" color={d.text} align="center" accessibilityRole="header">{E.permissionTitle}</AppText>
      <AppText variant="body" color={d.muted} align="center">{E.permissionBody}</AppText>
      <Button label={E.permissionAction} icon="bell" size="elder" onPress={onPress} />
    </View>
  );
}

function FaceButton({ kind, onPress, disabled }: { kind: Answer3; onPress: () => void; disabled: boolean }) {
  const t = useTheme();
  const s = useStyles();
  const bg = { good: t.c.mintPale, regular: t.c.yellowPale, bad: t.c.coralPale }[kind];
  return (
    <PressableScale haptic scaleTo={0.92} disabled={disabled} onPress={onPress} accessibilityLabel={strings.answers[kind]} style={s.faceBtn}>
      <View style={[s.faceCircle, { backgroundColor: t.hc ? t.c.bg : bg }, t.hairline]}>
        <Face kind={kind} size={72} />
      </View>
      <AppText variant="bodyStrong" align="center">{strings.answers[kind]}</AppText>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, flexShrink: 1, minWidth: 0 },
    noTouch: { pointerEvents: 'none' },
    tabular: { fontVariant: ['tabular-nums'] },
    round: { borderRadius: radius.hero },
    top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingTop: spacing.sm, marginBottom: spacing.md },
    locationChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', minHeight: 32, paddingHorizontal: spacing.sm, borderRadius: radius.pill, backgroundColor: t.c.surface, marginBottom: spacing.md },
    card: { borderRadius: radius.hero, padding: spacing.lg, paddingTop: spacing.xl, backgroundColor: t.c.surface, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    cardBody: { minWidth: 0, width: '100%', gap: spacing.sm },
    itemBody: { minWidth: 0, width: '100%', gap: spacing.md, alignItems: 'stretch' },
    actions: { width: '100%', gap: spacing.sm, marginTop: spacing.xs },
    optionsBtn: { alignItems: 'center', gap: 2, minWidth: 64, flexShrink: 0 },
    optionsCircle: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.surface, ...t.hairline, ...t.shadow.soft },
    twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    autoAnswers: { width: '100%', gap: spacing.xs },
    full: { width: '100%' },
    faces: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs },
    faceBtn: { alignItems: 'center', gap: spacing.xs, flexGrow: 1, flexBasis: 90 },
    faceCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
    later: { marginTop: spacing.section, gap: spacing.sm },
    chipsScroll: { marginHorizontal: -spacing.screen },
    chips: { paddingHorizontal: spacing.screen, gap: spacing.sm, paddingVertical: spacing.xs },
    chip: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, paddingRight: spacing.lg, borderRadius: radius.button, backgroundColor: t.c.surface, ...t.hairline, ...t.shadow.soft },
    bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
    help: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    // Dos líneas: "Volver a administrador" no cabe junto al texto a 360 px con la letra grande del adulto mayor.
    testBanner: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, padding: spacing.xs, paddingLeft: spacing.sm, marginBottom: spacing.xs, borderRadius: radius.card, backgroundColor: t.hc ? t.c.text : '#5B4BD0' },
    testExit: { flexBasis: '100%' },
    helpBtn: { flexGrow: 1, flexBasis: 150, minHeight: touch.elderMin },
  }),
);
