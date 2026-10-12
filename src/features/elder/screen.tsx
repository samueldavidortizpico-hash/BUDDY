import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { Face } from '@/components/charts';
import { BottomSheet, useToast } from '@/components/feedback';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { BuddyRobot, type RobotMood } from '@/components/robot';
import { ScreenContainer } from '@/components/screen-container';
import { AdminAccessSheet } from '@/features/elder/admin-access';
import { elderNow, type ElderItem } from '@/domain/now';
import { dayDoses, doseText, effectiveTime } from '@/domain/schedule';
import type { Answer3 } from '@/domain/types';
import { db, useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { doseActions, elderAnswers } from '@/state/care';
import { useRecords, useUserId } from '@/state/data';
import { useSession } from '@/state/session';
import { useNow } from '@/hooks/use-now';
import { radius, spacing, touch, type Domain } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatClock, formatLongDate, greetingFor, toISODate } from '@/utils/dates';
import { successHaptic } from '@/utils/haptics';

const E = strings.elder;
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
    default:
      return 'activity';
  }
}

/**
 * Pantalla única del adulto mayor: una cosa a la vez, botones enormes y ayuda siempre a mano.
 * `preview`: la ve el cuidador en Rutina exactamente igual, pero sin poder tocar nada.
 */
export function ElderScreen({ elderId, preview = false }: { elderId: string; preview?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const t = useTheme();
  const s = useStyles();
  const now = useNow(30_000);
  const { height } = useWindowDimensions();
  const userId = useUserId() ?? '';
  const caregiver = useSession((x) => (x.user?.role === 'elder' ? '' : (x.user?.name.split(' ')[0] ?? '')));
  const role = useSession((x) => x.user?.role ?? 'caregiver');
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
  const alerts = useRecords('alerts', scope);
  const contacts = useRecords('contacts', scope);
  const seen = useDb((x) => x.drafts[userId]?.['elder.seen'] as string[] | undefined) ?? EMPTY_SEEN;
  const [help, setHelp] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [mood, setMood] = useState<RobotMood>('wave');
  const thanksTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = toISODate(now);

  useEffect(() => () => {
    if (thanksTimer.current) clearTimeout(thanksTimer.current);
  }, []);

  useEffect(() => {
    if (elderId && !preview) doseActions.sync(elderId, now);
  }, [elderId, now, preview]);

  const items = useMemo(() => dayDoses(meds, doses, today, now), [meds, doses, today, now]);
  const { now: item, later } = elderNow({
    now,
    doses: items,
    stockAlerts: alerts.filter((a) => (a.kind === 'stock_low' || a.kind === 'stock_out') && a.status === 'pending'),
    seenAlerts: seen,
    checkinTime: elder?.checkinTime ?? null,
    checkin: checkins.find((c) => c.date === today) ?? null,
    meals,
    mealLogs: mealLogs.filter((l) => l.date === today),
    activities,
    activityLogs: activityLogs.filter((l) => l.date === today),
    water,
    glassesToday: waterEntries.filter((w) => w.date === today).length,
    reminders,
    seenReminders: seen,
  });

  const primary = contacts.find((c) => c.primary) ?? contacts[0];
  const question = questionText(item);

  // Voz: lee la pregunta si el familiar la activó; el robot "habla" mientras suena.
  useEffect(() => {
    if (preview || !elder?.screen.voice || !question) return;
    Speech.stop();
    Speech.speak(question, { language: 'es-CO', rate: elder.screen.voiceRate, onStart: () => setMood('talk'), onDone: () => setMood('idle'), onStopped: () => setMood('idle') });
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
    setMood('celebrate');
    toast({ message: E.thanks, icon: 'check' });
    if (thanksTimer.current) clearTimeout(thanksTimer.current);
    thanksTimer.current = setTimeout(() => setMood('idle'), 1600);
  };
  const d = t.domains[domainOf(item)];

  return (
    <ScreenContainer
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
          <AppText variant="eyebrow" color={t.ink.mint}>
            {formatLongDate(now)}
          </AppText>
          <Pressable
            disabled={preview}
            delayLongPress={2000}
            onLongPress={() => setAdmin(true)}
            accessibilityRole="header"
            accessibilityHint={preview ? undefined : strings.adminAccess.hint}
            accessibilityActions={preview ? undefined : [{ name: 'longpress', label: strings.adminAccess.enterAdmin }]}
            onAccessibilityAction={() => setAdmin(true)}
          >
            <AppText variant="h1" accessibilityRole="none">{E.greeting(greetingFor(now), elder.firstName)}</AppText>
          </Pressable>
        </View>
        {preview || role === 'elder' ? null : (
          <Pressable onPress={() => router.push('/elder/unlock')} accessibilityRole="button" accessibilityLabel={E.exit} hitSlop={6} style={s.lock}>
            <Icon name="lock" color={t.c.muted} size={22} />
          </Pressable>
        )}
      </View>

      <Appear key={JSON.stringify(item).slice(0, 80)} style={preview ? s.noTouch : undefined}>
        <View style={[s.card, { minHeight: Math.max(320, height * 0.42) }, t.hc ? t.hairline : t.shadow.hero]}>
          {t.hc ? null : <LinearGradient colors={[d.gradient[0], d.gradient[1]]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={[StyleSheet.absoluteFill, s.round]} />}
          <BuddyRobot size={120} mood={item.kind === 'done' ? 'celebrate' : item.kind === 'stock' || (item.kind === 'dose' && item.item.status === 'unconfirmed') ? 'worry' : mood} style={s.robot} accessibilityLabel={item.kind === 'stock' ? question ?? undefined : undefined} />
          <View style={s.cardBody}>
            <AppText variant="eyebrow" color={d.muted}>
              {E.now}
            </AppText>
            <ItemView item={item} caregiver={caregiver} onThanks={thanks} onSeen={markSeen} maxSnoozes={elder.screen.maxSnoozes} elderId={elder.id} preview={preview} />
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

      {preview ? null : <AdminAccessSheet visible={admin} onClose={() => setAdmin(false)} />}

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
    <AppText variant="display" color={d.text}>
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
          {title(medication.name)}
          <AppText variant="h3" color={d.text}>
            {doseText(medication)}
          </AppText>
          <AppText variant="heroXL" color={d.text} style={s.tabular}>
            {formatClock(effectiveTime(dose)).split(' ')[0]}
            <AppText variant="h3" color={d.muted}>{` ${formatClock(effectiveTime(dose)).split(' ').slice(1).join(' ')}`}</AppText>
          </AppText>
          {medication.instructions ? (
            <AppText variant="body" color={d.muted}>
              {medication.instructions}
            </AppText>
          ) : null}
          <Button label={E.taken} icon="check" size="elder" disabled={preview} onPress={() => { if (preview) return; doseActions.confirm(dose.id, 'elder'); onThanks(); }} />
          {snoozesLeft ? <Button label={E.snooze} icon="clock" variant="white" size="md" style={s.min56} disabled={preview} onPress={() => !preview && doseActions.snooze(dose.id, 'elder')} /> : null}
          <Button label={E.notTaken} variant="ghost" size="md" textColor={d.text} disabled={preview} onPress={() => !preview && doseActions.skip(dose.id, 'elder')} />
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
          <Button label={E.notYet} variant="white" size="md" style={s.min56} disabled={preview} onPress={() => !preview && elderAnswers.meal(item.meal.id, 'no', elderId)} />
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
          <Button label={E.notYet} variant="white" size="md" style={s.min56} disabled={preview} onPress={() => !preview && elderAnswers.activity(item.activity.id, false, elderId)} />
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
    case 'reminder':
      return (
        <View style={s.itemBody}>
          {title(item.reminder.title)}
          <Button label={E.ok} size="elder" disabled={preview} onPress={() => !preview && onSeen(item.reminder.id)} />
        </View>
      );
    default:
      return (
        <View style={s.itemBody}>
          {title(E.done)}
          <AppText variant="body" color={d.muted}>
            {E.doneBody}
          </AppText>
        </View>
      );
  }
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
      <AppText variant="bodyStrong">{strings.answers[kind]}</AppText>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    noTouch: { pointerEvents: 'none' },
    tabular: { fontVariant: ['tabular-nums'] },
    round: { borderRadius: radius.hero },
    top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingTop: spacing.sm, marginBottom: spacing.section + spacing.xxl },
    lock: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.surface, ...t.hairline },
    card: { borderRadius: radius.hero, padding: spacing.xl, backgroundColor: t.c.surface },
    robot: { position: 'absolute', top: -72, right: -18 },
    cardBody: { gap: spacing.sm },
    itemBody: { gap: spacing.md },
    min56: { minHeight: 56 },
    twoCol: { flexDirection: 'row', gap: spacing.sm },
    faces: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs },
    faceBtn: { alignItems: 'center', gap: spacing.xs, flexGrow: 1, flexBasis: 90 },
    faceCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
    later: { marginTop: spacing.section, gap: spacing.sm },
    chipsScroll: { marginHorizontal: -spacing.screen },
    chips: { paddingHorizontal: spacing.screen, gap: spacing.sm, paddingVertical: spacing.xs },
    chip: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, paddingRight: spacing.lg, borderRadius: radius.button, backgroundColor: t.c.surface, ...t.hairline, ...t.shadow.soft },
    bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
    help: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    helpBtn: { flexGrow: 1, flexBasis: 140, minHeight: touch.elderMin + 8 },
  }),
);
