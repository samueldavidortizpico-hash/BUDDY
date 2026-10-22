import { useRouter, type Href } from 'expo-router';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { ElderScreen } from '@/features/elder/screen';
import { strings } from '@/i18n';
import { useActiveElder } from '@/state/data';
import { spacing } from '@/theme';
import { ThemeOverride, resolveThemeName, useTheme } from '@/theme/provider';

/** Vista previa exacta de la pantalla del adulto mayor (sin poder tocar nada). */
export default function Preview() {
  const router = useRouter();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const system = useColorScheme();
  const elder = useActiveElder();
  if (!elder) return null;
  const pref = elder.screen.appearance;
  const name = resolveThemeName({ mode: pref === 'contrast' ? 'auto' : pref, highContrast: pref === 'contrast' }, system);
  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      <View style={[styles.bar, { paddingTop: insets.top, backgroundColor: t.c.surface }, t.hairline]}>
        <ScreenHeader title={`Vista de ${elder.firstName}`} subtitle={`Estás viendo la pantalla de ${elder.firstName}`} fallback="/summary" />
      </View>
      <View style={styles.note}>
        <Button label={`Cambiar a la cuenta de ${elder.firstName}`} icon="user" size="md" onPress={() => router.push('/account-switch' as Href)} />
      </View>
      <View style={styles.flex}>
        <ThemeOverride name={name} textScale={elder.screen.textScale}>
          <ElderScreen elderId={elder.id} preview />
        </ThemeOverride>
      </View>
      <AppText variant="meta" color={t.c.muted} align="center" style={styles.note}>
        {strings.routine.previewBody}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  bar: { paddingHorizontal: spacing.screen },
  note: { paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
});
