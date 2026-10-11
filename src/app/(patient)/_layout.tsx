import { Stack } from 'expo-router';

import { useSyncTodayDoses } from '@/features/medications/hooks';
import { useNow } from '@/hooks/use-now';

export default function PatientLayout() {
  // Crea las tomas del día al abrir y al cambiar de fecha (datos locales de demostración).
  useSyncTodayDoses(useNow(60_000));
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
