import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ConfirmDialog, useToast } from '@/components/feedback';
import { Icon } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { FEATURES } from '@/config/features';
import { PLANS } from '@/config/plans';
import { hasRevenueCatPublicKey, revenueCatProvider, splitBenefits } from '@/domain/entitlements';
import { strings } from '@/i18n';
import { planActions, useEntitlementPlan, useRenewalDate } from '@/state/entitlements';
import { spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatLongDate } from '@/utils/dates';

const P = strings.plus;
const STORE_SUBSCRIPTIONS = Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions';

/** Ajustes > Plan (V4.3): plan actual, lo que incluye, renovación, cambiar o cancelar y restaurar compras. */
export function PlanSettings() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const toast = useToast();
  const current = useEntitlementPlan();
  const renewal = useRenewalDate();
  const [cancel, setCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const plan = PLANS[current];
  const { included, soon } = splitBenefits(plan);
  const paid = current !== 'free';

  const restore = async () => {
    if (!hasRevenueCatPublicKey()) return toast(P.restoreNotConfigured);
    setBusy(true);
    try {
      const restored = await revenueCatProvider.restore?.();
      toast(restored && restored !== 'free' ? P.restored(PLANS[restored].name) : P.nothingToRestore);
    } catch {
      toast(P.restoreError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.stack}>
      <Card radius={28} style={s.hero}>
        <View style={s.head}>
          <IconTile icon={plan.icon} domain={plan.domain} size={56} />
          <View style={s.flex}>
            <AppText variant="caption" color={t.c.muted}>{P.planNow}</AppText>
            <AppText variant="h1">{plan.name}</AppText>
          </View>
        </View>
        <AppText variant="secondary" color={t.c.muted}>
          {!paid ? P.freeForever : renewal ? P.renewsOn(formatLongDate(renewal), FEATURES.devTools) : P.activePlan}
        </AppText>
        <View style={s.benefits}>
          {included.map((b) => (
            <View key={b.text} style={s.benefit}>
              <Icon name="check" size={18} color={t.hc ? t.c.text : t.ink.success} strokeWidth={2.6} />
              <AppText variant="secondary" style={s.flex}>{b.text}</AppText>
            </View>
          ))}
          {/* V5.3: lo que el plan aún no entrega se nombra como pendiente, nunca como incluido. */}
          {soon.map((b) => (
            <View key={b.text} style={s.benefit} accessible accessibilityLabel={`${b.text}${P.soonSuffix}`}>
              <Icon name="clock" size={18} color={t.c.muted} strokeWidth={2.4} />
              <AppText variant="secondary" color={t.c.muted} style={s.flex}>{`${b.text}${P.soonSuffix}`}</AppText>
            </View>
          ))}
        </View>
      </Card>
      <Button label={paid ? P.changePlan : P.seePlans} icon="sparkle" onPress={() => router.push('/plus' as Href)} />
      {paid ? <Button label={P.cancelPlan} variant="danger" onPress={() => setCancel(true)} /> : null}
      <Button label={P.restore} variant="text" size="sm" loading={busy} onPress={restore} style={s.center} />
      <AppText variant="caption" color={t.c.muted}>{P.essentialFree}</AppText>
      <ConfirmDialog
        visible={cancel}
        title={P.cancelTitle(plan.name)}
        body={FEATURES.devTools ? P.cancelBodyTest : P.cancelBodyStore}
        confirmLabel={FEATURES.devTools ? P.cancelPlan : P.openStore}
        destructive
        onCancel={() => setCancel(false)}
        onConfirm={() => {
          setCancel(false);
          if (FEATURES.devTools) {
            planActions.setTestPlan('free');
            toast({ message: P.cancelledTest, icon: 'check' });
          } else void Linking.openURL(STORE_SUBSCRIPTIONS);
        }}
      />
    </View>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    stack: { gap: spacing.md },
    flex: { flex: 1, minWidth: 0 },
    hero: { gap: spacing.md },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    benefits: { gap: spacing.xs },
    benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
    center: { alignSelf: 'center' },
  }),
);
