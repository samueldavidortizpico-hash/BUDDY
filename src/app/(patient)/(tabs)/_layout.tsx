import { Tabs } from 'expo-router/js-tabs';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import type { IconName } from '@/components/icon';

const ICONS: Record<string, IconName> = { home: 'home', medications: 'meds', chat: 'chat', wellness: 'heart' };

export default function PatientTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BottomTabBar {...props} icons={ICONS} />}>
      <Tabs.Screen name="home" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="medications" options={{ title: 'Medicamentos' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="wellness" options={{ title: 'Bienestar' }} />
    </Tabs>
  );
}
