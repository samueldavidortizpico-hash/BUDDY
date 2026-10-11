import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { DemoBadge, IconTile } from '@/components/blocks';
import { InitialsAvatar } from '@/components/buddy';
import { Button } from '@/components/button';
import { useToast } from '@/components/feedback';
import { useContacts } from '@/features/profile/hooks';
import { ink, palette, radius, spacing } from '@/theme';
import { warningHaptic } from '@/utils/haptics';

/** Hoja de emergencia de DEMOSTRACIÓN: muestra contactos ficticios y nunca marca números reales. */
export default function Emergency() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const contacts = useContacts();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));
  const call = (name: string) => {
    warningHaptic();
    toast({ message: `Demostración: aquí se llamaría a ${name}. No se realizó ninguna llamada.`, icon: 'phone' });
  };

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Cerrar emergencia">
        <View style={styles.scrim} />
      </Pressable>
      <Animated.View entering={SlideInDown.duration(280)} accessibilityViewIsModal style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.handle} />
        <View style={styles.head}>
          <IconTile icon="shield" tone="coral" size={52} />
          <View style={styles.flex}>
            <AppText variant="h2" accessibilityRole="header">
              Emergencia
            </AppText>
            <AppText variant="secondary" color={ink.muted}>
              ¿A quién quieres llamar?
            </AppText>
          </View>
        </View>
        <DemoBadge label="Demostración: no se realizan llamadas" />

        {contacts.map((c) => (
          <View key={c.id} style={styles.contact}>
            <InitialsAvatar initials={c.name.split(' ').map((p) => p[0]).join('').slice(0, 2)} label="" />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{c.name}</AppText>
              <AppText variant="caption" color={ink.muted}>{`${c.relation} · ${c.phone} (ficticio)`}</AppText>
            </View>
            <Button label="Llamar" icon="phone" size="md" onPress={() => call(c.name)} />
          </View>
        ))}
        <View style={styles.contact}>
          <IconTile icon="phone" tone="red" />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Línea de emergencias</AppText>
            <AppText variant="caption" color={ink.muted}>
              123 en Colombia
            </AppText>
          </View>
          <Button label="Llamar" icon="phone" variant="danger" size="md" onPress={() => call('la línea de emergencias')} />
        </View>

        <Button label="Cerrar" variant="ghost" onPress={close} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1, backgroundColor: palette.scrim },
  sheet: {
    backgroundColor: palette.warm,
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: palette.line },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.white,
    borderRadius: radius.button,
    padding: spacing.sm,
    flexWrap: 'wrap',
  },
});
