import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { DemoBadge, ListItem } from '@/components/blocks';
import { PersonAvatar } from '@/components/buddy';
import { Button, IconButton } from '@/components/button';
import { BottomSheet, useToast } from '@/components/feedback';
import { type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { BuddyRobot, type RobotMood } from '@/components/robot';
import { ScreenContainer } from '@/components/screen-container';
import { doseLabel, effectiveTime, medicationActions, strengthLabel, useDayPlan } from '@/features/medications/hooks';
import { isOpen } from '@/features/medications/schedule';
import { pickNow, type NowItem } from '@/features/now/pick';
import { useContacts, useSettings } from '@/features/profile/hooks';
import { WATER_GOAL, useTodayMood, useWellnessDay, wellbeingActions } from '@/features/wellbeing/hooks';
import { useNow } from '@/hooks/use-now';
import { border, domains, isDark, ink, palette, radius, shadow, spacing, touch, type Domain } from '@/theme';
import { clockToMinutes, formatClock, formatLongDate, greetingFor, toClock } from '@/utils/dates';
import { successHaptic } from '@/utils/haptics';

const MENU: { icon: IconName; title: string; href: Href }[] = [
  { icon: 'user', title: 'Mi perfil y ajustes', href: '/settings' },
  { icon: 'calendar', title: 'Historial y reportes', href: '/reports' },
  { icon: 'shield', title: 'Seguridad de medicamentos', href: '/safety' },
  { icon: 'clock', title: 'Mi sueño', href: '/sleep' },
  { icon: 'heart', title: 'Registros de salud', href: '/health' },
];

/** "2:00 p. m." → ["2:00", "p. m."] para el numeral héroe. */
function splitClock(label: string): [string, string] {
  const i = label.indexOf(' ');
  return i < 0 ? [label, ''] : [label.slice(0, i), label.slice(i + 1)];
}

function domainOf(item: NowItem): Domain {
  if (item.kind === 'medication') return item.item.status === 'unconfirmed' ? 'followUp' : 'medication';
  if (item.kind === 'water') return 'water';
  if (item.kind === 'checkin') return 'mood';
  return 'activity';
}

/** Inicio del adulto mayor: una sola tarea protagonista ("Ahora"), un resumen de lo que viene y ayuda a mano. */
export default function Home() {
  const router = useRouter();
  const toast = useToast();
  const now = useNow();
  const [menu, setMenu] = useState(false);
  const [checkinLater, setCheckinLater] = useState(false);
  const { userName } = useSettings();
  const contacts = useContacts();
  const plan = useDayPlan(now);
  const mood = useTodayMood(now);
  const wellness = useWellnessDay(now);
  const go = (href: Href) => router.push(href);
  // Pantallas bajas (≤ 780): menos aire sobre la tarjeta para que la acción principal quede a la vista.
  const compact = useWindowDimensions().height <= 780;

  const { now: item, later } = pickNow({
    open: plan.items.filter((i) => isOpen(i.status)),
    next: plan.next,
    nowMinutes: clockToMinutes(toClock(now)),
    glasses: wellness.glasses,
    goal: WATER_GOAL,
    moodDone: !!mood || checkinLater,
  });
  const family = contacts[0];

  const addGlass = () => {
    wellbeingActions.addWater(1);
    successHaptic();
    toast({ message: 'Anotado: un vaso de agua.', icon: 'check', action: { label: 'Deshacer', onPress: () => wellbeingActions.addWater(-1) } });
  };

  return (
    <ScreenContainer
      insideTabs
      footer={
        <View style={styles.help}>
          <Button
            label={family ? `Llamar a ${family.name.split(' ')[0]}` : 'Llamar'}
            variant="tonal"
            tone="mint"
            icon="phone"
            stacked style={styles.helpBtn}
            accessibilityHint="Demostración: no se realiza ninguna llamada"
            onPress={() => toast({ message: `Demostración: aquí se llamaría a ${family?.name ?? 'tu familiar'}. No se realizó ninguna llamada.`, icon: 'phone' })}
          />
          <Button label="Pedir ayuda" variant="tonal" tone="coral" icon="shield" stacked style={styles.helpBtn} onPress={() => go('/modals/emergency')} />
        </View>
      }
    >
      <View style={styles.top}>
        <IconButton icon="menu" label="Menú" variant="soft" onPress={() => setMenu(true)} />
        <PressableScale onPress={() => go('/settings')} accessibilityLabel="Abrir mi perfil" style={styles.avatarBtn}>
          <PersonAvatar size={52} label="" />
        </PressableScale>
      </View>

      <Appear index={0} style={[styles.greeting, compact && styles.greetingCompact]}>
        <View style={styles.dateRow}>
          <AppText variant="eyebrow" color={ink.mint}>
            {formatLongDate(now)}
          </AppText>
          <DemoBadge />
        </View>
        <AppText variant="h1" color={ink.title}>{`${greetingFor(now)}, ${userName}`}</AppText>
      </Appear>

      <Appear index={1}>
        <NowCard
          item={item}
          onConfirm={(doseId, name) => {
            medicationActions.confirm(doseId);
            successHaptic();
            toast({ message: `Anotado: tomaste ${name}.`, icon: 'check' });
          }}
          onAddGlass={addGlass}
          onCheckinLater={() => setCheckinLater(true)}
          go={go}
        />
      </Appear>

      {later.length ? (
        <Appear index={2} style={styles.laterBlock}>
          <AppText variant="h3" color={ink.title}>
            Más tarde hoy
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
            {later.map((l) => (
              <LaterChip key={l.kind === 'medication' ? l.item.dose.id : l.kind} item={l} go={go} />
            ))}
          </ScrollView>
        </Appear>
      ) : null}

      <BottomSheet visible={menu} onClose={() => setMenu(false)} title="Menú">
        <View style={styles.menu}>
          {MENU.map((m) => (
            <ListItem
              key={m.title}
              icon={m.icon}
              title={m.title}
              onPress={() => {
                setMenu(false);
                go(m.href);
              }}
            />
          ))}
        </View>
      </BottomSheet>
    </ScreenContainer>
  );
}

function NowCard({
  item,
  onConfirm,
  onAddGlass,
  onCheckinLater,
  go,
}: {
  item: NowItem;
  onConfirm: (doseId: string, name: string) => void;
  onAddGlass: () => void;
  onCheckinLater: () => void;
  go: (href: Href) => void;
}) {
  const d = domains[domainOf(item)];
  const secondaryStyle = [styles.secondary, { borderColor: `${d.text}40`, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.55)' }];

  let eyebrow = 'Hoy';
  let title = '¡Todo listo por hoy!';
  let detail = 'No tienes nada pendiente. Buen trabajo.';
  let numeral: [string, string] | null = null;
  let robot: RobotMood = 'celebrate';
  let robotLabel: string | undefined;
  let actions: ReactNode = <Button label="Hablar con BUDDY" size="elder" icon="chat" onPress={() => go('/chat')} />;

  if (item.kind === 'medication') {
    const { medication, dose, status } = item.item;
    const unconfirmed = status === 'unconfirmed';
    eyebrow = unconfirmed ? 'Sin confirmar' : 'Medicamento';
    title = medication.name;
    detail = `${strengthLabel(medication)} · ${doseLabel(medication)}`;
    numeral = splitClock(formatClock(effectiveTime(dose)));
    robot = unconfirmed ? 'worry' : 'wave';
    robotLabel = unconfirmed ? 'BUDDY te recuerda que esta toma no está confirmada' : undefined;
    actions = (
      <>
        <Button label="Ya lo tomé" size="elder" icon="check" onPress={() => onConfirm(dose.id, medication.name)} />
        <Button
          label="Ver opciones"
          variant="ghost"
          textColor={d.text}
          style={secondaryStyle}
          accessibilityHint="Posponer 10 minutos o marcar que no la tomaste"
          onPress={() => go({ pathname: '/modals/reminder', params: { doseId: dose.id } })}
        />
      </>
    );
  } else if (item.kind === 'water') {
    eyebrow = 'Agua';
    title = 'Toma un vaso de agua';
    detail = `Llevas ${item.glasses} de ${item.goal} vasos hoy`;
    numeral = [`${item.glasses}`, `de ${item.goal} vasos`];
    robot = 'idle';
    actions = (
      <>
        <Button label="Tomé un vaso" size="elder" variant={isDark ? 'primary' : 'white'} icon="plus" onPress={onAddGlass} />
        <Button label="Ver mi agua" variant="ghost" textColor={d.text} style={secondaryStyle} onPress={() => go('/wellness')} />
      </>
    );
  } else if (item.kind === 'checkin') {
    eyebrow = 'Chequeo';
    title = '¿Cómo te sientes hoy?';
    detail = 'Cuéntaselo a BUDDY. Toma menos de un minuto.';
    robot = 'think';
    actions = (
      <>
        <Button label="Contarle a BUDDY" size="elder" icon="heart" onPress={() => go('/mood')} />
        <Button label="Ahora no" variant="ghost" textColor={d.text} style={secondaryStyle} onPress={onCheckinLater} />
      </>
    );
  }

  return (
    <View style={[styles.hero, shadow.hero]}>
      <LinearGradient colors={[d.gradient[0], d.gradient[1]]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={[StyleSheet.absoluteFill, styles.heroFill]} />
      <BuddyRobot size={120} mood={robot} shadow={false} accessibilityLabel={robotLabel} style={styles.heroRobot} />
      <View style={styles.heroBody}>
        <View style={[styles.eyebrow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.65)' }]}>
          <View style={[styles.dot, { backgroundColor: d.accent }]} />
          <AppText variant="eyebrow" color={d.text}>
            {eyebrow}
          </AppText>
        </View>
        <AppText variant="display" color={d.text} style={styles.heroTitle}>
          {title}
        </AppText>
        <AppText variant="secondary" color={d.muted}>
          {detail}
        </AppText>
        {numeral ? (
          <View style={styles.numeral} accessible accessibilityLabel={numeral.join(' ')}>
            <AppText variant="heroXL" color={d.text}>
              {numeral[0]}
            </AppText>
            <AppText variant="h3" color={d.muted}>
              {numeral[1]}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.heroActions}>{actions}</View>
    </View>
  );
}

function LaterChip({ item, go }: { item: NowItem; go: (href: Href) => void }) {
  const d = domains[domainOf(item)];
  let top = '';
  let bottom = '';
  let href: Href = '/home';
  if (item.kind === 'medication') {
    top = formatClock(effectiveTime(item.item.dose));
    bottom = item.item.medication.name;
    href = { pathname: '/modals/reminder', params: { doseId: item.item.dose.id } };
  } else if (item.kind === 'water') {
    top = `${item.glasses} de ${item.goal}`;
    bottom = 'Vasos de agua';
    href = '/wellness';
  } else if (item.kind === 'checkin') {
    top = 'Chequeo';
    bottom = 'Cómo te sientes';
    href = '/mood';
  }
  return (
    <PressableScale onPress={() => go(href)} accessibilityLabel={`${top}, ${bottom}`} style={[styles.chip, shadow.soft]}>
      <View style={[styles.chipBar, { backgroundColor: d.accent }]} />
      <View>
        <AppText variant="bodyStrong" color={ink.title} style={styles.tabular}>
          {top}
        </AppText>
        <AppText variant="caption" color={ink.muted}>
          {bottom}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  top: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  avatarBtn: { borderRadius: radius.pill },
  greetingCompact: { marginBottom: spacing.section + spacing.lg },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs },
  greeting: { gap: spacing.xxs, marginTop: spacing.xs, marginBottom: spacing.section + spacing.xxl },
  hero: { minHeight: 300, borderRadius: radius.hero, padding: spacing.xl, gap: spacing.lg },
  heroFill: { borderRadius: radius.hero, ...border.hairline },
  heroRobot: { position: 'absolute', top: -58, right: -22 },
  heroBody: { gap: spacing.xs },
  heroTitle: { marginTop: spacing.xxs },
  eyebrow: {
    alignSelf: 'flex-start',
    marginRight: 84, // el robot asoma sobre esta fila
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  numeral: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
  heroActions: { gap: spacing.sm, marginTop: 'auto' },
  secondary: { minHeight: 56, borderWidth: 1.5 },
  laterBlock: { marginTop: spacing.section, gap: spacing.sm },
  chipsScroll: { marginHorizontal: -spacing.screen },
  chips: { paddingHorizontal: spacing.screen, paddingVertical: spacing.xs, gap: spacing.sm },
  chip: {
    minHeight: touch.timeRow + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
    borderRadius: radius.button,
    backgroundColor: palette.white,
    ...border.hairline,
  },
  chipBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
  help: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  helpBtn: { flexGrow: 1, flexBasis: 140, minHeight: 64 },
  menu: { gap: spacing.xs },
});
