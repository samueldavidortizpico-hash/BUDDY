import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ConfirmDialog } from '@/components/feedback';
import { Icon, type IconName } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import type { Elder } from '@/domain/types';
import {
  useAlertsStep,
  useCheckinStep,
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

export type StepKey = 'who' | 'health' | 'food' | 'meds' | 'contacts' | 'routine' | 'checkin' | 'alerts' | 'access' | 'done';
/**
 * Registro RÁPIDO (V3.0, primeros cinco minutos del hijo): lo mínimo para el primer valor (persona, un medicamento, un
 * contacto y la hora del chequeo) y al Inicio. Lo demás (salud, alimentación, agua y actividades, avisos, acceso) queda
 * en "Primeros pasos" y se abre en el asistente COMPLETO (`?step=`), que es también el de editar a la persona.
 */
export const QUICK: StepKey[] = ['who', 'meds', 'contacts', 'checkin', 'done'];
export const FULL: StepKey[] = ['who', 'health', 'food', 'meds', 'contacts', 'routine', 'alerts', 'access', 'done'];
const STEP_ICON: Record<StepKey, IconName> = { who: 'user', health: 'heart', food: 'food', meds: 'meds', contacts: 'phone', routine: 'calendar', checkin: 'smile', alerts: 'bell', access: 'lock', done: 'check' };

/** Asistente de registro del adulto mayor. Se puede salir y retomar: cada paso guarda un borrador. */
export default function ElderSetup() {
  const router = useRouter();
  const params = useLocalSearchParams<{ elderId?: string; new?: string; step?: StepKey }>();
  const elders = useElders();
  const pendingElder = params.new ? null : (elders.find((e) => e.id === params.elderId) ?? elders.find((e) => !e.setupDone) ?? null);
  const [elderId, setElderId] = useState<string | null>(pendingElder?.id ?? null);
  const elder = elders.find((e) => e.id === elderId) ?? null;
  // Rápido al registrar por primera vez; completo al editar a alguien ya registrado o al abrir un paso concreto.
  const [order] = useState<StepKey[]>(() => (pendingElder?.setupDone || params.step ? FULL : QUICK));
  const TOTAL = order.length;
  const [step, setStep] = useState(() =>
    params.step && order.includes(params.step) ? order.indexOf(params.step) + 1 : pendingElder && !pendingElder.setupDone ? Math.min(Math.max(1, pendingElder.setupStep), TOTAL) : 1,
  );
  const key = order[step - 1];
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
            title={S.stepTitles[key]}
            subtitle={S.title(step, TOTAL)}
            onBack={() => (step > 1 ? goto(step - 1) : setLeaving(true))}
            onClose={() => setLeaving(true)}
          />
          <Progress step={step} total={TOTAL} />
        </>
      }
    >
      <View style={styles.robotRow}>
        <IconTile icon={STEP_ICON[key]} domain="activity" size={56} />
        <AppText variant="h2" style={styles.flex}>
          {key === 'who' ? S.who.title : key === 'done' && elder ? S.done.title(elder.firstName) : key === 'access' && elder ? S.access.title(elder.firstName) : S.stepTitles[key]}
        </AppText>
      </View>

      <Appear key={key}>
        {key === 'who' ? <WhoStep elder={elder} onNext={next} /> : null}
        {key === 'access' && elder ? <ElderAccessForm elder={elder} onDone={next} onLater={() => goto(step + 1)} /> : null}
        {key !== 'who' && key !== 'access' && key !== 'done' && elder ? <MiddleStep step={key} elder={elder} onNext={next} onSkip={() => goto(step + 1)} /> : null}
        {key === 'done' && elder ? <DoneStep elder={elder} onFinish={finish} /> : null}
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

function Progress({ step, total }: { step: number; total: number }) {
  const t = useTheme();
  return (
    <View style={styles.progress} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: step }}>
      {Array.from({ length: total }, (_, i) => (
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

function MiddleStep({ step, elder, onNext, onSkip }: { step: Exclude<StepKey, 'who' | 'access' | 'done'>; elder: Elder; onNext: () => void; onSkip: () => void }) {
  const Step = { health: HealthStep, food: FoodStep, meds: MedsStep, contacts: ContactsStep, routine: RoutineStep, checkin: CheckinStep, alerts: AlertsStep }[step];
  return <Step elder={elder} onNext={onNext} onSkip={onSkip} />;
}

type StepProps = { elder: Elder; onNext: () => void; onSkip: () => void };
const HealthStep = (p: StepProps) => <Wrap p={p} h={useHealthStep(p.elder)} />;
const FoodStep = (p: StepProps) => <Wrap p={p} h={useFoodStep(p.elder)} />;
const MedsStep = (p: StepProps) => <Wrap p={p} h={useMedsStep(p.elder)} />;
const ContactsStep = (p: StepProps) => <Wrap p={p} h={useContactsStep(p.elder)} />;
const RoutineStep = (p: StepProps) => <Wrap p={p} h={useRoutineStep(p.elder)} />;
const AlertsStep = (p: StepProps) => <Wrap p={p} h={useAlertsStep(p.elder)} />;
const CheckinStep = (p: StepProps) => <Wrap p={p} h={useCheckinStep(p.elder)} />;

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
  robotRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  frame: { gap: spacing.lg },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});

const useStyles = makeStyles(() =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    cell: { flexGrow: 1, flexBasis: 140, gap: spacing.xs, padding: spacing.md, borderRadius: radius.card },
  }),
);
