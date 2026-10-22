import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet, ConfirmDialog, useToast } from '@/components/feedback';
import { Field, Stepper } from '@/components/forms';
import { Icon } from '@/components/icon';
import { InlineBanner } from '@/components/inline-banner';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState } from '@/components/states';
import { dayDoses, doseText, effectiveTime, scheduleTimes, stockUnit } from '@/domain/schedule';
import { estimateStock } from '@/domain/stock';
import { describeDays } from '@/domain/time';
import { parseDecimal } from '@/domain/validation';
import { strings } from '@/i18n';
import { doseActions, medicationActions } from '@/state/care';
import { useRecord, useRecords } from '@/state/data';
import { useNow } from '@/hooks/use-now';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
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
  const todays = dayDoses([med], doses, today, now);
  const history = doses.filter((d) => d.date < today && d.status !== 'pending').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 6);
  const d = t.domains.medication;
  const schedule = med.schedule.kind === 'times' ? scheduleTimes(med.schedule).map(formatClock).join(' · ') : `Cada ${med.schedule.everyHours} h desde ${formatClock(med.schedule.from)}`;
  const runOut = est.runOutDate ? parseISODate(est.runOutDate) : null;

  return (
    <ScreenContainer
      header={
        <ScreenHeader
          title={M.detail}
          fallback="/routine"
          right={<Button label={strings.common.edit} size="sm" variant="ghost" icon="pencil" onPress={() => router.push({ pathname: '/medication/new', params: { id: med.id } })} />}
        />
      }
    >
      <View style={s.stack}>
        <Card variant="gradient" domain="medication" radius={radius.hero} elevation="hero" style={s.hero}>
          {med.photoUri ? <Image source={{ uri: med.photoUri }} style={s.photo} contentFit="cover" accessibilityLabel={M.photo} /> : null}
          <AppText variant="eyebrow" color={d.muted}>
            {med.paused ? M.paused : M.forms[med.form]}
          </AppText>
          <AppText variant="display" color={d.text}>
            {med.name}
          </AppText>
          <AppText variant="bodyStrong" color={d.text}>
            {[med.strength, doseText(med)].filter(Boolean).join(' · ')}
          </AppText>
          <AppText variant="secondary" color={d.muted}>
            {`${schedule} · ${describeDays(med.schedule.days)}`}
          </AppText>
          {med.instructions ? <AppText variant="secondary" color={d.muted}>{med.instructions}</AppText> : null}
          {med.purpose ? <AppText variant="secondary" color={d.muted}>{`${M.purpose}: ${med.purpose}`}</AppText> : null}
        </Card>

        <Card style={s.block}>
          <AppText variant="h3">{M.today}</AppText>
          {todays.length ? (
            todays.map((it) => (
              <InlineBanner key={it.dose.id} action={it.status !== 'taken' ? <Button label={M.markTaken} size="sm" variant="ghost" onPress={() => doseActions.confirm(it.dose.id, 'caregiver')} /> : <Icon name="check" color={t.ink.mint} />}>
                <AppText variant="bodyStrong" style={s.time}>
                  {formatClock(effectiveTime(it.dose))}
                </AppText>
                <AppText variant="secondary" color={it.status === 'unconfirmed' ? t.ink.yellow : t.c.muted} style={s.flex}>
                  {M.statuses[it.status]}
                </AppText>
              </InlineBanner>
            ))
          ) : (
            <AppText variant="secondary" color={t.c.muted}>
              {M.noDosesToday}
            </AppText>
          )}
        </Card>

        <Card variant="tint" tone={est.level === 'low' || est.level === 'out' ? 'yellow' : 'slate'} style={s.block}>
          <AppText variant="h3">{M.stock}</AppText>
          {est.level === 'none' ? (
            <AppText variant="secondary">{M.noStock}</AppText>
          ) : (
            <>
              <AppText variant="heroL" style={s.tabular}>{`${String(med.unitsOnHand).replace('.', ',')}`}</AppText>
              <AppText variant="secondaryStrong">{stockUnit(med, med.unitsOnHand ?? 0)}</AppText>
              <AppText variant="secondary">
                {est.level === 'out' ? M.outOfStock : est.daysLeft !== null && runOut ? M.estimate(est.daysLeft, `${runOut.getDate()}/${runOut.getMonth() + 1}`) : ''}
              </AppText>
            </>
          )}
          <View style={s.row}>
            <Button label={M.purchase} icon="plus" size="md" variant="tonal" tone="yellow" onPress={() => setBuy(true)} style={s.grow} />
            <Button label={M.correct} icon="pencil" size="md" variant="ghost" onPress={() => { setFixValue(med.unitsOnHand != null ? String(med.unitsOnHand) : ''); setFix(true); }} style={s.grow} />
          </View>
        </Card>

        <Card style={s.block}>
          <AppText variant="h3">{M.pharmaTitle}</AppText>
          <AppText variant="secondary" color={t.c.muted}>
            {M.pharmaBody}
          </AppText>
        </Card>

        {history.length ? (
          <Card style={s.block}>
            <AppText variant="h3">{M.history}</AppText>
            {history.map((h) => (
              <View key={h.id} style={s.doseRow}>
                <AppText variant="secondary" style={s.flex}>{`${formatRelativeDay(h.date, today)} · ${formatClock(h.time)}`}</AppText>
                <AppText variant="captionStrong" color={h.status === 'taken' ? t.ink.mint : t.ink.yellow}>
                  {M.statuses[h.status]}
                </AppText>
              </View>
            ))}
          </Card>
        ) : null}

        <Button label={med.paused ? M.resume : M.pause} icon={med.paused ? 'play' : 'pause'} variant="ghost" size="md" onPress={() => medicationActions.pause(med.id, !med.paused)} />
        <Button label={strings.common.delete} icon="trash" variant="danger" size="md" onPress={() => setDel(true)} />
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

const useStyles = makeStyles(() =>
  StyleSheet.create({
    flex: { flex: 1, flexShrink: 1, minWidth: 0 },
    grow: { flexGrow: 1, flexBasis: '100%', minWidth: 0 },
    tabular: { fontVariant: ['tabular-nums'] },
    stack: { gap: spacing.md },
    hero: { gap: spacing.xs, padding: spacing.xl },
    photo: { width: '100%', height: 140, borderRadius: radius.md, marginBottom: spacing.sm },
    block: { gap: spacing.sm },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    doseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
    time: { minWidth: 96, fontVariant: ['tabular-nums'] },
  }),
);
