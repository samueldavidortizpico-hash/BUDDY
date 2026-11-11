/**
 * Retroalimentación: Toast (aviso breve con acción opcional, p. ej. Deshacer), BottomSheet (hoja inferior),
 * ConfirmDialog (confirmación de acciones destructivas) y SuccessBurst (éxito animado).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOutUp,
  SlideInDown,
  SlideInUp,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/i18n';
import { radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

import { AppText } from './app-text';
import { Button } from './button';
import { Icon, type IconName } from './icon';

// ── Toast ────────────────────────────────────────────────────

type ToastInput = { message: string; icon?: IconName; action?: { label: string; onPress: () => void } };
const ToastContext = createContext<(t: ToastInput | string) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const t = useTheme();
  const s = useStyles();
  const [toast, setToast] = useState<(ToastInput & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((input: ToastInput | string) => {
    const next = typeof input === 'string' ? { message: input } : input;
    setToast({ ...next, id: Date.now() });
    AccessibilityInfo.announceForAccessibility(next.message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), next.action ? 5500 : 3200);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const fg = t.hc ? t.c.bg : '#FFFFFF';
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={reduce ? FadeIn.duration(150) : SlideInUp.springify().damping(18).stiffness(240)}
          exiting={FadeOutUp.duration(180)}
          pointerEvents={toast.action ? 'box-none' : 'none'}
          accessibilityLiveRegion="polite"
          style={[s.toast, { top: insets.top + spacing.xs }]}
        >
          <Icon name={toast.icon ?? 'check'} color={t.hc ? fg : t.c.mint} />
          <AppText variant="secondaryStrong" color={fg} style={s.flex}>
            {toast.message}
          </AppText>
          {toast.action ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
              hitSlop={8}
              style={s.toastAction}
              onPress={() => {
                toast.action?.onPress();
                setToast(null);
              }}
            >
              <AppText variant="captionStrong" color={fg}>
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

export function BottomSheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const t = useTheme();
  const s = useStyles();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.sheetRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={strings.common.close}>
          <View style={s.scrim} />
        </Pressable>
        <Animated.View entering={reduce ? FadeIn.duration(150) : SlideInDown.springify().damping(22).stiffness(220)} accessibilityViewIsModal style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={s.handle} />
          <View style={s.sheetHead}>
            <AppText variant="h2" style={s.flex} accessibilityRole="header">
              {title}
            </AppText>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={strings.common.close} hitSlop={8} style={s.close}>
              <Icon name="close" color={t.c.text} size={24} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── ConfirmDialog ────────────────────────────────────────────

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = strings.common.cancel,
  destructive = false,
  loading = false,
  error,
  children,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Mientras se espera la respuesta: spinner en "confirmar" y los dos botones bloqueados (sin doble envío). */
  loading?: boolean;
  /** Error de la operación, DENTRO del diálogo (antes quedaba detrás, en la pantalla de fondo). */
  error?: string | null;
  /** Lo que el diálogo necesita pedir antes de confirmar (por ejemplo, la contraseña para eliminar la cuenta). */
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const s = useStyles();
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={loading ? undefined : onCancel} statusBarTranslucent>
      {/* El teclado empuja el diálogo; con letra muy grande o poco alto, el cuerpo se desplaza y los botones siguen a la vista. */}
      <KeyboardAvoidingView style={s.dialogRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.scrimAbs} />
        <View style={s.dialog} accessibilityViewIsModal accessibilityRole="alert">
          <ScrollView style={s.dialogScroll} contentContainerStyle={s.dialogBody} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
            <AppText variant="h2" accessibilityRole="header">
              {title}
            </AppText>
            {body ? (
              <AppText variant="secondary" color={t.c.muted}>
                {body}
              </AppText>
            ) : null}
            {children}
            {error ? (
              <View style={s.dialogError} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Icon name="warning" size={18} color={t.ink.danger} />
                <AppText variant="secondaryStrong" color={t.ink.danger} style={s.flex}>
                  {error}
                </AppText>
              </View>
            ) : null}
          </ScrollView>
          <View style={s.dialogActions}>
            <Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} size="md" loading={loading} onPress={onConfirm} />
            <Button label={cancelLabel} variant="ghost" size="md" disabled={loading} onPress={onCancel} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── SuccessBurst ─────────────────────────────────────────────

function Ring({ delay }: { delay: number }) {
  const s = useStyles();
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!reduceMotion) p.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), 2)));
  }, [delay, p, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - p.value), transform: [{ scale: 0.7 + p.value * 0.7 }] }));
  return <Animated.View style={[s.ring, style]} />;
}

/** Anillos que se expanden y check con rebote: confirmación de guardado. */
export function SuccessBurst({ title, text, icon = 'check', children }: { title: string; text: string; icon?: IconName; children?: ReactNode }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.success} accessibilityLiveRegion="polite">
      <View style={s.burst}>
        <Ring delay={0} />
        <Ring delay={450} />
        <Animated.View entering={ZoomIn.springify().damping(11)} style={s.checkOrb}>
          <Icon name={icon} size={52} color={t.ink.mint} strokeWidth={2.2} />
        </Animated.View>
      </View>
      <AppText variant="h1" align="center">
        {title}
      </AppText>
      <AppText variant="body" color={t.c.muted} align="center">
        {text}
      </AppText>
      <View style={s.successActions}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    toast: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      zIndex: 100,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: t.hc ? t.c.text : t.dark ? '#22364A' : '#0D3946',
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...t.shadow.elevated,
    },
    toastAction: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: t.hc ? 2 : 0,
      borderColor: t.c.bg,
      backgroundColor: t.hc ? 'transparent' : 'rgba(255, 255, 255, 0.18)',
    },
    sheetRoot: { flex: 1, justifyContent: 'flex-end' },
    scrim: { flex: 1, backgroundColor: t.c.scrim },
    scrimAbs: { ...StyleSheet.absoluteFill, backgroundColor: t.c.scrim },
    sheet: {
      backgroundColor: t.c.bg,
      borderTopLeftRadius: radius.modal,
      borderTopRightRadius: radius.modal,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.md,
      maxHeight: '88%',
      borderWidth: t.hc ? 2 : 0,
      borderColor: t.c.border,
      ...t.shadow.sheet,
    },
    sheetBody: { gap: spacing.sm, paddingBottom: spacing.xs },
    handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.hc ? t.c.text : t.dark ? '#33475A' : '#C9D6D4' },
    sheetHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    close: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.surface, ...t.hairline },
    dialogRoot: { flex: 1, justifyContent: 'center', padding: spacing.xl },
    dialog: { backgroundColor: t.c.surface, borderRadius: radius.modal, padding: spacing.xl, gap: spacing.sm, maxHeight: '100%', ...t.shadow.sheet, ...t.hairline },
    dialogScroll: { flexGrow: 0, flexShrink: 1 },
    dialogBody: { gap: spacing.sm },
    dialogError: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
    dialogActions: { gap: spacing.sm, marginTop: spacing.sm },
    success: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
    burst: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
    ring: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 14, borderColor: t.hc ? t.c.text : 'rgba(94, 217, 181, 0.35)' },
    checkOrb: {
      width: 112,
      height: 112,
      borderRadius: 56,
      backgroundColor: t.c.mintPale,
      borderWidth: t.hc ? 3 : 12,
      borderColor: t.hc ? t.c.text : 'rgba(94, 217, 181, 0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    successActions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
  }),
);
