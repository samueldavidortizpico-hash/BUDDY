import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet } from '@/components/feedback';
import { Icon, type IconName } from '@/components/icon';
import { ScreenContainer } from '@/components/screen-container';
import { useFeed } from '@/state/feed';
import { useNow } from '@/hooks/use-now';
import { StatusHero, TodayTiles, useDailySummaryNotice } from '@/features/summary/status';
import type { Elder } from '@/domain/types';
import { strings } from '@/i18n';
import { doseActions, evaluateAlerts } from '@/state/care';
import { elderActions } from '@/state/actions';
import type { Invite } from '@/domain/invites';
import { useDb } from '@/infrastructure/local/db';
import { useActiveElder, useElders, useRecords, useUserId } from '@/state/data';
import { invites } from '@/state/invites';
import { sessionActions, useSession } from '@/state/session';
import { radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const S = strings.summary;
const H = strings.summary.home;

export default function Summary() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const user = useSession((x) => x.user);
  const elders = useElders();
  const elder = useActiveElder();
  const { items, unread } = useFeed();
  const [picker, setPicker] = useState(false);
  const ready = elder?.setupDone ? elder : null;

  return (
    <ScreenContainer insideTabs>
      {/* Barra superior (V4): saludo a la izquierda; campana de Novedades y Ajustes a la derecha. Sin botón de BUDDY. */}
      <View style={s.top}>
        <AppText variant="h3" color={t.c.text} style={s.flex} numberOfLines={2}>
          {S.greeting(user?.name.split(' ')[0] ?? '')}
        </AppText>
        <IconButton icon="bell" label={S.alerts} showLabel={false} badge={unread} onPress={() => router.push('/alerts' as Href)} />
        {/* Siempre visible, también antes de registrar a la persona: Apariencia y Cerrar sesión viven en Ajustes. */}
        <IconButton icon="settings" label={strings.settings.title} showLabel={false} onPress={() => router.push('/settings' as Href)} />
      </View>

      {!ready ? (
        <Appear>
          <Card variant="gradient" domain="activity" elevation="hero" radius={radius.hero} style={s.hero}>
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
        <View style={s.stack}>
          <PersonCard name={ready.firstName} onPress={() => router.push('/preview' as Href)} onSwitch={elders.length > 1 ? () => setPicker(true) : undefined} />
          <StatusHero elder={ready} phone={ready.phone} />
          {/* Las novedades no se riegan por el Inicio: una sola fila ordenada que abre la lista completa. */}
          {unread ? <NewsRow count={unread} latest={items[0]?.title} onPress={() => router.push('/alerts' as Href)} /> : null}
          <TodayTiles elder={ready} />
          <FirstSteps />
          <HomeEffects elder={ready} />
        </View>
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

/** Tarjeta de la persona: "[Nombre] ›" en H1 y "Ver su pantalla"; abre la vista de su pantalla en solo lectura. */
function PersonCard({ name, onPress, onSwitch }: { name: string; onPress: () => void; onSwitch?: () => void }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <View style={s.personWrap}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}. ${H.seeScreen}`} accessibilityHint={H.personHint(name)} style={({ pressed }) => [s.person, pressed && s.pressed]}>
        <View style={[s.avatar, { backgroundColor: t.tiles.mood.bg }, t.hc && t.hairline]}>
          <AppText variant="h2" color={t.tiles.mood.fg} maxScale={1.2}>{name.slice(0, 1).toUpperCase()}</AppText>
        </View>
        <View style={s.flex}>
          <View style={s.nameRow}>
            <AppText variant="h1" numberOfLines={2} style={s.shrink}>{name}</AppText>
            <Icon name="chevron" color={t.c.muted} size={26} strokeWidth={2.4} />
          </View>
          <AppText variant="secondary" color={t.ink.info}>{H.seeScreen}</AppText>
        </View>
      </Pressable>
      {onSwitch ? <IconButton icon="users" label={S.switchPerson} showLabel={false} onPress={onSwitch} /> : null}
    </View>
  );
}

/** Una fila con el número de novedades y la más reciente; toda la lista vive en Novedades. */
function NewsRow({ count, latest, onPress }: { count: number; latest?: string; onPress: () => void }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${H.news(count)}${latest ? `. ${latest}` : ''}`} accessibilityHint={H.newsHint} style={({ pressed }) => [s.news, t.hairline, pressed && s.pressed]}>
      <View style={[s.newsDot, { backgroundColor: t.hc ? t.c.text : t.status.action.accent }]}>
        <AppText variant="captionStrong" color={t.hc ? t.c.bg : '#FFFFFF'} maxScale={1.2}>{count > 9 ? '9+' : String(count)}</AppText>
      </View>
      <View style={s.flex}>
        <AppText variant="secondaryStrong">{H.news(count)}</AppText>
        {latest ? <AppText variant="caption" color={t.c.muted} numberOfLines={2}>{latest}</AppText> : null}
      </View>
      <Icon name="chevron" color={t.c.muted} />
    </Pressable>
  );
}

/**
 * Efectos del Inicio sin interfaz: crea las tomas de hoy, revisa "sin confirmar" y existencias cada minuto, y programa
 * el resumen diario. Siguen aquí porque, sin servidor, el aviso al administrador se calcula al abrir el Inicio (A-09).
 */
function HomeEffects({ elder }: { elder: Elder }) {
  const now = useNow(60_000);
  useEffect(() => {
    doseActions.sync(elder.id, now);
    evaluateAlerts(elder.id, now);
  }, [elder.id, now]);
  useDailySummaryNotice(elder);
  return null;
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

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    stack: { gap: spacing.section },
    pressed: { opacity: 0.85 },
    personWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    person: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touch.min },
    avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
    news: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touch.timeRow + 8, padding: spacing.md, borderRadius: radius.card, backgroundColor: t.c.surface, ...t.shadow.soft },
    newsDot: { minWidth: 32, height: 32, borderRadius: 16, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    shrink: { flexShrink: 1 },
    tabular: { fontVariant: ['tabular-nums'] },
    top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, marginBottom: spacing.lg },
    hero: { gap: spacing.md, padding: spacing.xl, marginTop: spacing.xxl },
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
    steps: { gap: spacing.xs },
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
