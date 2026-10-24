import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { strings } from '@/i18n';
import { useActiveElder } from '@/state/data';
import { useSession } from '@/state/session';
import { radius, spacing, touch, type Domain } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const S = strings.settings;

type Item = { key: string; icon: IconName; domain: Domain | 'petrol' | 'slate'; label: string; href?: Href };

/**
 * Ajustes del administrador (V4): lista agrupada como en el brief (Cuenta, Personas, Apariencia, Avisos para mí, Plan,
 * Privacidad y legal, Avanzado, Acerca de BUDDY). Cada fila abre una pantalla completa con flecha atrás. Antes era una
 * pestaña oculta sin camino (docs/AUDITORIA_V4.md, Fase 0).
 */
export default function Settings() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const user = useSession((x) => x.user);
  const elder = useActiveElder();
  const groups: Item[][] = [
    [
      { key: 'account', icon: 'user', domain: 'petrol', label: S.sections.account },
      { key: 'people', icon: 'users', domain: 'contact', label: S.sections.people },
    ],
    [
      { key: 'appearance', icon: 'contrast', domain: 'mood', label: S.sections.appearance },
      { key: 'alerts', icon: 'bell', domain: 'followUp', label: S.sections.alerts },
      ...(elder ? [{ key: 'elder', icon: 'smile' as IconName, domain: 'activity' as Domain, label: S.sections.elderScreen(elder.firstName) }] : []),
      { key: 'notifications', icon: 'clock', domain: 'water', label: S.sections.notifications },
    ],
    [
      { key: 'plan', icon: 'sparkle', domain: 'medication', label: S.sections.plan, href: '/plus' as Href },
      { key: 'legal', icon: 'shield', domain: 'slate', label: S.sections.legal },
      { key: 'devices', icon: 'watch', domain: 'slate', label: S.sections.devices },
      { key: 'advanced', icon: 'settings', domain: 'slate', label: S.sections.advanced },
      { key: 'about', icon: 'info', domain: 'slate', label: S.sections.about },
    ],
  ];
  return (
    // Ruta propia con flecha atrás (V4): como pestaña oculta no había forma de llegar a Apariencia (docs/AUDITORIA_V4.md).
    <ScreenContainer header={<ScreenHeader title={S.title} fallback="/summary" />}>
      {user ? (
        <AppText variant="secondary" color={t.c.muted} style={s.head}>
          {`${user.name} · ${user.email}`}
        </AppText>
      ) : null}
      <View style={s.groups}>
        {groups.map((items, g) => (
          <View key={g} style={[s.group, t.hairline]}>
            {items.map((r, i) => (
              <Pressable
                key={r.key}
                onPress={() => router.push(r.href ?? ({ pathname: '/settings/[section]', params: { section: r.key } } as unknown as Href))}
                accessibilityRole="button"
                accessibilityLabel={r.label}
                style={({ pressed }) => [s.row, i > 0 && s.divider, pressed && { opacity: 0.8 }]}
              >
                <IconTile icon={r.icon} domain={r.domain} size={40} />
                <AppText variant="bodyStrong" style={s.flex}>
                  {r.label}
                </AppText>
                <Icon name="chevron" color={t.c.muted} />
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    head: { marginBottom: spacing.md },
    groups: { gap: spacing.section },
    group: { borderRadius: radius.card, backgroundColor: t.c.surface, overflow: 'hidden', ...t.shadow.soft },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touch.timeRow + 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
    divider: { borderTopWidth: t.borderWidth, borderTopColor: t.c.border },
  }),
);
