import { useRouter, type Href } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import { radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

import { AppText } from './app-text';
import { Icon } from './icon';

/**
 * Encabezado obligatorio de toda pantalla que no sea raíz de pestaña (lo verifica scripts/check-headers.ts):
 * flecha "Volver" arriba a la izquierda (48 dp), título centrado y acciones a la derecha.
 * En modales se puede añadir "Cerrar" a la derecha con `onClose`.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  fallback = '/',
  onClose,
  right,
  leading,
  showBack = true,
}: {
  title: string;
  subtitle?: string;
  /** Por defecto vuelve a la pantalla anterior (o a `fallback` si no hay historial). */
  onBack?: () => void;
  fallback?: Href;
  onClose?: () => void;
  right?: ReactNode;
  /** Avatar junto al título (chat de BUDDY): el título se alinea a la izquierda, al lado del avatar. */
  leading?: ReactNode;
  /** Solo raíces de pestaña antiguas: sin flecha. */
  showBack?: boolean;
  /** @deprecated la etiqueta accesible es siempre "Volver". */
  backLabel?: string;
}) {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(fallback)));
  // Botón atrás de Android sin historial (pantalla abierta por enlace o tras un replace): va a `fallback` en vez de
  // cerrar la app. Con historial, el comportamiento nativo ya equivale a la flecha.
  useEffect(() => {
    if (Platform.OS !== 'android' || !showBack) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) return false;
      router.replace(fallback);
      return true;
    });
    return () => sub.remove();
  }, [router, fallback, showBack]);
  return (
    <View style={s.row}>
      {showBack ? <Pressable
        onPress={back}
        accessibilityRole="button"
        accessibilityLabel={strings.common.back}
        hitSlop={8}
        style={({ pressed }) => [s.icon, pressed && s.pressed]}
      >
        <Icon name="back" size={28} color={t.c.text} strokeWidth={2.2} />
      </Pressable> : <View style={s.spacer} />}
      <View style={[s.center, leading ? s.withLeading : null]}>
        {leading}
        <View style={s.titles}>
          {/* V4: H2 de hasta 2 líneas. Tope ×1.5: con texto al 200 % el título partía palabras y quedaba cortado. */}
          <AppText variant="h2" align={leading ? 'left' : 'center'} accessibilityRole="header" numberOfLines={2} maxScale={1.5}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color={t.c.muted} align={leading ? 'left' : 'center'} numberOfLines={2} maxScale={1.5}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={s.side}>
        {right}
        {onClose ? (
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={strings.common.close} hitSlop={8} style={({ pressed }) => [s.icon, pressed && s.pressed]}>
            <Icon name="close" size={26} color={t.c.text} strokeWidth={2.2} />
          </Pressable>
        ) : null}
        {!right && !onClose ? <View style={s.spacer} /> : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
    icon: {
      width: touch.min,
      height: touch.min,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.c.surface,
      ...t.hairline,
    },
    spacer: { width: touch.min, height: touch.min },
    pressed: { opacity: 0.7 },
    center: { flex: 1, minWidth: 0 },
    withLeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    titles: { flex: 1, minWidth: 0 },
    side: { minWidth: touch.min, flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs },
  }),
);
