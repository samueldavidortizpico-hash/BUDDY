import { useRouter, type Href } from 'expo-router';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
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
        <ScreenHeader title={`Vista de ${elder.firstName}`} fallback="/summary" />
      </View>
      {/* Banner visible (V4): es su pantalla real, en solo lectura; tocar aquí no cambia nada ni cancela sus avisos. */}
      <View style={[styles.banner, { backgroundColor: t.status.attention.bg, borderColor: t.status.attention.border }]} accessibilityRole="alert">
        <Icon name="eye" color={t.status.attention.accent} />
        <AppText variant="secondaryStrong" color={t.status.attention.text} style={styles.flex}>{`Estás viendo la pantalla de ${elder.firstName}`}</AppText>
      </View>
      <View style={styles.note}>
        <Button label={`Cambiar a la cuenta de ${elder.firstName}`} icon="user" size="md" onPress={() => router.push('/account-switch' as Href)} />
      </View>
      <View style={styles.flex}>
        <ThemeOverride name={name} textScale={elder.screen.textScale}>
          <ElderScreen elderId={elder.id} preview />
        </ThemeOverride>
      </View>
      <AppText variant="caption" color={t.c.muted} align="center" style={styles.note}>
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginVertical: spacing.xs, padding: spacing.sm, borderRadius: 16, borderWidth: 1 },
});
