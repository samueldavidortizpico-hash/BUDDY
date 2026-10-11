import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { DoseStatusBadge, EmptyState } from '@/components/blocks';
import { BuddyAvatar } from '@/components/buddy';
import { Button, IconButton } from '@/components/button';
import { SuccessBurst, useToast } from '@/components/feedback';
import { Icon } from '@/components/icon';
import { PillVisual } from '@/components/pill-visual';
import { ScreenContainer } from '@/components/screen-container';
import { doseLabel, effectiveTime, medicationActions, strengthLabel, useDayPlan } from '@/features/medications/hooks';
import { useSettings } from '@/features/profile/hooks';
import { useNow } from '@/hooks/use-now';
import { ink, palette, radius, spacing } from '@/theme';
import { formatClock } from '@/utils/dates';
import { successHaptic, tapHaptic } from '@/utils/haptics';

export default function Reminder() {
  const router = useRouter();
  const toast = useToast();
  const now = useNow();
  const { userName } = useSettings();
  const { doseId } = useLocalSearchParams<{ doseId?: string }>();
  const plan = useDayPlan(now);
  const [done, setDone] = useState(false);

  const item = (doseId ? plan.items.find((i) => i.dose.id === doseId) : null) ?? (done ? null : plan.next);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  const top = (
    <View style={styles.top}>
      <View style={styles.brand}>
        <BuddyAvatar size="small" label="" />
        <AppText variant="h3">BUDDY</AppText>
      </View>
      <IconButton icon="close" label="Cerrar" onPress={close} />
    </View>
  );

  if (done) {
    const next = plan.next;
    return (
      <ScreenContainer gradient="reminder" header={top} contentStyle={styles.center}>
        <SuccessBurst
          title={`¡Muy bien, ${userName}!`}
          text={
            next
              ? `Tu toma quedó registrada. La próxima es ${next.medication.name} a las ${formatClock(effectiveTime(next.dose))}.`
              : 'Tu toma quedó registrada. No tienes más tomas pendientes hoy.'
          }
        >
          <Button label="Volver" onPress={close} />
        </SuccessBurst>
      </ScreenContainer>
    );
  }

  if (!item) {
    return (
      <ScreenContainer gradient="reminder" header={top}>
        <EmptyState icon="check" title="Sin tomas pendientes" text="No tienes recordatorios por ahora." action={{ label: 'Volver', onPress: close }} />
      </ScreenContainer>
    );
  }

  const m = item.medication;
  const time = formatClock(effectiveTime(item.dose));
  const answered = item.status === 'taken' || item.status === 'skipped';

  return (
    <ScreenContainer gradient="reminder" header={top} contentStyle={styles.content}>
      <View style={styles.copy}>
        <AppText variant="eyebrow" color={ink.mint} align="center">
          {`RECORDATORIO DE LAS ${time.toUpperCase()}`}
        </AppText>
        <AppText variant="display" color={ink.title} align="center">
          {item.status === 'unconfirmed' ? '¿Ya tomaste tu\nmedicamento?' : 'Es hora de tu\nmedicamento'}
        </AppText>
        <AppText variant="body" color={ink.muted} align="center">
          Cuidarte también es celebrar cada día.
        </AppText>
      </View>

      <View style={styles.illustration} accessible={false}>
        <View style={[styles.ring, styles.ringA]} />
        <View style={[styles.ring, styles.ringB]} />
        <Animated.View entering={ZoomIn.springify().damping(14)}>
          <PillVisual color={m.color} size="lg" />
        </Animated.View>
      </View>

      <View style={styles.med} accessible accessibilityLabel={`${m.name}, ${strengthLabel(m)}, ${doseLabel(m)}, a las ${time}`}>
        <AppText variant="h2" align="center">
          {m.name}
        </AppText>
        <AppText variant="body" color={ink.muted} align="center">
          {`${strengthLabel(m)} · ${doseLabel(m)}`}
        </AppText>
        <View style={styles.inline}>
          <Icon name="clock" size={18} color={ink.muted} />
          <AppText variant="secondaryStrong" color={ink.muted}>
            {time}
          </AppText>
          <DoseStatusBadge status={item.status} />
        </View>
        {m.instructions ? (
          <AppText variant="secondary" color={ink.muted} align="center">
            {m.instructions}
          </AppText>
        ) : null}
      </View>

      <View style={styles.actions}>
        {answered ? (
          <AppText variant="secondary" color={ink.muted} align="center">
            Ya respondiste esta toma. Puedes cambiar tu respuesta:
          </AppText>
        ) : null}
        <Button
          label="Ya lo tomé"
          icon="check"
          onPress={() => {
            medicationActions.confirm(item.dose.id);
            successHaptic();
            setDone(true);
          }}
        />
        <View style={styles.row}>
          <Button
            label="Posponer 10 min"
            variant="secondary"
            icon="clock"
            size="md"
            style={styles.half}
            onPress={() => {
              const to = medicationActions.snooze(item.dose.id);
              tapHaptic();
              toast({ message: `Pospuesto. Te lo recordamos a las ${formatClock(to ?? '')}.`, icon: 'clock' });
              close();
            }}
          />
          <Button
            label="No lo tomé"
            variant="ghost"
            size="md"
            style={styles.half}
            onPress={() => {
              medicationActions.skip(item.dose.id);
              tapHaptic();
              toast({ message: 'Registrado: no tomaste esta dosis. Si tienes dudas, consulta con tu médico.', icon: 'check' });
              close();
            }}
          />
        </View>
        <AppText variant="meta" color={ink.muted} align="center">
          “Ya lo tomé” es lo que tú confirmas; BUDDY no puede comprobarlo. Las notificaciones del teléfono llegarán próximamente.
        </AppText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  center: { flexGrow: 1, justifyContent: 'center' },
  content: { flexGrow: 1, gap: spacing.md },
  copy: { gap: spacing.xs, paddingTop: spacing.sm },
  illustration: { height: 200, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(94, 217, 181, 0.25)' },
  ringA: { width: 180, height: 180 },
  ringB: { width: 132, height: 132, backgroundColor: 'rgba(255, 255, 255, 0.65)', boxShadow: '0px 20px 45px rgba(23, 74, 89, 0.10)' },
  med: { alignItems: 'center', gap: spacing.xxs },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  actions: { marginTop: 'auto', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  half: { flexGrow: 1, flexBasis: 140 },
  bg: { backgroundColor: palette.warm },
});
