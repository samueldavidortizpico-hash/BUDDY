import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ink, spacing } from '@/theme';

import { AppText } from './app-text';
import { IconTile } from './blocks';
import { BuddyAvatar } from './buddy';
import { Button } from './button';
import { Card } from './card';
import type { IconName } from './icon';
import { ScreenContainer } from './screen-container';
import { ScreenHeader } from './screen-header';

/** Pantalla o sección aún no implementada: lo dice claramente ("Próximamente"), nunca la presenta como real. */
export function ComingSoon({
  title,
  text = 'Esta sección estará disponible próximamente.',
  icon = 'settings',
  links = [],
  showBack = true,
}: {
  title: string;
  text?: string;
  icon?: IconName;
  links?: { label: string; href: Href }[];
  showBack?: boolean;
}) {
  const router = useRouter();
  return (
    <ScreenContainer header={<ScreenHeader title={title} showBack={showBack} />}>
      <Card style={styles.card}>
        <View style={styles.art}>
          <IconTile icon={icon} tone="mint" size={64} />
          <BuddyAvatar size="medium" />
        </View>
        <AppText variant="eyebrow" color={ink.mint} align="center">
          PRÓXIMAMENTE
        </AppText>
        <AppText variant="body" color={ink.muted} align="center">
          {text}
        </AppText>
      </Card>
      <View style={styles.links}>
        {links.map((l) => (
          <Button key={l.label} label={l.label} variant="secondary" trailing="chevron" onPress={() => router.push(l.href)} />
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, marginTop: spacing.sm },
  art: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  links: { gap: spacing.sm, marginTop: spacing.lg },
});
