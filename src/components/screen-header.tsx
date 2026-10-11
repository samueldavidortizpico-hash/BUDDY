import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ink, spacing } from '@/theme';

import { AppText } from './app-text';
import { IconButton } from './button';

/** Encabezado de pantalla: Atrás (con texto), título y acción opcional. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Atrás',
  showBack = true,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  showBack?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={styles.row}>
      {showBack ? <IconButton icon="back" label={backLabel} onPress={back} variant="plain" /> : null}
      <View style={styles.center}>
        <AppText variant="h3" align={showBack || right ? 'center' : 'left'} accessibilityRole="header" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={ink.muted} align="center">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? (showBack ? <View style={styles.spacer} /> : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  center: { flex: 1 },
  spacer: { width: 72 },
});
