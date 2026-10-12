import { Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { LocationMap, MAP_ATTRIBUTION } from '@/components/location-map';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
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
  if (!elder) return null;
  const name = elder.firstName;
  const v = locationView(elder, fixes, now);
  const ago = (iso: string) => formatAgo(new Date(iso), now);

  return (
    <ScreenContainer header={<ScreenHeader title={L.title(name)} fallback="/summary" />}>
      <View style={s.stack}>
        {v.kind === 'located' ? (
          <>
            <LocationMap lat={v.last.lat} lng={v.last.lng} accuracy={v.last.accuracy} label={L.title(name)} />
            <AppText variant="caption" color={t.c.muted}>{MAP_ATTRIBUTION}</AppText>
            <Card style={s.stack}>
              <AppText variant="h3">{L.last(ago(v.last.at), hm(v.last.at))}</AppText>
              {v.last.accuracy ? <AppText variant="secondary" color={t.c.muted}>{L.accuracy(Math.round(v.last.accuracy))}</AppText> : null}
              {v.stale ? (
                <View style={s.row} accessibilityRole="alert">
                  <Icon name="warning" color={t.ink.yellow} size={20} />
                  <AppText variant="secondaryStrong" style={s.flex}>{L.stale}</AppText>
                </View>
              ) : null}
              <View style={s.row}>
                <Button label={L.directions} icon="location" variant="tonal" onPress={() => Linking.openURL(directionsUrl(`${v.last.lat},${v.last.lng}`))} style={s.flex} />
                {elder.phone ? <Button label={L.call(name)} icon="phone" variant="ghost" onPress={() => Linking.openURL(`tel:${elder.phone!.replace(/[^\d+]/g, '')}`)} style={s.flex} /> : null}
              </View>
            </Card>
            {v.history.length ? (
              <Card style={s.stack}>
                <AppText variant="h3">{L.history}</AppText>
                {v.history.map((f) => (
                  <AppText key={f.id} variant="secondary" color={t.c.muted}>{`${hm(f.at)} · ${ago(f.at)}${f.accuracy ? ` · ±${Math.round(f.accuracy)} m` : ''}`}</AppText>
                ))}
              </Card>
            ) : null}
          </>
        ) : (
          <Card style={s.empty}>
            <View style={s.illustration} importantForAccessibility="no-hide-descendants">
              <Icon name="location" color={t.ink.mint} size={44} />
            </View>
            {v.kind === 'requested' ? (
              <>
                <AppText variant="h2" align="center">{L.requested(name)}</AppText>
                <AppText variant="secondary" color={t.c.muted} align="center">{L.requestedBody(name)}</AppText>
              </>
            ) : v.kind === 'waiting' ? (
              <AppText variant="h3" align="center">{L.waiting(name)}</AppText>
            ) : (
              <>
                <AppText variant="h2" align="center">{L.notShared}</AppText>
                <AppText variant="secondary" color={t.c.muted} align="center">{L.notSharedBody[v.reason](name)}</AppText>
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
    empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
    illustration: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.mintPale, borderWidth: t.hc ? 2 : 0, borderColor: t.c.text },
  }),
);
