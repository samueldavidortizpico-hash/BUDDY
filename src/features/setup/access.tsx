/**
 * Acceso del adulto mayor: correo y contraseña que define su administrador (cuenta local con rol `elder` vinculada a
 * su `elderId`). Se usa en el paso "Acceso de [nombre]" del registro y en la pantalla Ajustes > Mis personas > Acceso.
 * La contraseña se guarda solo como hash con sal (src/infrastructure/local/auth.ts): ni la app ni el administrador
 * pueden volver a leerla. Por eso "Restablecer" genera una contraseña TEMPORAL que se muestra una sola vez.
 */
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ConfirmDialog, useToast } from '@/components/feedback';
import { Field } from '@/components/forms';
import { Icon } from '@/components/icon';
import { StrengthMeter } from '@/features/auth/strength-meter';
import { AuthError } from '@/domain/auth';
import type { Elder } from '@/domain/types';
import { isAcceptablePassword, isValidEmail, passwordStrength, tempPassword } from '@/domain/validation';
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
  const [confirming, setConfirming] = useState<'reset' | 'revoke' | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  /** Contraseña temporal recién generada: se muestra UNA vez y se olvida al tocar "Ya la anoté". */
  const [temp, setTemp] = useState<string | null>(null);

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

  const fail = (e: unknown) => {
    warningHaptic();
    setErrors({ form: e instanceof AuthError ? e.message : E.unknown });
  };

  const create = async () => {
    const next: typeof errors = {};
    if (!isValidEmail(email)) next.email = E.email;
    if (!isAcceptablePassword(password)) next.password = E.weak;
    if (confirm !== password) next.confirm = E.mismatch;
    setErrors(next);
    if (Object.keys(next).length) return warningHaptic();
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
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  /** Restablecer (o reactivar): contraseña temporal aleatoria, visible una sola vez. */
  const reset = async () => {
    setConfirming(null);
    setBusy(true);
    try {
      const pw = tempPassword(await Crypto.getRandomBytesAsync(12));
      await sessionActions.resetElderAccess(elder.id, pw);
      successHaptic();
      setTemp(pw);
      setErrors({});
      setAccess((a) => (a ? { ...a, revoked: false } : a));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const saveEmail = async () => {
    if (!isValidEmail(email)) return setErrors({ email: E.email });
    setBusy(true);
    try {
      await sessionActions.changeElderEmail(elder.id, email);
      successHaptic();
      toast({ message: A.emailChanged, icon: 'check' });
      setAccess((a) => (a ? { ...a, email: email.trim().toLowerCase() } : a));
      setEditingEmail(false);
      setErrors({});
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setConfirming(null);
    try {
      await sessionActions.revokeElderAccess(elder.id);
      setAccess((a) => (a ? { ...a, revoked: true } : a));
      toast({ message: A.revoked, icon: 'lock' });
    } catch (e) {
      fail(e);
    }
  };

  if (access === undefined) return <AppText variant="secondary" color={t.c.muted}>{strings.common.loading}</AppText>;

  const formError = errors.form ? (
    <View style={s.formError} accessibilityLiveRegion="assertive">
      <AppText variant="secondaryStrong" color={t.ink.danger}>
        {errors.form}
      </AppText>
    </View>
  ) : null;

  // Sin acceso todavía: se crea con correo y contraseña definidos por el administrador.
  if (!access) {
    return (
      <View style={s.stack}>
        <AppText variant="body" color={t.c.muted}>
          {A.body(elder.firstName)}
        </AppText>
        <Field label={A.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email"
          textContentType="emailAddress" icon="mail" placeholder={strings.auth.emailPlaceholder} error={errors.email} />
        <Field label={A.password} value={password} onChangeText={setPassword} secure autoCapitalize="none" autoComplete="new-password"
          textContentType="newPassword" icon="lock" hint={strings.auth.passwordHint} error={errors.password} />
        {password ? <StrengthMeter value={passwordStrength(password)} /> : null}
        <Field label={A.confirm} value={confirm} onChangeText={setConfirm} secure autoCapitalize="none" autoComplete="new-password" textContentType="newPassword"
          icon="lock" error={errors.confirm} />
        {formError}
        <Button label={onDone ? A.create : A.createOnly} trailing="arrow" loading={busy} haptic onPress={create} />
        {onLater ? <Button label={A.later} variant="ghost" size="md" onPress={onLater} /> : null}
        <AppText variant="caption" color={t.c.muted}>
          {A.localNote}
        </AppText>
      </View>
    );
  }

  return (
    <View style={s.stack}>
      <Card style={s.stack}>
        <View style={s.statusRow}>
          <Icon name={access.revoked ? 'lock' : 'check'} color={access.revoked ? t.c.muted : t.ink.mint} />
          <AppText variant="captionStrong" color={access.revoked ? t.c.muted : t.ink.mint}>
            {access.revoked ? A.status.revoked : A.status.active}
          </AppText>
        </View>
        <AppText variant="caption" color={t.c.muted}>{A.email}</AppText>
        <AppText variant="bodyStrong" selectable>{access.email}</AppText>
        <Button
          label={A.copyEmail}
          icon="copy"
          size="sm"
          variant="ghost"
          onPress={async () => {
            await Clipboard.setStringAsync(access.email);
            toast({ message: A.copied, icon: 'check' });
          }}
        />
      </Card>

      {temp ? (
        <Card variant="tint" tone="mint" style={s.stack}>
          <AppText variant="h3" accessibilityLiveRegion="polite">{A.tempTitle}</AppText>
          <AppText variant="secondary">{A.tempBody(elder.firstName)}</AppText>
          <AppText variant="heroL" selectable style={s.temp} accessibilityLabel={temp.split('').join(' ')}>
            {temp}
          </AppText>
          <Button
            label={A.copyPassword}
            icon="copy"
            variant="tonal"
            tone="mint"
            size="md"
            onPress={async () => {
              await Clipboard.setStringAsync(temp);
              toast({ message: A.copied, icon: 'check' });
            }}
          />
          <Button label={A.tempDone} onPress={() => setTemp(null)} />
        </Card>
      ) : null}

      {editingEmail ? (
        <>
          <Field label={A.newEmail} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email"
            textContentType="emailAddress" icon="mail" error={errors.email} />
          <Button label={A.saveEmail} loading={busy} onPress={saveEmail} />
          <Button label={strings.common.cancel} variant="ghost" size="md" onPress={() => setEditingEmail(false)} />
        </>
      ) : null}

      {formError}

      {!temp && !editingEmail ? (
        <>
          <Button label={access.revoked ? A.reactivate : A.reset} icon="lock" variant="tonal" tone="mint" loading={busy} onPress={() => setConfirming('reset')} />
          <Button label={A.changeEmail} icon="mail" variant="tonal" tone="mint" onPress={() => { setEmail(access.email); setEditingEmail(true); }} />
          {access.revoked ? null : <Button label={A.revoke} variant="ghost" size="md" onPress={() => setConfirming('revoke')} />}
        </>
      ) : null}
      {onDone && !temp ? <Button label={strings.common.continue} trailing="arrow" onPress={onDone} /> : null}

      <AppText variant="caption" color={t.c.muted}>
        {A.localNote}
      </AppText>

      <ConfirmDialog
        visible={confirming === 'reset'}
        title={A.resetTitle}
        body={A.resetBody(elder.firstName)}
        confirmLabel={access.revoked ? A.reactivate : A.reset}
        cancelLabel={strings.common.cancel}
        onConfirm={reset}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmDialog
        visible={confirming === 'revoke'}
        title={A.revokeTitle}
        body={A.revokeBody(elder.firstName)}
        confirmLabel={A.revoke}
        cancelLabel={strings.common.cancel}
        destructive
        onConfirm={revoke}
        onCancel={() => setConfirming(null)}
      />
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    stack: { gap: spacing.md },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    temp: { letterSpacing: 1 },
    formError: { padding: spacing.md, borderRadius: radius.md, backgroundColor: t.c.dangerPale, ...t.hairline },
  }),
);
