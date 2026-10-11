import { useLocalSearchParams } from 'expo-router';

import { ComingSoon } from '@/components/coming-soon';

export default function SettingsSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  return <ComingSoon title={section ?? 'Ajustes'} />;
}
