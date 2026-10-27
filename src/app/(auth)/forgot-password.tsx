import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { SuccessBurst } from '@/components/feedback';
import { Field } from '@/components/forms';
import { Icon } from '@/components/icon';
import { isAcceptablePassword, isValidEmail, passwordStrength } from '@/domain/validation';
import { AuthShell } from '@/features/auth/auth-shell';
import { StrengthMeter } from '@/features/auth/strength-meter';
import { strings } from '@/i18n';
import { sessionActions } from '@/state/session';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { successHaptic } from '@/utils/haptics';

const A = strings.auth;
const F = A.forgot;
type Step = 'email' | 'code' | 'sent' | 'done';

/**
 * Recuperar contraseña (V4.3): un campo y un botón. Con servidor, confirma "Revisa tu correo"; en este teléfono (cuenta
 * local) sigue con el código de recuperación que se guardó al crear la cuenta. Termina con una confirmación ilustrada.
 */
export default function ForgotPassword() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!isValidEmail(email)) return setError(A.errors.email);
    setError(null);
    setBusy(true);
    try {
      const result = await sessionActions.resetPassword(email);
      setStep(result.sent ? 'sent' : 'code');
    } catch {
      setError(A.errors.unknown);
    } finally {
      setBusy(false);
    }
  };

  const change = async () => {
    if (!code) return setError(A.errors.required);
    if (!isAcceptablePassword(next)) return setError(A.errors.weak);
    setBusy(true);
    setError(null);
    try {
      await sessionActions.recoverWithCode({ email, code, next });
      successHaptic();
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : A.errors.unknown);
    } finally {
      setBusy(false);
    }
  };

  const backToSignIn = <Button label={A.backToSignIn} onPress={() => router.replace('/sign-in')} />;

  return (
    <AuthShell tagline={A.tagline.caregiver} back="/sign-in">
      {step === 'sent' || step === 'done' ? (
        <SuccessBurst icon={step === 'sent' ? 'mail' : 'check'} title={step === 'sent' ? A.forgotSent : A.forgotDone} text={step === 'sent' ? F.sent : A.forgotDoneBody}>
          {backToSignIn}
        </SuccessBurst>
      ) : (
        <>
          <AppText variant="h1" accessibilityRole="header">
            {step === 'email' ? F.title : A.forgotCodeTitle}
          </AppText>
          <AppText variant="secondary" color={t.c.muted}>
            {step === 'email' ? F.body : A.forgotCodeBody}
          </AppText>
          {step === 'email' ? (
            <Field
              label={A.email}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setError(null);
              }}
              onClear={() => setEmail('')}
              valid={isValidEmail(email)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              icon="mail"
              placeholder={A.emailPlaceholder}
              error={error}
              returnKeyType="go"
              onSubmitEditing={send}
            />
          ) : (
            <>
              <Field label="Código de recuperación" value={code} onChangeText={setCode} autoCapitalize="characters" icon="lock" secure />
              <View>
                <Field label="Nueva contraseña" value={next} onChangeText={setNext} secure autoCapitalize="none" autoComplete="new-password" icon="lock" />
                {next ? <StrengthMeter value={passwordStrength(next)} /> : null}
              </View>
              {error ? (
                <View style={s.formError} accessibilityLiveRegion="assertive" accessibilityRole="alert">
                  <Icon name="warning" size={18} color={t.ink.danger} />
                  <AppText variant="secondaryStrong" color={t.ink.danger} style={s.flex}>
                    {error}
                  </AppText>
                </View>
              ) : null}
            </>
          )}
          <Button label={step === 'email' ? A.forgotContinue : A.forgotChange} loading={busy} onPress={step === 'email' ? send : change} />
          {step === 'code' ? (
            <AppText variant="caption" color={t.c.muted}>
              {F.localMessage}
            </AppText>
          ) : null}
        </>
      )}
    </AuthShell>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    formError: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: t.c.dangerPale },
  }),
);
