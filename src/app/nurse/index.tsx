import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet, ConfirmDialog, useToast } from '@/components/feedback';
import { Chip, Stepper } from '@/components/forms';
import { IconTile } from '@/components/icon-tile';
import { ScreenContainer } from '@/components/screen-container';
import { EmptyState } from '@/components/states';
import { dayDoses, doseText, effectiveTime, isOpen } from '@/domain/schedule';
import type { Answer3, Medication } from '@/domain/types';
import { strings } from '@/i18n';
import { useActiveElder, useRecords } from '@/state/data';
import { doseActions, elderAnswers, medicationActions } from '@/state/care';
import { sessionActions, useSession } from '@/state/session';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatClock, formatLongDate, greetingFor, toISODate } from '@/utils/dates';
import { successHaptic } from '@/utils/haptics';

const N = strings.nurse;

/**
 * Inicio de la enfermera (V4.3, plan Salud): lo que le toca hoy con esa persona. Recibe los avisos, confirma las tomas
 * que administra (quedan firmadas como "enfermera" en el historial), registra cómo se siente y lleva las existencias.
 * No crea ni cambia medicamentos ni horarios: eso lo hace el administrador (permisos en domain/permissions.ts).
 */
export default function NurseHome() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const toast = useToast();
  const user = useSession((x) => x.user);
  const elder = useActiveElder();
  const meds = useRecords('medications');
  const doses = useRecords('doses');
  const alerts = useRecords('alerts');
  const checkins = useRecords('checkins');
  const [now] = useState(() => new Date());
  const [purchase, setPurchase] = useState<Medication | null>(null);
  const [packages, setPackages] = useState(1);
  const [leaving, setLeaving] = useState(false);
  const today = toISODate(now);

  useEffect(() => {
    if (elder) doseActions.sync(elder.id, new Date());
  }, [elder]);

  const items = useMemo(() => dayDoses(meds, doses, today, now), [meds, doses, today, now]);
  const pending = alerts.filter((a) => a.status === 'pending');
  const todayCheckin = checkins.find((c) => c.date === today);
  const stocked = meds.filter((m) => !m.deletedAt && m.unitsOnHand !== null);

  if (!elder || !user) {
    return (
      <ScreenContainer>
        <EmptyState icon="plus" title={N.noElderTitle} text={N.noElderBody} />
      </ScreenContainer>
    );
  }

  const answer = (patch: { mood?: Answer3; sleep?: Answer3 }) => {
    elderAnswers.checkin(patch, elder.id);
    successHaptic();
  };

  return (
    <ScreenContainer>
      <View style={s.top}>
        <View style={s.flex}>
          <AppText variant="h1" accessibilityRole="header">{N.greeting(greetingFor(now), user.name.split(' ')[0])}</AppText>
          <AppText variant="secondary" color={t.c.muted}>{N.caring(elder.firstName, formatLongDate(now))}</AppText>
        </View>
        <IconButton icon="logout" label={N.signOut} showLabel={false} onPress={() => setLeaving(true)} />
      </View>

      <View style={s.sections}>
        <Appear index={0}>
          <Card variant="status" status={pending.length ? 'attention' : 'ok'} style={s.stack}>
            <View style={s.row}>
              <IconTile icon={pending.length ? 'bell' : 'check'} domain={pending.length ? 'followUp' : 'activity'} />
              <AppText variant="h3" style={s.flex}>{pending.length ? N.alerts(pending.length) : N.noAlerts}</AppText>
            </View>
            {pending.slice(0, 3).map((a) => (
              <AppText key={a.id} variant="secondary">{`· ${a.title}`}</AppText>
            ))}
          </Card>
        </Appear>

        <Appear index={1} style={s.stack}>
          <AppText variant="h2">{N.dosesTitle}</AppText>
          {items.length ? (
            <Card padding={0} style={s.list}>
              {items.map(({ dose, medication, status }, i) => {
                const open = isOpen(status);
                // Pendiente: el botón va debajo a todo el ancho para que el nombre no se parta.
                return (
                  <View key={dose.id} style={[open ? s.doseOpen : s.doseRow, i > 0 && s.divider]}>
                    <View style={open ? undefined : s.flex}>
                      <AppText variant="captionStrong" color={t.c.muted}>{formatClock(effectiveTime(dose))}</AppText>
                      <AppText variant="bodyStrong">{medication.name}</AppText>
                      <AppText variant="caption" color={t.c.muted}>{doseText(medication)}</AppText>
                    </View>
                    {open ? (
                      <Button
                        label={N.administered}
                        icon="check"
                        size="sm"
                        onPress={() => {
                          doseActions.confirm(dose.id, 'nurse');
                          successHaptic();
                          toast({ message: N.administeredDone(medication.name), icon: 'check' });
                        }}
                      />
                    ) : (
                      <View style={s.donePill}>
                        <AppText variant="captionStrong" color={status === 'taken' ? t.ink.success : t.c.muted}>{N.status[status] ?? status}</AppText>
                      </View>
                    )}
                  </View>
                );
              })}
            </Card>
          ) : (
            <Card>
              <AppText variant="secondary" color={t.c.muted}>{N.noDoses}</AppText>
            </Card>
          )}
        </Appear>

        <Appear index={2} style={s.stack}>
          <AppText variant="h2">{N.checkinTitle(elder.firstName)}</AppText>
          <Card style={s.stack}>
            <AppText variant="secondaryStrong">{N.mood}</AppText>
            <View style={s.chips}>
              {(['good', 'regular', 'bad'] as Answer3[]).map((a) => (
                <Chip key={a} label={strings.answers[a]} selected={todayCheckin?.mood === a} onPress={() => answer({ mood: a })} />
              ))}
            </View>
            <AppText variant="secondaryStrong">{N.sleep}</AppText>
            <View style={s.chips}>
              {(['good', 'regular', 'bad'] as Answer3[]).map((a) => (
                <Chip key={a} label={strings.answers[a]} selected={todayCheckin?.sleep === a} onPress={() => answer({ sleep: a })} />
              ))}
            </View>
          </Card>
        </Appear>

        <Appear index={3} style={s.stack}>
          <AppText variant="h2">{N.stockTitle}</AppText>
          {stocked.length ? (
            <Card padding={0} style={s.list}>
              {stocked.map((m, i) => (
                <View key={m.id} style={[s.doseRow, i > 0 && s.divider]}>
                  <View style={s.flex}>
                    <AppText variant="bodyStrong">{m.name}</AppText>
                    <AppText variant="caption" color={t.c.muted}>{N.units(m.unitsOnHand ?? 0)}</AppText>
                  </View>
                  <Button label={N.registerPurchase} icon="plus" size="sm" variant="secondary" onPress={() => { setPackages(1); setPurchase(m); }} />
                </View>
              ))}
            </Card>
          ) : (
            <Card>
              <AppText variant="secondary" color={t.c.muted}>{N.noStock}</AppText>
            </Card>
          )}
        </Appear>
        <AppText variant="caption" color={t.c.muted}>{N.limits}</AppText>
      </View>

      <BottomSheet visible={!!purchase} onClose={() => setPurchase(null)} title={purchase ? N.purchaseTitle(purchase.name) : ''}>
        <Stepper label={N.packages} value={packages} onChange={setPackages} min={1} max={20} />
        <Button
          label={N.savePurchase}
          onPress={() => {
            if (!purchase) return;
            medicationActions.registerPurchase(purchase.id, { packages });
            successHaptic();
            toast({ message: N.purchaseDone, icon: 'check' });
            setPurchase(null);
          }}
        />
      </BottomSheet>
      <ConfirmDialog
        visible={leaving}
        title={N.signOutTitle}
        body={N.signOutBody}
        confirmLabel={N.signOut}
        onCancel={() => setLeaving(false)}
        onConfirm={async () => {
          setLeaving(false);
          await sessionActions.signOut();
          router.replace('/');
        }}
      />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingTop: spacing.sm },
    sections: { gap: spacing.section, marginTop: spacing.lg },
    stack: { gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    list: { overflow: 'hidden', borderRadius: radius.card },
    doseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 64, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    doseOpen: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    divider: { borderTopWidth: t.borderWidth, borderTopColor: t.c.border },
    donePill: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: t.c.surface2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  }),
);
