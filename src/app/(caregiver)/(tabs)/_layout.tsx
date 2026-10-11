import { Tabs } from 'expo-router/js-tabs';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import type { IconName } from '@/components/icon';
import { strings } from '@/i18n';

const ICONS: Record<string, IconName> = { summary: 'home', routine: 'calendar', buddy: 'sparkle', health: 'heart', settings: 'settings' };

/** Pestañas del cuidador: Resumen, Rutina, BUDDY (centro, destacada), Salud y Ajustes. */
export default function CaregiverTabs() {
  const T = strings.tabs;
  return (
    <Tabs screenOptions={{ headerShown: false, animation: 'fade' }} tabBar={(props) => <BottomTabBar {...props} icons={ICONS} featured="buddy" />}>
      <Tabs.Screen name="summary" options={{ title: T.summary }} />
      <Tabs.Screen name="routine" options={{ title: T.routine }} />
      <Tabs.Screen name="buddy" options={{ title: T.buddy }} />
      <Tabs.Screen name="health" options={{ title: T.health }} />
      <Tabs.Screen name="settings" options={{ title: T.settings }} />
    </Tabs>
  );
}
