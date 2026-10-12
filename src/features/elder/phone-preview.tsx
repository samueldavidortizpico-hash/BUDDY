/**
 * Vista previa EN VIVO de la pantalla del adulto mayor: el mismo `ElderScreen` real (no una copia), en modo solo
 * lectura, con su apariencia y su tamaño de texto, dentro de un marco de teléfono. Lee el mismo store que Rutina y el
 * chat, así que se actualiza al instante mientras el administrador edita.
 */
import { useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Button, IconButton } from '@/components/button';
import { BottomSheet } from '@/components/feedback';
import { strings } from '@/i18n';
import { useActiveElder } from '@/state/data';
import { radius, spacing } from '@/theme';
import { ThemeOverride, makeStyles, resolveThemeName, useTheme } from '@/theme/provider';

import { ElderScreen } from './screen';

const H = strings.handoff;

export function PhonePreview({ height = 560 }: { height?: number }) {
  const t = useTheme();
  const s = useStyles();
  const system = useColorScheme();
  const elder = useActiveElder();
  if (!elder) return null;
  const pref = elder.screen.appearance;
  const name = resolveThemeName({ mode: pref === 'contrast' ? 'auto' : pref, highContrast: pref === 'contrast' }, system);
  return (
    <View style={s.wrap} accessible={false}>
      <View style={[s.frame, { height }, t.shadow.elevated]} testID="phone-preview">
        <View style={s.notch} />
        <View style={s.screen}>
          <ThemeOverride name={name} textScale={elder.screen.textScale}>
            <ElderScreen elderId={elder.id} preview />
          </ThemeOverride>
        </View>
      </View>
      <AppText variant="caption" color={t.c.muted} align="center">
        {H.liveNote}
      </AppText>
    </View>
  );
}

/** Botón "Ver pantalla de [nombre]" que abre la vista previa como hoja inferior (Rutina y chat). */
export function PreviewSheetButton({ compact = false }: { compact?: boolean }) {
  const elder = useActiveElder();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  if (!elder?.setupDone) return null;
  const label = strings.buddy.seeElderScreen(elder.firstName);
  return (
    <>
      <Animated.View entering={reduce ? undefined : FadeIn.duration(220)} style={{ flexShrink: 1, maxWidth: '100%' }}>
        {compact ? (
          <IconButton icon="eye" label={label} showLabel={false} accessibilityHint={strings.summary.elderScreenHint} onPress={() => setOpen(true)} />
        ) : (
          <Button label={label} icon="eye" variant="tonal" tone="mint" size="sm" accessibilityHint={strings.summary.elderScreenHint} onPress={() => setOpen(true)} />
        )}
      </Animated.View>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        {open ? <PhonePreview height={520} /> : null}
      </BottomSheet>
    </>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { gap: spacing.xs, alignItems: 'center' },
    frame: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 36,
      padding: 8,
      backgroundColor: t.dark ? '#0B1F26' : '#173A45',
    },
    notch: { alignSelf: 'center', width: 90, height: 6, borderRadius: 3, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.35)' },
    screen: { flex: 1, borderRadius: radius.hero, overflow: 'hidden', backgroundColor: t.c.bg },
  }),
);
