import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { PulseRings } from '@/components/charts';
import { Icon } from '@/components/icon';
import { LocationMap, MAP_ATTRIBUTION } from '@/components/location-map';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { IconTile } from '@/components/icon-tile';
import { locationView } from '@/domain/location';
import { useNow } from '@/hooks/use-now';
import { strings } from '@/i18n';
import { useActiveElder, useRecords } from '@/state/data';
import { locationActions } from '@/state/location';
import { spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatAgo, formatClock } from '@/utils/dates';
import { directionsUrl } from '@/utils/maps';

const L = strings.location;
const hm = (iso: string) => {
  const d = new Date(iso);
  return formatClock(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
};

/**
 * "Dónde está [nombre]": solo con el consentimiento del adulto mayor y en primer plano. Nunca muestra una ubicación
 * inventada: sin datos reales, el estado lo explica y ofrece "Solicitar ubicación".
 */
export default function LocationScreen() {
  const t = useTheme();
  const s = useStyles();
  const now = useNow(60_000);
  const elder = useActiveElder();
  const fixes = useRecords('locations');
  const { height } = useWindowDimensions();
  if (!elder) return null;
  const name = elder.firstName;
  const v = locationView(elder, fixes, now);
  const ago = (iso: string) => formatAgo(new Date(iso), now);

  return (
    <ScreenContainer header={<ScreenHeader title={L.title(name)} fallback="/summary" />}>
      <View style={s.stack}>
        {v.kind === 'located' ? (
          <>
            {/* Mapa en la mitad superior (V4). */}
            <LocationMap lat={v.last.lat} lng={v.last.lng} accuracy={v.last.accuracy} label={L.title(name)} height={Math.max(260, Math.round(height * 0.42))} />
            <AppText variant="caption" color={t.c.muted}>{MAP_ATTRIBUTION}</AppText>
            <Card style={s.stack}>
              <View style={s.row}>
                {/* Punto "en vivo": late mientras la ubicación es reciente; si está vieja, queda el aviso de abajo. */}
                <View style={s.live}>
                  {v.stale ? null : <PulseRings size={12} color={t.c.success} count={2} />}
                  <View style={[s.liveDot, { backgroundColor: v.stale ? t.c.tertiary : t.c.success }]} />
                </View>
                <AppText variant="h3" style={s.flex}>{L.last(ago(v.last.at), hm(v.last.at))}</AppText>
              </View>
              {v.last.accuracy ? <AppText variant="secondary" color={t.c.muted}>{L.accuracy(Math.round(v.last.accuracy))}</AppText> : null}
              {v.stale ? (
                <View style={s.row} accessibilityRole="alert">
                  <Icon name="warning" color={t.ink.yellow} size={20} />
                  <AppText variant="secondaryStrong" style={s.flex}>{L.stale}</AppText>
                </View>
              ) : null}
              {/* "Llamar" es la acción principal; con letra grande los dos botones se apilan (flexBasis + wrap). */}
              <View style={s.actions}>
                {elder.phone ? <Button label={L.call(name)} icon="phone" onPress={() => Linking.openURL(`tel:${elder.phone!.replace(/[^\d+]/g, '')}`)} style={s.action} /> : null}
                <Button label={L.directions} icon="location" variant="solid" tone="sky" onPress={() => Linking.openURL(directionsUrl(`${v.last.lat},${v.last.lng}`))} style={s.action} />
              </View>
            </Card>
            {v.history.length ? (
              <Card style={s.stack}>
                <AppText variant="h3">{L.history}</AppText>
                {v.history.map((f) => (
                  <View key={f.id} style={s.row}>
                    <View style={[s.liveDot, { backgroundColor: t.domains.contact.accent }]} />
                    <AppText variant="secondary" color={t.c.muted} style={s.flex}>{`${hm(f.at)} · ${ago(f.at)}${f.accuracy ? ` · ±${Math.round(f.accuracy)} m` : ''}`}</AppText>
                  </View>
                ))}
              </Card>
            ) : null}
          </>
        ) : (
          <Card variant="gradient" domain="contact" style={s.empty}>
            {/* Radar suave mientras se espera la respuesta: se ve que BUDDY sigue buscando, sin inventar un punto. */}
            <View style={s.radar}>
              {v.kind === 'requested' || v.kind === 'waiting' ? <PulseRings size={72} color={t.domains.contact.accent} /> : null}
              <IconTile icon="location" domain="contact" size={72} />
            </View>
            {v.kind === 'requested' ? (
              <>
                <AppText variant="h2" align="center" color={t.domains.contact.text}>{L.requested(name)}</AppText>
                <AppText variant="secondary" color={t.domains.contact.muted} align="center">{L.requestedBody(name)}</AppText>
              </>
            ) : v.kind === 'waiting' ? (
              <AppText variant="h3" align="center" color={t.domains.contact.text}>{L.waiting(name)}</AppText>
            ) : (
              <>
                <AppText variant="h2" align="center" color={t.domains.contact.text}>{L.askShare(name)}</AppText>
                <AppText variant="secondary" color={t.domains.contact.muted} align="center">{L.notSharedBody[v.reason](name)}</AppText>
                <Button label={L.request} icon="location" onPress={() => locationActions.request(elder.id)} />
              </>
            )}
          </Card>
        )}
        <AppText variant="caption" color={t.c.muted}>{L.foregroundNote}</AppText>
        <AppText variant="caption" color={t.c.muted}>{L.syncNote}</AppText>
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    stack: { gap: spacing.md },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    action: { flexGrow: 1, flexBasis: 160 },
    empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, overflow: 'hidden' },
    radar: { width: 160, height: 120, alignItems: 'center', justifyContent: 'center' },
    live: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
    liveDot: { width: 10, height: 10, borderRadius: 5 },
  }),
);
