import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { hasRevenueCatPublicKey, PLUS_OFFER, revenueCatProvider } from '@/domain/entitlements';
import { useTheme } from '@/theme/provider';
import { spacing } from '@/theme';

export default function BuddyPlus() {
  const router = useRouter();
  const t = useTheme();
  const [message, setMessage] = useState('Los precios y la prueba gratuita se definirán antes del lanzamiento.');
  const [busy, setBusy] = useState(false);
  const restore = async () => {
    if (!hasRevenueCatPublicKey()) {
      setMessage('Restaurar compras estará disponible cuando se configuren los productos y RevenueCat.');
      return;
    }
    setBusy(true);
    try {
      const plan = await revenueCatProvider.restore?.();
      setMessage(plan === 'plus' ? 'BUDDY Plus está activo en esta cuenta.' : 'No encontramos compras para restaurar.');
    } catch {
      setMessage('No pudimos revisar compras. Inténtalo de nuevo cuando tengas conexión.');
    } finally { setBusy(false); }
  };
  return (
    <ScreenContainer header={<ScreenHeader title="BUDDY Plus" fallback="/(caregiver)/(tabs)/health" />}>
      <View style={s.stack}>
        <Card variant="tint" tone="mint" style={s.hero}>
          <Icon name="sparkle" color={t.ink.mint} size={30} />
          <AppText variant="h2">Más apoyo para tu familia</AppText>
          <AppText variant="secondary" color={t.c.muted}>El núcleo de cuidado y todas las alertas de seguridad siguen siendo gratis.</AppText>
        </Card>
        <Card style={s.stack}>
          <AppText variant="h3">Incluye</AppText>
          <AppText variant="secondary">• Invitar a más cuidadores de confianza</AppText>
          <AppText variant="secondary">• Conectar Apple Salud o Health Connect para ver actividad real</AppText>
          <AppText variant="caption" color={t.c.muted}>Prueba gratuita, mensual y anual: disponibles cuando se configuren en las tiendas.</AppText>
        </Card>
        <Card style={s.stack}>
          <AppText variant="secondaryStrong">Prueba gratuita: {PLUS_OFFER.trialLabel}</AppText>
          <AppText variant="secondaryStrong">Mensual: {PLUS_OFFER.monthlyPriceLabel}</AppText>
          <AppText variant="secondaryStrong">Anual: {PLUS_OFFER.yearlyPriceLabel}</AppText>
        </Card>
        <Button label="Restaurar compras" icon="download" variant="secondary" size="md" loading={busy} onPress={restore} />
        <Button label="Ver términos" variant="ghost" size="md" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} />
        <AppText accessibilityLiveRegion="polite" variant="caption" color={t.c.muted}>{message}</AppText>
        <AppText variant="caption" color={t.c.muted}>Las compras se activarán cuando existan productos y condiciones publicadas. No ingreses datos de tarjeta aquí.</AppText>
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({ stack: { gap: spacing.md }, hero: { gap: spacing.sm } });
