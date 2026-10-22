import { Redirect, Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { useDb } from '@/infrastructure/local/db';
import { useValidHandoff } from '@/state/nav';
import { useSession } from '@/state/session';
import { themes } from '@/theme';
import { ThemeOverride, resolveThemeName } from '@/theme/provider';

/**
 * Pantalla del adulto mayor. Se llega de dos formas:
 * - con su propio acceso (sesión con rol `elder`, creada por su administrador), o
 * - con una entrega heredada (handoff), que ahora se cierra con la contraseña de la cuenta administradora.
 * Usa su apariencia y su tamaño de texto.
 */
export default function ElderLayout() {
  const system = useColorScheme();
  const user = useSession((s) => s.user);
  const handoff = useValidHandoff();
  const elderId = user?.role === 'elder' ? (user.elderId ?? null) : (handoff?.elderId ?? null);
  const elder = useDb((s) => (elderId ? s.elders[elderId] : undefined));
  if (!user) return <Redirect href="/" />;
  if (user.role !== 'elder' && (!handoff || !elder)) return <Redirect href="/summary" />;
  const pref = elder?.screen.appearance ?? 'auto';
  const name = resolveThemeName({ mode: pref === 'contrast' ? 'auto' : pref, highContrast: pref === 'contrast' }, system);
  return (
    <ThemeOverride name={name} textScale={elder?.screen.textScale ?? 'large'}>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false, contentStyle: { backgroundColor: themes[name].c.bg } }} />
    </ThemeOverride>
  );
}
