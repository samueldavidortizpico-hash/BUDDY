import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { strings } from '@/i18n';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/provider';

const A = strings.auth;

/** Pie de las pantallas de cuenta: términos y privacidad en 13, con enlaces (área táctil por línea de 44). */
export function LegalFooter() {
  const router = useRouter();
  const t = useTheme();
  const link = { color: t.hc ? t.c.text : t.ink.info, textDecorationLine: 'underline' as const };
  return (
    <View style={styles.wrap}>
      <AppText variant="caption" color={t.c.muted} align="center">
        {`${A.legalPrefix} `}
        <Text accessibilityRole="link" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} style={link}>
          {A.legalTerms}
        </Text>
        {` ${A.legalAnd} `}
        <Text accessibilityRole="link" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} style={link}>
          {A.legalPrivacy}
        </Text>
        .
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { marginTop: 'auto', paddingTop: spacing.md, minHeight: 44, justifyContent: 'center' } });
