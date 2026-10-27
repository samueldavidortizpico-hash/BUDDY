import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { motion, spacing, touch, type Domain } from '@/theme';
import { makeStyles, useBigText, useTheme } from '@/theme/provider';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';
import { IconTile } from './icon-tile';
import { PressableScale } from './pressable-scale';

/**
 * Fila de lista (V4.3): icono en el fondo suave de su dominio, título, detalle opcional y chevron. Al tocar escala a 0,98
 * y el fondo se oscurece un 4 %. Con letra muy grande el icono cede su ancho al texto.
 */
export function ListRow({
  icon,
  domain = 'slate',
  title,
  detail,
  right,
  divider,
  onPress,
}: {
  icon?: IconName;
  domain?: Domain | 'petrol' | 'slate';
  title: string;
  detail?: string;
  right?: ReactNode;
  divider?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = useStyles();
  const big = useBigText();
  return (
    <PressableScale onPress={onPress} scaleTo={motion.pressScaleCard} dim={0.04} accessibilityLabel={detail ? `${title}. ${detail}` : title} style={[s.row, divider && s.divider]}>
      {icon && !big ? <IconTile icon={icon} domain={domain} size={40} /> : null}
      <View style={s.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        {detail ? (
          <AppText variant="caption" color={t.c.muted}>
            {detail}
          </AppText>
        ) : null}
      </View>
      {right}
      <Icon name="chevron" color={t.c.tertiary} size={20} />
    </PressableScale>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touch.timeRow + 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, overflow: 'hidden' },
    divider: { borderTopWidth: t.borderWidth, borderTopColor: t.c.border },
  }),
);
