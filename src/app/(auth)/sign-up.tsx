import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Checkbox, Field } from '@/components/forms';
import { RobotPerch, useRobotFieldFocus } from '@/components/robot/stage';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { AuthError } from '@/domain/auth';
import { isAcceptablePassword, isValidEmail, isValidName, passwordStrength } from '@/domain/validation';
import { strings } from '@/i18n';
import { sessionActions } from '@/state/session';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { successHaptic, warningHaptic } from '@/utils/haptics';

const A = strings.auth;
type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'terms' | 'form', string>>;

export default function SignUp() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const { focus, blur, robot } = useRobotFieldFocus();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<View>(null);
  const emailRef = useRef<View>(null);
  const passRef = useRef<View>(null);
  const confirmRef = useRef<View>(null);

  const strength = passwordStrength(password);

  const submit = async () => {
    const next: Errors = {};
    if (!isValidName(name)) next.name = A.errors.name;
    if (!isValidEmail(email)) next.email = A.errors.email;
    if (!isAcceptablePassword(password)) next.password = A.errors.weak;
    if (confirm !== password) next.confirm = A.errors.mismatch;
    if (!terms) next.terms = A.errors.terms;
    setErrors(next);
    if (Object.keys(next).length) {
      warningHaptic();
      robot.shake();
      return;
    }
    setBusy(true);
    try {
      await sessionActions.signUp({ name, email, password });
      successHaptic();
      await robot.celebrateAndLeave();
      router.replace('/setup');
    } catch (e) {
      warningHaptic();
      robot.shake();
      setErrors({ form: e instanceof AuthError ? e.message : A.errors.unknown });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer keyboard header={<ScreenHeader title={A.signUpTitle} fallback="/" />}>
      <View style={s.hero}>
        <RobotPerch name="sign-up" size={112} mood="wave" />
        <AppText variant="secondary" color={t.c.muted} align="center">
          {A.signUpSubtitle}
        </AppText>
      </View>

      <View style={s.form}>
        <View ref={nameRef} collapsable={false}>
          <Field label={A.name} value={name} onChangeText={setName} placeholder={A.namePlaceholder} autoComplete="name" textContentType="name" icon="user"
            error={errors.name} onFocus={() => focus(nameRef)} onBlur={blur} returnKeyType="next" />
        </View>
        <View ref={emailRef} collapsable={false}>
          <Field label={A.email} value={email} onChangeText={setEmail} placeholder={A.emailPlaceholder} keyboardType="email-address" autoCapitalize="none"
            autoComplete="email" textContentType="emailAddress" icon="mail" error={errors.email} onFocus={() => focus(emailRef)} onBlur={blur} />
        </View>
        <View ref={passRef} collapsable={false}>
          <Field label={A.password} value={password} onChangeText={setPassword} secure autoCapitalize="none" autoComplete="new-password" textContentType="newPassword"
            icon="lock" hint={A.passwordHint} error={errors.password} onFocus={() => focus(passRef, 'password')} onBlur={blur} />
          {password ? <StrengthMeter value={strength} /> : null}
        </View>
        <View ref={confirmRef} collapsable={false}>
          <Field label={A.confirm} value={confirm} onChangeText={setConfirm} secure autoCapitalize="none" autoComplete="new-password" textContentType="newPassword"
            icon="lock" error={errors.confirm} onFocus={() => focus(confirmRef, 'password')} onBlur={blur} />
        </View>
        <Checkbox checked={terms} onChange={setTerms} label={A.terms} error={errors.terms} />
        <View style={s.links}>
          <Button label={A.readTerms} variant="ghost" size="sm" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} style={s.link} />
          <Button label={A.readPrivacy} variant="ghost" size="sm" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} style={s.link} />
        </View>
        {errors.form ? (
          <View style={s.formError} accessibilityLiveRegion="assertive">
            <AppText variant="secondaryStrong" color={t.ink.danger}>
              {errors.form}
            </AppText>
          </View>
        ) : null}
        <Button label={A.create} variant="primary" loading={busy} onPress={submit} haptic />
        <Button label={A.haveAccount} variant="ghost" size="md" onPress={() => router.replace('/sign-in')} />
        <AppText variant="caption" color={t.c.muted} align="center">
          {A.deviceNote}
        </AppText>
      </View>
    </ScreenContainer>
  );
}

export function StrengthMeter({ value }: { value: number }) {
  const t = useTheme();
  const s = useStyles();
  const colors = [t.ink.danger, t.ink.danger, t.ink.yellow, t.ink.mint, t.ink.success];
  return (
    <View style={s.meter} accessible accessibilityLabel={A.strengthLabel(A.strength[value])}>
      <View style={s.bars}>
        {[1, 2, 3, 4].map((k) => (
          <View key={k} style={[s.bar, { backgroundColor: k <= value ? colors[value] : t.c.surface2 }, t.hc && k <= value ? { backgroundColor: t.c.text } : null]} />
        ))}
      </View>
      <AppText variant="caption" color={colors[value]}>
        {A.strengthLabel(A.strength[value])}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    hero: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
    form: { gap: spacing.md },
    links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    link: { flexGrow: 1 },
    formError: { padding: spacing.md, borderRadius: radius.md, backgroundColor: t.c.dangerPale, ...t.hairline },
    meter: { gap: spacing.xxs, marginTop: spacing.xs },
    bars: { flexDirection: 'row', gap: 6 },
    bar: { flex: 1, height: 6, borderRadius: 3 },
  }),
);
