import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedScrollHandler, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gradients as legacyGradients, spacing, type GradientName } from '@/theme';
import { useTheme } from '@/theme/provider';

import { tabBarSpace } from './bottom-tab-bar';

export const SCREEN_PADDING = spacing.screen;

export interface ScreenContainerProps {
  children: ReactNode;
  /** Degradado de fondo: 'screen' (por defecto), 'welcome', colores propios o un nombre heredado. */
  gradient?: 'screen' | 'welcome' | GradientName;
  gradientColors?: readonly [string, string, ...string[]];
  /** false para pantallas con su propia lista (FlatList) o diseño fijo. */
  scroll?: boolean;
  /** Contenido fijo arriba, fuera del scroll (encabezado). */
  header?: ReactNode;
  /** Contenido fijo abajo (barra de entrada del chat, acciones). */
  footer?: ReactNode;
  /** Formularios: evita que el teclado tape los campos. */
  keyboard?: boolean;
  /** Pantallas dentro de pestañas: la barra ya reserva el área inferior segura. */
  insideTabs?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Capa decorativa fija detrás del contenido (orbes, arte). */
  background?: ReactNode;
  /** Desplazamiento vertical en el hilo de UI (el robot de las pantallas de cuenta se achica con él). */
  scrollY?: SharedValue<number>;
}

/** Contenedor de pantalla: fondo del tema (con degradado opcional), safe areas, scroll y teclado. */
export function ScreenContainer({
  children,
  gradient = 'screen',
  gradientColors,
  scroll = true,
  header,
  footer,
  keyboard = false,
  insideTabs = false,
  contentStyle,
  background,
  scrollY,
}: ScreenContainerProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // Dentro de pestañas la barra flota sobre el contenido (V2.4): se reserva su alto más el del robot lanzador.
  const bottomPad = (insideTabs ? tabBarSpace(insets.bottom) + 88 : insets.bottom) + spacing.xl;
  const colors =
    gradientColors ?? (gradient === 'screen' || gradient === 'welcome' ? t.gradients[gradient] : legacyGradients[gradient]);

  const onScroll = useAnimatedScrollHandler((e) => {
    if (scrollY) scrollY.set(e.contentOffset.y);
  });

  const body = scroll ? (
    <Animated.ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingBottom: footer ? spacing.md : bottomPad }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </Animated.ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
  );

  const inner = (
    <>
      {body}
      {footer ? <View style={[styles.footer, { paddingBottom: insideTabs ? tabBarSpace(insets.bottom) + spacing.sm : insets.bottom + spacing.sm }]}>{footer}</View> : null}
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      {t.hc ? null : <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />}
      {background}
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        {header ? <View style={styles.header}>{header}</View> : null}
        {keyboard ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
            {inner}
          </KeyboardAvoidingView>
        ) : (
          inner
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  flex: { flex: 1 },
  content: { paddingHorizontal: SCREEN_PADDING },
  header: { paddingHorizontal: SCREEN_PADDING },
  footer: { paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.sm },
});
