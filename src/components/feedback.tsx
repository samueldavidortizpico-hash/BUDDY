/** Retroalimentación: Toast (aviso breve), BottomSheet (hoja inferior) y SuccessBurst (éxito animado). */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  FadeOutUp,
  SlideInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ink, palette, radius, shadow, spacing, tones } from '@/theme';

import { AppText } from './app-text';
import { IconButton } from './button';
import { Icon, type IconName } from './icon';

// ── Toast ────────────────────────────────────────────────────

/** `action`: acción breve (p. ej. Deshacer). El toast nunca es la única vía para información crítica. */
type ToastInput = { message: string; icon?: IconName; action?: { label: string; onPress: () => void } };
const ToastContext = createContext<(t: ToastInput | string) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<(ToastInput & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((t: ToastInput | string) => {
    const next = typeof t === 'string' ? { message: t } : t;
    setToast({ ...next, id: Date.now() });
    AccessibilityInfo.announceForAccessibility(next.message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), next.action ? 5000 : 3200);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={FadeInUp.duration(220)}
          exiting={FadeOutUp.duration(180)}
          pointerEvents={toast.action ? 'box-none' : 'none'}
          accessibilityLiveRegion="polite"
          style={[styles.toast, { top: insets.top + spacing.xs }]}
        >
          <Icon name={toast.icon ?? 'check'} color={palette.mint} />
          <AppText variant="secondaryStrong" color={ink.inverse} style={styles.flex}>
            {toast.message}
          </AppText>
          {toast.action ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
              hitSlop={8}
              style={styles.toastAction}
              onPress={() => {
                toast.action?.onPress();
                setToast(null);
              }}
            >
              <AppText variant="captionStrong" color={ink.inverse}>
                {toast.action.label}
              </AppText>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

// ── BottomSheet ──────────────────────────────────────────────

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
          <View style={styles.scrim} />
        </Pressable>
        <Animated.View
          entering={SlideInDown.duration(280)}
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
        >
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <AppText variant="h2" style={styles.flex} accessibilityRole="header">
              {title}
            </AppText>
            <IconButton icon="close" label="Cerrar" onPress={onClose} variant="soft" />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── SuccessBurst ─────────────────────────────────────────────

function Ring({ delay }: { delay: number }) {
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!reduceMotion) p.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), 2)));
  }, [delay, p, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - p.value), transform: [{ scale: 0.7 + p.value * 0.7 }] }));
  return <Animated.View style={[styles.ring, style]} />;
}

/** Anillos que se expanden y check con rebote: confirmación de guardado. */
export function SuccessBurst({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <View style={styles.success} accessibilityLiveRegion="polite">
      <View style={styles.burst}>
        <Ring delay={0} />
        <Ring delay={450} />
        <Animated.View entering={ZoomIn.springify().damping(11)} style={styles.checkOrb}>
          <Icon name="check" size={52} color={tones.mint.fg} strokeWidth={2.4} />
        </Animated.View>
      </View>
      <AppText variant="h1" align="center">
        {title}
      </AppText>
      <AppText variant="body" color={ink.muted} align="center">
        {text}
      </AppText>
      <View style={styles.successActions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.petrol,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadow.elevated,
  },
  toastAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.pill, backgroundColor: 'rgba(255, 255, 255, 0.18)' },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1, backgroundColor: palette.scrim },
  sheet: {
    backgroundColor: palette.warm,
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    maxHeight: '88%',
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: palette.line },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  success: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  burst: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  ring: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 14, borderColor: 'rgba(94, 217, 181, 0.35)' },
  checkOrb: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: palette.mintPale,
    borderWidth: 12,
    borderColor: 'rgba(94, 217, 181, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successActions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
});
