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

import { ToastProvider } from '@/components/feedback';
import { ErrorState } from '@/components/states';
import { db } from '@/infrastructure/local/db';
import { startSession, useSession } from '@/state/session';
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
  const dbReady = useSyncExternalStore(db.onReady, db.isReady, db.isReady);
  const appearanceReady = useSyncExternalStore(subscribeAppearance, appearanceHydrated, appearanceHydrated);
  const session = useSession((s) => s.status);

  // La sesión se lee cuando la base local ya está hidratada (crea los ajustes de la cuenta si faltan).
  useEffect(() => {
    if (dbReady) startSession();
  }, [dbReady]);

  // Si la fuente falla, seguimos con la del sistema en lugar de bloquear la app.
  const ready = (fontsLoaded || !!fontError) && dbReady && appearanceReady && session !== 'loading';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ToastProvider>
          <ThemedStack />
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
      <Stack screenOptions={{ headerShown: false, gestureEnabled: true, animation: 'slide_from_right', contentStyle: { backgroundColor: t.c.bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="legal/[doc]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="dev/robot" />
      </Stack>
    </>
  );
}
