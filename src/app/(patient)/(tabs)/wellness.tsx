import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { IconTile, ListItem, SectionHeader } from '@/components/blocks';
import { BuddyAvatar, PersonAvatar } from '@/components/buddy';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { CountUp, ProgressRing } from '@/components/progress';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { useSettings } from '@/features/profile/hooks';
import { DAILY_GOALS, HABITS, useWellnessDay, WATER_GOAL, wellbeingActions, type HabitId } from '@/features/wellbeing/hooks';
import { useNow } from '@/hooks/use-now';
import { gradients, ink, motion, palette, radius, shadow, spacing, type Tone } from '@/theme';
import { successHaptic, tapHaptic } from '@/utils/haptics';

const HABIT_VISUAL: Record<HabitId, { icon: IconName; tone: Tone }> = {
  walk: { icon: 'care', tone: 'mint' },
  breathing: { icon: 'heart', tone: 'lavender' },
  food: { icon: 'check', tone: 'yellow' },
};

/** Vaso que se llena desde abajo (scaleY). */
function Glass({ filled }: { filled: boolean }) {
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    fill.set(reduceMotion ? (filled ? 1 : 0) : withSpring(filled ? 1 : 0, motion.spring));
  }, [filled, reduceMotion, fill]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: fill.value }] }));
  return (
    <View style={styles.glass}>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: 'bottom' }, style]}>
        <LinearGradient colors={gradients.water} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

export default function Wellness() {
  const router = useRouter();
  const now = useNow();
  const { userName } = useSettings();
  const day = useWellnessDay(now);
  const ratio = day.goals / DAILY_GOALS;

  return (
    <ScreenContainer
      insideTabs
      header={
        <ScreenHeader
          title="Bienestar diario"
          showBack={false}
          right={
            <PressableScale onPress={() => router.push('/settings')} accessibilityLabel="Abrir mi perfil" style={styles.avatar}>
              <PersonAvatar size={44} label="" />
            </PressableScale>
          }
        />
      }
    >
      <View style={styles.stack}>
        <Appear index={0}>
          <Card variant="gradient" gradient="wellness" style={styles.hero}>
            <View style={styles.flex}>
              <AppText variant="eyebrow" color={ink.mint}>
                TU PROGRESO DE HOY
              </AppText>
              <AppText variant="h3">{day.goals ? `¡Vas muy bien, ${userName}!` : '¡Empecemos el día!'}</AppText>
              <AppText variant="secondary" color={ink.muted}>
                {`${day.goals} de ${DAILY_GOALS} pequeñas metas completadas`}
              </AppText>
            </View>
            <ProgressRing value={ratio} size={78} stroke={8} accessibilityLabel={`Metas de hoy: ${day.goals} de ${DAILY_GOALS}`}>
              <CountUp value={Math.round(ratio * 100)} suffix="%" variant="captionStrong" />
            </ProgressRing>
          </Card>
        </Appear>

        <Appear index={1}>
          <Card variant="gradient" gradient="hydration" style={styles.hydration}>
            <View style={styles.row}>
              <IconTile icon="care" tone="sky" />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">Hidratación</AppText>
                <AppText variant="secondary" color={ink.muted} accessibilityLiveRegion="polite">
                  {`${day.glasses} de ${WATER_GOAL} vasos`}
                </AppText>
              </View>
            </View>
            <View style={styles.glasses} accessible accessibilityLabel={`${day.glasses} de ${WATER_GOAL} vasos de agua`}>
              {Array.from({ length: WATER_GOAL }, (_, i) => (
                <Glass key={i} filled={i < day.glasses} />
              ))}
            </View>
            <View style={styles.row}>
              <Button
                label={day.glasses >= WATER_GOAL ? '¡Meta cumplida!' : 'Añadir vaso'}
                icon="plus"
                variant="secondary"
                size="md"
                disabled={day.glasses >= WATER_GOAL}
                style={styles.flex}
                onPress={() => {
                  wellbeingActions.addWater(1);
                  if (day.glasses + 1 >= WATER_GOAL) successHaptic();
                  else tapHaptic();
                }}
              />
              {day.glasses > 0 ? <Chip role="button" label="Quitar uno" onPress={() => wellbeingActions.addWater(-1)} /> : null}
            </View>
          </Card>
        </Appear>

        <SectionHeader title="Tu rutina de hoy" subtitle="Pasos pequeños, grandes logros" style={styles.section} />
        <View style={styles.habits}>
          {HABITS.map((h, i) => {
            const done = day.habitsDone.includes(h.id);
            const v = HABIT_VISUAL[h.id];
            return (
              <Appear key={h.id} index={i + 2}>
                <PressableScale
                  haptic
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${h.name}, ${h.detail}`}
                  accessibilityState={{ checked: done }}
                  onPress={() => wellbeingActions.toggleHabit(h.id)}
                  style={styles.habit}
                >
                  <IconTile icon={v.icon} tone={v.tone} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">{h.name}</AppText>
                    <AppText variant="caption" color={ink.muted}>
                      {h.detail}
                    </AppText>
                  </View>
                  <View style={[styles.check, done && styles.checkDone]}>
                    {done ? (
                      <Animated.View entering={ZoomIn.springify().damping(12)}>
                        <Icon name="check" size={18} color={ink.inverse} strokeWidth={2.4} />
                      </Animated.View>
                    ) : (
                      <Icon name="plus" size={18} color={ink.muted} />
                    )}
                  </View>
                </PressableScale>
              </Appear>
            );
          })}
        </View>

        <Card variant="gradient" gradient="achievement" style={styles.achievement}>
          <View style={styles.mark}>
            <Icon name="heart" color={ink.title} />
          </View>
          <View style={styles.flex}>
            <AppText variant="eyebrow" color={ink.yellow}>
              LOGRO DEL DÍA
            </AppText>
            <AppText variant="bodyStrong">
              {day.streak > 1 ? `¡${day.streak} días cuidándote!` : day.streak === 1 ? '¡Hoy te estás cuidando!' : 'Tu primer logro te espera'}
            </AppText>
            <AppText variant="caption" color={ink.muted}>
              Tu constancia hace la diferencia.
            </AppText>
          </View>
          <BuddyAvatar size="small" label="" />
        </Card>

        <ListItem icon="calendar" title="Mi historial de bienestar" subtitle="Consulta avances y tendencias" onPress={() => router.push('/reports')} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  stack: { gap: spacing.md, paddingTop: spacing.xs },
  avatar: { borderRadius: radius.pill },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 23 },
  hydration: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  glasses: { flexDirection: 'row', gap: 6 },
  glass: {
    flex: 1,
    height: 30,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    overflow: 'hidden',
    backgroundColor: palette.white,
  },
  section: { marginTop: spacing.xs, marginBottom: 0 },
  habits: { gap: spacing.xs },
  habit: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 17,
    backgroundColor: palette.white,
    ...shadow.soft,
  },
  check: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: ink.success, borderColor: ink.success },
  achievement: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mark: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.yellow, alignItems: 'center', justifyContent: 'center' },
});
