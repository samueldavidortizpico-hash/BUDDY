import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Field } from '@/components/forms';
import { useSharedValue } from 'react-native-reanimated';

import { AuthRobot, useFormRobot } from '@/components/robot/auth-robot';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { AuthError, dataOwnerId } from '@/domain/auth';
import type { Role } from '@/domain/types';
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
  const params = useLocalSearchParams<{ role?: string }>();
  const role: Role = params.role === 'elder' ? 'elder' : 'caregiver';
  const R = A.roles;
  const t = useTheme();
  const s = useStyles();
  const robot = useFormRobot('wave');
  const scrollY = useSharedValue(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const fe = { email: isValidEmail(email) ? undefined : A.errors.email, password: password ? undefined : A.errors.required };
    setFieldErrors(fe);
    setError(null);
    if (fe.email || fe.password) {
      warningHaptic();
      robot.error();
      return;
    }
    setBusy(true);
    try {
      const user = await sessionActions.signIn({ email, password, role });
      successHaptic();
      robot.success();
      const owner = dataOwnerId(user);
      const hasElder = db.list('elders', owner).some((e) => e.setupDone);
      router.replace(homeHrefFor(owner, hasElder, false, user.role));
    } catch (e) {
      warningHaptic();
      robot.error();
      setError(e instanceof AuthError ? e.message : A.errors.unknown);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer keyboard scrollY={scrollY} header={<ScreenHeader title={A.signInTitle} subtitle={role === 'elder' ? R.elder : R.admin} fallback="/" />}>
      <View style={s.hero}>
        <AuthRobot maxHeight={160} scrollY={scrollY} mood={robot.mood} look={robot.mood === 'look' ? -0.6 : 0} />
        <AppText variant="secondary" color={t.c.muted} align="center">
          {role === 'elder' ? R.elderNote : A.signInSubtitle}
        </AppText>
      </View>
      <View style={s.form}>
        <View>
          <Field label={A.email} value={email} onChangeText={setEmail} placeholder={A.emailPlaceholder} keyboardType="email-address" autoCapitalize="none"
            autoComplete="email" textContentType="username" icon="mail" error={fieldErrors.email} onFocus={() => robot.focus()} onBlur={robot.blur} />
        </View>
        <View>
          <Field label={A.password} value={password} onChangeText={setPassword} secure autoCapitalize="none" autoComplete="current-password"
            textContentType="password" icon="lock" error={fieldErrors.password} onFocus={() => robot.focus('password')} onBlur={robot.blur}
            returnKeyType="go" onSubmitEditing={submit} />
        </View>
        {error ? (
          <View style={s.formError} accessibilityLiveRegion="assertive">
            <AppText variant="secondaryStrong" color={t.ink.danger}>
              {error}
            </AppText>
          </View>
        ) : null}
        <Button label={A.enter} loading={busy} onPress={submit} haptic size={role === 'elder' ? 'elder' : undefined} />
        {role === 'caregiver' ? (
          <>
            <Button label={A.forgotLink} variant="ghost" size="md" onPress={() => router.push('/forgot-password')} />
            <Button label={A.noAccount} variant="tonal" tone="mint" size="md" onPress={() => router.replace('/sign-up')} />
          </>
        ) : null}
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
