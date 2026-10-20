import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import type { IconName } from '@/components/icon';
import { BuddyLauncher } from '@/features/feed/launcher';
import { strings } from '@/i18n';

const ICONS: Record<string, IconName> = { summary: 'home', routine: 'calendar', health: 'heart', settings: 'settings' };

/**
 * Pestañas del administrador (V3.0): Inicio, Rutina, Salud y Ajustes, con el robot lanzador encima. El chat de BUDDY ya
 * no es una pestaña: es una pantalla completa del stack (`/buddy`) que se abre desde el robot, el Inicio y las novedades,
 * sin barra de pestañas que tape su compositor.
 */
export default function CaregiverTabs() {
  const T = strings.tabs;
  return (
    <View style={styles.flex}>
      <Tabs screenOptions={{ headerShown: false, animation: 'fade' }} tabBar={(props) => <BottomTabBar {...props} icons={ICONS} />}>
        <Tabs.Screen name="summary" options={{ title: T.summary }} />
        <Tabs.Screen name="routine" options={{ title: T.routine }} />
        <Tabs.Screen name="health" options={{ title: T.health }} />
        <Tabs.Screen name="settings" options={{ title: T.settings }} />
      </Tabs>
      {/* Robot lanzador con la bolita de novedades: solo sobre las pestañas (el chat está fuera de ellas). */}
      <BuddyLauncher />
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
