import { Redirect, Stack } from 'expo-router';

import { useValidHandoff } from '@/state/nav';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/provider';

/** Zona del cuidador: requiere sesión. Si el teléfono está entregado al adulto mayor, se muestra su pantalla. */
export default function CaregiverLayout() {
  const t = useTheme();
  const user = useSession((s) => s.user);
  const handoff = useValidHandoff();
  if (!user) return <Redirect href="/" />;
  // El adulto mayor con su propio acceso solo tiene su pantalla: nunca entra a la zona del administrador.
  if (user.role === 'elder') return <Redirect href="/elder" />;
  if (handoff) return <Redirect href="/elder" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: t.c.bg } }} />;
}
