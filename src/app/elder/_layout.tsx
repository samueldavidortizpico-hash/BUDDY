import { Redirect, Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { useDb } from '@/infrastructure/local/db';
import { useSession } from '@/state/session';
import { themes } from '@/theme';
import { ThemeOverride, resolveThemeName } from '@/theme/provider';

/** Pantalla del adulto mayor: solo existe mientras el teléfono está entregado. Usa su apariencia y su tamaño de texto. */
export default function ElderLayout() {
  const system = useColorScheme();
  const user = useSession((s) => s.user);
  const handoff = useDb((s) => s.handoff);
  const elder = useDb((s) => (s.handoff ? s.elders[s.handoff.elderId] : undefined));
  if (!user) return <Redirect href="/" />;
  if (!handoff || handoff.userId !== user.id || !elder) return <Redirect href="/summary" />;
  const pref = elder.screen.appearance;
  const name = resolveThemeName({ mode: pref === 'contrast' ? 'auto' : pref, highContrast: pref === 'contrast' }, system);
  return (
    <ThemeOverride name={name} textScale={elder.screen.textScale}>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false, contentStyle: { backgroundColor: themes[name].c.bg } }} />
    </ThemeOverride>
  );
}
