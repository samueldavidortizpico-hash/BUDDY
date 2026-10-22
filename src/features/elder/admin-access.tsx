/** Opciones de la cuenta adulta; la contraseña del administrador se verifica en una ruta propia. */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { BottomSheet } from '@/components/feedback';
import { strings } from '@/i18n';
import { sessionActions } from '@/state/session';
import { spacing } from '@/theme';

export function ElderOptionsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => { setConfirm(false); setError(null); onClose(); };
  return <BottomSheet visible={visible} onClose={close} title={confirm ? strings.adminAccess.signOutTitle : strings.adminAccess.title}>
    <View style={{ gap: spacing.md }}>
      {confirm ? <>
        <AppText>{strings.adminAccess.signOutBody}</AppText>
        {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
        <Button label={strings.adminAccess.signOutConfirm} size="elder" loading={busy} onPress={async () => {
          if (busy) return;
          setBusy(true);
          try { await sessionActions.signOut(); close(); router.replace('/'); }
          catch { setError('No pudimos cerrar sesión. Inténtalo de nuevo.'); }
          finally { setBusy(false); }
        }} />
        <Button label={strings.common.cancel} variant="ghost" size="elder" onPress={() => setConfirm(false)} />
      </> : <>
        <Button label={strings.adminAccess.enterAdmin} icon="lock" size="elder" onPress={() => { close(); router.push('/elder/unlock'); }} />
        <Button label={strings.adminAccess.signOut} icon="logout" variant="ghost" size="elder" onPress={() => setConfirm(true)} />
      </>}
    </View>
  </BottomSheet>;
}
