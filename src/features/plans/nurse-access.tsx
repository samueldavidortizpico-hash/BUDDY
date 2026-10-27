import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useToast } from '@/components/feedback';
import { Checkbox, Field } from '@/components/forms';
import { IconTile } from '@/components/icon-tile';
import { PlusLock } from '@/components/plus-lock';
import { AuthError } from '@/domain/auth';
import type { Elder } from '@/domain/types';
import { isAcceptablePassword, isValidEmail, isValidName, passwordStrength } from '@/domain/validation';
import { StrengthMeter } from '@/features/auth/strength-meter';
import { strings } from '@/i18n';
import { useHasFeature } from '@/state/entitlements';
import { sessionActions } from '@/state/session';
import { spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { successHaptic } from '@/utils/haptics';

const N = strings.nurse;
const A = strings.auth;

/**
 * Acceso de la enfermera o cuidadora de una persona (V4.3, plan Salud). El administrador lo crea con el consentimiento
 * explícito de la persona (buddy-medical-safety: compartir datos de salud con otro cuidador) y lo puede quitar.
 */
export function NurseAccessCard({ elder }: { elder: Elder }) {
  const t = useTheme();
  const s = useStyles();
  const toast = useToast();
  const allowed = useHasFeature('nurse_role');
  const [access, setAccess] = useState<{ email: string; revoked: boolean } | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void sessionActions.nurseAccess(elder.id).then((a) => alive && setAccess(a)).catch(() => alive && setAccess(null));
    return () => {
      alive = false;
    };
  }, [elder.id]);

  if (!allowed) return <PlusLock feature="nurse_role" label={`${N.accessTitle} · Incluido en Salud`} />;

  const create = async () => {
    if (!isValidName(name)) return setError(A.errors.name);
    if (!isValidEmail(email)) return setError(A.errors.email);
    if (!isAcceptablePassword(password)) return setError(A.errors.weak);
    if (!consent) return setError(N.consentRequired);
    setError(null);
    setBusy(true);
    try {
      await sessionActions.createNurseAccess({ elderId: elder.id, name, email, password });
      successHaptic();
      setAccess({ email: email.trim().toLowerCase(), revoked: false });
      setPassword('');
      toast({ message: N.accessCreated, icon: 'check' });
    } catch (e) {
      setError(e instanceof AuthError ? e.message : A.errors.unknown);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={s.stack}>
      <View style={s.head}>
        <IconTile icon="plus" domain="water" />
        <View style={s.flex}>
          <AppText variant="h3">{N.accessTitle}</AppText>
          <AppText variant="caption" color={t.c.muted}>{N.accessBody(elder.firstName)}</AppText>
        </View>
      </View>
      {access && !access.revoked ? (
        <>
          <AppText variant="secondaryStrong">{N.accessActive(access.email)}</AppText>
          <Button
            label={N.accessRevoke}
            variant="danger"
            size="md"
            onPress={async () => {
              await sessionActions.revokeNurseAccess(elder.id);
              setAccess({ ...access, revoked: true });
              toast({ message: N.accessRevoked, icon: 'check' });
            }}
          />
        </>
      ) : access === undefined ? null : (
        <>
          <Field label={A.name} value={name} onChangeText={setName} icon="user" autoComplete="off" valid={isValidName(name)} />
          <Field label={A.email} value={email} onChangeText={setEmail} icon="mail" keyboardType="email-address" autoCapitalize="none" valid={isValidEmail(email)} />
          <View>
            <Field label={A.password} value={password} onChangeText={setPassword} icon="lock" secure autoCapitalize="none" hint={password ? undefined : A.passwordHint} />
            {password ? <StrengthMeter value={passwordStrength(password)} /> : null}
          </View>
          <Checkbox checked={consent} onChange={setConsent} label={N.accessConsent(elder.firstName)} />
          {error ? (
            <AppText variant="caption" color={t.ink.danger} accessibilityLiveRegion="assertive">
              {error}
            </AppText>
          ) : null}
          <Button label={N.accessCreate} icon="plus" loading={busy} onPress={create} />
        </>
      )}
    </Card>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    stack: { gap: spacing.md },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    flex: { flex: 1, minWidth: 0 },
  }),
);
