/** Galería interna de componentes. Solo existe en desarrollo (__DEV__); en producción redirige al inicio. */
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { DemoBadge, DoseStatusBadge, EmptyState, ListItem, Notice, SectionHeader, StatCard } from '@/components/blocks';
import { BrandMark, BuddyAvatar, BuddyHero, PersonAvatar } from '@/components/buddy';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { BarChart, Sparkline } from '@/components/charts';
import { ChatBubble, TypingIndicator } from '@/components/chat';
import { Chip, SegmentedControl } from '@/components/chip';
import { BottomSheet, SuccessBurst, useToast } from '@/components/feedback';
import { DateField, Field, TimeField } from '@/components/field';
import { Icon, type IconName } from '@/components/icon';
import { MoodSelector } from '@/components/mood-selector';
import { PillVisual } from '@/components/pill-visual';
import { CountUp, ProgressBar, ProgressRing } from '@/components/progress';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { MOODS } from '@/features/wellbeing/hooks';
import type { MoodKey } from '@/types/domain';
import { ink, spacing } from '@/theme';

const ICONS: IconName[] = [
  'arrow', 'back', 'bell', 'calendar', 'camera', 'care', 'chat', 'check', 'chevron', 'clock', 'close', 'heart',
  'home', 'location', 'meds', 'menu', 'mic', 'phone', 'plus', 'search', 'settings', 'shield', 'user', 'warning',
];

export default function Gallery() {
  const toast = useToast();
  const [mood, setMood] = useState<MoodKey | null>('good');
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [sheet, setSheet] = useState(false);
  const [time, setTime] = useState('08:00');
  const [date, setDate] = useState<string | null>('2026-10-10');

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <ScreenContainer header={<ScreenHeader title="Galería (desarrollo)" />}>
      <View style={styles.stack}>
        <BrandMark />
        <BuddyHero size={160} />
        <View style={styles.row}>
          <BuddyAvatar size="small" />
          <BuddyAvatar size="medium" />
          <PersonAvatar size={58} />
        </View>

        <SectionHeader title="Botones" subtitle="primary, coral, secondary, danger, ghost" />
        <Button label="Primario" icon="check" onPress={() => toast('Primario')} />
        <Button label="Comenzar" variant="coral" trailing="arrow" />
        <Button label="Secundario" variant="secondary" icon="clock" />
        <Button label="Emergencia" variant="danger" icon="shield" trailing="arrow" />
        <Button label="Fantasma" variant="ghost" />
        <Button label="Cargando" loading />
        <Button label="Deshabilitado" disabled />
        <View style={styles.row}>
          <IconButton icon="plus" label="Agregar" variant="mint" />
          <IconButton icon="back" label="Atrás" variant="plain" />
          <IconButton icon="close" label="Cerrar" showLabel={false} />
        </View>

        <SectionHeader title="Iconos" />
        <View style={styles.wrap}>
          {ICONS.map((n) => (
            <View key={n} style={styles.icon}>
              <Icon name={n} />
              <AppText variant="meta" color={ink.muted}>
                {n}
              </AppText>
            </View>
          ))}
        </View>

        <SectionHeader title="Selección" />
        <SegmentedControl
          accessibilityLabel="Ejemplo"
          options={[
            { key: 'a', label: 'Todos' },
            { key: 'b', label: 'Hoy' },
            { key: 'c', label: 'Próximos' },
          ]}
          value={seg}
          onChange={setSeg}
        />
        <View style={styles.wrap}>
          <Chip label="Mareo" selected />
          <Chip label="Fatiga" />
        </View>
        <MoodSelector options={MOODS} value={mood} onChange={setMood} />

        <SectionHeader title="Progreso y datos" />
        <ProgressBar value={0.75} accessibilityLabel="Progreso 75 %" />
        <View style={styles.row}>
          <ProgressRing value={0.6} accessibilityLabel="60 %">
            <CountUp value={60} suffix="%" variant="captionStrong" />
          </ProgressRing>
          <PillVisual color="coral" />
          <PillVisual color="blue" />
          <PillVisual color="yellow" />
          <PillVisual color="coral" size="lg" />
        </View>
        <Card>
          <Sparkline values={[40, 55, 48, 65, 58, 72, 66]} />
          <BarChart
            accessibilityLabel="Ejemplo de barras"
            data={[0.6, 0.8, null, 1, 0.5, 0.9, 0.7].map((v, i) => ({ label: 'LMXJVSD'[i], value: v }))}
          />
        </Card>
        <View style={styles.row}>
          <StatCard icon="meds" value="3/4" label="Tomadas" />
          <StatCard icon="bell" tone="coral" value="1" label="Pendiente" />
        </View>
        <ListItem icon="shield" title="Fila de lista" subtitle="Con subtítulo" onPress={() => undefined} />
        <View style={styles.wrap}>
          <DoseStatusBadge status="taken" />
          <DoseStatusBadge status="pending" />
          <DoseStatusBadge status="snoozed" />
          <DoseStatusBadge status="skipped" />
          <DoseStatusBadge status="unconfirmed" />
          <DemoBadge />
        </View>
        <Notice text="Los datos son orientativos y no sustituyen una valoración médica." />

        <SectionHeader title="Formularios" />
        <Field label="Nombre" placeholder="Ej.: Losartán" icon="meds" />
        <Field label="Con error" error="Escribe el nombre del medicamento." />
        <TimeField label="Hora" value={time} onChange={setTime} />
        <DateField label="Fecha" value={date} today="2026-10-10" onChange={setDate} optional />

        <SectionHeader title="Chat" />
        <ChatBubble from="buddy" text="¡Hola! ¿Cómo te sientes hoy?" time="9:40 a. m." />
        <ChatBubble from="user" text="Muy bien" time="9:41 a. m." />
        <TypingIndicator />

        <SectionHeader title="Estados" />
        <EmptyState icon="meds" title="Sin medicamentos" text="Agrega el primero." action={{ label: 'Agregar', onPress: () => undefined }} />
        <SuccessBurst title="¡Muy bien!" text="Estado de éxito." />
        <Button label="Abrir hoja inferior" variant="secondary" onPress={() => setSheet(true)} />
        <Appear index={1}>
          <Card variant="gradient" gradient="sleep">
            <AppText variant="bodyStrong" color={ink.inverse}>
              Tarjeta con degradado
            </AppText>
          </Card>
        </Appear>
      </View>
      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Hoja inferior">
        <AppText>Contenido de ejemplo.</AppText>
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  icon: { width: 72, alignItems: 'center', gap: 2, paddingVertical: spacing.xs },
});
