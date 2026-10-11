import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gradients, spacing, type GradientName } from '@/theme';

export const SCREEN_PADDING = spacing.screen;

export interface ScreenContainerProps {
  children: ReactNode;
  gradient?: GradientName;
  /** false para pantallas con su propia lista (FlatList) o diseño fijo. */
  scroll?: boolean;
  /** Contenido fijo arriba, fuera del scroll (encabezado). */
  header?: ReactNode;
  /** Contenido fijo abajo (barra de entrada del chat, acciones). */
  footer?: ReactNode;
  /** Para formularios: evita que el teclado tape los campos. */
  keyboard?: boolean;
  /** Pantallas dentro de pestañas: la barra ya reserva el área inferior segura. */
  insideTabs?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Capa decorativa fija detrás del contenido (orbes, arte). */
  background?: ReactNode;
}

/** Contenedor de pantalla: fondo (con degradado opcional), safe areas, scroll y teclado. */
export function ScreenContainer({
  children,
  gradient = 'screen',
  scroll = true,
  header,
  footer,
  keyboard = false,
  insideTabs = false,
  contentStyle,
  background,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = (insideTabs ? 0 : insets.bottom) + spacing.xl;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingBottom: footer ? spacing.md : bottomPad }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
  );

  const inner = (
    <>
      {body}
      {footer ? <View style={[styles.footer, { paddingBottom: insideTabs ? spacing.sm : insets.bottom + spacing.sm }]}>{footer}</View> : null}
    </>
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients[gradient]} style={StyleSheet.absoluteFill} />
      {background}
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        {header ? <View style={styles.header}>{header}</View> : null}
        {keyboard ? (
          <KeyboardAvoidingView behavior="padding" style={styles.flex}>
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
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: SCREEN_PADDING },
  header: { paddingHorizontal: SCREEN_PADDING },
  footer: { paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.sm },
});
