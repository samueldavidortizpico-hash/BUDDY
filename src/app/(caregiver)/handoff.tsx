import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet } from '@/components/feedback';
import { Icon } from '@/components/icon';
import { PinPad } from '@/components/pin-pad';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState } from '@/components/states';
import { PhonePreview } from '@/features/elder/phone-preview';
import { strings } from '@/i18n';
import { useActiveElder } from '@/state/data';
import { handoffActions } from '@/state/handoff';
import { spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const H = strings.handoff;

/**
 * "Entregar a [nombre]": tres opciones claras.
 * 1. Vista previa en vivo (la pantalla real, solo lectura, se actualiza al instante).
 * 2. Probar como [nombre] (modo completo con banner "Modo prueba" y salida sin PIN).
 * 3. Entregar el celular (bloquea en modo adulto mayor; para salir hace falta el PIN).
 */
export default function Handoff() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const elder = useActiveElder();
  const [pinSheet, setPinSheet] = useState<null | 'set' | 'confirm'>(null);
  const [firstPin, setFirstPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (!elder?.setupDone) {
    return (
      <ScreenContainer header={<ScreenHeader title={strings.routine.title} fallback="/routine" />}>
        <EmptyState title={strings.summary.emptyTitle} text={strings.summary.emptyBody} action={{ label: strings.summary.steps.register, onPress: () => router.push('/setup') }} />
      </ScreenContainer>
    );
  }

  const handOff = () => {
    if (!handoffActions.hasPin()) return setPinSheet('set');
    handoffActions.start(elder.id);
    router.replace('/elder');
  };
  const test = () => {
    handoffActions.startTest(elder.id);
    router.replace('/elder');
  };

  return (
    <ScreenContainer header={<ScreenHeader title={H.title(elder.firstName)} fallback="/routine" />}>
      <Appear style={s.stack}>
        <View style={s.section}>
          <View style={s.titleRow}>
            <Icon name="eye" color={t.ink.mint} />
            <AppText variant="h3" accessibilityRole="header">
              {H.previewTitle}
            </AppText>
          </View>
          <AppText variant="secondary" color={t.c.muted}>
            {H.previewBody(elder.firstName)}
          </AppText>
          <PhonePreview />
        </View>

        <Card style={s.option}>
          <View style={s.titleRow}>
            <Icon name="play" color={t.ink.lavender} />
            <AppText variant="h3" accessibilityRole="header" style={s.flex}>
              {H.testTitle(elder.firstName)}
            </AppText>
          </View>
          <AppText variant="secondary" color={t.c.muted}>
            {H.testBody}
          </AppText>
          <Button label={H.testAction(elder.firstName)} icon="play" variant="tonal" tone="mint" onPress={test} />
        </Card>

        <Card style={s.option}>
          <View style={s.titleRow}>
            <Icon name="lock" color={t.ink.coral} />
            <AppText variant="h3" accessibilityRole="header" style={s.flex}>
              {H.handTitle}
            </AppText>
          </View>
          <AppText variant="secondary" color={t.c.muted}>
            {H.handBody}
          </AppText>
          <Button label={strings.routine.handoff(elder.firstName)} icon="lock" haptic onPress={handOff} />
        </Card>

        <View style={s.note}>
          <Icon name="info" color={t.ink.info} size={20} />
          <AppText variant="caption" color={t.c.muted} style={s.flex}>
            {H.syncNote}
          </AppText>
        </View>
      </Appear>

      <BottomSheet
        visible={!!pinSheet}
        onClose={() => {
          if (pending.current) return;
          setPinSheet(null);
          setPinError(null);
          setFirstPin('');
        }}
        title={pinSheet === 'confirm' ? strings.pin.confirm : strings.pin.setTitle}
      >
        <AppText variant="secondary" color={t.c.muted}>
          {strings.pin.setBody}
        </AppText>
        <PinPad
          key={pinSheet ?? 'x'}
          error={pinError}
          disabled={pinBusy}
          onComplete={async (pin) => {
            if (pending.current) return;
            if (pinSheet === 'set') {
              setFirstPin(pin);
              setPinError(null);
              setPinSheet('confirm');
            } else if (pin !== firstPin) {
              setPinError(strings.pin.mismatch);
              setPinSheet('set');
            } else {
              pending.current = true;
              setPinBusy(true);
              try {
                const saved = await handoffActions.setPin(pin);
                if (!mounted.current) return;
                if (!saved) {
                  setPinError(strings.pin.saveError);
                  return;
                }
                handoffActions.start(elder.id);
                setFirstPin('');
                setPinSheet(null);
                router.replace('/elder');
              } catch {
                if (mounted.current) setPinError(strings.pin.saveError);
              } finally {
                pending.current = false;
                if (mounted.current) setPinBusy(false);
              }
            }
          }}
        />
      </BottomSheet>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    stack: { gap: spacing.lg, paddingBottom: spacing.lg },
    section: { gap: spacing.sm },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    option: { gap: spacing.sm },
    note: { flexDirection: 'row', gap: spacing.xs, padding: spacing.md, borderRadius: 16, backgroundColor: t.c.surface, ...t.hairline },
  }),
);
