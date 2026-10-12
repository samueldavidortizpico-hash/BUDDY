import * as ImagePicker from 'expo-image-picker';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Chip } from '@/components/forms';
import { Icon, type IconName } from '@/components/icon';
import { BuddyRobot } from '@/components/robot';
import { draftComplete, draftFields, draftTitle, type Draft } from '@/domain/assistant/draft';
import { EXAMPLES } from '@/domain/assistant/engine';
import type { AssistantAction, FieldKey } from '@/domain/assistant/types';
import type { AssistantMessage } from '@/domain/types';
import { FINAL, useBuddyChat } from '@/features/chat/use-chat';
import { PreviewSheetButton } from '@/features/elder/phone-preview';
import { savePhoto } from '@/infrastructure/local/media';
import { strings } from '@/i18n';
import { SUGGESTIONS, conversation } from '@/state/assistant';
import { routineActions } from '@/state/actions';
import { useActiveElder, useRecords } from '@/state/data';
import { radius, spacing, touch, type, type Domain } from '@/theme';
import { makeStyles, useTextScaleFactor, useTheme } from '@/theme/provider';
import { formatClock } from '@/utils/dates';

const B = strings.buddy;

const DOMAIN: Partial<Record<AssistantAction['type'], { d: Domain; icon: IconName }>> = {
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
const metaOf = (a: AssistantAction) => DOMAIN[a.type] ?? { d: 'activity' as Domain, icon: 'sparkle' as IconName };

/**
 * BUDDY: centro de mando conversacional del cuidador. Entiende, prepara un borrador, pregunta de a un dato y solo
 * cambia algo cuando confirmas. La tarjeta del borrador queda FIJA sobre el compositor: nunca se pierde arriba.
 */
export default function Buddy() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const scale = useTextScaleFactor();
  const insets = useSafeAreaInsets();
  const elder = useActiveElder();
  const records = useRecords('messages');
  const messages = useMemo(() => [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [records]);
  const meds = useRecords('medications');
  const contacts = useRecords('contacts');
  const primary = contacts.find((c) => c.primary) ?? contacts[0];
  const [text, setText] = useState('');
  const [bump, setBump] = useState(0);
  const list = useRef<FlatList<AssistantMessage>>(null);

  const chat = useBuddyChat({
    openScan: () => router.push('/medication/scan'),
    openRoutine: (seg) => router.push({ pathname: '/routine', params: { seg } } as unknown as Href),
    openPreview: () => router.push('/handoff' as Href),
    call: (phone) => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`),
    primary: primary ? { name: primary.name, phone: primary.phone } : undefined,
  });

  // Siempre al final: cada mensaje nuevo, la escritura de BUDDY y los cambios del borrador.
  useEffect(() => {
    const id = setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(id);
  }, [messages.length, chat.typing, chat.draft?.asking?.field, chat.draft?.asking?.index]);

  if (!elder?.setupDone) {
    return (
      <View style={[s.root, { paddingTop: insets.top + spacing.xl }]}>
        <View style={s.emptyWrap}>
          <BuddyRobot size={120} mood="wave" />
          <AppText variant="h2" align="center">{strings.summary.emptyTitle}</AppText>
          <Button label={strings.summary.steps.register} onPress={() => router.push('/setup')} />
        </View>
      </View>
    );
  }

  const send = (raw: string) => {
    if (!raw.trim()) return;
    setText('');
    setBump((b) => b + 1);
    chat.send(raw);
  };

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (r.canceled || !r.assets[0]?.uri) return;
    const uri = await savePhoto(r.assets[0].uri);
    conversation.add('user', B.photoSent, { imageUri: uri });
    router.push({ pathname: '/medication/new', params: { photo: uri } });
  };

  const last = messages.at(-1);
  const lastQuick = last?.from === 'buddy' && !chat.typing ? last.quickReplies : [];
  const chips = meds.length ? B.chipsFull : B.chipsEmpty;

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
        <BuddyRobot size={56} compact mood={chat.mood} bump={bump} shadow={false} flying={false} />
        <View style={s.flex}>
          <AppText variant="h3">{strings.brand.name}</AppText>
          <AppText variant="caption" color={t.c.muted}>{strings.summary.caring(elder.firstName)}</AppText>
        </View>
        <PreviewSheetButton compact />
        {messages.length ? (
          <Pressable onPress={() => conversation.clear()} accessibilityRole="button" accessibilityLabel={B.clear} style={s.headerBtn}>
            <Icon name="trash" color={t.c.muted} size={20} />
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={list}
          testID="chat-list"
          data={messages}
          keyExtractor={(m) => m.id}
          style={s.flex}
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <BuddyRobot size={120} mood="wave" />
              <AppText variant="h2" align="center">{B.emptyTitle(elder.firstName)}</AppText>
              <AppText variant="secondary" color={t.c.muted} align="center">{B.emptyBody}</AppText>
              {EXAMPLES.map((e) => (
                <Pressable key={e} onPress={() => send(e)} accessibilityRole="button" accessibilityLabel={e} style={s.example}>
                  <Icon name="sparkle" color={t.ink.mint} size={18} />
                  <AppText variant="secondaryStrong" style={s.flex}>{`“${e}”`}</AppText>
                </Pressable>
              ))}
            </View>
          }
          renderItem={({ item: m }) => (
            <Message m={m} draft={chat.draft} onConfirm={chat.confirm} onCancel={chat.cancel} onEdit={() => chat.draft && chat.edit(0, firstEditable(chat.draft))} />
          )}
          ListFooterComponent={
            <>
              {chat.typing ? <Typing /> : null}
              {lastQuick.length ? (
                <Animated.View entering={FadeInDown.duration(200)} style={s.quick}>
                  {lastQuick.map((q) => (
                    <Chip key={q} label={q} onPress={() => chat.quick(q)} tone="mint" />
                  ))}
                </Animated.View>
              ) : null}
            </>
          }
        />

        {chat.draft ? (
          <DraftCard draft={chat.draft} onConfirm={chat.confirm} onCancel={chat.cancel} onEdit={chat.edit} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipsBar} keyboardShouldPersistTaps="handled">
            {chips.map((c) => (
              <Chip key={c} label={c} onPress={() => (c === B.scanChip ? router.push('/medication/scan') : setText(c))} />
            ))}
          </ScrollView>
        )}

        <View style={[s.composer, t.hairline]}>
          <Pressable onPress={() => router.push('/medication/scan')} accessibilityRole="button" accessibilityLabel={strings.scan.title} style={s.tool}>
            <Icon name="camera" color={t.c.text} />
          </Pressable>
          <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel={strings.scan.gallery} style={s.tool}>
            <Icon name="image" color={t.c.text} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={B.placeholder}
            placeholderTextColor={t.dark ? '#7F99A0' : '#7A8797'}
            accessibilityLabel={B.placeholder}
            style={[s.input, { fontSize: type.secondary.fontSize * scale, color: t.c.text }]}
            multiline
            onSubmitEditing={() => send(text)}
            returnKeyType="send"
            blurOnSubmit
          />
          <Pressable onPress={() => send(text)} disabled={!text.trim()} accessibilityRole="button" accessibilityLabel={B.send} style={[s.send, !text.trim() && s.disabled]}>
            <Icon name="send" color={t.hc ? t.c.bg : '#FFFFFF'} size={20} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Primer dato que conviene editar: el primero vacío; si no hay, el primero. */
function firstEditable(d: Draft): FieldKey {
  const f = draftFields(d.actions[0]);
  return (f.find((x) => x.value === null) ?? f[0]).key;
}

function Message({ m, draft, onConfirm, onCancel, onEdit }: { m: AssistantMessage; draft: Draft | null; onConfirm: () => void; onCancel: () => void; onEdit: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const reduce = useReducedMotion();
  const mine = m.from === 'user';
  const p = m.proposal ? (JSON.parse(m.proposal) as { kind?: string; draftId?: string; suggestions?: boolean }) : null;
  const final = p?.kind === FINAL;
  const live = final && m.proposalState === 'open' && draft?.id === p?.draftId;
  return (
    <Animated.View entering={reduce ? undefined : ZoomIn.duration(200)} style={[s.msgRow, mine && s.mineRow]}>
      <View style={[s.bubble, mine ? s.mine : s.theirs]}>
        {m.imageUri ? <AppText variant="caption" color={mine ? t.c.onPrimary : t.c.muted}>{B.photoSent}</AppText> : null}
        <AppText variant="secondary" color={mine ? t.c.onPrimary : t.c.text}>{m.text}</AppText>
      </View>
      {final ? (
        <View testID={live ? 'chat-final-confirm' : undefined} style={s.finalCard}>
          {live && draft ? (
            <>
              {draft.actions.map((a, i) => (
                <ActionSummary key={i} a={a} />
              ))}
              <Button label={B.confirmAdd} icon="check" size="md" haptic onPress={onConfirm} />
              <View style={s.actionsRow}>
                <Button label={strings.common.edit} icon="pencil" size="sm" variant="ghost" onPress={onEdit} style={s.flex} />
                <Button label={strings.common.cancel} size="sm" variant="ghost" onPress={onCancel} style={s.flex} />
              </View>
            </>
          ) : (
            <AppText variant="caption" color={m.proposalState === 'confirmed' ? t.ink.mint : t.c.muted}>
              {m.proposalState === 'confirmed' ? B.confirmed : B.cancelled}
            </AppText>
          )}
        </View>
      ) : null}
      {p?.suggestions ? <Suggestions /> : null}
    </Animated.View>
  );
}

function ActionSummary({ a }: { a: AssistantAction }) {
  const t = useTheme();
  const s = useStyles();
  const meta = metaOf(a);
  const d = t.domains[meta.d];
  const filled = draftFields(a).filter((f) => f.value !== null);
  return (
    <View style={[s.action, { backgroundColor: t.hc ? t.c.bg : d.gradient[0], borderColor: t.hc ? t.c.text : d.accent }]}>
      <Icon name={meta.icon} color={t.hc ? t.c.text : d.accent} />
      <View style={s.flex}>
        <AppText variant="secondaryStrong" color={t.hc ? t.c.text : d.text}>{draftTitle(a)}</AppText>
        <AppText variant="caption" color={t.hc ? t.c.text : d.muted}>{filled.map((f) => `${f.label}: ${f.value}`).join(' · ')}</AppText>
      </View>
    </View>
  );
}

/** Tarjeta fija del borrador, justo encima del compositor. Se llena a medida que el cuidador responde. */
function DraftCard({ draft, onConfirm, onCancel, onEdit }: { draft: Draft; onConfirm: () => void; onCancel: () => void; onEdit: (index: number, field: FieldKey) => void }) {
  const t = useTheme();
  const s = useStyles();
  const reduce = useReducedMotion();
  const [editing, setEditing] = useState(false);
  const ready = draftComplete(draft);
  const all = draft.actions.flatMap((a, index) => draftFields(a).map((f) => ({ ...f, index })));
  const required = all.filter((f) => f.required);
  const done = required.filter((f) => f.value !== null).length;
  const first = draft.actions[0];
  const meta = metaOf(first);
  const d = t.domains[meta.d];
  return (
    <Animated.View testID="draft-pinned" layout={reduce ? undefined : LinearTransition.duration(180)} style={[s.pinned, t.hairline, t.shadow.soft]}>
      <View style={s.pinnedHead}>
        <View style={[s.pinnedIcon, { backgroundColor: t.hc ? t.c.bg : d.gradient[0] }]}>
          <Icon name={meta.icon} color={t.hc ? t.c.text : d.accent} size={20} />
        </View>
        <View style={s.flex}>
          <AppText variant="secondaryStrong" numberOfLines={2}>
            {draft.actions.length > 1 ? `${draftTitle(first)} (+${draft.actions.length - 1})` : draftTitle(first)}
          </AppText>
          <AppText variant="caption" color={ready ? t.ink.mint : t.c.muted} accessibilityLiveRegion="polite">
            {ready ? B.draftReady : B.draftProgress(done, required.length)}
          </AppText>
        </View>
      </View>
      <View style={s.fields}>
        {all
          .filter((f) => editing || f.required || f.value !== null)
          .map((f) => {
            const asking = draft.asking?.index === f.index && draft.asking.field === f.key;
            const key = `${f.index}-${f.key}-${f.label}`;
            const label = `${f.label}: ${f.value ?? (f.required ? B.pending : B.optional)}`;
            const pill = (
              <View style={[s.pill, f.value === null && s.pillEmpty, asking && { borderColor: t.hc ? t.c.text : t.c.mintStrong, borderWidth: 2 }]}>
                <Icon name={f.value !== null ? 'check' : asking ? 'chat' : 'minus'} size={14} color={f.value !== null ? t.ink.mint : t.c.muted} />
                <AppText variant="captionStrong" color={f.value !== null ? t.c.text : t.c.muted} numberOfLines={1} style={s.pillText}>
                  {f.value !== null && f.key === 'name' ? f.value : label}
                </AppText>
              </View>
            );
            return editing ? (
              <Pressable key={key} onPress={() => onEdit(f.index, f.key)} accessibilityRole="button" accessibilityLabel={label} style={s.pillHit}>
                {pill}
              </Pressable>
            ) : (
              <View key={key} accessible accessibilityLabel={label}>
                {pill}
              </View>
            );
          })}
      </View>
      {editing ? <AppText variant="caption" color={t.c.muted}>{B.editHint}</AppText> : null}
      {first.type === 'add_medication' && !ready ? <AppText variant="caption" color={t.c.muted}>{B.doseRule}</AppText> : null}
      <Button label={B.confirmAdd} icon="check" size="md" haptic disabled={!ready} onPress={onConfirm} />
      <View style={s.actionsRow}>
        <Button label={editing ? strings.common.done : strings.common.edit} icon="pencil" size="sm" variant="ghost" onPress={() => setEditing((e) => !e)} style={s.flex} />
        <Button label={strings.common.cancel} size="sm" variant="ghost" onPress={onCancel} style={s.flex} />
      </View>
    </Animated.View>
  );
}

/** Sugerencias generales de bienestar (no son consejos médicos). */
function Suggestions() {
  const t = useTheme();
  const s = useStyles();
  const [added, setAdded] = useState<string[]>([]);
  return (
    <View style={s.finalCard}>
      {SUGGESTIONS.map((sg) => (
        <View key={sg.title} style={[s.action, { backgroundColor: t.hc ? t.c.bg : t.domains.activity.gradient[0], borderColor: t.hc ? t.c.text : t.domains.activity.accent }]}>
          <View style={s.flex}>
            <AppText variant="secondaryStrong" color={t.hc ? t.c.text : t.domains.activity.text}>{`${sg.title} · ${formatClock(sg.time)}`}</AppText>
            <AppText variant="caption" color={t.hc ? t.c.text : t.domains.activity.muted}>{sg.why}</AppText>
          </View>
          {added.includes(sg.title) ? (
            <Icon name="check" color={t.ink.mint} />
          ) : (
            <Button
              label={B.addToRoutine}
              size="sm"
              variant="ghost"
              onPress={() => {
                routineActions.addActivity({ kind: sg.kind, title: sg.title, time: sg.time, minutes: sg.minutes });
                setAdded([...added, sg.title]);
              }}
            />
          )}
        </View>
      ))}
      <AppText variant="caption" color={t.c.muted}>{B.noMedicalAdvice}</AppText>
    </View>
  );
}

function Typing() {
  const s = useStyles();
  return (
    <View style={s.msgRow} accessibilityLabel={B.typing}>
      <View style={[s.bubble, s.theirs, s.typing]}>
        <BuddyRobot size={56} compact mood="think" shadow={false} flying={false} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    grow: { flexGrow: 1, flexBasis: 150 },
    root: { flex: 1, backgroundColor: t.c.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.screen, paddingBottom: spacing.xs, backgroundColor: t.c.glass, borderBottomWidth: t.borderWidth, borderBottomColor: t.c.border },
    headerBtn: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
    list: { padding: spacing.screen, paddingBottom: spacing.md, flexGrow: 1 },
    emptyWrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg, paddingHorizontal: spacing.screen },
    example: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch', minHeight: touch.min, padding: spacing.md, borderRadius: radius.button, backgroundColor: t.c.surface, ...t.hairline },
    msgRow: { gap: spacing.xs, alignItems: 'flex-start', marginBottom: spacing.sm },
    mineRow: { alignItems: 'flex-end' },
    bubble: { maxWidth: '88%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20 },
    mine: { backgroundColor: t.hc ? t.c.text : t.c.primary, borderBottomRightRadius: 6 },
    theirs: { backgroundColor: t.c.surface, borderBottomLeftRadius: 6, ...t.hairline },
    typing: { paddingVertical: 2, paddingHorizontal: spacing.xs },
    finalCard: { alignSelf: 'stretch', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.card, backgroundColor: t.c.surface, ...t.hairline, ...t.shadow.soft },
    action: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderLeftWidth: 4, borderWidth: t.hc ? 2 : 0 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
    quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chipsBar: { flexGrow: 0 },
    chips: { paddingHorizontal: spacing.screen, gap: spacing.xs, paddingVertical: spacing.xs },
    pinned: { marginHorizontal: spacing.md, marginBottom: spacing.xs, padding: spacing.sm, gap: spacing.xs, borderRadius: radius.card, backgroundColor: t.c.surface },
    pinnedHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    pinnedIcon: { width: 40, height: 40, borderRadius: radius.icon, alignItems: 'center', justifyContent: 'center' },
    fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, maxWidth: '100%', paddingHorizontal: spacing.xs, borderRadius: radius.pill, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface2 },
    pillEmpty: { backgroundColor: t.c.surface, borderStyle: 'dashed' },
    pillText: { flexShrink: 1 },
    pillHit: { minHeight: touch.min, justifyContent: 'center' },
    actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, marginHorizontal: spacing.md, marginBottom: spacing.xs, padding: spacing.xs, minHeight: touch.timeRow, borderRadius: 28, backgroundColor: t.c.surface },
    tool: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
    input: { flex: 1, minHeight: touch.min, maxHeight: 120, paddingVertical: spacing.sm, fontFamily: 'Manrope_600SemiBold' },
    send: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.hc ? t.c.text : t.c.primary },
    disabled: { opacity: 0.4 },
  }),
);
