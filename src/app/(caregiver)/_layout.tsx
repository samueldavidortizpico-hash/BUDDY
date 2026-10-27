import { Redirect, Stack, type Href } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { useValidHandoff } from '@/state/nav';
import { useSession } from '@/state/session';
import { motion } from '@/theme';
import { useTheme } from '@/theme/provider';

/** Zona del cuidador: requiere sesión. Si el teléfono está entregado al adulto mayor, se muestra su pantalla. */
export default function CaregiverLayout() {
  const t = useTheme();
  const reduce = useReducedMotion();
  const user = useSession((s) => s.user);
  const handoff = useValidHandoff();
  if (!user) return <Redirect href="/" />;
  // El adulto mayor con su propio acceso solo tiene su pantalla: nunca entra a la zona del administrador.
  if (user.role === 'elder') return <Redirect href="/elder" />;
  if (user.role === 'nurse') return <Redirect href={'/nurse' as Href} />;
  if (handoff) return <Redirect href="/elder" />;
  return <Stack screenOptions={{ headerShown: false, animation: reduce ? 'fade' : 'slide_from_right', animationDuration: reduce ? motion.reduced : motion.screen, contentStyle: { backgroundColor: t.c.bg } }} />;
}
