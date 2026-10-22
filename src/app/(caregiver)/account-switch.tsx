import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Field } from '@/components/forms';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { AuthError } from '@/domain/auth';
import { useActiveElder } from '@/state/data';
import { sessionActions } from '@/state/session';
import { spacing } from '@/theme';

export default function AccountSwitch() {
  const elder = useActiveElder();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return <ScreenContainer keyboard header={<ScreenHeader title="Cambiar de cuenta" fallback="/preview" />}>
    <View style={{ gap: spacing.md }}>
      <AppText variant="h2">{`Entrar a la cuenta de ${elder?.firstName ?? 'tu persona'}`}</AppText>
      <Field label="Código de acceso de esta persona" secure value={password} onChangeText={setPassword} autoCapitalize="none" error={error} />
      <Button label="Cambiar de cuenta" loading={busy} disabled={!elder || !password} onPress={async () => {
        if (!elder || busy) return;
        setBusy(true); setError(null);
        try { await sessionActions.switchToElder(elder.id, password); setPassword(''); router.replace('/elder'); }
        catch (e) { setError(e instanceof AuthError ? e.message : 'No pudimos cambiar de cuenta. Revisa su acceso en Mis personas.'); }
        finally { setBusy(false); }
      }} />
      <Button label="Configurar el acceso" size="sm" variant="ghost" onPress={() => elder && router.push({ pathname: '/settings/access/[elderId]', params: { elderId: elder.id } })} />
    </View>
  </ScreenContainer>;
}
