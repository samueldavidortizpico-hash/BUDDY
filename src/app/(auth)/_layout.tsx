import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { motion } from '@/theme';

export default function AuthLayout() {
  const reduce = useReducedMotion();
  return <Stack screenOptions={{ headerShown: false, animation: reduce ? 'fade' : 'slide_from_right', animationDuration: reduce ? motion.reduced : motion.screen }} />;
}
