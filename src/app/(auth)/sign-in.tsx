import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Field } from '@/components/forms';
import { RobotPerch, useRobotFieldFocus } from '@/components/robot/stage';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { AuthError } from '@/domain/auth';
import { isValidEmail } from '@/domain/validation';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { homeHrefFor } from '@/state/nav';
import { sessionActions } from '@/state/session';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { successHaptic, warningHaptic } from '@/utils/haptics';

const A = strings.auth;

export default function SignIn() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const { focus, blur, robot } = useRobotFieldFocus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<View>(null);
  const passRef = useRef<View>(null);

  const submit = async () => {
    const fe = { email: isValidEmail(email) ? undefined : A.errors.email, password: password ? undefined : A.errors.required };
    setFieldErrors(fe);
    setError(null);
    if (fe.email || fe.password) {
      warningHaptic();
      robot.shake();
      return;
    }
    setBusy(true);
    try {
      const user = await sessionActions.signIn({ email, password });
      successHaptic();
      await robot.celebrateAndLeave();
      const hasElder = db.list('elders', user.id).some((e) => e.setupDone);
      router.replace(homeHrefFor(user.id, hasElder, false));
    } catch (e) {
      warningHaptic();
      robot.shake();
      setError(e instanceof AuthError ? e.message : A.errors.unknown);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer keyboard header={<ScreenHeader title={A.signInTitle} fallback="/" />}>
      <View style={s.hero}>
        <RobotPerch name="sign-in" size={120} mood="wave" />
        <AppText variant="secondary" color={t.c.muted} align="center">
          {A.signInSubtitle}
        </AppText>
      </View>
      <View style={s.form}>
        <View ref={emailRef} collapsable={false}>
          <Field label={A.email} value={email} onChangeText={setEmail} placeholder={A.emailPlaceholder} keyboardType="email-address" autoCapitalize="none"
            autoComplete="email" textContentType="username" icon="mail" error={fieldErrors.email} onFocus={() => focus(emailRef)} onBlur={blur} />
        </View>
        <View ref={passRef} collapsable={false}>
          <Field label={A.password} value={password} onChangeText={setPassword} secure autoCapitalize="none" autoComplete="current-password"
            textContentType="password" icon="lock" error={fieldErrors.password} onFocus={() => focus(passRef, 'password')} onBlur={blur}
            returnKeyType="go" onSubmitEditing={submit} />
        </View>
        {error ? (
          <View style={s.formError} accessibilityLiveRegion="assertive">
            <AppText variant="secondaryStrong" color={t.ink.danger}>
              {error}
            </AppText>
          </View>
        ) : null}
        <Button label={A.enter} loading={busy} onPress={submit} haptic />
        <Button label={A.forgotLink} variant="ghost" size="md" onPress={() => router.push('/forgot-password')} />
        <Button label={A.noAccount} variant="tonal" tone="mint" size="md" onPress={() => router.replace('/sign-up')} />
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    hero: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
    form: { gap: spacing.md },
    formError: { padding: spacing.md, borderRadius: radius.md, backgroundColor: t.c.dangerPale, ...t.hairline },
  }),
);
