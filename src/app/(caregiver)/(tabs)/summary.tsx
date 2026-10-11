import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActivityRow } from '@/components/activity-row';
import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { DemoBadge, IconTile, SectionHeader, StatCard } from '@/components/blocks';
import { InitialsAvatar, PersonAvatar } from '@/components/buddy';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useToast } from '@/components/feedback';
import { Icon, type IconName } from '@/components/icon';
import { MapIllustration } from '@/components/map-illustration';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenContainer } from '@/components/screen-container';
import { DEMO_CAREGIVER, useCaregiverOverview } from '@/features/caregiver/hooks';
import { DEMO_PROFILE } from '@/features/profile/hooks';
import { moodLabel } from '@/features/wellbeing/hooks';
import { useNow } from '@/hooks/use-now';
import { ink, palette, radius, shadow, spacing, type Tone } from '@/theme';
import { formatAgo, formatDuration } from '@/utils/dates';

function StatusTile({ icon, tone, value, label, onPress }: { icon: IconName; tone: Tone; value: string; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${label}: ${value}`} style={styles.statusTile}>
      <IconTile icon={icon} tone={tone} size={36} />
      <AppText variant="secondaryStrong" align="center" numberOfLines={2}>
        {value}
      </AppText>
      <AppText variant="caption" color={ink.muted}>
        {label}
      </AppText>
    </PressableScale>
  );
}

export default function CaregiverSummary() {
  const router = useRouter();
  const toast = useToast();
  const now = useNow();
  const o = useCaregiverOverview(now);
  const allGood = o.plan.unconfirmed === 0;
  const openWellbeing = () => router.push({ pathname: '/tracking', params: { tab: 'wellbeing' } });
  const symptomText = o.symptomsToday.length ? `${o.symptomsToday.length} registrado${o.symptomsToday.length > 1 ? 's' : ''}` : 'Ninguno';

  return (
    <ScreenContainer insideTabs>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="eyebrow" color={ink.mint}>
            BUDDY CUIDADOR
          </AppText>
          <AppText variant="h1" color={ink.title}>
            Panel del cuidador
          </AppText>
        </View>
        <PressableScale onPress={() => router.push('/account')} accessibilityLabel={`Tu cuenta: ${DEMO_CAREGIVER.name}`} style={styles.round}>
          <InitialsAvatar initials={DEMO_CAREGIVER.initials} size={52} label="" />
        </PressableScale>
      </View>
      <DemoBadge style={styles.demo} />

      <View style={styles.stack}>
        <Appear index={0}>
          <Card style={styles.person}>
            <PersonAvatar size={64} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{DEMO_PROFILE.fullName}</AppText>
              <View style={styles.inline}>
                <View style={[styles.dot, { backgroundColor: allGood ? palette.success : palette.yellow }]} />
                <AppText variant="captionStrong" color={allGood ? ink.success : ink.yellow}>
                  {allGood ? 'Todo en orden hoy' : `${o.plan.unconfirmed} ${o.plan.unconfirmed === 1 ? 'toma sin confirmar' : 'tomas sin confirmar'}`}
                </AppText>
              </View>
              <AppText variant="caption" color={ink.muted}>
                {o.lastActivity ? `Última actividad ${formatAgo(new Date(o.lastActivity.at), now)}` : 'Sin actividad registrada hoy'}
              </AppText>
            </View>
          </Card>
        </Appear>

        <Appear index={1} style={styles.row}>
          <StatCard
            icon="meds"
            value={`${o.plan.taken}/${o.plan.total}`}
            label="Tomas confirmadas"
            onPress={openWellbeing}
            accessibilityHint="Abre el bienestar de hoy"
          />
          <StatCard
            icon="bell"
            tone="coral"
            value={`${o.counts.pending + o.counts.important}`}
            label="Alertas por revisar"
            onPress={() => router.push('/alerts')}
            accessibilityHint="Abre las alertas de seguimiento"
          />
        </Appear>

        <Appear index={2} style={styles.row}>
          <StatusTile icon="heart" tone="lavender" value={o.mood ? moodLabel(o.mood.mood) : 'Sin registro'} label="Ánimo" onPress={openWellbeing} />
          <StatusTile icon="clock" tone="sky" value={o.sleep.lastMinutes !== null ? formatDuration(o.sleep.lastMinutes) : '—'} label="Sueño" onPress={openWellbeing} />
          <StatusTile icon="warning" tone="yellow" value={symptomText} label="Síntomas" onPress={openWellbeing} />
        </Appear>

        <Appear index={3}>
          <PressableScale onPress={() => router.push('/tracking')} accessibilityLabel="Ver ubicación compartida (vista de ejemplo)" style={styles.mapWrap}>
            {o.locationSharing.enabled ? (
              <>
                <MapIllustration height={150} />
                <View style={styles.caption}>
                  <View style={styles.inline}>
                    <Icon name="location" size={16} color={ink.text} />
                    <AppText variant="captionStrong">En casa (ejemplo)</AppText>
                  </View>
                  <AppText variant="meta" color={ink.muted}>
                    {o.locationSharing.updatedAt ? `Actualizado ${formatAgo(new Date(o.locationSharing.updatedAt), now)}` : ''}
                  </AppText>
                </View>
              </>
            ) : (
              <View style={styles.noMap}>
                <IconTile icon="location" tone="slate" />
                <AppText variant="secondaryStrong" style={styles.flex}>
                  Ubicación no compartida
                </AppText>
                <Icon name="chevron" color={ink.muted} />
              </View>
            )}
          </PressableScale>
        </Appear>

        <View style={styles.row}>
          <Button
            label="Llamar"
            icon="phone"
            size="md"
            style={styles.flex}
            onPress={() => toast({ message: `Demostración: aquí se llamaría a ${DEMO_PROFILE.fullName}. No se realizó ninguna llamada.`, icon: 'phone' })}
          />
          <Button
            label="Mensaje"
            icon="chat"
            variant="secondary"
            size="md"
            style={styles.flex}
            onPress={() => toast({ message: 'Los mensajes estarán disponibles próximamente.', icon: 'chat' })}
          />
        </View>

        <SectionHeader
          title="Actividad de hoy"
          action={{ label: 'Ver reporte', onPress: () => router.push({ pathname: '/reports', params: { viewer: 'caregiver' } }) }}
          style={styles.section}
        />
        {o.activity.length ? (
          o.activity.slice(0, 4).map((a) => <ActivityRow key={a.id} item={a} now={now} />)
        ) : (
          <AppText variant="secondary" color={ink.muted}>
            Aún no hay actividad registrada hoy.
          </AppText>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  header: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  round: { borderRadius: radius.pill },
  demo: { marginBottom: spacing.sm },
  stack: { gap: spacing.sm },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexWrap: 'wrap' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  row: { flexDirection: 'row', gap: spacing.sm },
  statusTile: {
    flex: 1,
    minHeight: 104,
    backgroundColor: palette.white,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    padding: spacing.xs,
    ...shadow.soft,
  },
  mapWrap: { borderRadius: 22 },
  caption: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: palette.glass,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  noMap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: palette.white, borderRadius: 22, padding: spacing.md, ...shadow.soft },
  section: { marginTop: spacing.sm, marginBottom: 0 },
});
