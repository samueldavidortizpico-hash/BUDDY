import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { CountUp } from '@/components/count-up';
import { useToast } from '@/components/feedback';
import { Segmented } from '@/components/forms';
import { Icon } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { PressableScale } from '@/components/pressable-scale';
import { BuddyRobot } from '@/components/robot';
import { FEATURES } from '@/config/features';
import { COMPARISON, formatCOP, PLAN_ORDER, PLANS, RECOMMENDED_PLAN, yearlySavings, type BillingPeriod, type PaidPlanId, type PlanId } from '@/config/plans';
import { hasRevenueCatPublicKey, revenueCatProvider } from '@/domain/entitlements';
import { strings } from '@/i18n';
import { planActions, useEntitlementPlan } from '@/state/entitlements';
import { motion, radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { successHaptic } from '@/utils/haptics';

const PAID: PaidPlanId[] = ['plus', 'health', 'family'];
const P = strings.plus;

/**
 * BUDDY Plus (V4.3): invita a elegir un plan sin presión engañosa (sin contadores ni precios tachados inventados).
 * Encabezado con el degradado Plus, Mensual o Anual, tres planes con el recomendado destacado, comparación, confianza y
 * un botón fijo con el plan y su precio. No cobra: en desarrollo activa un plan de prueba; con RevenueCat configurado
 * compra por la tienda; sin él lo dice.
 */
export default function BuddyPlus() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ plan?: string }>();
  const current = useEntitlementPlan();
  const initial = (PAID as string[]).includes(params.plan ?? '') ? (params.plan as PaidPlanId) : RECOMMENDED_PLAN;
  const [selected, setSelected] = useState<PaidPlanId>(initial);
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const [compare, setCompare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const plan = PLANS[selected];
  const price = period === 'monthly' ? plan.monthly : plan.yearly;
  const isCurrent = current === selected;
  const ctaLabel = isCurrent ? P.isCurrent : price === null ? P.yearlyTbd : P.continueWith(plan.name, formatCOP(price), period === 'monthly' ? P.perMonth : P.perYear);

  // Plan de prueba: el check del botón se ve 700 ms y luego el aviso; se cancela si la pantalla se cierra antes.
  const planName = plan.name;
  useEffect(() => {
    if (!done || !FEATURES.devTools) return;
    const id = setTimeout(() => {
      setDone(false);
      toast({ message: P.testActivated(planName), icon: 'check' });
    }, 700);
    return () => clearTimeout(id);
  }, [done, planName, toast]);

  const choose = async () => {
    setMessage(null);
    if (FEATURES.devTools) {
      planActions.setTestPlan(selected);
      successHaptic();
      setDone(true);
      return;
    }
    if (!hasRevenueCatPublicKey()) return setMessage(P.notConfigured);
    setBusy(true);
    const result = await revenueCatProvider.purchase!(selected, period);
    setBusy(false);
    if (result.ok) {
      successHaptic();
      setDone(true);
    } else setMessage(result.reason === 'cancelled' ? null : P.purchaseError[result.reason]);
  };

  const restore = async () => {
    if (!hasRevenueCatPublicKey()) return setMessage(P.restoreNotConfigured);
    setBusy(true);
    try {
      const restored = await revenueCatProvider.restore?.();
      setMessage(restored && restored !== 'free' ? P.restored(PLANS[restored].name) : P.nothingToRestore);
    } catch {
      setMessage(P.restoreError);
    } finally {
      setBusy(false);
    }
  };

  const savings = PAID.map((p) => yearlySavings(PLANS[p])).find((x) => x !== null) ?? null;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 200 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
          {t.hc ? null : <LinearGradient colors={t.gradients.plus} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
          {t.hc ? null : <View style={s.lavenderGlow} />}
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/summary'))} accessibilityRole="button" accessibilityLabel={strings.common.back} hitSlop={8} style={s.back}>
            <Icon name="back" color={t.hc ? t.c.text : '#FFFFFF'} size={22} />
          </Pressable>
          <View style={s.heroRow}>
            <View style={s.flex}>
              <AppText variant="display" color={t.hc ? t.c.text : '#FFFFFF'} accessibilityRole="header">
                {P.title}
              </AppText>
              <AppText variant="body" color={t.hc ? t.c.text : 'rgba(255,255,255,0.88)'} style={s.heroBody}>
                {P.body}
              </AppText>
            </View>
            <BuddyRobot size={72} shape="square" />
          </View>
        </View>

        <View style={s.content}>
          <View style={s.periodRow}>
            <View style={s.flex}>
              <Segmented label={P.period} value={period} onChange={setPeriod} options={[{ key: 'monthly', label: P.monthly }, { key: 'yearly', label: P.yearly }]} />
            </View>
            <View style={s.saveTag}>
              <AppText variant="captionStrong" color={t.hc ? t.c.text : t.ink.success}>
                {savings ? P.saveUpTo(formatCOP(savings)) : P.yearlySoon}
              </AppText>
            </View>
          </View>

          <View style={s.cards} accessibilityRole="radiogroup" accessibilityLabel={P.choose}>
            {PAID.map((id, i) => (
              <Appear key={id} index={i}>
                <PlanCard id={id} period={period} selected={selected === id} current={current === id} onSelect={() => setSelected(id)} />
              </Appear>
            ))}
          </View>

          <View style={s.compare}>
            <Pressable
              onPress={() => setCompare((c) => !c)}
              accessibilityRole="button"
              accessibilityState={{ expanded: compare }}
              accessibilityLabel={P.compare}
              style={s.compareHead}
            >
              <AppText variant="h3" style={s.flex}>
                {P.compare}
              </AppText>
              <Icon name={compare ? 'minus' : 'plus'} color={t.c.text} size={20} />
            </Pressable>
            {compare ? <Comparison /> : null}
          </View>

          <View style={s.trust}>
            <TrustRow icon="check" text={P.cancelAnytime} />
            <TrustRow icon="lock" text={P.securePay} />
            <TrustRow icon="shield" text={P.essentialFree} />
            <View style={s.trustLinks}>
              <Button label={P.restore} variant="text" size="sm" loading={busy && !done} onPress={restore} />
              <Button label={strings.auth.legalTerms} variant="text" size="sm" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} />
              <Button label={strings.auth.legalPrivacy} variant="text" size="sm" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={s.currentLine} accessible accessibilityLabel={`${P.currentPlan(PLANS[current].name)}. ${P.essentialFreeShort}`}>
          <Icon name="shield" size={16} color={t.hc ? t.c.text : t.ink.mint} />
          <AppText variant="caption" color={t.c.muted} style={s.flex}>
            <AppText variant="captionStrong" color={t.c.text}>{P.currentPlan(PLANS[current].name)}</AppText>
            {` · ${P.essentialFreeShort}`}
          </AppText>
        </View>
        {message ? (
          <AppText variant="caption" color={t.c.muted} accessibilityLiveRegion="polite">
            {message}
          </AppText>
        ) : null}
        <Button label={ctaLabel} loading={busy} success={done} disabled={isCurrent || price === null} onPress={choose} />
      </View>
    </View>
  );
}

/** Tarjeta de plan: precio con cifras tabulares, para quién es, beneficios con check del color de su dominio y botón. */
function PlanCard({ id, period, selected, current, onSelect }: { id: PaidPlanId; period: BillingPeriod; selected: boolean; current: boolean; onSelect: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const reduce = useReducedMotion();
  const plan = PLANS[id];
  const recommended = id === RECOMMENDED_PLAN;
  const price = period === 'monthly' ? plan.monthly : plan.yearly;
  const lift = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    lift.set(reduce ? (selected ? 1 : 0) : withSpring(selected ? 1 : 0, motion.spring));
  }, [selected, reduce, lift]);
  const lifted = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.015 * lift.value }, { translateY: -4 * lift.value }] }));
  const tile = t.tiles[plan.domain];
  const dom = t.domains[plan.domain];
  const body = (
    <View style={[s.card, selected && s.cardOn, recommended && s.cardRecommended]}>
      {/* V5: cada plan se reconoce por su color: una franja con su tinte que se funde con la tarjeta. */}
      {t.hc ? null : <LinearGradient pointerEvents="none" colors={[dom.gradient[1], t.c.surface]} style={s.cardBand} />}
      {recommended && !t.hc ? <Shine /> : null}
      <View style={s.cardHead}>
        <IconTile icon={plan.icon} domain={plan.domain} size={44} />
        <View style={s.flex}>
          <AppText variant="h2">{plan.name}</AppText>
          <AppText variant="secondary" color={t.c.muted}>
            {plan.audience}
          </AppText>
        </View>
        {recommended ? (
          <View style={s.recommended}>
            <AppText variant="captionStrong" color={t.hc ? t.c.bg : '#FFFFFF'}>
              {P.recommended}
            </AppText>
          </View>
        ) : current ? (
          <View style={s.currentTag}>
            <AppText variant="captionStrong" color={t.c.text}>
              {P.yourPlan}
            </AppText>
          </View>
        ) : null}
      </View>
      <Animated.View key={period} entering={reduce ? undefined : FadeIn.duration(220)} style={s.priceRow}>
        {price === null ? (
          <AppText variant="h2" color={t.c.muted}>
            {P.yearlyTbdShort}
          </AppText>
        ) : (
          <>
            <CountUp value={price} format={formatCOP} variant="heroL" color={t.hc ? undefined : dom.muted} />
            <AppText variant="secondaryStrong" color={t.c.muted}>
              {period === 'monthly' ? P.perMonth : P.perYear}
            </AppText>
          </>
        )}
      </Animated.View>
      <View style={s.benefits}>
        {plan.benefits.map((b) => (
          <View key={b} style={s.benefit}>
            <View style={[s.check, { backgroundColor: tile.bg }]}>
              <Icon name="check" size={14} color={tile.fg} strokeWidth={3} />
            </View>
            <AppText variant="secondary" style={s.flex}>
              {b}
            </AppText>
          </View>
        ))}
      </View>
      <Button label={selected ? P.chosen(plan.name) : P.choosePlan(plan.name)} icon={selected ? 'check' : undefined} variant={selected ? 'solid' : 'tonal'} tone={dom.tone} onPress={onSelect} />
    </View>
  );
  return (
    <Animated.View style={[selected ? t.shadow.elevated : t.shadow.soft, s.cardShell, lifted]}>
      <PressableScale
        onPress={onSelect}
        haptic
        scaleTo={motion.pressScaleCard}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`${plan.name}. ${plan.audience}. ${price === null ? P.yearlyTbdShort : `${formatCOP(price)} ${period === 'monthly' ? P.perMonth : P.perYear}`}${recommended ? `. ${P.recommended}` : ''}`}
        style={s.cardPress}
      >
        {recommended && !t.hc ? (
          <LinearGradient colors={['#1FA9A0', '#7B6CF0', '#174A59']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ring}>
            {body}
          </LinearGradient>
        ) : (
          body
        )}
      </PressableScale>
    </Animated.View>
  );
}

/** Brillo que recorre el plan recomendado cada 4 s (solo transform). */
function Shine() {
  const s = useStyles();
  const reduce = useReducedMotion();
  const x = useSharedValue(-1);
  useEffect(() => {
    if (reduce) return;
    x.set(withRepeat(withSequence(withDelay(3100, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })), withTiming(-1, { duration: 0 })), -1));
    return () => cancelAnimation(x);
  }, [reduce, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: `${x.value * 130}%` }, { skewX: '-18deg' }] }));
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={s.shineClip}>
      <Animated.View style={[s.shine, style]}>
        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

function Comparison() {
  const t = useTheme();
  const s = useStyles();
  return (
    <View style={s.table}>
      <View style={[s.tr, s.trHead]}>
        <View style={s.tdLabel} />
        {PLAN_ORDER.map((p) => (
          <AppText key={p} variant="captionStrong" align="center" style={s.td} maxScale={1.3} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {PLANS[p].name}
          </AppText>
        ))}
      </View>
      {COMPARISON.map((row) => (
        <View key={row.label} style={s.tr} accessible accessibilityLabel={`${row.label}: ${PLAN_ORDER.filter((p) => PLAN_ORDER.indexOf(p) >= PLAN_ORDER.indexOf(row.from)).map((p) => PLANS[p].name).join(', ')}`}>
          <AppText variant="caption" style={s.tdLabel}>
            {row.label}
          </AppText>
          {PLAN_ORDER.map((p: PlanId) => (
            <View key={p} style={s.td}>
              {PLAN_ORDER.indexOf(p) >= PLAN_ORDER.indexOf(row.from) ? (
                <Icon name="check" size={18} color={t.hc ? t.c.text : t.ink.success} strokeWidth={2.6} />
              ) : (
                <View style={s.dash} />
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function TrustRow({ icon, text }: { icon: 'check' | 'lock' | 'shield'; text: string }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <View style={s.trustRow}>
      <Icon name={icon} size={18} color={t.hc ? t.c.text : t.ink.mint} />
      <AppText variant="secondary" style={s.flex}>
        {text}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.c.bg },
    flex: { flex: 1, minWidth: 0 },
    header: { paddingHorizontal: spacing.lg, paddingBottom: 72, overflow: 'hidden' },
    lavenderGlow: { position: 'absolute', right: -80, top: -40, width: 260, height: 260, borderRadius: 130, backgroundColor: '#A99DFF', opacity: 0.18 },
    back: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.hc ? t.c.bg : 'rgba(255,255,255,0.14)', ...(t.hc ? t.hairline : {}) },
    heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginTop: spacing.lg },
    heroBody: { marginTop: spacing.xs },
    content: { marginTop: -48, paddingHorizontal: spacing.lg, gap: spacing.section },
    periodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.xs, borderRadius: radius.cardLg, backgroundColor: t.c.surface, ...t.shadow.elevated, ...(t.hc ? t.hairline : {}) },
    saveTag: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: t.hc ? t.c.bg : t.c.successPale, maxWidth: 140, ...(t.hc ? t.hairline : {}) },
    cards: { gap: spacing.md },
    cardShell: { borderRadius: radius.cardLg },
    cardPress: { borderRadius: radius.cardLg, overflow: 'hidden' },
    ring: { padding: 2, borderRadius: radius.cardLg },
    card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.cardLg, backgroundColor: t.c.surface, borderWidth: 1, borderColor: t.hc ? t.c.text : t.c.border, overflow: 'hidden' },
    cardBand: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
    cardRecommended: { borderWidth: 0, borderRadius: radius.cardLg - 2 },
    cardOn: { borderColor: t.hc ? t.c.text : t.c.accent, borderWidth: 2 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    recommended: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: t.hc ? t.c.text : '#174A59' },
    currentTag: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: t.c.surface2, ...(t.hc ? t.hairline : {}) },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
    benefits: { gap: spacing.xs },
    benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
    check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    shineClip: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
    shine: { position: 'absolute', top: 0, bottom: 0, left: '30%', width: '30%' },
    compare: { borderRadius: radius.card, backgroundColor: t.c.surface, ...t.hairline, ...t.shadow.soft, overflow: 'hidden' },
    compareHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touch.timeRow, paddingHorizontal: spacing.lg },
    table: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
    tr: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderTopWidth: 1, borderTopColor: t.c.border, gap: 4 },
    trHead: { borderTopWidth: 0 },
    tdLabel: { flex: 2.2, minWidth: 0, paddingVertical: spacing.xs },
    td: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    dash: { width: 12, height: 2, borderRadius: 1, backgroundColor: t.c.tertiary },
    trust: { gap: spacing.sm },
    trustRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    trustLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      backgroundColor: t.c.surface,
      borderTopLeftRadius: radius.modal,
      borderTopRightRadius: radius.modal,
      ...t.shadow.sheet,
      ...(t.hc ? t.hairline : {}),
    },
    currentLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  }),
);
