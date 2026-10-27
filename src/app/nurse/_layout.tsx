import { Redirect, Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { useSession } from '@/state/session';
import { motion } from '@/theme';
import { useTheme } from '@/theme/provider';

/** Zona de la enfermera (V4.3): requiere su sesión; cualquier otro rol vuelve a su inicio. */
export default function NurseLayout() {
  const t = useTheme();
  const reduce = useReducedMotion();
  const user = useSession((s) => s.user);
  if (!user) return <Redirect href="/" />;
  if (user.role !== 'nurse') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, animation: reduce ? 'fade' : 'slide_from_right', animationDuration: reduce ? motion.reduced : motion.screen, contentStyle: { backgroundColor: t.c.bg } }} />;
}
