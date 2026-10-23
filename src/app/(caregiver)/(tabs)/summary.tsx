import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet } from '@/components/feedback';
import { Icon, type IconName } from '@/components/icon';
import { BuddyRobot } from '@/components/robot';
import { ScreenContainer } from '@/components/screen-container';
import { useFeed } from '@/state/feed';
import { locationView } from '@/domain/location';
import { useNow } from '@/hooks/use-now';
import { formatAgo } from '@/utils/dates';
import { DailySummaryCard, StatusHero } from '@/features/summary/status';
import { TodayPanel } from '@/features/summary/today';
import { strings } from '@/i18n';
import { elderActions } from '@/state/actions';
import type { Invite } from '@/domain/invites';
import { useDb } from '@/infrastructure/local/db';
import { useActiveElder, useElders, useRecords, useUserId } from '@/state/data';
import { invites } from '@/state/invites';
import { sessionActions, useSession } from '@/state/session';
import { radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const S = strings.summary;

export default function Summary() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const user = useSession((x) => x.user);
  const elders = useElders();
  const elder = useActiveElder();
  const { unread } = useFeed();
  const [picker, setPicker] = useState(false);
  const ready = elder?.setupDone ? elder : null;

  return (
    <ScreenContainer insideTabs>
      <View style={s.top}>
        <View style={s.flex}>
          <AppText variant="secondary" color={t.c.muted}>
            {S.greeting(user?.name.split(' ')[0] ?? '')}
          </AppText>
          {elder ? (
            <Pressable onPress={() => router.push('/preview')} accessibilityRole="button" accessibilityLabel={`Vista de ${elder.firstName}`} style={s.personBtn}>
              <AppText variant="h1" numberOfLines={2} style={s.shrink}>
                {elder.firstName}
              </AppText>
              <Icon name="chevron" color={t.c.muted} size={22} strokeWidth={2.2} />
            </Pressable>
          ) : (
            <AppText variant="h1">{strings.brand.name}</AppText>
          )}
        </View>
        <IconButton icon="bell" label={S.alerts} showLabel={false} badge={unread} onPress={() => router.push('/alerts' as Href)} />
        {/* Siempre visible, también antes de registrar a la persona: Apariencia y Cerrar sesión viven en Ajustes. */}
        <IconButton icon="settings" label={strings.settings.title} showLabel={false} onPress={() => router.push('/settings' as Href)} />
      </View>

      {!ready ? (
        <Appear>
          <Card variant="gradient" domain="activity" elevation="hero" radius={radius.hero} style={s.hero}>
            <BuddyRobot size={120} mood="wave" style={s.heroRobot} />
            <AppText variant="display" color={t.domains.activity.text}>
              {S.emptyTitle}
            </AppText>
            <AppText variant="body" color={t.domains.activity.muted}>
              {S.emptyBody}
            </AppText>
            <HowItWorks />
            <Button
              label={elder ? S.resume : S.steps.register}
              variant="primary"
              trailing="arrow"
              size="elder"
              onPress={() => router.push(elder ? { pathname: '/setup', params: { elderId: elder.id } } : '/setup')}
            />
          </Card>
        </Appear>
      ) : (
        <>
          {/* Vista de un segundo (V3.0): el estado es lo primero; las novedades viven en la campana y en el robot. */}
          <StatusHero elder={ready} phone={ready.phone} />
          <DailySummaryCard elder={ready} />
          <FirstSteps />
          <Card variant="tint" tone="mint" style={s.elderPreview}>
            <AppText variant="h3">{S.elderScreenTitle}</AppText>
            <AppText variant="secondary" color={t.c.muted}>{S.elderScreenBody}</AppText>
            <Button
              label={S.elderScreenAction(ready.firstName)}
              icon="eye"
              variant="tonal"
              tone="mint"
              size="md"
              accessibilityHint={S.elderScreenHint}
              onPress={() => router.push('/preview' as Href)}
            />
          </Card>
          <WhereCard name={ready.firstName} consent={ready.locationConsent} onPress={() => router.push('/location' as Href)} />
          <TodayPanel elder={ready} />
        </>
      )}

      <BottomSheet visible={picker} onClose={() => setPicker(false)} title={S.switchPerson}>
        {elders.map((e) => (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            accessibilityState={{ selected: e.id === elder?.id }}
            onPress={() => {
              elderActions.setActive(e.id);
              setPicker(false);
              if (!e.setupDone) router.push({ pathname: '/setup', params: { elderId: e.id } });
            }}
            style={[s.personRow, e.id === elder?.id && s.personOn]}
          >
            <Icon name="user" color={t.ink.lavender} />
            <AppText variant="bodyStrong" style={s.flex}>
              {`${e.firstName} ${e.lastName}`.trim()}
            </AppText>
            {e.id === elder?.id ? <Icon name="check" color={t.ink.mint} /> : null}
          </Pressable>
        ))}
        <Button
          label={S.addPerson}
          icon="plus"
          variant="tonal"
          tone="mint"
          onPress={() => {
            setPicker(false);
            router.push({ pathname: '/setup', params: { new: '1' } });
          }}
        />
      </BottomSheet>
    </ScreenContainer>
  );
}

/** Los tres pasos de la idea central (estado vacío del Resumen). */
function HowItWorks() {
  const t = useTheme();
  const s = useStyles();
  const icons: IconName[] = ['users', 'bell', 'chart'];
  return (
    <View style={s.how}>
      {S.howItWorks.map((text, i) => (
        <View key={text} style={s.howRow}>
          <View style={s.howNum}>
            <Icon name={icons[i]} color={t.hc ? t.c.text : t.domains.activity.accent} size={22} />
          </View>
          <AppText variant="secondaryStrong" color={t.domains.activity.text} style={s.flex}>
            {`${i + 1}. ${text}`}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** Tarjeta "Primeros pasos": visible hasta completar lo básico. */
function FirstSteps() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const elder = useActiveElder();
  const meds = useRecords('medications');
  const contacts = useRecords('contacts');
  const water = useRecords('waterPlans');
  const userId = useUserId() ?? '';
  const invited = useDb((x) => ((x.drafts[userId]?.[invites.key] as Invite[] | undefined) ?? []).some((i) => i.elderId === elder?.id));
  const [hasAccess, setHasAccess] = useState(false);
  useEffect(() => {
    let alive = true;
    if (elder?.setupDone) sessionActions.elderAccess(elder.id).then((a) => alive && setHasAccess(!!a && !a.revoked)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [elder?.id, elder?.setupDone]);
  const full = (step: string): Href => ({ pathname: '/setup', params: { elderId: elder?.id ?? '', step } }) as unknown as Href;
  // Lo mínimo va en el registro rápido; lo demás queda aquí y abre el paso del asistente completo (V3.0, Hito 6).
  const items: { label: string; done: boolean; href: Href }[] = [
    { label: S.steps.register, done: !!elder?.setupDone, href: '/setup' },
    { label: S.steps.medication, done: meds.length > 0, href: '/medication/new' as Href },
    { label: S.steps.contacts, done: contacts.length > 0, href: '/routine/contacts' as Href },
    { label: S.steps.checkin, done: !!elder?.checkinTime, href: '/routine/checkin' as Href },
    { label: S.steps.health, done: !!elder && elder.allergies.length + elder.conditions.length > 0, href: full('health') },
    { label: S.steps.routine, done: water.length > 0, href: full('routine') },
    { label: S.steps.access(elder?.firstName ?? ''), done: hasAccess, href: { pathname: '/settings/access/[elderId]', params: { elderId: elder?.id ?? '' } } as unknown as Href },
    { label: S.steps.invite, done: invited, href: '/settings/invite' as Href },
  ];
  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;
  return (
    <Appear>
      <Card style={s.steps}>
        <View style={s.stepsHead}>
          <View style={s.flex}>
            <AppText variant="h3">{S.firstSteps}</AppText>
            <AppText variant="caption" color={t.c.muted}>
              {S.firstStepsBody}
            </AppText>
          </View>
          <AppText variant="h2" color={t.ink.mint} style={s.tabular}>{`${doneCount}/${items.length}`}</AppText>
        </View>
        {items.map((it) => (
          <Pressable
            key={it.label}
            disabled={it.done}
            onPress={() => router.push(it.href)}
            accessibilityRole="button"
            accessibilityState={{ checked: it.done, disabled: it.done }}
            accessibilityLabel={it.label}
            style={s.stepRow}
          >
            <View style={[s.check, it.done && { backgroundColor: t.hc ? t.c.text : t.c.mintStrong, borderColor: t.hc ? t.c.text : t.c.mintStrong }]}>
              {it.done ? <Icon name="check" size={16} color={t.hc ? t.c.bg : '#FFFFFF'} strokeWidth={3} /> : null}
            </View>
            <AppText variant="secondaryStrong" color={it.done ? t.c.muted : t.c.text} style={[s.flex, it.done && s.strike]}>
              {it.label}
            </AppText>
            {!it.done ? <Icon name="chevron" color={t.c.muted} /> : null}
          </Pressable>
        ))}
      </Card>
    </Appear>
  );
}

/** "Dónde está [nombre]": acceso a la ubicación compartida (o a solicitarla) desde el Resumen. */
function WhereCard({ name, consent, onPress }: { name: string; consent?: import('@/domain/types').LocationConsent; onPress: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const now = useNow(60_000);
  const fixes = useRecords('locations');
  const v = locationView({ locationConsent: consent }, fixes, now);
  const L = strings.location;
  const detail = v.kind === 'located' ? L.lastShort(formatAgo(new Date(v.last.at), now)) : v.kind === 'requested' ? L.requested(name) : v.kind === 'waiting' ? L.waiting(name) : L.summaryNone;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${L.title(name)}. ${detail}`} style={({ pressed }) => [s.where, t.hairline, pressed && { opacity: 0.85 }]}>
      <View style={s.whereIcon}>
        <Icon name="location" color={t.ink.mint} />
      </View>
      <View style={s.flex}>
        <AppText variant="h3">{L.title(name)}</AppText>
        <AppText variant="secondary" color={t.c.muted} numberOfLines={2}>{detail}</AppText>
      </View>
      <Icon name="chevron" color={t.c.muted} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    where: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touch.timeRow + 16, padding: spacing.md, borderRadius: radius.card, backgroundColor: t.c.surface },
    whereIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.mintPale },
    flex: { flex: 1 },
    shrink: { flexShrink: 1 },
    tabular: { fontVariant: ['tabular-nums'] },
    top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, marginBottom: spacing.lg },
    personBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, minHeight: touch.min, alignSelf: 'flex-start' },
    hero: { gap: spacing.md, padding: spacing.xl, marginTop: spacing.xxl },
    heroRobot: { position: 'absolute', top: -84, right: -10 },
    how: { gap: spacing.sm, marginVertical: spacing.xs },
    howRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    howNum: {
      width: 44,
      height: 44,
      borderRadius: radius.icon,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.hc ? t.c.bg : 'rgba(255,255,255,0.7)',
      ...(t.hc ? t.hairline : {}),
    },
    steps: { gap: spacing.xs, marginBottom: spacing.section },
    elderPreview: { gap: spacing.xs, marginBottom: spacing.sm },
    stepsHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touch.min },
    check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: t.hc ? t.c.text : t.c.muted, alignItems: 'center', justifyContent: 'center' },
    strike: { textDecorationLine: 'line-through' },
    personRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: touch.timeRow,
      paddingHorizontal: spacing.md,
      borderRadius: radius.input,
      backgroundColor: t.c.surface,
      ...t.hairline,
    },
    personOn: { borderColor: t.hc ? t.c.text : t.c.mintStrong, borderWidth: 2 },
  }),
);
