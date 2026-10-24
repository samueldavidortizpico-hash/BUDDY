import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet, ConfirmDialog, useToast } from '@/components/feedback';
import { Field, Stepper } from '@/components/forms';
import { Icon, type IconName } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { Row } from '@/components/row';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState } from '@/components/states';
import { doseAmbiguity } from '@/domain/dose-safety';
import { dayDoses, displayStatus, doseText, effectiveTime, scheduleTimes, stockUnit } from '@/domain/schedule';
import { estimateStock } from '@/domain/stock';
import { describeDays } from '@/domain/time';
import { parseDecimal } from '@/domain/validation';
import { strings } from '@/i18n';
import { doseActions, medicationActions } from '@/state/care';
import { useRecord, useRecords } from '@/state/data';
import { useDb } from '@/infrastructure/local/db';
import { useNow } from '@/hooks/use-now';
import { radius, spacing } from '@/theme';
import { makeStyles, useBigText, useTheme } from '@/theme/provider';
import { formatClock, formatRelativeDay, parseISODate, toISODate } from '@/utils/dates';

const M = strings.meds;

export default function MedicationDetail() {
  const router = useRouter();
  const toast = useToast();
  const t = useTheme();
  const s = useStyles();
  const now = useNow();
  const { id } = useLocalSearchParams<{ id: string }>();
  const med = useRecord('medications', id);
  const doses = useRecords('doses', { elderId: med?.elderId ?? null }).filter((d) => d.medicationId === id);
  const big = useBigText();
  const elderName = useDb((x) => (med?.elderId ? x.elders[med.elderId]?.firstName : undefined)) ?? strings.location.yourFamily;
  const [buy, setBuy] = useState(false);
  const [fix, setFix] = useState(false);
  const [del, setDel] = useState(false);
  const [packages, setPackages] = useState(1);
  const [loose, setLoose] = useState('');
  const [fixValue, setFixValue] = useState('');

  if (!med) {
    return (
      <ScreenContainer header={<ScreenHeader title={M.detail} fallback="/routine" />}>
        <EmptyState title="Este medicamento ya no existe" mood="think" action={{ label: strings.common.back, onPress: () => router.back() }} />
      </ScreenContainer>
    );
  }

  const today = toISODate(now);
  const est = estimateStock(med, today);
  // Las tomas retenidas por seguridad (R8) no se le piden al adulto mayor, pero el administrador sí las ve y las resuelve.
  const held = doses.filter((x) => x.date === today && x.safetyHold && !x.cancelledAt && (x.status === 'pending' || x.status === 'snoozed'));
  const todays = [...dayDoses([med], doses, today, now), ...held.map((dose) => ({ dose, medication: med, status: displayStatus(dose, now) }))].sort((a, b) => effectiveTime(a.dose).localeCompare(effectiveTime(b.dose)));
  const ambiguous = doseAmbiguity(doses, med.id, today);
  const history = doses.filter((d) => d.date < today && d.status !== 'pending').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 6);
  const schedule = med.schedule.kind === 'times' ? scheduleTimes(med.schedule).map(formatClock).join(' · ') : `Cada ${med.schedule.everyHours} h desde ${formatClock(med.schedule.from)}`;
  const runOut = est.runOutDate ? parseISODate(est.runOutDate) : null;

  return (
    <ScreenContainer
      header={
        <ScreenHeader
          title={med.name}
          subtitle={med.paused ? M.paused : M.forms[med.form]}
          fallback="/routine"
          right={<Button label={strings.common.edit} size="sm" variant="secondary" icon="pencil" onPress={() => router.push({ pathname: '/medication/new', params: { id: med.id } })} />}
        />
      }
    >
      <View style={s.stack}>
        {/* Datos: concentración, dosis, horas, días e instrucciones. */}
        <Card style={s.block}>
          {med.photoUri ? <Image source={{ uri: med.photoUri }} style={s.photo} contentFit="cover" accessibilityLabel={M.photo} /> : null}
          <View style={s.dataHead}>
            {big ? null : <IconTile icon="meds" domain="medication" size={56} />}
            <View style={s.flex}>
              <AppText variant="h3">{doseText(med)}</AppText>
              {med.strength ? <AppText variant="secondary" color={t.c.muted}>{`${M.strength}: ${med.strength}`}</AppText> : null}
            </View>
          </View>
          <Fact icon="clock" label={M.schedule} value={schedule} />
          <Fact icon="calendar" label={M.days} value={describeDays(med.schedule.days)} />
          {med.instructions ? <Fact icon="info" label={M.instructions} value={med.instructions} /> : null}
          {med.purpose ? <Fact icon="heart" label={M.purpose} value={med.purpose} /> : null}
        </Card>

        {/* Hoy: una fila por toma; "Marcar como tomado" baja debajo cuando no cabe. */}
        <View style={s.block}>
          <AppText variant="h2">{M.today}</AppText>
          {ambiguous ? (
            <Card variant="status" status="attention" style={s.r8} accessibilityLabel={strings.doseSafety.confirmBeforeAnotherDose(elderName)}>
              <Icon name="warning" color={t.status.attention.accent} />
              <AppText variant="secondaryStrong" color={t.status.attention.text} style={s.flex}>{strings.doseSafety.confirmBeforeAnotherDose(elderName)}</AppText>
            </Card>
          ) : null}
          <Card style={s.block}>
            {todays.length ? (
              todays.map((it, i) => (
                <Row
                  key={it.dose.id}
                  style={i > 0 ? s.divider : undefined}
                  action={it.status !== 'taken' && it.status !== 'skipped' ? <Button label={M.markTaken} size="sm" variant="tonal" tone="mint" icon="check" onPress={() => doseActions.confirm(it.dose.id, 'caregiver')} /> : null}
                >
                  <AppText variant="bodyStrong" style={s.tabular}>{formatClock(effectiveTime(it.dose))}</AppText>
                  <StatusChip status={it.dose.safetyHold && it.status !== 'taken' && it.status !== 'skipped' ? 'held' : it.status} />
                </Row>
              ))
            ) : (
              <AppText variant="secondary" color={t.c.muted}>{M.noDosesToday}</AppText>
            )}
          </Card>
        </View>

        {/* Existencias: número grande, estimado y dos acciones apiladas a ancho completo. */}
        <Card variant={est.level === 'low' || est.level === 'out' ? 'status' : 'white'} status="attention" style={s.block}>
          <AppText variant="h3">{M.stock}</AppText>
          {est.level === 'none' ? (
            <AppText variant="secondary">{M.noStock}</AppText>
          ) : (
            <>
              <AppText variant="heroL" style={s.tabular}>{`${String(med.unitsOnHand).replace('.', ',')} ${stockUnit(med, med.unitsOnHand ?? 0)}`}</AppText>
              <AppText variant="secondary">
                {est.level === 'out' ? M.outOfStock : est.daysLeft !== null && runOut ? M.estimate(est.daysLeft, `${runOut.getDate()}/${runOut.getMonth() + 1}`) : ''}
              </AppText>
            </>
          )}
          <View style={s.stackTight}>
            <Button label={M.purchase} icon="plus" variant="tonal" tone="yellow" onPress={() => setBuy(true)} />
            <Button label={M.correct} icon="pencil" variant="text" onPress={() => { setFixValue(med.unitsOnHand != null ? String(med.unitsOnHand) : ''); setFix(true); }} />
          </View>
        </Card>

        <Card style={s.block}>
          <AppText variant="h3" maxScale={1.5}>{M.pharmaTitle}</AppText>
          <AppText variant="secondary" color={t.c.muted}>
            {M.pharmaBody}
          </AppText>
        </Card>

        {history.length ? (
          <Card style={s.block}>
            <AppText variant="h3">{M.history}</AppText>
            {history.map((h) => {
              const icon: IconName = h.status === 'taken' ? 'check' : h.status === 'skipped' ? 'close' : 'clock';
              const color = h.status === 'taken' ? t.c.success : h.status === 'skipped' ? t.c.danger : t.c.muted;
              return (
                <View key={h.id} style={s.doseRow} accessible accessibilityLabel={`${formatRelativeDay(h.date, today)}, ${formatClock(h.time)}: ${M.statuses[h.status]}`}>
                  <View style={[s.histIcon, { borderColor: color }]}>
                    <Icon name={icon} color={color} size={18} strokeWidth={2.6} />
                  </View>
                  <AppText variant="secondary" style={s.flex}>{`${formatRelativeDay(h.date, today)} · ${formatClock(h.time)}`}</AppText>
                  <AppText variant="captionStrong" color={color}>{M.statuses[h.status]}</AppText>
                </View>
              );
            })}
          </Card>
        ) : null}

        <View style={s.stackTight}>
          <Button label={med.paused ? M.resume : M.pause} icon={med.paused ? 'play' : 'pause'} variant="ghost" onPress={() => medicationActions.pause(med.id, !med.paused)} />
          <Button label={strings.common.delete} icon="trash" variant="danger" onPress={() => setDel(true)} />
        </View>
      </View>

      <BottomSheet visible={buy} onClose={() => setBuy(false)} title={M.purchase}>
        {med.unitsPerPackage ? <Stepper label={M.packages} value={packages} min={0} max={20} onChange={setPackages} /> : null}
        <Field label={M.looseUnits} optional value={loose} onChangeText={setLoose} keyboardType="number-pad" />
        <Button
          label={strings.common.save}
          onPress={() => {
            const units = parseDecimal(loose || '0', 0, 10000) ?? 0;
            medicationActions.registerPurchase(med.id, { packages: med.unitsPerPackage ? packages : 0, units });
            setBuy(false);
            setLoose('');
            toast({ message: M.purchase, icon: 'check' });
          }}
        />
      </BottomSheet>

      <BottomSheet visible={fix} onClose={() => setFix(false)} title={M.correct}>
        <Field label={M.onHand} value={fixValue} onChangeText={setFixValue} keyboardType="decimal-pad" />
        <Button
          label={strings.common.save}
          onPress={() => {
            const v = fixValue.trim() ? parseDecimal(fixValue, 0, 100000) : null;
            medicationActions.setStock(med.id, v);
            setFix(false);
          }}
        />
      </BottomSheet>

      <ConfirmDialog
        visible={del}
        title={M.deleteTitle}
        body={M.deleteBody}
        confirmLabel={strings.common.delete}
        destructive
        onCancel={() => setDel(false)}
        onConfirm={() => {
          setDel(false);
          medicationActions.remove(med.id);
          toast({ message: M.deleted(med.name), icon: 'trash', action: { label: strings.common.undo, onPress: () => medicationActions.restore(med.id) } });
          router.back();
        }}
      />
    </ScreenContainer>
  );
}

/** Etiqueta y valor del medicamento, con icono. */
function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <View style={s.fact} accessible accessibilityLabel={`${label}: ${value}`}>
      <Icon name={icon} color={t.c.muted} size={20} />
      <View style={s.flex}>
        <AppText variant="caption" color={t.c.muted}>{label}</AppText>
        <AppText variant="secondaryStrong">{value}</AppText>
      </View>
    </View>
  );
}

/** Estado de una toma: color + palabra (nunca solo color). */
function StatusChip({ status }: { status: keyof typeof M.statuses | 'held' }) {
  const t = useTheme();
  const s = useStyles();
  const look = { taken: t.status.ok, skipped: t.status.action, unconfirmed: t.status.attention, held: t.status.attention, pending: t.status.none, snoozed: t.status.none }[status];
  return (
    <View style={[s.chip, { backgroundColor: look.bg, borderColor: look.border }]}>
      <AppText variant="captionStrong" color={look.text}>{status === 'held' ? M.held : M.statuses[status]}</AppText>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, flexShrink: 1, minWidth: 0 },
    tabular: { fontVariant: ['tabular-nums'] },
    stack: { gap: spacing.section },
    stackTight: { gap: spacing.sm },
    photo: { width: '100%', height: 160, borderRadius: radius.md },
    block: { gap: spacing.sm },
    dataHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
    fact: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, minHeight: 44, paddingTop: spacing.xs, borderTopWidth: t.borderWidth, borderTopColor: t.c.border },
    divider: { paddingTop: spacing.sm, borderTopWidth: t.borderWidth, borderTopColor: t.c.border },
    r8: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
    chip: { alignSelf: 'flex-start', minHeight: 28, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.pill, borderWidth: 1, marginTop: 2 },
    doseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
    histIcon: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  }),
);
