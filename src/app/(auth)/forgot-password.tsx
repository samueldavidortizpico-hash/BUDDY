import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Field } from '@/components/forms';
import { Icon } from '@/components/icon';
import { RobotPerch, useRobotFieldFocus } from '@/components/robot/stage';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { isValidEmail } from '@/domain/validation';
import { strings } from '@/i18n';
import { sessionActions } from '@/state/session';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const F = strings.auth.forgot;

export default function ForgotPassword() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const { focus, blur } = useRobotFieldFocus();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<View>(null);

  const send = async () => {
    if (!isValidEmail(email)) return setError(strings.auth.errors.email);
    setError(null);
    setBusy(true);
    try {
      setResult(await sessionActions.resetPassword(email));
    } catch {
      setError(strings.auth.errors.unknown);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer keyboard header={<ScreenHeader title={F.title} fallback="/sign-in" />}>
      <View style={s.hero}>
        <RobotPerch name="forgot" size={112} mood={result ? (result.sent ? 'celebrate' : 'think') : 'idle'} />
        <AppText variant="secondary" color={t.c.muted} align="center">
          {F.body}
        </AppText>
      </View>
      <View style={s.form}>
        <View ref={ref} collapsable={false}>
          <Field label={strings.auth.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon="mail"
            placeholder={strings.auth.emailPlaceholder} error={error} onFocus={() => focus(ref)} onBlur={blur} />
        </View>
        {result ? (
          <View style={s.note} accessibilityLiveRegion="polite">
            <Icon name="info" color={t.ink.info} />
            <AppText variant="secondary" style={s.flex}>
              {result.message}
            </AppText>
          </View>
        ) : null}
        <Button label={F.send} loading={busy} onPress={send} />
        <Button label={strings.auth.noAccount} variant="ghost" size="md" onPress={() => router.replace('/sign-up')} />
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    hero: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
    form: { gap: spacing.md },
    note: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: t.c.skyPale, ...t.hairline },
  }),
);
