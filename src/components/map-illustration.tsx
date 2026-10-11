/** Dibujo ILUSTRATIVO de un mapa (no es un mapa real ni usa GPS). Siempre lleva la etiqueta "Vista de ejemplo". */
import { StyleSheet, View } from 'react-native';

import { ink, palette, radius, shadow, spacing } from '@/theme';

import { AppText } from './app-text';
import { PersonAvatar } from './buddy';
import { Icon } from './icon';

const STREETS = [
  { top: '22%', rotate: '24deg' },
  { top: '58%', rotate: '24deg' },
  { top: '40%', rotate: '-66deg' },
  { top: '70%', rotate: '-66deg' },
] as const;

export function MapIllustration({ height = 150, labels = false }: { height?: number; labels?: boolean }) {
  return (
    <View
      style={[styles.map, { height }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Vista de ejemplo de un mapa con la ubicación en casa. No es un mapa real."
    >
      <View style={styles.park} />
      {STREETS.map((s, i) => (
        <View key={i} style={[styles.street, { top: s.top, transform: [{ rotate: s.rotate }] }]} />
      ))}
      <View style={styles.pin}>
        <PersonAvatar size={height > 200 ? 52 : 38} label="" />
      </View>
      {labels ? (
        <>
          <View style={[styles.place, { left: '52%', top: '66%' }]}>
            <AppText variant="meta" color={ink.muted}>
              Casa (ejemplo)
            </AppText>
          </View>
          <View style={[styles.place, { left: 20, top: 46 }]}>
            <AppText variant="meta" color={ink.muted}>
              Parque (ejemplo)
            </AppText>
          </View>
        </>
      ) : null}
      <View style={styles.tag}>
        <Icon name="location" size={14} color={ink.yellow} />
        <AppText variant="meta" color={ink.yellow}>
          Vista de ejemplo
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { borderRadius: 22, overflow: 'hidden', backgroundColor: palette.map, alignItems: 'center', justifyContent: 'center' },
  park: { position: 'absolute', left: 14, top: 18, width: 120, height: 80, backgroundColor: palette.mapPark, borderRadius: 40 },
  street: { position: 'absolute', left: '-20%', width: '140%', height: 12, backgroundColor: 'rgba(255, 255, 255, 0.85)' },
  pin: { padding: 4, borderRadius: radius.pill, backgroundColor: palette.mint, ...shadow.elevated },
  place: { position: 'absolute', backgroundColor: 'rgba(255, 255, 255, 0.8)', paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: 6 },
  tag: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.yellowPale,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
});
