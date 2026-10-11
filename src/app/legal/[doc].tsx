import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { strings } from '@/i18n';
import { spacing } from '@/theme';

/** Términos de uso y política de privacidad (texto en src/i18n). */
export default function Legal() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const content = doc === 'privacy' ? strings.legal.privacy : strings.legal.terms;
  return (
    <ScreenContainer header={<ScreenHeader title={content.title} onClose={() => router.back()} />}>
      <View style={styles.body}>
        {content.body.map((p) => (
          <AppText key={p} variant="body">
            {p}
          </AppText>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md, paddingTop: spacing.xs } });
