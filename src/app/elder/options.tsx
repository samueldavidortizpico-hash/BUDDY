import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/feedback';
import { Chip } from '@/components/forms';
import { Icon, type IconName } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import type { ElderAppearance } from '@/domain/types';
import { useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { elderActions } from '@/state/actions';
import { sessionActions, useSession } from '@/state/session';
import { radius, spacing, touch, type Domain, type TextScale } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const O = strings.elderOptions;

/**
 * Opciones del adulto mayor (V4, ruta completa con flecha atrás). Antes era una hoja inferior sobre su pantalla.
 * Solo cambia lo que es suyo: permisos de su celular, tamaño de letra y apariencia (nunca su rutina), salir de BUDDY y
 * entrar como administrador con la contraseña de la cuenta administradora.
 */
export default function ElderOptions() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const user = useSession((x) => x.user);
  const handoffId = useDb((x) => x.handoff?.elderId ?? null);
  const elderId = user?.role === 'elder' ? (user.elderId ?? null) : handoffId;
  const elder = useDb((x) => (elderId ? x.elders[elderId] : undefined));
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!elder) return null;
  // Solo apariencia: la rutina la define el administrador (docs/DECISIONS.md, V4).
  const look = (patch: Partial<Pick<typeof elder.screen, 'textScale' | 'appearance'>>) => elderActions.setLook(elder.id, patch);
  return (
    <ScreenContainer header={<ScreenHeader title={strings.adminAccess.title} fallback="/elder" />}>
      <View style={s.stack}>
        <View style={[s.group, t.hairline]}>
          <OptionRow icon="bell" domain="followUp" label={O.permissions} hint={O.permissionsHint} onPress={() => router.push('/elder/permissions' as Href)} />
          <OptionRow icon="lock" domain="petrol" label={strings.adminAccess.enterAdmin} hint={O.adminHint} onPress={() => router.push('/elder/unlock' as Href)} divider />
        </View>

        <View style={[s.section, t.hairline]}>
          <AppText variant="h3">{O.look}</AppText>
          <AppText variant="secondary" color={t.c.muted}>{O.lookHint}</AppText>
          <AppText variant="secondaryStrong">{strings.settings.textSize}</AppText>
          <View style={s.wrap}>
            {(['normal', 'large', 'xlarge', 'huge'] as TextScale[]).map((k) => (
              <Chip key={k} label={strings.settings.sizes[k]} selected={elder.screen.textScale === k} onPress={() => look({ textScale: k })} />
            ))}
          </View>
          <AppText variant="secondaryStrong">{strings.settings.sections.appearance}</AppText>
          <View style={s.wrap}>
            {(['auto', 'light', 'dark', 'contrast'] as ElderAppearance[]).map((k) => (
              <Chip key={k} label={strings.settings.elderAppearance[k]} selected={elder.screen.appearance === k} onPress={() => look({ appearance: k })} />
            ))}
          </View>
        </View>

        <Button label={strings.adminAccess.signOut} icon="logout" variant="danger" onPress={() => setConfirm(true)} />
        {error ? <AppText accessibilityRole="alert" color={t.ink.danger}>{error}</AppText> : null}
      </View>
      <ConfirmDialog
        visible={confirm}
        title={strings.adminAccess.signOutTitle}
        body={strings.adminAccess.signOutBody}
        confirmLabel={strings.adminAccess.signOutConfirm}
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await sessionActions.signOut();
            setConfirm(false);
            router.replace('/');
          } catch {
            setError(O.signOutError);
            setConfirm(false);
          }
        }}
      />
    </ScreenContainer>
  );
}

function OptionRow({ icon, domain, label, hint, onPress, divider }: { icon: IconName; domain: Domain | 'petrol'; label: string; hint: string; onPress: () => void; divider?: boolean }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} style={({ pressed }) => [s.row, divider && s.divider, pressed && s.pressed]}>
      <IconTile icon={icon} domain={domain} />
      <View style={s.flex}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText variant="caption" color={t.c.muted}>{hint}</AppText>
      </View>
      <Icon name="chevron" color={t.c.muted} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    stack: { gap: spacing.section },
    group: { borderRadius: radius.card, backgroundColor: t.c.surface, overflow: 'hidden', ...t.shadow.soft },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touch.elderMin + 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    divider: { borderTopWidth: t.borderWidth, borderTopColor: t.c.border },
    pressed: { opacity: 0.8 },
    section: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.card, backgroundColor: t.c.surface, ...t.shadow.soft },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  }),
);
