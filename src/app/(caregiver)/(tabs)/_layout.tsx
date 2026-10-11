import { Tabs } from 'expo-router/js-tabs';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import type { IconName } from '@/components/icon';

const ICONS: Record<string, IconName> = { summary: 'home', tracking: 'location', alerts: 'bell', account: 'user' };

export default function CaregiverTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BottomTabBar {...props} icons={ICONS} />}>
      <Tabs.Screen name="summary" options={{ title: 'Resumen' }} />
      <Tabs.Screen name="tracking" options={{ title: 'Seguimiento' }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alertas' }} />
      <Tabs.Screen name="account" options={{ title: 'Cuenta' }} />
    </Tabs>
  );
}
