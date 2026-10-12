/**
 * Acceso del adulto mayor: correo y contraseña que define su administrador (cuenta local con rol `elder` vinculada a
 * su `elderId`). Se usa en el paso "Acceso de [nombre]" del registro y en Ajustes > Mis personas > Acceso.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ConfirmDialog, useToast } from '@/components/feedback';
import { Field } from '@/components/forms';
import { Icon } from '@/components/icon';
import { StrengthMeter } from '@/app/(auth)/sign-up';
import { AuthError } from '@/domain/auth';
import type { Elder } from '@/domain/types';
import { isAcceptablePassword, isValidEmail, passwordStrength } from '@/domain/validation';
import { strings } from '@/i18n';
import { sessionActions } from '@/state/session';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { successHaptic, warningHaptic } from '@/utils/haptics';

const A = strings.setup.access;
const E = strings.auth.errors;

type Access = { email: string; revoked: boolean } | null;

export function ElderAccessForm({ elder, onDone, onLater }: { elder: Elder; onDone?: () => void; onLater?: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const toast = useToast();
  const [access, setAccess] = useState<Access | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    let alive = true;
    sessionActions
      .elderAccess(elder.id)
      .then((a) => alive && setAccess(a))
      .catch(() => alive && setAccess(null));
    return () => {
      alive = false;
    };
  }, [elder.id]);

  const validate = (withEmail: boolean) => {
    const next: typeof errors = {};
    if (withEmail && !isValidEmail(email)) next.email = E.email;
    if (!isAcceptablePassword(password)) next.password = E.weak;
    if (confirm !== password) next.confirm = E.mismatch;
    setErrors(next);
    if (Object.keys(next).length) warningHaptic();
    return !Object.keys(next).length;
  };

  const create = async () => {
    if (!validate(true)) return;
    setBusy(true);
    try {
      const u = await sessionActions.createElderAccess({ elderId: elder.id, name: elder.firstName, email, password });
      successHaptic();
      toast({ message: A.created(u.email), icon: 'check' });
      setAccess({ email: u.email, revoked: false });
      setPassword('');
      setConfirm('');
      onDone?.();
    } catch (e) {
      setErrors({ form: e instanceof AuthError ? e.message : E.unknown });
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!validate(false)) return;
    setBusy(true);
    try {
      await sessionActions.resetElderAccess(elder.id, password);
      successHaptic();
      toast({ message: A.resetDone, icon: 'check' });
      setAccess((a) => (a ? { ...a, revoked: false } : a));
      setResetting(false);
      setPassword('');
      setConfirm('');
    } catch (e) {
      setErrors({ form: e instanceof AuthError ? e.message : E.unknown });
    } finally {
      setBusy(false);
    }
  };

  const passwordFields = (
    <>
      <Field label={resetting ? A.newPassword : A.password} value={password} onChangeText={setPassword} secure autoCapitalize="none" autoComplete="new-password"
        textContentType="newPassword" icon="lock" hint={strings.auth.passwordHint} error={errors.password} />
      {password ? <StrengthMeter value={passwordStrength(password)} /> : null}
      <Field label={A.confirm} value={confirm} onChangeText={setConfirm} secure autoCapitalize="none" autoComplete="new-password" textContentType="newPassword"
        icon="lock" error={errors.confirm} />
    </>
  );

  if (access === undefined) return <AppText variant="secondary" color={t.c.muted}>{strings.common.loading}</AppText>;

  return (
    <View style={s.stack}>
      {access ? (
        <Card style={s.statusRow}>
          <Icon name={access.revoked ? 'lock' : 'check'} color={access.revoked ? t.c.muted : t.ink.mint} />
          <View style={s.flex}>
            <AppText variant="bodyStrong">{access.email}</AppText>
            <AppText variant="caption" color={access.revoked ? t.c.muted : t.ink.mint}>
              {access.revoked ? A.status.revoked : A.status.active}
            </AppText>
          </View>
        </Card>
      ) : (
        <>
          <AppText variant="body" color={t.c.muted}>
            {A.body(elder.firstName)}
          </AppText>
          <Field label={A.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email"
            textContentType="emailAddress" icon="mail" placeholder={strings.auth.emailPlaceholder} error={errors.email} />
          {passwordFields}
        </>
      )}

      {access && (resetting || access.revoked) ? passwordFields : null}

      {errors.form ? (
        <View style={s.formError} accessibilityLiveRegion="assertive">
          <AppText variant="secondaryStrong" color={t.ink.danger}>
            {errors.form}
          </AppText>
        </View>
      ) : null}

      {!access ? <Button label={onDone ? A.create : A.createOnly} trailing="arrow" loading={busy} haptic onPress={create} /> : null}
      {access && !access.revoked && !resetting ? (
        <>
          <Button label={A.reset} icon="lock" variant="tonal" tone="mint" onPress={() => setResetting(true)} />
          <Button label={A.revoke} variant="ghost" size="md" onPress={() => setRevoking(true)} />
        </>
      ) : null}
      {access && (resetting || access.revoked) ? <Button label={access.revoked ? A.reactivate : A.saveReset} loading={busy} onPress={reset} /> : null}
      {onLater && !access ? <Button label={A.later} variant="ghost" size="md" onPress={onLater} /> : null}
      {onDone && access ? <Button label={strings.common.continue} trailing="arrow" onPress={onDone} /> : null}

      <AppText variant="caption" color={t.c.muted}>
        {A.localNote}
      </AppText>

      <ConfirmDialog
        visible={revoking}
        title={A.revokeTitle}
        body={A.revokeBody(elder.firstName)}
        confirmLabel={A.revoke}
        cancelLabel={strings.common.cancel}
        onConfirm={async () => {
          setRevoking(false);
          try {
            await sessionActions.revokeElderAccess(elder.id);
            setAccess((a) => (a ? { ...a, revoked: true } : a));
            toast({ message: A.revoked, icon: 'lock' });
          } catch (e) {
            setErrors({ form: e instanceof AuthError ? e.message : E.unknown });
          }
        }}
        onCancel={() => setRevoking(false)}
      />
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    stack: { gap: spacing.md },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    formError: { padding: spacing.md, borderRadius: radius.md, backgroundColor: t.c.dangerPale, ...t.hairline },
  }),
);
