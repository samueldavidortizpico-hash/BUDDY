import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet } from '@/components/feedback';
import { Icon, type IconName } from '@/components/icon';
import { BuddyRobot } from '@/components/robot';
import { ScreenContainer } from '@/components/screen-container';
import { SuggestsPanel } from '@/features/feed/feed-card';
import { useFeed } from '@/state/feed';
import { TodayPanel } from '@/features/summary/today';
import { strings } from '@/i18n';
import { elderActions } from '@/state/actions';
import { useActiveElder, useElders, useRecords } from '@/state/data';
import { useSession } from '@/state/session';
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
            <Pressable onPress={() => setPicker(true)} accessibilityRole="button" accessibilityLabel={`${S.caring(elder.firstName)}. ${S.switchPerson}`} style={s.personBtn}>
              <AppText variant="h1" numberOfLines={1} style={s.shrink}>
                {elder.firstName}
              </AppText>
              <Icon name="chevron" color={t.c.muted} size={22} strokeWidth={2.2} />
            </Pressable>
          ) : (
            <AppText variant="h1">{strings.brand.name}</AppText>
          )}
        </View>
        <IconButton icon="bell" label={S.alerts} showLabel={false} badge={unread} onPress={() => router.push('/alerts' as Href)} />
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
          <SuggestsPanel />
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
  const items: { label: string; done: boolean; href: Href }[] = [
    { label: S.steps.register, done: !!elder?.setupDone, href: '/setup' },
    { label: S.steps.medication, done: meds.length > 0, href: '/medication/new' as Href },
    { label: S.steps.contacts, done: contacts.length > 0, href: '/routine/contacts' as Href },
    { label: S.steps.water, done: water.length > 0, href: '/routine/water' as Href },
    { label: S.steps.checkin, done: !!elder?.checkinTime, href: '/routine/checkin' as Href },
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

const useStyles = makeStyles((t) =>
  StyleSheet.create({
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
