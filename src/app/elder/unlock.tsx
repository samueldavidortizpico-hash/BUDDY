import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { PinPad } from '@/components/pin-pad';
import { BuddyRobot } from '@/components/robot';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { strings } from '@/i18n';
import { handoffActions } from '@/state/handoff';
import { sessionActions } from '@/state/session';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/provider';
import { successHaptic, warningHaptic } from '@/utils/haptics';

const P = strings.pin;

/** El familiar vuelve a su modo con el PIN. Tras 5 errores, espera creciente. */
export default function Unlock() {
  const router = useRouter();
  const t = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const submit = async (pin: string) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const r = await handoffActions.unlock(pin);
      if (!mounted.current) return;
      if (r.result === 'ok') {
        successHaptic();
        router.replace('/summary');
      } else {
        warningHaptic();
        setMessage(r.result === 'wrong' ? P.wrong(r.left) : P.locked(r.seconds));
      }
    } catch {
      warningHaptic();
      if (mounted.current) setMessage(P.unavailable);
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <ScreenContainer header={<ScreenHeader title={P.title} fallback="/elder" />}>
      <View style={styles.body}>
        <BuddyRobot size={104} mood={message ? 'worry' : 'cover'} shadow={false} />
        <AppText variant="body" color={t.c.muted} align="center">
          {P.body}
        </AppText>
        <PinPad onComplete={submit} disabled={busy} error={message} />
        <Button
          label={P.forgot}
          variant="ghost"
          size="md"
          disabled={busy}
          onPress={async () => {
            if (pending.current) return;
            pending.current = true;
            setBusy(true);
            try {
              await sessionActions.signOut();
              if (mounted.current) router.replace('/sign-in');
            } catch {
              if (mounted.current) setMessage(strings.auth.errors.unknown);
            } finally {
              pending.current = false;
              if (mounted.current) setBusy(false);
            }
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ body: { alignItems: 'center', gap: spacing.md } });
