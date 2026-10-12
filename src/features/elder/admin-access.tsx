/**
 * Acceso discreto del administrador desde la pantalla del adulto mayor (mantener presionado el saludo 2 s).
 * Pide el PIN de 4 dígitos (límite de intentos y espera creciente) y ofrece:
 * - "Cambiar de usuario": cierra la sesión y vuelve a la entrada.
 * - "Entrar como administrador": con el teléfono entregado, lo desbloquea; con el acceso propio del adulto mayor,
 *   cierra su sesión y abre el inicio de sesión del administrador (su contraseña nunca se guarda en este teléfono).
 */
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { BottomSheet } from '@/components/feedback';
import { PinPad } from '@/components/pin-pad';
import { strings } from '@/i18n';
import { handoffActions } from '@/state/handoff';
import { sessionActions, useSession } from '@/state/session';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/provider';
import { successHaptic, warningHaptic } from '@/utils/haptics';

const A = strings.adminAccess;
const P = strings.pin;

export function AdminAccessSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const t = useTheme();
  const role = useSession((s) => s.user?.role ?? 'caregiver');
  const [unlocked, setUnlocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const hasPin = handoffActions.hasPin();
  const open = unlocked || !hasPin;

  const close = () => {
    setUnlocked(false);
    setMessage(null);
    onClose();
  };

  const submit = async (pin: string) => {
    setBusy(true);
    setMessage(null);
    try {
      // Con el teléfono entregado, el PIN correcto también cierra la entrega.
      const r = role === 'elder' ? await handoffActions.verifyAdminPin(pin) : await handoffActions.unlock(pin);
      if (!mounted.current) return;
      if (r.result === 'ok') {
        successHaptic();
        setUnlocked(true);
      } else {
        warningHaptic();
        setMessage(r.result === 'wrong' ? P.wrong(r.left) : P.locked(r.seconds));
      }
    } catch {
      if (mounted.current) setMessage(P.unavailable);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const switchUser = async () => {
    close();
    await sessionActions.signOut();
    router.replace('/');
  };
  const enterAdmin = async () => {
    close();
    if (role === 'elder') {
      await sessionActions.signOut();
      router.replace({ pathname: '/sign-in', params: { role: 'caregiver' } });
    } else {
      router.replace('/summary');
    }
  };

  return (
    <BottomSheet visible={visible} onClose={close} title={open ? A.title : P.title}>
      {open ? (
        <View style={styles.body}>
          {!hasPin ? (
            <AppText variant="secondary" color={t.c.muted}>
              {A.noPin}
            </AppText>
          ) : null}
          <Button label={A.enterAdmin} icon="lock" size="elder" onPress={enterAdmin} />
          <Button label={A.switchUser} icon="users" variant="tonal" tone="mint" size="elder" onPress={switchUser} />
        </View>
      ) : (
        <View style={styles.body}>
          <AppText variant="body" color={t.c.muted}>
            {A.pinBody}
          </AppText>
          <PinPad onComplete={submit} disabled={busy} error={message} />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md } });
