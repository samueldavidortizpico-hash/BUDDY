import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ConfirmDialog } from '@/components/feedback';
import { Icon, type IconName } from '@/components/icon';
import { BuddyRobot } from '@/components/robot';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import type { Elder } from '@/domain/types';
import {
  useAlertsStep,
  useContactsStep,
  useFoodStep,
  useHealthStep,
  useMedsStep,
  useRoutineStep,
  useWhoStep,
  type StepHandle,
} from '@/features/setup/steps';
import { ElderAccessForm } from '@/features/setup/access';
import { strings } from '@/i18n';
import { activeElderId, elderActions } from '@/state/actions';
import { useElders, useRecords } from '@/state/data';
import { radius, spacing, type Tone } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatClock } from '@/utils/dates';
import { successHaptic } from '@/utils/haptics';

const S = strings.setup;
const TOTAL = 9;
const ACCESS = 8;
const ROBOT_MOOD = ['wave', 'think', 'idle', 'look', 'idle', 'wave', 'look', 'happy', 'celebrate'] as const;

/** Asistente de registro del adulto mayor (9 pasos, incluido su acceso). Se puede salir y retomar: cada paso guarda un borrador. */
export default function ElderSetup() {
  const router = useRouter();
  const params = useLocalSearchParams<{ elderId?: string; new?: string }>();
  const elders = useElders();
  const pendingElder = params.new ? null : (elders.find((e) => e.id === params.elderId) ?? elders.find((e) => !e.setupDone) ?? null);
  const [elderId, setElderId] = useState<string | null>(pendingElder?.id ?? null);
  const elder = elders.find((e) => e.id === elderId) ?? null;
  const [step, setStep] = useState(() => (pendingElder && !pendingElder.setupDone ? Math.min(pendingElder.setupStep, TOTAL) : 1));
  const [leaving, setLeaving] = useState(false);

  const exit = () => (router.canGoBack() ? router.back() : router.replace(elders.some((e) => e.setupDone) ? '/summary' : '/'));
  const goto = (n: number) => {
    setStep(n);
    if (elder && !elder.setupDone) elderActions.update(elder.id, { setupStep: n });
  };
  const next = () => {
    // El paso 1 crea a la persona y la deja activa: se toma de la base, no de la lista ya renderizada.
    const id = elder?.id ?? activeElderId();
    if (!elder) setElderId(id);
    setStep(Math.min(TOTAL, step + 1));
    if (id) elderActions.update(id, { setupStep: Math.min(TOTAL, step + 1) });
  };
  const finish = () => {
    if (elder) {
      elderActions.update(elder.id, { setupDone: true, setupStep: TOTAL });
      elderActions.setActive(elder.id);
    }
    successHaptic();
    router.replace('/summary');
  };

  return (
    <ScreenContainer
      keyboard
      header={
        <>
          <ScreenHeader
            title={S.stepNames[step - 1]}
            subtitle={S.title(step, TOTAL)}
            onBack={() => (step > 1 ? goto(step - 1) : setLeaving(true))}
            onClose={() => setLeaving(true)}
          />
          <Progress step={step} />
        </>
      }
    >
      <View style={styles.robotRow}>
        <BuddyRobot size={96} mood={ROBOT_MOOD[step - 1]} shadow={false} />
        <AppText variant="h2" style={styles.flex}>
          {step === 1 ? S.who.title : step === TOTAL && elder ? S.done.title(elder.firstName) : step === ACCESS && elder ? S.access.title(elder.firstName) : S.stepNames[step - 1]}
        </AppText>
      </View>

      <Appear key={step}>
        {step === 1 ? <WhoStep elder={elder} onNext={next} /> : null}
        {step === ACCESS && elder ? <ElderAccessForm elder={elder} onDone={next} onLater={() => goto(step + 1)} /> : null}
        {step > 1 && step < ACCESS && elder ? <MiddleStep step={step} elder={elder} onNext={next} onSkip={() => goto(step + 1)} /> : null}
        {step === TOTAL && elder ? <DoneStep elder={elder} onFinish={finish} /> : null}
      </Appear>

      <ConfirmDialog
        visible={leaving}
        title={S.leaveTitle}
        body={S.leaveBody}
        confirmLabel={S.leave}
        cancelLabel={strings.common.keepEditing}
        onConfirm={() => {
          setLeaving(false);
          exit();
        }}
        onCancel={() => setLeaving(false)}
      />
    </ScreenContainer>
  );
}

function Progress({ step }: { step: number }) {
  const t = useTheme();
  return (
    <View style={styles.progress} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: TOTAL, now: step }}>
      {Array.from({ length: TOTAL }, (_, i) => (
        <View key={i} style={[styles.seg, { backgroundColor: i < step ? (t.hc ? t.c.text : t.c.mintStrong) : t.c.surface2 }]} />
      ))}
    </View>
  );
}

function Frame({ handle, children, onNext, onSkip }: { handle: StepHandle; children: ReactNode; onNext: () => void; onSkip?: () => void }) {
  return (
    <View style={styles.frame}>
      {children}
      <View style={styles.actions}>
        <Button label={S.saveAndContinue} trailing="arrow" haptic onPress={() => handle.save() && onNext()} />
        {onSkip ? <Button label={S.skipStep} variant="ghost" size="md" onPress={onSkip} /> : null}
      </View>
    </View>
  );
}

function WhoStep({ elder, onNext }: { elder: Elder | null; onNext: () => void }) {
  const h = useWhoStep(elder);
  return (
    <Frame handle={h} onNext={onNext}>
      {h.view}
    </Frame>
  );
}

function MiddleStep({ step, elder, onNext, onSkip }: { step: number; elder: Elder; onNext: () => void; onSkip: () => void }) {
  const Step = [HealthStep, FoodStep, MedsStep, ContactsStep, RoutineStep, AlertsStep][step - 2];
  return <Step elder={elder} onNext={onNext} onSkip={onSkip} />;
}

type StepProps = { elder: Elder; onNext: () => void; onSkip: () => void };
const HealthStep = (p: StepProps) => <Wrap p={p} h={useHealthStep(p.elder)} />;
const FoodStep = (p: StepProps) => <Wrap p={p} h={useFoodStep(p.elder)} />;
const MedsStep = (p: StepProps) => <Wrap p={p} h={useMedsStep(p.elder)} />;
const ContactsStep = (p: StepProps) => <Wrap p={p} h={useContactsStep(p.elder)} />;
const RoutineStep = (p: StepProps) => <Wrap p={p} h={useRoutineStep(p.elder)} />;
const AlertsStep = (p: StepProps) => <Wrap p={p} h={useAlertsStep(p.elder)} />;

function Wrap({ p, h }: { p: StepProps; h: StepHandle & { view: ReactNode } }) {
  return (
    <Frame handle={h} onNext={p.onNext} onSkip={p.onSkip}>
      {h.view}
    </Frame>
  );
}

function DoneStep({ elder, onFinish }: { elder: Elder; onFinish: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const D = S.done;
  const meds = useRecords('medications', { elderId: elder.id });
  const water = useRecords('waterPlans', { elderId: elder.id })[0];
  const meals = useRecords('meals', { elderId: elder.id });
  const contacts = useRecords('contacts', { elderId: elder.id });
  const acts = useRecords('activities', { elderId: elder.id });
  const rows: { icon: IconName; tone: Tone; text: string; ok: boolean }[] = [
    { icon: 'meds', tone: 'coral', text: D.meds(meds.length), ok: meds.length > 0 },
    { icon: 'drop', tone: 'sky', text: D.water(water?.glasses ?? 0), ok: !!water },
    { icon: 'food', tone: 'yellow', text: D.meals(meals.length), ok: meals.length > 0 },
    { icon: 'phone', tone: 'lavender', text: D.contacts(contacts.length), ok: contacts.length > 0 },
    { icon: 'smile', tone: 'mint', text: elder.checkinTime ? D.checkin(formatClock(elder.checkinTime)) : S.routine.checkin, ok: !!elder.checkinTime },
    { icon: 'walk', tone: 'mint', text: D.activities(acts.length), ok: acts.length > 0 },
  ];
  return (
    <View style={styles.frame}>
      <AppText variant="body" color={t.c.muted}>
        {D.body}
      </AppText>
      <View style={s.grid}>
        {rows.map((r) => (
          <Card key={r.text} variant="tint" tone={r.ok ? r.tone : 'slate'} style={s.cell} elevation="none">
            <Icon name={r.icon} color={r.ok ? t.tones[r.tone].fg : t.c.muted} size={26} />
            <AppText variant="secondaryStrong">{r.text}</AppText>
            {!r.ok ? (
              <AppText variant="caption" color={t.c.muted}>
                {strings.summary.firstSteps}
              </AppText>
            ) : null}
          </Card>
        ))}
      </View>
      <Button label={D.go} variant="coral" trailing="arrow" haptic onPress={onFinish} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: { flexDirection: 'row', gap: 4, paddingBottom: spacing.sm },
  seg: { flex: 1, height: 6, borderRadius: 3 },
  robotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm, marginLeft: -spacing.lg },
  frame: { gap: spacing.lg },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});

const useStyles = makeStyles(() =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    cell: { flexGrow: 1, flexBasis: 140, gap: spacing.xs, padding: spacing.md, borderRadius: radius.card },
  }),
);
