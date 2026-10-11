import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { ListItem, SectionHeader } from '@/components/blocks';
import { BuddyAvatar } from '@/components/buddy';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useToast } from '@/components/feedback';
import { TextArea } from '@/components/field';
import { Icon } from '@/components/icon';
import { MOOD_VISUAL, MoodSelector } from '@/components/mood-selector';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { moodLabel, MOODS, useTodayMood, useWeekMoods, wellbeingActions } from '@/features/wellbeing/hooks';
import { useNow } from '@/hooks/use-now';
import type { MoodKey } from '@/types/domain';
import { ink, palette, shadow, spacing, tones } from '@/theme';
import { dayInitial, formatRelativeDay, toISODate } from '@/utils/dates';
import { successHaptic } from '@/utils/haptics';

export default function Mood() {
  const router = useRouter();
  const toast = useToast();
  const now = useNow();
  const today = useTodayMood(now);
  const week = useWeekMoods(now);
  const [mood, setMood] = useState<MoodKey | null>(today?.mood ?? null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (!mood) return;
    wellbeingActions.saveMood(mood, note);
    successHaptic();
    setSaved(true);
    setNote('');
    toast({ message: `Ánimo guardado: ${moodLabel(mood)}. Gracias por contármelo.`, icon: 'heart' });
  };

  return (
    <ScreenContainer keyboard header={<ScreenHeader title="Estado de ánimo" />}>
      <View style={styles.stack}>
        <Appear index={0}>
          <Card variant="gradient" gradient="mood" style={styles.hero}>
            <BuddyAvatar size="medium" />
            <View style={styles.flex}>
              <AppText variant="eyebrow" color={ink.lavender}>
                BUDDY TE ESCUCHA
              </AppText>
              <AppText variant="h3">¿Cómo te sientes hoy?</AppText>
              <AppText variant="secondary" color={ink.muted}>
                No hay respuestas correctas. Cuéntame cómo estás.
              </AppText>
            </View>
          </Card>
        </Appear>

        <Appear index={1}>
          <MoodSelector
            options={MOODS}
            value={mood}
            onChange={(k) => {
              setMood(k);
              setSaved(false);
            }}
          />
        </Appear>

        <TextArea label="¿Quieres contarme algo más?" optional placeholder="Escribe aquí cómo fue tu día…" value={note} onChangeText={setNote} />

        <Button
          label={saved ? 'Ánimo guardado' : 'Guardar cómo me siento'}
          icon={saved ? 'check' : 'heart'}
          disabled={!mood}
          accessibilityHint={!mood ? 'Primero elige cómo te sientes' : undefined}
          onPress={save}
        />

        <SectionHeader title="Tu ánimo esta semana" action={{ label: 'Ver historial', onPress: () => router.push('/reports') }} style={styles.section} />
        <View style={styles.week}>
          {week.map(({ date, entry }) => {
            const visual = entry ? MOOD_VISUAL[entry.mood] : null;
            return (
              <View
                key={date}
                style={styles.day}
                accessible
                accessibilityLabel={`${formatRelativeDay(date, toISODate(now))}: ${entry ? moodLabel(entry.mood) : 'sin registro'}`}
              >
                <View style={[styles.dot, { backgroundColor: visual ? tones[visual.tone].solid : palette.slatePale }]}>
                  {visual ? <Icon name={visual.icon} size={16} color={ink.title} /> : null}
                </View>
                <AppText variant="meta" color={ink.muted}>
                  {dayInitial(date)}
                </AppText>
              </View>
            );
          })}
        </View>

        <ListItem
          icon="plus"
          tone="coral"
          title="¿Tienes algún síntoma?"
          subtitle="Regístralo para llevar un mejor seguimiento"
          onPress={() => router.push('/symptoms')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  stack: { gap: spacing.lg, paddingTop: spacing.xs },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  section: { marginBottom: -spacing.xs },
  week: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: palette.white, borderRadius: 18, padding: spacing.sm, ...shadow.soft },
  day: { alignItems: 'center', gap: spacing.xxs, flex: 1 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
