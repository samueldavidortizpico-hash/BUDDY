import { BlurView } from 'expo-blur';
import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { FEATURE_PLAN, PLANS, type Feature } from '@/config/plans';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

import { Appear } from './appear';
import { AppText } from './app-text';
import { Button } from './button';
import { Card } from './card';
import { Icon } from './icon';
import { IconTile } from './icon-tile';

const plansHref = (feature: Feature) => ({ pathname: '/plus', params: { plan: FEATURE_PLAN[feature] } }) as unknown as Href;

/** Fila compacta "Incluido en [plan]" que abre la pantalla de planes. */
export function PlusLock({ feature, label }: { feature: Feature; label?: string }) {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const plan = PLANS[FEATURE_PLAN[feature]];
  const text = label ?? `Incluido en ${plan.name}`;
  return (
    <Card style={s.row} onPress={() => router.push(plansHref(feature))} accessibilityLabel={`${text}. Ver planes`}>
      <Icon name="lock" color={t.hc ? t.c.text : t.ink.lavender} />
      <View style={s.flex}>
        <AppText variant="secondaryStrong">{text}</AppText>
        <AppText variant="caption" color={t.c.muted}>Ver planes</AppText>
      </View>
      <Icon name="chevron" color={t.c.tertiary} />
    </Card>
  );
}

/**
 * Bloqueo amable (V4.3): la función se ve detrás de un velo difuminado, con candado, el plan que la incluye y
 * "Ver planes". La vista previa no se puede tocar ni la lee el lector de pantalla (solo el mensaje).
 */
export function LockedPreview({ feature, title, body, children }: { feature: Feature; title: string; body?: string; children: ReactNode }) {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const plan = PLANS[FEATURE_PLAN[feature]];
  return (
    <View style={s.wrap}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.preview}>
        {children}
      </View>
      {t.hc ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.c.bg }]} />
      ) : (
        <BlurView intensity={t.dark ? 36 : 28} tint={t.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      )}
      {/* El mensaje va en una tarjeta sólida: sobre el velo, la vista previa se colaba detrás del texto y no se leía. */}
      <Appear style={s.overlay}>
        <View style={s.panel}>
          <View style={s.message} accessible accessibilityRole="summary" accessibilityLabel={`${title}. Incluido en el plan ${plan.name}.`}>
            <IconTile icon="lock" domain={plan.domain} size={56} />
            <AppText variant="h2" align="center">
              {title}
            </AppText>
            {body ? (
              <AppText variant="secondary" color={t.c.muted} align="center">
                {body}
              </AppText>
            ) : null}
            <View style={s.badge}>
              <Icon name={plan.icon} size={16} color={t.hc ? t.c.text : t.ink.info} />
              <AppText variant="captionStrong" color={t.hc ? t.c.text : t.ink.info}>{`Incluido en ${plan.name}`}</AppText>
            </View>
          </View>
          <Button label="Ver planes" icon="sparkle" onPress={() => router.push(plansHref(feature))} style={s.cta} />
        </View>
      </Appear>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 64 },
    wrap: { borderRadius: radius.cardLg, overflow: 'hidden', minHeight: 360 },
    preview: { opacity: 0.55 },
    overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
    panel: {
      alignItems: 'center',
      gap: spacing.xs,
      width: '100%',
      maxWidth: 340,
      padding: spacing.lg,
      borderRadius: radius.cardLg,
      backgroundColor: t.c.surface,
      ...t.hairline,
      ...(t.hc ? null : t.shadow.elevated),
    },
    message: { alignItems: 'center', gap: spacing.xs, alignSelf: 'stretch' },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: t.hc ? t.c.bg : t.c.surface,
      ...(t.hc ? t.hairline : t.shadow.soft),
    },
    cta: { alignSelf: 'stretch', marginTop: spacing.sm },
  }),
);
