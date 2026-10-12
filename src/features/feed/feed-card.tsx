/**
 * Tarjetas del feed de BUDDY (alertas y recomendaciones) y panel "BUDDY te sugiere" del Resumen.
 * Color por severidad y SIEMPRE con texto e icono (no solo color): info, atención, señal de alarma; rojo solo para
 * "pidió ayuda". Las acciones van por los casos de uso de siempre (src/state/feed.ts).
 */
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useToast } from '@/components/feedback';
import { Icon, type IconName } from '@/components/icon';
import { BuddyRobot } from '@/components/robot';
import type { FeedItem } from '@/domain/recommendations/engine';
import { strings } from '@/i18n';
import { useActiveElder } from '@/state/data';
import { feedActions, useFeed } from '@/state/feed';
import { radius, spacing, type Tone } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { successHaptic } from '@/utils/haptics';

const F = strings.feed;

function look(f: FeedItem): { tone: Tone; icon: IconName } {
  if (f.help) return { tone: 'red', icon: 'shield' };
  if (f.positive) return { tone: 'mint', icon: 'heart' };
  if (f.severity === 'alarm') return { tone: 'coral', icon: 'warning' };
  if (f.severity === 'attention') return { tone: 'yellow', icon: 'warning' };
  return { tone: f.kind === 'alert' ? 'sky' : 'lavender', icon: f.kind === 'alert' ? 'bell' : 'sparkle' };
}

export function FeedCard({ item, index = 0 }: { item: FeedItem; index?: number }) {
  const router = useRouter();
  const toast = useToast();
  const t = useTheme();
  const s = useStyles();
  const reduce = useReducedMotion();
  const elder = useActiveElder();
  const [why, setWhy] = useState(false);
  const { tone, icon } = look(item);
  const label = item.help ? F.help : F.severity[item.severity];

  const act = (a: FeedItem['actions'][number]) => {
    const r = feedActions.run(a);
    if (r.open) return router.push(r.open as Href);
    if (r.call !== undefined) {
      if (r.call) Linking.openURL(`tel:${r.call}`);
      else toast({ message: F.noPhone(elder?.firstName ?? 'tu familiar'), icon: 'info' });
      return;
    }
    if (r.done) {
      successHaptic();
      toast({ message: r.done, icon: 'check' });
    }
  };

  return (
    <Animated.View testID="reco-card" entering={reduce ? undefined : FadeInDown.delay(Math.min(index, 5) * 60).duration(240)} layout={reduce ? undefined : LinearTransition.duration(200)}>
      <Card variant="tint" tone={tone} style={s.card}>
        <View style={s.head}>
          <View style={[s.iconBox, { backgroundColor: t.hc ? t.c.bg : t.tones[tone].soft }]}>
            <Icon name={icon} color={t.hc ? t.c.text : t.tones[tone].fg} size={22} />
          </View>
          <View style={s.flex}>
            <AppText variant="meta" color={t.hc ? t.c.text : t.tones[tone].fg}>
              {`${label}${item.count > 1 ? ` · ${item.count}` : ''}`}
            </AppText>
            <AppText variant="bodyStrong">{item.title}</AppText>
          </View>
        </View>
        <AppText variant="secondary" color={t.c.text}>
          {item.reason}
        </AppText>
        {why && item.support.length ? (
          <View style={s.support}>
            <AppText variant="captionStrong">{F.why}</AppText>
            {item.support.map((x) => (
              <AppText key={x} variant="caption" color={t.c.muted}>
                {`• ${x}`}
              </AppText>
            ))}
          </View>
        ) : null}
        <View style={s.actions}>
          {item.actions.map((a, k) => (
            <Button key={`${a.type}-${k}`} label={F.actions[a.type]} size="sm" variant={k === 0 ? (item.help ? 'danger' : 'tonal') : 'ghost'} tone={tone} icon={a.type === 'call' ? 'phone' : a.type === 'confirm_dose' ? 'check' : undefined} onPress={() => act(a)} />
          ))}
          {item.support.length ? <Button label={why ? strings.common.close : F.actions.open} size="sm" variant="ghost" onPress={() => setWhy(!why)} /> : null}
          {!item.help ? (
            <Button
              label={item.kind === 'alert' ? F.snooze : F.mute}
              size="sm"
              variant="ghost"
              onPress={() => {
                feedActions.mute(item.key, item.kind === 'alert' ? 24 : 24 * 7);
                toast({ message: item.kind === 'alert' ? F.snoozed : F.muted, icon: 'clock' });
              }}
            />
          ) : null}
        </View>
      </Card>
    </Animated.View>
  );
}

/** Panel "BUDDY te sugiere" del Resumen: siempre visible; con todo en orden muestra tarjetas informativas. */
export function SuggestsPanel({ max = 4 }: { max?: number }) {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const { items } = useFeed();
  return (
    <View style={s.panel}>
      <View style={s.panelHead}>
        <BuddyRobot size={56} compact mood={items.some((f) => f.severity === 'alarm') ? 'worry' : 'happy'} shadow={false} flying={false} />
        <AppText variant="h2" style={s.flex} accessibilityRole="header">
          {F.suggests}
        </AppText>
        {items.length > max ? <Button label={F.seeAll(items.length)} size="sm" variant="ghost" onPress={() => router.push('/alerts' as Href)} /> : null}
      </View>
      {items.slice(0, max).map((f, i) => (
        <FeedCard key={f.key} item={f} index={i} />
      ))}
      {!items.length ? (
        <AppText variant="secondary" color={t.c.muted}>
          {F.noneToday}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    card: { gap: spacing.sm },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    iconBox: { width: 44, height: 44, borderRadius: radius.icon, alignItems: 'center', justifyContent: 'center' },
    support: { gap: 2, padding: spacing.sm, borderRadius: radius.md, backgroundColor: t.c.surface, ...t.hairline },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    panel: { gap: spacing.sm },
    panelHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  }),
);
