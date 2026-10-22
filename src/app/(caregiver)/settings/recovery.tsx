import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Field } from '@/components/forms';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { sessionActions } from '@/state/session';
import { spacing } from '@/theme';

export default function RecoveryCode() {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return <ScreenContainer keyboard header={<ScreenHeader title="Código de recuperación" fallback="/settings/account" />}>
    <View style={{ gap: spacing.md }}>
      <AppText>Guarda el código en un lugar seguro. Generar uno nuevo invalida el anterior.</AppText>
      {code ? <>
        <AppText selectable variant="h2">{code}</AppText>
        <Button label="Ya lo guardé" onPress={() => setCode(null)} />
      </> : <>
        <Field label="Contraseña actual" secure value={password} onChangeText={setPassword} autoCapitalize="none" error={error} />
        <Button label="Generar un código nuevo" loading={busy} onPress={async () => {
          if (busy) return;
          setBusy(true); setError(null);
          try { setCode(await sessionActions.recoveryCode(password)); setPassword(''); }
          catch (e) { setError(e instanceof Error ? e.message : 'No pudimos generar el código.'); }
          finally { setBusy(false); }
        }} />
      </>}
    </View>
  </ScreenContainer>;
}
