/** Solo desarrollo: galería del sistema de diseño V4 (botones, tarjetas de estado, filas, mosaicos y encabezado). */
import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconTile } from '@/components/icon-tile';
import { Row } from '@/components/row';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { spacing, type Domain, type StatusKind } from '@/theme';

const DOMAINS: Domain[] = ['medication', 'water', 'mood', 'sleep', 'activity', 'food', 'contact', 'followUp'];
const STATUS: [StatusKind, string][] = [['ok', 'Todo bien'], ['attention', 'Atención'], ['action', 'Acción necesaria'], ['none', 'Aún no hay registros']];

export default function Gallery() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <ScreenContainer header={<ScreenHeader title="Galería V4 (desarrollo)" />}>
      <View style={styles.stack}>
        <AppText variant="h2">Botones</AppText>
        <Button label="Ya lo tomé" icon="check" size="elder" />
        <Button label="Llamar a Rosa" icon="phone" />
        <Button label="Registrar compra" icon="plus" variant="tonal" tone="yellow" />
        <Button label="Corregir existencias" icon="pencil" variant="text" />
        <Button label="Dejar de compartir" variant="ghost" />
        <Button label="Eliminar" icon="trash" variant="danger" />
        <Button label="Editar" icon="pencil" size="sm" variant="secondary" />

        <AppText variant="h2">Tarjetas de estado</AppText>
        {STATUS.map(([kind, label]) => (
          <Card key={kind} variant="status" status={kind}>
            <AppText variant="h3">{label}</AppText>
            <AppText variant="secondary">Una frase con la razón.</AppText>
          </Card>
        ))}

        <AppText variant="h2">Fila (la acción baja si no cabe)</AppText>
        <Card>
          <Row action={<Button label="Marcar como tomado" size="sm" variant="tonal" icon="check" />}>
            <AppText variant="bodyStrong">8:00 a. m.</AppText>
            <AppText variant="secondary">Losartán de 50 mg, una tableta con el desayuno</AppText>
          </Row>
        </Card>

        <AppText variant="h2">Mosaicos de icono</AppText>
        <View style={styles.tiles}>
          {DOMAINS.map((d) => <IconTile key={d} icon="heart" domain={d} />)}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
