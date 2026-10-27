import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';

import { BottomTabBar } from '@/components/bottom-tab-bar';
import type { IconName } from '@/components/icon';
import { strings } from '@/i18n';
import { motion } from '@/theme';

const ICONS: Record<string, IconName> = { summary: 'home', health: 'heart', location: 'location', routine: 'calendar' };

/**
 * Pestañas del administrador (V3.1): Inicio, Salud, BUDDY, Ubicación y Rutina. BUDDY abre el chat del stack en pantalla
 * completa, y Ajustes es una ruta del stack que se abre desde el engranaje de Inicio.
 */
export default function CaregiverTabs() {
  const T = strings.tabs;
  return (
    <View style={styles.flex}>
      <Tabs screenOptions={{ headerShown: false, animation: 'fade', transitionSpec: { animation: 'timing', config: { duration: motion.tab } } }} tabBar={(props) => <BottomTabBar {...props} icons={ICONS} caregiver />}>
        <Tabs.Screen name="summary" options={{ title: T.summary }} />
        <Tabs.Screen name="health" options={{ title: T.health }} />
        <Tabs.Screen name="location" options={{ title: T.location }} />
        <Tabs.Screen name="routine" options={{ title: T.routine }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
