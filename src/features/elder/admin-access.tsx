/**
 * "Opciones" de la pantalla del adulto mayor (V3.0): un botón pequeño pero visible y etiquetado en la esquina superior
 * (antes era un gesto oculto de 2 s sobre el saludo y no había forma evidente de salir). Ofrece:
 * - "Cerrar sesión": con confirmación clara ("Vas a salir de BUDDY en este celular") y vuelve a la entrada con la
 *   elección de rol. Sirve para cambiar de celular o de usuario.
 * - "Entrar como administrador": con el teléfono entregado, abre el PIN (/elder/unlock, con "olvidé el PIN"). Con el
 *   acceso propio del adulto mayor pide el PIN del administrador (límite de intentos y espera creciente) o, sin PIN o a
 *   elección, su correo y contraseña en el inicio de sesión (que tiene su propio límite). La contraseña del
 *   administrador nunca se guarda en este teléfono.
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

type Step = 'menu' | 'signOut' | 'pin';

export function ElderOptionsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const t = useTheme();
  const role = useSession((s) => s.user?.role ?? 'caregiver');
  const [step, setStep] = useState<Step>('menu');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const close = () => {
    setStep('menu');
    setMessage(null);
    onClose();
  };

  const signOutTo = async (href: Parameters<typeof router.replace>[0]) => {
    close();
    await sessionActions.signOut();
    router.replace(href);
  };

  const enterAdmin = () => {
    if (role !== 'elder') {
      // Teléfono del administrador entregado: se vuelve con su PIN.
      close();
      router.push('/elder/unlock');
      return;
    }
    if (handoffActions.hasPin()) setStep('pin');
    else signOutTo({ pathname: '/sign-in', params: { role: 'caregiver' } });
  };

  const submit = async (pin: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await handoffActions.verifyAdminPin(pin);
      if (!mounted.current) return;
      if (r.result === 'ok') {
        successHaptic();
        await signOutTo({ pathname: '/sign-in', params: { role: 'caregiver' } });
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

  return (
    <BottomSheet visible={visible} onClose={close} title={step === 'pin' ? P.title : step === 'signOut' ? A.signOutTitle : A.title}>
      {step === 'menu' ? (
        <View style={styles.body}>
          <Button label={A.enterAdmin} icon="lock" size="elder" onPress={enterAdmin} />
          <Button label={A.signOut} icon="logout" variant="tonal" tone="mint" size="elder" onPress={() => setStep('signOut')} />
        </View>
      ) : step === 'signOut' ? (
        <View style={styles.body}>
          <AppText variant="body">{A.signOutBody}</AppText>
          <Button label={A.signOutConfirm} icon="logout" size="elder" onPress={() => signOutTo('/')} />
          <Button label={strings.common.cancel} variant="ghost" size="md" onPress={() => setStep('menu')} />
        </View>
      ) : (
        <View style={styles.body}>
          <AppText variant="body" color={t.c.muted}>
            {A.pinBody}
          </AppText>
          <PinPad onComplete={submit} disabled={busy} error={message} />
          <Button label={A.usePassword} variant="ghost" size="md" disabled={busy} onPress={() => signOutTo({ pathname: '/sign-in', params: { role: 'caregiver' } })} />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.md } });
