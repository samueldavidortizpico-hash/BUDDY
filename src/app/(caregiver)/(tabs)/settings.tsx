import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { ScreenContainer } from '@/components/screen-container';
import { strings } from '@/i18n';
import { useActiveElder } from '@/state/data';
import { useSession } from '@/state/session';
import { radius, spacing, touch } from '@/theme';
import { makeStyles, useTextScaleFactor, useTheme } from '@/theme/provider';

const S = strings.settings;

export default function Settings() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const user = useSession((x) => x.user);
  const elder = useActiveElder();
  // Con texto muy grande el icono cede su espacio al texto (como iOS en tamaños de accesibilidad).
  const bigText = useTextScaleFactor() >= 1.6;
  const rows: { key: string; icon: IconName; label: string }[] = [
    { key: 'account', icon: 'user', label: S.sections.account },
    { key: 'appearance', icon: 'contrast', label: S.sections.appearance },
    ...(elder ? [{ key: 'elder', icon: 'smile' as IconName, label: S.sections.elderScreen(elder.firstName) }] : []),
    { key: 'alerts', icon: 'bell', label: S.sections.alerts },
    { key: 'notifications', icon: 'clock', label: S.sections.notifications },
    { key: 'people', icon: 'users', label: S.sections.people },
    { key: 'devices', icon: 'watch', label: S.sections.devices },
    { key: 'legal', icon: 'shield', label: S.sections.legal },
    { key: 'advanced', icon: 'settings', label: S.sections.advanced },
    { key: 'about', icon: 'info', label: S.sections.about },
  ];
  return (
    <ScreenContainer insideTabs>
      <View style={s.head}>
        <AppText variant="h1">{S.title}</AppText>
        <AppText variant="secondary" color={t.c.muted}>
          {user ? `${user.name} · ${user.email}` : ''}
        </AppText>
      </View>
      <View style={s.group}>
        {rows.map((r, i) => (
          <Pressable
            key={r.key}
            onPress={() => router.push({ pathname: '/settings/[section]', params: { section: r.key } } as unknown as Href)}
            accessibilityRole="button"
            accessibilityLabel={r.label}
            style={({ pressed }) => [s.row, i > 0 && s.divider, pressed && { opacity: 0.8 }]}
          >
            {bigText ? null : (
              <View style={s.icon}>
                <Icon name={r.icon} color={t.ink.mint} />
              </View>
            )}
            <AppText variant="bodyStrong" style={s.flex}>
              {r.label}
            </AppText>
            <Icon name="chevron" color={t.c.muted} />
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    head: { paddingTop: spacing.sm, marginBottom: spacing.lg },
    group: { borderRadius: radius.card, backgroundColor: t.c.surface, overflow: 'hidden', ...t.hairline, ...t.shadow.soft },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touch.timeRow + 8, paddingHorizontal: spacing.md },
    divider: { borderTopWidth: t.borderWidth, borderTopColor: t.c.border },
    icon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.mintPale },
  }),
);
