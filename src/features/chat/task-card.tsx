/**
 * Tarjeta de tarea activa del chat (V2.4), FIJA sobre el compositor: una pregunta por vez con respuestas tocables
 * (píldoras, contador +/−, hora y fecha en hoja inferior), progreso "Paso n de m", Atrás, Omitir y, al completar lo
 * obligatorio, un resumen editable con "Confirmar y agregar". Escribir es siempre opcional.
 * También el menú de 8 acciones de BUDDY.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, LinearTransition, useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { BottomSheet } from '@/components/feedback';
import { Icon, type IconName } from '@/components/icon';
import { TimeWheelPicker } from '@/components/time-picker';
import {
  MENU,
  countRange,
  draftComplete,
  draftFields,
  draftTitle,
  inputKind,
  isOptional,
  optionalEmpty,
  previousField,
  questionFor,
  stepInfo,
  type Draft,
  type MenuKey,
} from '@/domain/assistant/draft';
import type { AssistantAction, FieldKey } from '@/domain/assistant/types';
import { strings } from '@/i18n';
import { context } from '@/state/assistant';
import { radius, spacing, touch, type Domain } from '@/theme';
import { makeStyles, useTextScaleFactor, useTheme } from '@/theme/provider';
import { formatClock } from '@/utils/dates';
import { tapHaptic } from '@/utils/haptics';

const B = strings.buddy;

const ACTION_META: Partial<Record<AssistantAction['type'], { d: Domain; icon: IconName }>> = {
  add_medication: { d: 'medication', icon: 'meds' },
  update_medication: { d: 'medication', icon: 'meds' },
  remove_medication: { d: 'medication', icon: 'trash' },
  update_stock: { d: 'followUp', icon: 'box' },
  set_water_goal: { d: 'water', icon: 'drop' },
  add_activity_goal: { d: 'activity', icon: 'walk' },
  set_steps_goal: { d: 'activity', icon: 'walk' },
  add_emergency_contact: { d: 'contact', icon: 'phone' },
  update_emergency_contact: { d: 'contact', icon: 'phone' },
  set_checkin_time: { d: 'mood', icon: 'smile' },
  add_meal_reminder: { d: 'food', icon: 'food' },
  add_appointment: { d: 'followUp', icon: 'calendar' },
  add_note_for_elder: { d: 'contact', icon: 'bell' },
  send_message: { d: 'contact', icon: 'chat' },
};
export const actionMeta = (a: AssistantAction) => ACTION_META[a.type] ?? { d: 'activity' as Domain, icon: 'sparkle' as IconName };

const MENU_META: Record<MenuKey, { d: Domain; icon: IconName }> = {
  medication: { d: 'medication', icon: 'meds' },
  water: { d: 'water', icon: 'drop' },
  appointment: { d: 'followUp', icon: 'calendar' },
  contact: { d: 'contact', icon: 'phone' },
  meal: { d: 'food', icon: 'food' },
  activity: { d: 'activity', icon: 'walk' },
  medInfo: { d: 'medication', icon: 'info' },
  day: { d: 'mood', icon: 'chart' },
};

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Píldora de respuesta: rol de botón, área táctil ≥ 48. */
function Reply({ label, onPress, icon, a11y, strong }: { label: string; onPress: () => void; icon?: IconName; a11y?: string; strong?: boolean }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      style={({ pressed }) => [s.reply, strong && s.replyStrong, pressed && s.pressed]}
    >
      {icon ? <Icon name={icon} size={18} color={strong ? (t.hc ? t.c.bg : '#0D3946') : t.ink.mint} /> : null}
      <AppText variant="captionStrong" color={strong ? (t.hc ? t.c.bg : '#0D3946') : t.c.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function TaskCard({
  draft,
  hint,
  onAnswer,
  onConfirm,
  onCancel,
  onEdit,
}: {
  draft: Draft;
  hint: string | null;
  onAnswer: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: (index: number, field: FieldKey) => void;
}) {
  const t = useTheme();
  const s = useStyles();
  const reduce = useReducedMotion();
  const { height } = useWindowDimensions();
  const first = draft.actions[0];
  const meta = actionMeta(first);
  const d = t.domains[meta.d];
  const step = stepInfo(draft);
  const ready = draftComplete(draft);
  const title = draft.actions.length > 1 ? `${draftTitle(first)} (+${draft.actions.length - 1})` : draftTitle(first);

  return (
    // Altura máxima: con texto grande el cuerpo se desplaza y la confirmación y el compositor siguen visibles.
    <Animated.View testID="draft-pinned" layout={reduce ? undefined : LinearTransition.duration(180)} style={[s.card, { maxHeight: height * 0.55 }, t.hairline, t.shadow.soft]}>
      <View style={s.head}>
        <View style={[s.iconBubble, { backgroundColor: t.hc ? t.c.bg : d.gradient[0] }]}>
          <Icon name={meta.icon} color={t.hc ? t.c.text : d.accent} size={20} />
        </View>
        <View style={s.flex}>
          <AppText variant="secondaryStrong" numberOfLines={2}>
            {title}
          </AppText>
          {draft.asking ? (
            <View style={s.stepRow} accessible accessibilityLabel={B.step(step.current, step.total)}>
              <AppText variant="caption" color={t.c.muted}>
                {B.step(step.current, step.total)}
              </AppText>
              <View style={s.dots} importantForAccessibility="no-hide-descendants">
                {Array.from({ length: step.total }, (_, i) => (
                  <View key={i} style={[s.dot, i < step.current && { backgroundColor: t.hc ? t.c.text : t.c.mintStrong }]} />
                ))}
              </View>
            </View>
          ) : (
            <AppText variant="caption" color={t.ink.mint}>
              {B.summary}
            </AppText>
          )}
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {draft.asking ? (
          <Question key={`${draft.asking.index}-${draft.asking.field}`} draft={draft} hint={hint} onAnswer={onAnswer} onEdit={onEdit} onCancel={onCancel} />
        ) : (
          <Summary draft={draft} onEdit={onEdit} />
        )}
      </ScrollView>

      {draft.asking ? null : (
        <View style={s.footer}>
          <Button label={strings.common.cancel} size="md" variant="ghost" onPress={onCancel} />
          <Button label={B.confirmAdd} icon="check" size="md" haptic disabled={!ready} onPress={onConfirm} style={s.grow} />
        </View>
      )}
    </Animated.View>
  );
}

function Question({ draft, hint, onAnswer, onEdit, onCancel }: { draft: Draft; hint: string | null; onAnswer: (v: string) => void; onEdit: (index: number, field: FieldKey) => void; onCancel: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const reduce = useReducedMotion();
  const asking = draft.asking!;
  const a = draft.actions[asking.index];
  const q = questionFor(a, asking.field, context());
  const kind = inputKind(a, asking.field);
  const prev = previousField(draft);
  const [sheet, setSheet] = useState<'time' | 'date' | null>(null);
  return (
    <Animated.View entering={reduce ? undefined : FadeIn.duration(160)} style={s.question}>
      {hint ? (
        <AppText variant="captionStrong" color={t.ink.danger} accessibilityLiveRegion="polite">
          {hint}
        </AppText>
      ) : null}
      <AppText variant="bodyStrong" accessibilityLiveRegion="polite">
        {q.question}
      </AppText>
      {kind === 'count' ? (
        <Counter key={asking.field} field={asking.field} initial={a.type === 'set_water_goal' && a.glasses ? a.glasses : undefined} onUse={(n) => onAnswer(String(n))} />
      ) : (
        <View style={s.replies}>
          {(kind === 'date' ? ['Hoy', ...q.quickReplies] : q.quickReplies).map((r) => (
            <Reply key={r} label={r} onPress={() => onAnswer(r)} />
          ))}
          {kind === 'time' ? <Reply label={B.otherTime} icon="clock" onPress={() => setSheet('time')} /> : null}
          {kind === 'date' ? <Reply label={B.pickDate} icon="calendar" onPress={() => setSheet('date')} /> : null}
        </View>
      )}
      {kind === 'text' || kind === 'choice' ? (
        <AppText variant="caption" color={t.c.muted}>
          {B.typeBelow}
        </AppText>
      ) : null}
      {a.type === 'add_medication' && asking.field === 'doseAmount' ? (
        <AppText variant="caption" color={t.c.muted}>
          {B.doseRule}
        </AppText>
      ) : null}
      <View style={s.navRow}>
        {prev ? <Button label={B.back} icon="back" size="sm" variant="ghost" onPress={() => onEdit(prev.index, prev.field)} /> : null}
        {isOptional(draft) ? <Button label={B.skip} size="sm" variant="ghost" onPress={() => onAnswer('Omitir')} /> : null}
        <Button label={strings.common.cancel} size="sm" variant="ghost" onPress={onCancel} />
      </View>
      <TimeWheelPicker
        key={sheet === 'time' ? 'open' : 'closed'}
        visible={sheet === 'time'}
        title={B.pickTime}
        value="08:00"
        onClose={() => setSheet(null)}
        onConfirm={(v) => {
          setSheet(null);
          onAnswer(formatClock(v));
        }}
      />
      <DateSheet
        visible={sheet === 'date'}
        onClose={() => setSheet(null)}
        onPick={(label) => {
          setSheet(null);
          onAnswer(label);
        }}
      />
    </Animated.View>
  );
}

/** Contador +/− con "Usar N" (vasos, unidades, pasos). */
function Counter({ field, initial, onUse }: { field: FieldKey; initial?: number; onUse: (n: number) => void }) {
  const t = useTheme();
  const s = useStyles();
  const r = countRange(field);
  const [n, setN] = useState(initial ?? r.start);
  const set = (v: number) => setN(Math.min(r.max, Math.max(r.min, v)));
  return (
    <View style={s.counter}>
      <Pressable onPress={() => set(n - r.step)} accessibilityRole="button" accessibilityLabel={B.less} style={s.counterBtn}>
        <Icon name="minus" color={t.c.text} />
      </Pressable>
      <AppText variant="h1" style={s.counterValue} accessibilityLiveRegion="polite">
        {String(n)}
      </AppText>
      <Pressable onPress={() => set(n + r.step)} accessibilityRole="button" accessibilityLabel={B.more} style={s.counterBtn}>
        <Icon name="plus" color={t.c.text} />
      </Pressable>
      <Reply label={B.useValue(String(n))} icon="check" strong onPress={() => onUse(n)} />
    </View>
  );
}

/** Resumen editable: cada dato se toca para cambiarlo; los opcionales vacíos se agregan con "+". */
function Summary({ draft, onEdit }: { draft: Draft; onEdit: (index: number, field: FieldKey) => void }) {
  const t = useTheme();
  const s = useStyles();
  const filled = draft.actions.flatMap((a, index) => draftFields(a).filter((f) => f.value !== null).map((f) => ({ ...f, index })));
  const extra = optionalEmpty(draft);
  return (
    <View style={s.question}>
      <View style={s.replies}>
        {filled.map((f) => (
          <Pressable
            key={`${f.index}-${f.key}-${f.label}`}
            onPress={() => onEdit(f.index, f.key)}
            accessibilityRole="button"
            accessibilityLabel={`${f.label}: ${f.value}. ${strings.common.edit}`}
            style={({ pressed }) => [s.field, pressed && s.pressed]}
          >
            <Icon name="check" size={14} color={t.ink.mint} />
            <AppText variant="captionStrong" numberOfLines={2} style={s.shrink}>
              {`${f.label}: ${f.value}`}
            </AppText>
            <Icon name="pencil" size={14} color={t.c.muted} />
          </Pressable>
        ))}
      </View>
      {extra.length ? (
        <>
          <AppText variant="caption" color={t.c.muted}>
            {B.addDetail}
          </AppText>
          <View style={s.replies}>
            {extra.map((f) => (
              <Reply key={`${f.index}-${f.field}`} label={`+ ${f.label}`} a11y={`${B.addDetail}: ${f.label}`} onPress={() => onEdit(f.index, f.field)} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Próximos 90 días en una hoja inferior (filas grandes: más fácil que una rueda para personas mayores). */
function DateSheet({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (label: string) => void }) {
  const s = useStyles();
  const today = new Date();
  const days = Array.from({ length: 90 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
  return (
    <BottomSheet visible={visible} onClose={onClose} title={B.pickDay}>
      <ScrollView style={s.dateList}>
        {days.map((d) => {
          const label = `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
          return (
            <Pressable key={label} onPress={() => onPick(`${d.getDate()} de ${MONTHS[d.getMonth()]}`)} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [s.dateRow, pressed && s.pressed]}>
              <AppText variant="bodyStrong">{label.charAt(0).toUpperCase() + label.slice(1)}</AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

/** Menú de 8 acciones (estado vacío, botón "+" y cuando BUDDY no entiende). */
export function ActionMenu({ onPick }: { onPick: (key: MenuKey) => void }) {
  const t = useTheme();
  const s = useStyles();
  // Con texto grande una palabra larga ("emergencia") no cabe en media columna: una sola columna.
  const oneColumn = useTextScaleFactor() >= 1.3;
  return (
    <View style={s.grid}>
      {MENU.map((key) => {
        const m = MENU_META[key];
        const d = t.domains[m.d];
        return (
          <Pressable
            key={key}
            onPress={() => {
              tapHaptic();
              onPick(key);
            }}
            accessibilityRole="button"
            accessibilityLabel={B.menu[key]}
            style={({ pressed }) => [s.tile, oneColumn && s.tileWide, { backgroundColor: t.hc ? t.c.surface : d.gradient[0], borderColor: t.hc ? t.c.text : 'transparent' }, pressed && s.pressed]}
          >
            <View style={[s.tileIcon, { backgroundColor: t.hc ? t.c.bg : t.c.surface }]}>
              <Icon name={m.icon} color={t.hc ? t.c.text : d.accent} size={22} />
            </View>
            <AppText variant="captionStrong" color={t.hc ? t.c.text : d.text} style={s.shrink}>
              {B.menu[key]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, flexShrink: 1, minWidth: 0 },
    shrink: { flexShrink: 1 },
    pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
    card: { alignSelf: 'stretch', minWidth: 0, marginHorizontal: spacing.md, marginBottom: spacing.xs, padding: spacing.sm, gap: spacing.xs, borderRadius: radius.card, backgroundColor: t.c.surface },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    iconBubble: { width: 40, height: 40, borderRadius: radius.icon, alignItems: 'center', justifyContent: 'center' },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    dots: { flexDirection: 'row', gap: 4 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.c.border },
    body: { paddingVertical: spacing.xs },
    question: { gap: spacing.xs },
    replies: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    reply: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: touch.min,
      maxWidth: '100%',
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: t.c.surface2,
      borderWidth: t.hc ? 2 : 1,
      borderColor: t.hc ? t.c.text : t.c.border,
    },
    replyStrong: { backgroundColor: t.hc ? t.c.text : t.c.mint, borderColor: t.hc ? t.c.text : t.c.mint },
    field: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: touch.min, maxWidth: '100%', paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: t.c.surface2, ...t.hairline },
    navRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
    grow: { flexGrow: 1, flexBasis: 180 },
    scroll: { flexShrink: 1 },
    counter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
    counterBtn: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.surface2, borderWidth: t.hc ? 2 : 1, borderColor: t.hc ? t.c.text : t.c.border },
    counterValue: { minWidth: 56, textAlign: 'center', fontVariant: ['tabular-nums'] },
    dateList: { maxHeight: 420 },
    dateRow: { minHeight: touch.timeRow, justifyContent: 'center', paddingHorizontal: spacing.md, borderBottomWidth: t.borderWidth, borderBottomColor: t.c.border },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignSelf: 'stretch' },
    tile: { flexGrow: 1, flexBasis: '46%', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 64, padding: spacing.sm, borderRadius: radius.md, borderWidth: t.hc ? 2 : 0 },
    tileWide: { flexBasis: '100%' },
    tileIcon: { width: 40, height: 40, borderRadius: radius.icon, alignItems: 'center', justifyContent: 'center' },
  }),
);
