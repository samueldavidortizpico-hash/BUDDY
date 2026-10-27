import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Checkbox, Field } from '@/components/forms';
import { Icon } from '@/components/icon';
import { AuthError } from '@/domain/auth';
import { isAcceptablePassword, isValidEmail, isValidName, passwordStrength } from '@/domain/validation';
import { AuthShell } from '@/features/auth/auth-shell';
import { StrengthMeter } from '@/features/auth/strength-meter';
import { strings } from '@/i18n';
import { sessionActions } from '@/state/session';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { successHaptic, warningHaptic } from '@/utils/haptics';

const A = strings.auth;
type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'terms' | 'form', string>>;

/** Crear cuenta (V4.3): paso 1 de 3 del registro, con medidor de fortaleza y check de éxito antes de seguir. */
export default function SignUp() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [recovery, setRecovery] = useState<string | null>(null);

  const strength = passwordStrength(password);
  const clear = (k: keyof Errors) => errors[k] && setErrors((e) => ({ ...e, [k]: undefined }));

  const submit = async () => {
    const next: Errors = {};
    if (!isValidName(name)) next.name = A.errors.name;
    if (!isValidEmail(email)) next.email = A.errors.email;
    if (!isAcceptablePassword(password)) next.password = A.errors.weak;
    if (confirm !== password) next.confirm = A.errors.mismatch;
    if (!terms) next.terms = A.errors.terms;
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await sessionActions.signUp({ name, email, password });
      successHaptic();
      const code = await sessionActions.recoveryCode(password);
      setBusy(false);
      setDone(true);
      setPassword('');
      setConfirm('');
      // Check de éxito breve y luego el código de recuperación (paso siguiente del registro).
      setTimeout(() => setRecovery(code), 600);
    } catch (e) {
      warningHaptic();
      setBusy(false);
      setErrors({ form: e instanceof AuthError ? e.message : A.errors.unknown });
    }
  };

  if (recovery) {
    return (
      <AuthShell tagline={A.tagline.caregiver} back="/setup">
        <Steps index={0} />
        <AppText variant="h1" accessibilityRole="header">
          Guarda tu código de recuperación
        </AppText>
        <AppText variant="body" color={t.c.muted}>
          Se muestra una sola vez. Guárdalo en un lugar seguro: sirve para cambiar tu contraseña en este celular.
        </AppText>
        <View style={s.code}>
          <AppText variant="h2" selectable align="center" style={s.codeText}>
            {recovery}
          </AppText>
        </View>
        <Button
          label="Ya guardé mi código"
          onPress={() => {
            setRecovery(null);
            router.replace('/setup');
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell tagline={A.tagline.caregiver}>
      <Steps index={0} />
      <AppText variant="h1" accessibilityRole="header">
        {A.signUpTitle}
      </AppText>
      <AppText variant="secondary" color={t.c.muted}>
        {A.signUpSubtitle}
      </AppText>
      <Field label={A.name} value={name} onChangeText={(v) => { setName(v); clear('name'); }} valid={isValidName(name)} placeholder={A.namePlaceholder}
        autoComplete="name" textContentType="name" icon="user" error={errors.name} returnKeyType="next" />
      <Field label={A.email} value={email} onChangeText={(v) => { setEmail(v); clear('email'); }} onClear={() => setEmail('')} valid={isValidEmail(email)}
        placeholder={A.emailPlaceholder} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" icon="mail" error={errors.email} />
      <View>
        <Field label={A.password} value={password} onChangeText={(v) => { setPassword(v); clear('password'); }} secure autoCapitalize="none" autoComplete="new-password"
          textContentType="newPassword" icon="lock" hint={password ? undefined : A.passwordHint} error={errors.password} />
        {password ? <StrengthMeter value={strength} /> : null}
      </View>
      <Field label={A.confirm} value={confirm} onChangeText={(v) => { setConfirm(v); clear('confirm'); }} valid={!!confirm && confirm === password} secure
        autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" icon="lock" error={errors.confirm} />
      <Checkbox checked={terms} onChange={(v) => { setTerms(v); clear('terms'); }} label={A.terms} error={errors.terms}>
        <AppText variant="secondary" style={s.flex}>
          {`${A.termsLead} `}
          <Text
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
            style={{ color: t.hc ? t.c.text : t.ink.info, textDecorationLine: 'underline' }}
          >
            {A.termsLink}
          </Text>
        </AppText>
      </Checkbox>
      {errors.form ? (
        <View style={s.formError} accessibilityLiveRegion="assertive" accessibilityRole="alert">
          <Icon name="warning" size={18} color={t.ink.danger} />
          <AppText variant="secondaryStrong" color={t.ink.danger} style={s.flex}>
            {errors.form}
          </AppText>
        </View>
      ) : null}
      <Button label={A.create} loading={busy} success={done} onPress={submit} />
      <Button label={A.haveAccount} variant="text" size="sm" onPress={() => router.replace('/sign-in')} style={s.center} />
      <AppText variant="caption" color={t.c.muted} align="center">
        {A.deviceNote}
      </AppText>
    </AuthShell>
  );
}

/** Indicador de pasos del registro: barra en tres tramos y la etiqueta del paso actual. */
function Steps({ index }: { index: number }) {
  const t = useTheme();
  const s = useStyles();
  const n = A.signUpSteps.length;
  return (
    <View style={s.steps} accessible accessibilityLabel={A.signUpStep(index + 1, n, A.signUpSteps[index])}>
      <View style={s.stepBars}>
        {A.signUpSteps.map((_, k) => (
          <View key={k} style={[s.stepBar, { backgroundColor: k <= index ? (t.hc ? t.c.text : t.c.accent) : t.c.surface2 }, t.hc && k > index ? t.hairline : null]} />
        ))}
      </View>
      <AppText variant="captionStrong" color={t.c.muted}>
        {A.signUpStep(index + 1, n, A.signUpSteps[index])}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    center: { alignSelf: 'center' },
    steps: { gap: spacing.xs },
    stepBars: { flexDirection: 'row', gap: 6 },
    stepBar: { flex: 1, height: 4, borderRadius: 2 },
    code: { padding: spacing.lg, borderRadius: radius.card, backgroundColor: t.c.surface2, ...(t.hc ? t.hairline : {}) },
    codeText: { fontVariant: ['tabular-nums'], letterSpacing: 1 },
    formError: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: t.c.dangerPale },
  }),
);
