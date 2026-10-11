import { Redirect, Stack } from 'expo-router';

import { useDb } from '@/infrastructure/local/db';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/provider';

/** Zona del cuidador: requiere sesión. Si el teléfono está entregado al adulto mayor, se muestra su pantalla. */
export default function CaregiverLayout() {
  const t = useTheme();
  const user = useSession((s) => s.user);
  const handoff = useDb((s) => (user && s.handoff?.userId === user.id ? s.handoff : null));
  if (!user) return <Redirect href="/" />;
  if (handoff) return <Redirect href="/elder" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: t.c.bg } }} />;
}
