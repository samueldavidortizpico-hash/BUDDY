import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Field } from '@/components/forms';
import { Icon } from '@/components/icon';
import { AuthError, dataOwnerId } from '@/domain/auth';
import type { Role } from '@/domain/types';
import { isValidEmail } from '@/domain/validation';
import { AuthShell } from '@/features/auth/auth-shell';
import { LegalFooter } from '@/features/auth/legal-footer';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { homeHrefFor } from '@/state/nav';
import { sessionActions } from '@/state/session';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { successHaptic, warningHaptic } from '@/utils/haptics';

const A = strings.auth;
const SUCCESS_MS = 600;

/** Iniciar sesión (V4.3): degradado de marca arriba y una tarjeta con lo esencial; el rol se ve y se puede cambiar. */
export default function SignIn() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const roleKey = params.role === 'elder' || params.role === 'nurse' ? params.role : 'caregiver';
  const role = roleKey as Role;
  const t = useTheme();
  const s = useStyles();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const wait = useCountdown(lockedUntil);
  const locked = wait > 0;

  const submit = async () => {
    if (locked) return;
    const fe = { email: isValidEmail(email) ? undefined : A.errors.email, password: password ? undefined : A.errors.required };
    setFieldErrors(fe);
    setError(null);
    if (fe.email || fe.password) return;
    setBusy(true);
    try {
      const user = await sessionActions.signIn({ email, password, role });
      successHaptic();
      setBusy(false);
      setDone(true);
      const owner = dataOwnerId(user);
      const hasElder = db.list('elders', owner).some((e) => e.setupDone);
      // Check de éxito breve antes de entrar.
      setTimeout(() => router.replace(homeHrefFor(owner, hasElder, false, user.role)), SUCCESS_MS);
    } catch (e) {
      warningHaptic();
      setBusy(false);
      if (e instanceof AuthError && e.code === 'locked' && e.retryAfterMs) setLockedUntil(Date.now() + e.retryAfterMs);
      setError(e instanceof AuthError ? e.message : A.errors.unknown);
    }
  };

  return (
    <AuthShell tagline={A.tagline[roleKey]} footer={<LegalFooter />}>
      <AppText variant="h1" accessibilityRole="header">
        {A.signInTitle}
      </AppText>
      <Pressable
        onPress={() => router.replace('/' as Href)}
        accessibilityRole="button"
        accessibilityLabel={A.roleChipLabel(A.roleChip[roleKey])}
        hitSlop={6}
        style={s.chip}
      >
        <Icon name={roleKey === 'elder' ? 'heart' : roleKey === 'nurse' ? 'plus' : 'users'} size={16} color={t.hc ? t.c.text : t.ink.info} />
        <AppText variant="captionStrong" color={t.c.text}>
          {A.roleChip[roleKey]}
        </AppText>
        <AppText variant="captionStrong" color={t.hc ? t.c.text : t.ink.info}>
          {A.roles.change}
        </AppText>
      </Pressable>
      {roleKey === 'elder' ? (
        <AppText variant="secondary" color={t.c.muted}>
          {A.roles.elderNote}
        </AppText>
      ) : null}

      <Field
        label={A.email}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
        }}
        onClear={() => setEmail('')}
        valid={isValidEmail(email)}
        placeholder={A.emailPlaceholder}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="username"
        icon="mail"
        error={fieldErrors.email}
        returnKeyType="next"
      />
      <Field
        label={A.password}
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
        }}
        secure
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        icon="lock"
        error={fieldErrors.password}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {roleKey !== 'elder' ? (
        <Button label={A.forgotQuestion} variant="text" size="sm" onPress={() => router.push('/forgot-password')} style={s.forgot} />
      ) : null}

      {error ? (
        <View style={s.formError} accessibilityLiveRegion="assertive" accessibilityRole="alert">
          <Icon name="warning" size={18} color={t.ink.danger} />
          <View style={s.flex}>
            <AppText variant="secondaryStrong" color={t.ink.danger}>
              {locked ? A.waitLabel(formatWait(wait)) : error}
            </AppText>
          </View>
        </View>
      ) : null}

      <Button
        label={locked ? A.waitLabel(formatWait(wait)) : A.enter}
        loading={busy}
        success={done}
        disabled={locked}
        onPress={submit}
        size={roleKey === 'elder' ? 'elder' : 'lg'}
      />

      {roleKey === 'caregiver' ? (
        <>
          <View style={s.or} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={s.line} />
            <AppText variant="caption" color={t.c.muted}>
              {A.or}
            </AppText>
            <View style={s.line} />
          </View>
          <Button label={A.create} variant="outline" onPress={() => router.replace('/sign-up')} />
        </>
      ) : null}
    </AuthShell>
  );
}

/** Segundos que faltan hasta `until` (se actualiza cada segundo). */
function useCountdown(until: number | null) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!until) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);
  return left;
}

function formatWait(seconds: number) {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(seconds % 60).padStart(2, '0')}`;
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.xs,
      minHeight: 36,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: t.c.surface2,
      ...(t.hc ? t.hairline : {}),
    },
    forgot: { alignSelf: 'flex-end', marginTop: -spacing.xs },
    formError: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: t.c.dangerPale },
    or: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    line: { flex: 1, height: 1, backgroundColor: t.c.border },
  }),
);
