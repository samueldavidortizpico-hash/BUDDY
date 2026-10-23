import { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { healthConnectProvider, healthKitProvider } from '@/domain/services';
import { useIsPlus } from '@/state/entitlements';
import { strings } from '@/i18n';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/provider';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Pedometer de Expo Go: histórico en iOS; Android solo ofrece lecturas en primer plano. */
export default function Watch() {
  const t = useTheme();
  const router = useRouter();
  const entitled = useIsPlus();
  const [today, setToday] = useState<number | null>(null);
  const [week, setWeek] = useState<number | null>(null);
  const [message, setMessage] = useState('Conecta Apple Salud o Health Connect para consultar tus pasos.');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true);
    setToday(null); setWeek(null);
    try {
      if (Platform.OS === 'web') { setMessage('El podómetro requiere un dispositivo iPhone o Android.'); return; }
      const available = await Pedometer.isAvailableAsync();
      if (!available) { setMessage('Este dispositivo no informa pasos con el podómetro.'); return; }
      const permission = await Pedometer.getPermissionsAsync();
      const result = permission.granted ? permission : await Pedometer.requestPermissionsAsync();
      if (!result.granted) { setMessage('Permiso de movimiento no concedido. Revisa los permisos del celular.'); return; }
      if (Platform.OS === 'ios') {
        const now = new Date();
        const todayResult = await Pedometer.getStepCountAsync(startOfDay(now), now);
        const weekResult = await Pedometer.getStepCountAsync(startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), now);
        setToday(todayResult.steps); setWeek(weekResult.steps);
        setMessage('Datos del iPhone. El historial del podómetro conserva hasta siete días.');
      } else {
        setMessage('En Android, Expo Go solo informa pasos en primer plano. Para el total de hoy y la semana se requiere conectar Health Connect en una versión instalable.');
      }
    } catch {
      setMessage('No pudimos leer los pasos. Puedes conectar un reloj desde la versión instalable.');
    } finally { setBusy(false); }
  }, []);
  const provider = Platform.OS === 'ios' ? healthKitProvider : healthConnectProvider;
  return (
    <ScreenContainer header={<ScreenHeader title="Conectar reloj" fallback="/(caregiver)/(tabs)/health" />}>
      <View style={s.stack}>
        {!entitled ? (
          <Card variant="tint" tone="lavender" style={s.stack}>
            <AppText variant="h3">Disponible en BUDDY Plus</AppText>
            <AppText variant="secondary">Apple Salud y Health Connect requieren permisos del adulto mayor y una suscripción activa.</AppText>
            <Button label="Conocer BUDDY Plus" icon="lock" size="md" onPress={() => router.push('/plus' as Href)} />
          </Card>
        ) : null}
        {entitled ? <Card style={s.stack}>
          <AppText variant="h3">Pasos del celular</AppText>
          <AppText variant="secondary" color={t.c.muted}>{message}</AppText>
          {Platform.OS === 'ios' && today !== null ? <AppText variant="h2">Hoy: {today.toLocaleString()} pasos</AppText> : null}
          {Platform.OS === 'ios' && week !== null ? <AppText variant="secondaryStrong">Últimos 7 días: {week.toLocaleString()} pasos</AppText> : null}
          <Button label="Actualizar pasos" icon="walk" variant="secondary" size="md" loading={busy} onPress={refresh} />
        </Card> : null}
        <Card style={s.stack}>
          <AppText variant="h3">Conectar un reloj</AppText>
          <AppText variant="secondary">Apple Salud o Health Connect permiten compartir datos medidos. El adaptador de reloj requiere un build instalable y permisos explícitos.</AppText>
          <AppText variant="caption" color={t.c.muted}>{provider.platform === 'healthkit' ? 'Apple Salud' : 'Health Connect'}: {provider.platform === 'healthkit' ? 'iPhone' : 'Android'}.</AppText>
        </Card>
        <AppText variant="caption" color={t.c.muted}>{strings.health.disclaimer}</AppText>
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({ stack: { gap: spacing.md } });
