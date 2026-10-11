import { Stack } from 'expo-router';

import { useSyncTodayDoses } from '@/features/medications/hooks';
import { useNow } from '@/hooks/use-now';

export default function CaregiverLayout() {
  useSyncTodayDoses(useNow(60_000));
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
