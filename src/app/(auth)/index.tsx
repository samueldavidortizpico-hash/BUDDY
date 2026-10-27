import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenContainer } from '@/components/screen-container';
import type { Role } from '@/domain/types';
import { strings } from '@/i18n';
import { useHomeHref } from '@/state/nav';
import { useSession } from '@/state/session';
import { radius, spacing, touch } from '@/theme';
import { makeStyles, useAppearanceStore, useTheme, type AppearanceMode } from '@/theme/provider';

const R = strings.auth.roles;
const S = strings.welcome;
const NEXT_MODE: Record<AppearanceMode, AppearanceMode> = { auto: 'light', light: 'dark', dark: 'auto' };
type Choice = 'admin' | 'elder' | 'nurse';

/** Bienvenida: cabecera "Bienvenido", la pregunta de quién usa el celular con tres opciones, y crear cuenta / iniciar sesión. */
export default function Welcome() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const status = useSession((x) => x.status);
  const home = useHomeHref();
  const mode = useAppearanceStore((x) => x.mode);
  const setAppearance = useAppearanceStore((x) => x.set);
  const [choice, setChoice] = useState<Choice | null>(null);

  if (status === 'signedIn') return <Redirect href={home} />;

  // La enfermera o cuidadora entra por la misma puerta que quien administra: invitación y cuenta de cuidador.
  const role: Role = choice === 'elder' ? 'elder' : 'caregiver';
  const colors = t.dark ? t.gradients.welcome : (['#8FE8D8', '#CFF5EC', '#F4FBF8'] as const);

  return (
    <ScreenContainer gradientColors={colors} contentStyle={s.content}>
      <View style={s.root}>
        <View style={s.topBar}>
          <Pressable
            onPress={() => setAppearance({ mode: NEXT_MODE[mode] })}
            accessibilityRole="button"
            accessibilityLabel={`${S.appearance}. ${S.appearanceNow(S.modes[mode])}`}
            hitSlop={8}
            style={s.modeBtn}
          >
            <Icon name={mode === 'dark' ? 'moon' : mode === 'light' ? 'sun' : 'contrast'} color={t.c.text} size={22} />
          </Pressable>
        </View>

        <Appear style={s.head}>
          <AppText variant="display" accessibilityRole="header" style={s.headText}>
            {S.header}
          </AppText>
        </Appear>

        <Appear delay={120} style={s.card}>
          <AppText variant="h3" accessibilityRole="header">
            {R.title}
          </AppText>
          <View style={s.roles} accessibilityRole="radiogroup">
            <RoleCard icon="users" tone="mint" title={R.admin} detail={R.adminDetail} selected={choice === 'admin'} onPress={() => setChoice('admin')} />
            <RoleCard icon="heart" tone="coral" title={R.elder} detail={R.elderDetail} selected={choice === 'elder'} onPress={() => setChoice('elder')} />
            <RoleCard icon="plus" tone="sky" title={R.nurse} detail={R.nurseDetail} selected={choice === 'nurse'} onPress={() => setChoice('nurse')} />
          </View>
          {choice === 'elder' ? (
            <AppText variant="secondary" color={t.c.muted}>
              {R.elderNote}
            </AppText>
          ) : null}
        </Appear>

        <Appear delay={240} style={s.actions}>
          {choice !== 'elder' ? <Button label={S.createAccount} variant="mint" trailing="arrow" haptic shine style={s.cta} onPress={() => router.push('/onboarding')} /> : null}
          <Button
            label={S.signIn}
            variant={choice === 'elder' ? 'mint' : 'ghost'}
            size={choice === 'elder' ? 'elder' : 'md'}
            haptic
            onPress={() => router.push({ pathname: '/sign-in', params: { role } })}
          />
        </Appear>
      </View>
    </ScreenContainer>
  );
}

/** Opción grande del selector de rol (radio accesible). */
function RoleCard({ icon, tone, title, detail, selected, onPress }: { icon: IconName; tone: 'mint' | 'coral' | 'sky'; title: string; detail: string; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <PressableScale
      haptic
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${detail}`}
      style={[s.role, selected && s.roleOn]}
    >
      <View style={[s.roleIcon, { backgroundColor: selected ? (t.hc ? t.c.text : t.c.mintStrong) : tone === 'mint' ? t.c.mintPale : tone === 'coral' ? t.c.coralPale : t.c.surface2 }]}>
        <Icon name={icon} color={selected ? (t.hc ? t.c.bg : '#FFFFFF') : tone === 'mint' ? t.c.mintDeep : tone === 'coral' ? t.c.coral : t.c.text} size={26} />
      </View>
      <View style={s.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color={t.c.muted}>
          {detail}
        </AppText>
      </View>
      <View style={[s.radio, selected && s.radioOn]}>{selected ? <View style={s.radioDot} /> : null}</View>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    content: { flexGrow: 1 },
    root: { flexGrow: 1, gap: spacing.md },
    topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: spacing.xs },
    modeBtn: {
      width: touch.min,
      height: touch.min,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.c.surface,
      ...t.hairline,
    },
    head: { paddingVertical: spacing.lg, alignItems: 'center' },
    headText: { textAlign: 'center' },
    card: { gap: spacing.md, padding: spacing.md, borderRadius: radius.card, backgroundColor: t.c.surface, ...t.hairline, ...t.shadow.soft },
    actions: { gap: spacing.sm, marginTop: 'auto', paddingTop: spacing.lg },
    cta: { minHeight: touch.primary + 4 },
    flex: { flex: 1 },
    roles: { gap: spacing.sm },
    role: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: touch.elderMin + 12,
      padding: spacing.md,
      borderRadius: radius.card,
      backgroundColor: t.c.surface,
      ...t.hairline,
    },
    roleOn: { borderWidth: 2, borderColor: t.hc ? t.c.text : t.c.mintStrong },
    roleIcon: { width: 48, height: 48, borderRadius: radius.icon, alignItems: 'center', justifyContent: 'center' },
    radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: t.hc ? t.c.text : t.c.muted, alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: t.hc ? t.c.text : t.c.mintStrong },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: t.hc ? t.c.text : t.c.mintStrong },
  }),
);
