import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { IconTile, Notice, SectionHeader, StatusBadge } from '@/components/blocks';
import { Card } from '@/components/card';
import { Icon, type IconName } from '@/components/icon';
import { PillVisual } from '@/components/pill-visual';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { strengthLabel, useMedications } from '@/features/medications/hooks';
import { ink, palette, spacing } from '@/theme';

/**
 * Seguridad de medicamentos: SIN contenido farmacológico. No se afirma ninguna interacción,
 * contraindicación ni indicación (ni siquiera ficticia) hasta contar con fuentes verificadas
 * y revisión profesional (ver .claude/skills/buddy-medical-safety).
 */
const HOW: { icon: IconName; title: string; text: string }[] = [
  { icon: 'shield', title: 'Fuentes verificadas', text: 'Solo usará información de fuentes oficiales y con licencia, como registros sanitarios. Cada aviso mostrará su fuente.' },
  { icon: 'user', title: 'Revisión profesional', text: 'Las reglas y los textos serán revisados por profesionales de la salud antes de activarse.' },
  { icon: 'warning', title: 'Sin conclusiones automáticas', text: 'Si no hay información verificada, BUDDY lo dirá claramente; nunca dirá que “no hay riesgo”.' },
];

export default function Safety() {
  const meds = useMedications();
  return (
    <ScreenContainer header={<ScreenHeader title="Seguridad de medicamentos" />}>
      <View style={styles.stack}>
        <Appear index={0}>
          <Card variant="gradient" gradient="petrolCard" elevation="elevated" style={styles.hero}>
            <View style={styles.orb}>
              <Icon name="shield" size={32} color={palette.mint} />
            </View>
            <View style={styles.flex}>
              <StatusBadge label="Próximamente" tone="slate" />
              <AppText variant="h3" color={ink.inverse}>
                Revisión farmacológica
              </AppText>
              <AppText variant="caption" color={palette.nightText}>
                {`${meds.length} medicamentos registrados · aún sin revisar`}
              </AppText>
            </View>
          </Card>
        </Appear>

        <SectionHeader title="Cómo funcionará" subtitle="Para cuidarte mejor, sin adivinar" />
        {HOW.map((h, i) => (
          <Appear key={h.title} index={i + 1}>
            <Card bordered style={styles.row}>
              <IconTile icon={h.icon} tone="mint" />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{h.title}</AppText>
                <AppText variant="secondary" color={ink.muted}>
                  {h.text}
                </AppText>
              </View>
            </Card>
          </Appear>
        ))}

        <SectionHeader title="Tus medicamentos" subtitle="Aún no hay revisión para ninguno" />
        {meds.map((m) => (
          <View key={m.id} style={styles.med} accessible accessibilityLabel={`${m.name} ${strengthLabel(m)}: sin revisión todavía`}>
            <PillVisual color={m.color} size="sm" />
            <AppText variant="bodyStrong" style={styles.flex}>{`${m.name} · ${strengthLabel(m)}`}</AppText>
            <StatusBadge label="Sin revisión" tone="slate" />
          </View>
        ))}

        <Notice text="Esta información es orientativa y no reemplaza la evaluación de un profesional de la salud. Ante cualquier duda sobre tus medicamentos, consulta con tu médico o farmacéutico." />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  stack: { gap: spacing.md, paddingTop: spacing.xs },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  orb: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.14)', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  med: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: palette.line,
  },
});
