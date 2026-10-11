/** Bloques de ajustes compartidos por el perfil del adulto mayor y la cuenta del cuidador. */
import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { profileActions, TEXT_SCALE_OPTIONS, useSettings } from '@/features/profile/hooks';
import { ink, palette, radius, shadow, spacing, touch } from '@/theme';

import { AppText } from './app-text';
import { IconTile } from './blocks';
import { SegmentedControl } from './chip';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <View style={styles.wrap}>
      {title ? (
        <AppText variant="eyebrow" color={ink.muted} style={styles.title}>
          {title}
        </AppText>
      ) : null}
      <View style={styles.group}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {child}
            {i < items.length - 1 ? <View style={styles.divider} /> : null}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  danger,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} style={styles.row} scaleTo={0.99}>
      <IconTile icon={icon} tone={danger ? 'coral' : 'mint'} size={40} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong" color={danger ? ink.coral : ink.text}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={ink.muted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron" color={ink.muted} />
    </PressableScale>
  );
}

export function SwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color={ink.muted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        trackColor={{ false: '#C9D6D3', true: palette.mintDeep }}
        thumbColor={palette.white}
        ios_backgroundColor="#C9D6D3"
      />
    </View>
  );
}

/** Selector de tamaño de texto: se aplica a toda la app al instante (y se suma a la escala del sistema). */
export function TextScalePicker() {
  const { textScale } = useSettings();
  return (
    <View style={styles.scale}>
      <AppText variant="bodyStrong">Tamaño del texto</AppText>
      <SegmentedControl accessibilityLabel="Tamaño del texto" options={TEXT_SCALE_OPTIONS} value={textScale} onChange={profileActions.setTextScale} />
      <View style={styles.preview}>
        <AppText variant="body">Así se verá el texto en BUDDY.</AppText>
        <AppText variant="caption" color={ink.muted}>
          También respeta el tamaño de letra que elegiste en tu teléfono.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  wrap: { gap: spacing.xs },
  title: { marginLeft: spacing.xxs },
  group: { backgroundColor: palette.white, borderRadius: radius.button, overflow: 'hidden', ...shadow.soft },
  divider: { height: 1, backgroundColor: palette.line, marginLeft: spacing.md },
  row: { minHeight: touch.primary + 16, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  scale: { gap: spacing.sm, padding: spacing.md },
  preview: { backgroundColor: palette.mintPale, borderRadius: radius.md, padding: spacing.md, gap: spacing.xxs },
});
