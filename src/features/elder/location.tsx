/**
 * Ubicación en la pantalla del adulto mayor: la solicitud del administrador ("¿Aceptas?"), el registro de su ubicación
 * SOLO mientras BUDDY está abierto y con su consentimiento, y "Dejar de compartir" siempre a mano.
 * Las decisiones se registran como del adulto mayor (`by: 'elder'`): la matriz `can` solo le permite a él decidir.
 */
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { useToast } from '@/components/feedback';
import { Icon } from '@/components/icon';
import { InlineBanner } from '@/components/row';
import type { Elder } from '@/domain/types';
import { currentFix } from '@/infrastructure/location';
import { strings } from '@/i18n';
import { locationActions } from '@/state/location';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const L = strings.location;
/** Mientras la pantalla está abierta, la ubicación se renueva cada 10 minutos. */
const EVERY_MS = 10 * 60_000;

export function ElderLocation({ elder, caregiver, preview }: { elder: Elder; caregiver: string; preview: boolean }) {
  const t = useTheme();
  const s = useStyles();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const consent = elder.locationConsent ?? 'none';
  const who = caregiver || L.yourFamily;

  useEffect(() => {
    if (preview || consent !== 'granted') return;
    let alive = true;
    const tick = async () => {
      const r = await currentFix(false);
      if (alive && r.ok) locationActions.record(elder.id, r, 'elder');
    };
    tick();
    const id = setInterval(tick, EVERY_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [consent, preview, elder.id]);

  const accept = async () => {
    setBusy(true);
    locationActions.decide(elder.id, true, 'elder');
    // El permiso del sistema se pide aquí, en contexto, después de que la persona aceptó.
    const r = await currentFix(true);
    if (r.ok) locationActions.record(elder.id, r, 'elder');
    else toast({ message: L.permissionDenied, icon: 'info' });
    setBusy(false);
  };

  if (consent === 'requested') {
    return (
      <View testID="elder-location-ask" style={[s.card, t.hairline]} pointerEvents={preview ? 'none' : 'auto'}>
        <View style={s.row}>
          <View style={s.icon}>
            <Icon name="location" color={t.ink.mint} size={26} />
          </View>
          <AppText variant="h3" style={s.flex}>{L.elderAsk(who)}</AppText>
        </View>
        <AppText variant="body" color={t.c.muted}>{L.elderAskBody}</AppText>
        <View style={s.row}>
          <Button label={L.accept} icon="check" disabled={busy || preview} onPress={accept} style={s.flex} />
          <Button label={L.notNow} variant="ghost" disabled={busy || preview} onPress={() => locationActions.decide(elder.id, false, 'elder')} style={s.flex} />
        </View>
      </View>
    );
  }
  if (consent === 'granted') {
    return (
      <View pointerEvents={preview ? 'none' : 'auto'}>
        <InlineBanner icon={<Icon name="location" color={t.c.muted} size={18} />} action={<Button
          label={L.stop}
          size="sm"
          variant="ghost"
          disabled={preview}
          onPress={() => Alert.alert('Dejar de compartir ubicación', 'Tu familia dejará de ver tu ubicación actual.', [
            { text: strings.common.cancel, style: 'cancel' },
            { text: L.stop, style: 'destructive', onPress: () => { locationActions.revoke(elder.id, 'elder'); toast({ message: L.stopped, icon: 'check' }); } },
          ])}
        />}>
          <AppText variant="secondary" color={t.c.muted}>{L.sharing(who)}</AppText>
        </InlineBanner>
      </View>
    );
  }
  return null;
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, flexShrink: 1, minWidth: 0 },
    // Margen inferior amplio: el robot de la tarjeta "Ahora" sobresale hacia arriba y no debe tapar los botones.
    card: { gap: spacing.sm, padding: spacing.md, marginBottom: 64, borderRadius: radius.card, backgroundColor: t.c.surface },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
    icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.mintPale },
    sharing: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  }),
);
