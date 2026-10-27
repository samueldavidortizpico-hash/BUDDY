/** Solo desarrollo: galería del sistema de diseño V4.3 con cada componente en todos sus estados. */
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CountUp } from '@/components/count-up';
import { BottomSheet, useToast } from '@/components/feedback';
import { Checkbox, Chip, Field, Segmented, Toggle } from '@/components/forms';
import { IconTile } from '@/components/icon-tile';
import { ListRow } from '@/components/list-row';
import { Row } from '@/components/row';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState, Skeleton } from '@/components/states';
import { FEATURES } from '@/config/features';
import { radius, spacing, type Domain, type StatusKind } from '@/theme';
import { makeStyles } from '@/theme/provider';

const DOMAINS: Domain[] = ['medication', 'water', 'mood', 'sleep', 'activity', 'food', 'contact', 'followUp'];
const STATUS: [StatusKind, string][] = [['ok', 'Todo bien'], ['attention', 'Atención'], ['action', 'Acción necesaria'], ['none', 'Aún no hay registros']];

export default function Gallery() {
  const s = useStyles();
  const toast = useToast();
  const [checked, setChecked] = useState(true);
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState<'day' | 'week' | 'month'>('week');
  const [email, setEmail] = useState('laura@correo.co');
  const [sheet, setSheet] = useState(false);
  const [count, setCount] = useState(7000);
  if (!FEATURES.devTools) return <Redirect href="/" />;
  return (
    <ScreenContainer header={<ScreenHeader title="Galería V4.3" />}>
      <View style={s.stack}>
        <AppText variant="h2">Botones</AppText>
        <Button label="Entrar" />
        <Button label="Entrar" loading />
        <Button label="Guardado" success />
        <Button label="Entrar" disabled />
        <Button label="Ver detalle" variant="secondary" />
        <Button label="Crear cuenta" variant="outline" />
        <Button label="Eliminar" icon="trash" variant="danger" />
        <Button label="Corregir existencias" icon="pencil" variant="text" />
        <View style={s.row}>
          <Button label="Editar" icon="pencil" size="sm" variant="secondary" />
          <Button label="Ya lo tomé" icon="check" size="sm" />
        </View>
        <Button label="Ya lo tomé" icon="check" size="elder" />

        <AppText variant="h2">Campos</AppText>
        <Field label="Correo electrónico" icon="mail" value={email} onChangeText={setEmail} onClear={() => setEmail('')} valid={/@.+\./.test(email)} />
        <Field label="Contraseña" icon="lock" secure value="secreta" error="La contraseña no coincide" onChangeText={() => undefined} />
        <Field label="Nombre" icon="user" placeholder="Ej.: Laura Gómez" hint="Así te verá tu familia." />

        <AppText variant="h2">Selección</AppText>
        <Checkbox checked={checked} onChange={setChecked} label="Acepto los términos y la política de privacidad" />
        <View style={s.toggleRow}>
          <AppText variant="bodyStrong" style={s.flex}>Avisos sonoros</AppText>
          <Toggle value={on} onChange={setOn} label="Avisos sonoros" />
        </View>
        <Segmented label="Periodo" value={seg} onChange={setSeg} options={[{ key: 'day', label: 'Hoy' }, { key: 'week', label: 'Semana' }, { key: 'month', label: 'Mes' }]} />
        <View style={s.chips}>
          <Chip label="Mañana" selected />
          <Chip label="Tarde" />
          <Chip label="Noche" />
        </View>

        <AppText variant="h2">Tarjetas y filas</AppText>
        {STATUS.map(([kind, label]) => (
          <Card key={kind} variant="status" status={kind}>
            <AppText variant="h3">{label}</AppText>
            <AppText variant="secondary">Una frase con la razón.</AppText>
          </Card>
        ))}
        <Card padding={0} style={s.list}>
          <ListRow icon="user" domain="petrol" title="Cuenta" onPress={() => undefined} />
          <ListRow icon="bell" domain="followUp" title="Avisos para mí" detail="Sonido y horario" divider onPress={() => undefined} />
        </Card>
        <Card>
          <Row action={<Button label="Marcar como tomado" size="sm" variant="tonal" icon="check" />}>
            <AppText variant="bodyStrong">8:00 a. m.</AppText>
            <AppText variant="secondary">Losartán de 50 mg, una tableta con el desayuno</AppText>
          </Row>
        </Card>

        <AppText variant="h2">Iconos de dominio</AppText>
        <View style={s.chips}>
          {DOMAINS.map((d) => <IconTile key={d} icon="heart" domain={d} />)}
        </View>

        <AppText variant="h2">Números y avisos</AppText>
        <CountUp value={count} variant="heroL" format={(n) => `$${n.toLocaleString('es-CO')}`} />
        <View style={s.row}>
          <Button label="Contar" size="sm" variant="secondary" onPress={() => setCount((c) => (c === 7000 ? 13000 : 7000))} />
          <Button label="Aviso" size="sm" variant="secondary" onPress={() => toast({ message: 'Guardado', icon: 'check' })} />
          <Button label="Hoja" size="sm" variant="secondary" onPress={() => setSheet(true)} />
        </View>

        <AppText variant="h2">Vacío y carga</AppText>
        <Card>
          <EmptyState icon="calendar" title="Aún no hay citas" text="Agrega la primera y BUDDY la recordará." action={{ label: 'Agregar cita', onPress: () => undefined }} />
        </Card>
        <Card style={s.stack}>
          <Skeleton height={22} width="60%" />
          <Skeleton height={16} />
          <Skeleton height={16} width="80%" />
        </Card>
      </View>
      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Hoja inferior">
        <AppText variant="body">Sube desde abajo con resorte y tiene su asa.</AppText>
      </BottomSheet>
    </ScreenContainer>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    stack: { gap: spacing.md },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
    flex: { flex: 1 },
    list: { overflow: 'hidden', borderRadius: radius.card },
  }),
);
