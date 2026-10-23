import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Card } from './card';
import { Icon } from './icon';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/provider';

export function PlusLock({ label = 'Disponible en BUDDY Plus' }: { label?: string }) {
  const router = useRouter();
  const t = useTheme();
  return (
    <Card style={s.lock} onPress={() => router.push('/plus' as Href)} accessibilityLabel={label}>
      <Icon name="lock" color={t.ink.lavender} />
      <View style={s.flex}><AppText variant="secondaryStrong">{label}</AppText><AppText variant="caption" color={t.c.muted}>Conoce qué incluye</AppText></View>
      <Icon name="chevron" color={t.c.muted} />
    </Card>
  );
}

const s = StyleSheet.create({ lock: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 64 }, flex: { flex: 1, minWidth: 0 } });
