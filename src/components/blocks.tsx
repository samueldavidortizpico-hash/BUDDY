/** Bloques de contenido reutilizables: encabezados de sección, tarjetas de dato, filas, estados y avisos. */
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { AlertStatus, DisplayDoseStatus } from '@/types/domain';
import { ink, palette, radius, shadow, spacing, tones, touch, type Tone } from '@/theme';

import { AppText } from './app-text';
import { Button } from './button';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

export function SectionHeader({
  title,
  subtitle,
  action,
  style,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.flex}>
        <AppText variant="h3" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="secondary" color={ink.muted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action ? (
        <PressableScale onPress={action.onPress} accessibilityRole="link" accessibilityLabel={action.label} style={styles.link} hitSlop={8}>
          <AppText variant="secondaryStrong" color={ink.mint}>
            {action.label}
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

/** Cuadro de icono con tinte (usado en filas, tarjetas y métricas). */
export function IconTile({ icon, tone = 'mint', size = 44, solid = false }: { icon: IconName; tone?: Tone; size?: number; solid?: boolean }) {
  const t = tones[tone];
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: solid ? t.solid : t.bg }]}>
      <Icon name={icon} color={solid ? ink.inverse : t.fg} size={size * 0.52} />
    </View>
  );
}

export function StatCard({
  icon,
  tone = 'mint',
  value,
  label,
  onPress,
  accessibilityHint,
  style,
}: {
  icon: IconName;
  tone?: Tone;
  value: string;
  label: string;
  onPress?: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const content = (
    <>
      <IconTile icon={icon} tone={tone} size={40} />
      <AppText variant="h3">{value}</AppText>
      <AppText variant="caption" color={ink.muted}>
        {label}
      </AppText>
    </>
  );
  return onPress ? (
    <PressableScale onPress={onPress} accessibilityLabel={`${label}: ${value}`} accessibilityHint={accessibilityHint} style={[styles.stat, style]}>
      {content}
    </PressableScale>
  ) : (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={[styles.stat, style]}>
      {content}
    </View>
  );
}

export function ListItem({
  icon,
  tone = 'mint',
  title,
  subtitle,
  onPress,
  right,
  accessibilityHint,
  style,
}: {
  icon?: IconName;
  tone?: Tone;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const body = (
    <>
      {icon ? <IconTile icon={icon} tone={tone} /> : null}
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="secondary" color={ink.muted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron" color={ink.muted} /> : null)}
    </>
  );
  return onPress ? (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      style={[styles.row, style]}
    >
      {body}
    </PressableScale>
  ) : (
    <View style={[styles.row, style]}>{body}</View>
  );
}

export function StatusBadge({ label, tone, icon }: { label: string; tone: Tone; icon?: IconName }) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={14} color={t.fg} strokeWidth={2.2} /> : null}
      <AppText variant="captionStrong" color={t.fg}>
        {label}
      </AppText>
    </View>
  );
}

const DOSE_BADGE: Record<DisplayDoseStatus, { label: string; tone: Tone; icon: IconName }> = {
  pending: { label: 'Pendiente', tone: 'slate', icon: 'clock' },
  taken: { label: 'Tomada', tone: 'mint', icon: 'check' },
  snoozed: { label: 'Pospuesta', tone: 'sky', icon: 'clock' },
  skipped: { label: 'Omitida', tone: 'coral', icon: 'close' },
  unconfirmed: { label: 'Sin confirmar', tone: 'yellow', icon: 'bell' },
};

/** Estado de una toma: color + icono + texto (nunca solo color). */
export function DoseStatusBadge({ status }: { status: DisplayDoseStatus }) {
  return <StatusBadge {...DOSE_BADGE[status]} />;
}

export const doseStatusLabel = (s: DisplayDoseStatus) => DOSE_BADGE[s].label;

const ALERT_BADGE: Record<AlertStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pendiente', tone: 'coral' },
  important: { label: 'Importante', tone: 'yellow' },
  attended: { label: 'Atendida', tone: 'sky' },
  resolved: { label: 'Resuelto', tone: 'mint' },
};

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  return <StatusBadge {...ALERT_BADGE[status]} />;
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: IconName;
  title: string;
  text: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.empty}>
      <IconTile icon={icon} tone="mint" size={64} />
      <AppText variant="h3" align="center">
        {title}
      </AppText>
      <AppText variant="secondary" color={ink.muted} align="center">
        {text}
      </AppText>
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" style={styles.emptyAction} /> : null}
    </View>
  );
}

/** Aviso orientativo (guidance-card del Figma). */
export function Notice({ text, icon = 'shield', style }: { text: string; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.notice, style]} accessible accessibilityLabel={text}>
      <Icon name={icon} color={palette.petrol} size={22} />
      <AppText variant="caption" color={ink.muted} style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

/** Etiqueta "Datos de ejemplo" para que nada ficticio se confunda con real. */
export function DemoBadge({ label = 'Datos de ejemplo', style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.demo, style]} accessible accessibilityLabel={label}>
      <Icon name="warning" size={14} color={ink.yellow} strokeWidth={2.2} />
      <AppText variant="meta" color={ink.yellow}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  section: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.sm },
  link: { minHeight: touch.min, justifyContent: 'center' },
  tile: { alignItems: 'center', justifyContent: 'center' },
  stat: {
    flex: 1,
    minHeight: 120,
    backgroundColor: palette.white,
    borderRadius: 19,
    padding: spacing.md,
    gap: spacing.xxs,
    ...shadow.soft,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: palette.white,
    borderRadius: radius.button,
    ...shadow.soft,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.md },
  emptyAction: { alignSelf: 'stretch', marginTop: spacing.xs },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: palette.notice,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    alignSelf: 'flex-start',
    backgroundColor: palette.yellowPale,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
});
