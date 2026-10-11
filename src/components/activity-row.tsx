import { StyleSheet, View } from 'react-native';

import type { ActivityItem } from '@/features/caregiver/hooks';
import { ink, palette, radius, shadow, spacing, type Tone } from '@/theme';
import { formatAgo } from '@/utils/dates';

import { AppText } from './app-text';
import { IconTile } from './blocks';
import type { IconName } from './icon';

const VISUAL: Record<ActivityItem['kind'], { icon: IconName; tone: Tone }> = {
  dose: { icon: 'meds', tone: 'mint' },
  mood: { icon: 'heart', tone: 'lavender' },
  symptom: { icon: 'warning', tone: 'yellow' },
  vital: { icon: 'heart', tone: 'coral' },
};

/** Fila de actividad registrada por la persona acompañada. */
export function ActivityRow({ item, now }: { item: ActivityItem; now?: Date }) {
  const v = VISUAL[item.kind];
  const ago = now ? formatAgo(new Date(item.at), now) : null;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${item.title}: ${item.detail}${ago ? `, ${ago}` : ''}`}>
      <IconTile icon={v.icon} tone={v.tone} size={40} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{item.title}</AppText>
        <AppText variant="caption" color={ink.muted}>
          {item.detail}
        </AppText>
      </View>
      {ago ? (
        <AppText variant="meta" color={ink.muted}>
          {ago}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: palette.white, borderRadius: radius.md, padding: spacing.sm, ...shadow.soft },
});
