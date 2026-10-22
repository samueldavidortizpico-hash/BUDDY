import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Field } from '@/components/forms';
import { AuthError } from '@/domain/auth';
import { sessionActions } from '@/state/session';
import { spacing } from '@/theme';

export function AdminPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  return <View style={{ gap: spacing.md }}>
    <AppText>Escribe la contraseña de la cuenta del administrador.</AppText>
    <Field label="Contraseña del administrador" secure value={password} onChangeText={setPassword} autoCapitalize="none" error={error} />
    <Field label="Correo del administrador" optional value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" hint="Solo hace falta si esta cuenta es anterior al cambio de acceso." />
    <Button label="Entrar como administrador" size="elder" loading={busy} onPress={async () => {
      if (pending.current) return;
      pending.current = true;
      setBusy(true); setError(null);
      try { await sessionActions.returnToAdmin(password, email.trim() || undefined); setPassword(''); router.replace('/summary'); }
      catch (e) { setError(e instanceof AuthError ? e.message : 'No pudimos comprobar la contraseña.'); }
      finally { pending.current = false; setBusy(false); }
    }} />
    <Button label="Olvidé la contraseña" variant="ghost" size="md" onPress={() => router.push('/forgot-password')} />
  </View>;
}
