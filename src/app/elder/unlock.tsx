import { useRouter } from 'expo-router';
import { useState } from 'react';
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

  const submit = async (pin: string) => {
    setBusy(true);
    const r = await handoffActions.unlock(pin);
    setBusy(false);
    if (r.result === 'ok') {
      successHaptic();
      router.replace('/summary');
    } else {
      warningHaptic();
      setMessage(r.result === 'wrong' ? P.wrong(r.left) : P.locked(r.seconds));
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
          onPress={async () => {
            await sessionActions.signOut();
            router.replace('/sign-in');
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ body: { alignItems: 'center', gap: spacing.md } });
