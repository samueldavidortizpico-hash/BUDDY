import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ErrorState } from '@/components/states';
import { ToastProvider } from '@/components/feedback';
import { RobotStageProvider } from '@/components/robot/stage';
import { useStorageReady } from '@/features/profile/hooks';
import { ThemeProvider, useAppearanceStore, useTheme } from '@/theme/provider';

SplashScreen.preventAutoHideAsync();

const subscribeAppearance = (cb: () => void) => useAppearanceStore.persist.onFinishHydration(cb);
const appearanceHydrated = () => useAppearanceStore.persist.hasHydrated();

/** Error inesperado en cualquier pantalla: mensaje claro y reintento (convención de Expo Router). */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <ThemeProvider>
      <ErrorState onRetry={retry} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const storageReady = useStorageReady();
  const appearanceReady = useSyncExternalStore(subscribeAppearance, appearanceHydrated, appearanceHydrated);
  // Si la fuente falla, seguimos con la del sistema en lugar de bloquear la app.
  const ready = (fontsLoaded || !!fontError) && storageReady && appearanceReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ToastProvider>
          <RobotStageProvider>
            <ThemedStack />
          </RobotStageProvider>
        </ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStack() {
  const t = useTheme();
  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, gestureEnabled: true, contentStyle: { backgroundColor: t.c.bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(patient)" />
        <Stack.Screen name="(caregiver)" />
        <Stack.Screen name="modals/add-medication" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/add-vital" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals/reminder" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen
          name="modals/emergency"
          options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
        />
        <Stack.Screen name="dev/gallery" />
      </Stack>
    </>
  );
}
