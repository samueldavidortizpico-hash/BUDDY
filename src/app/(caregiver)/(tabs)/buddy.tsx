import * as ImagePicker from 'expo-image-picker';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Chip } from '@/components/forms';
import { Icon, type IconName } from '@/components/icon';
import { BuddyRobot, type RobotMood } from '@/components/robot';
import { EXAMPLES } from '@/domain/assistant/engine';
import type { AssistantAction } from '@/domain/assistant/types';
import { savePhoto } from '@/infrastructure/local/media';
import { strings } from '@/i18n';
import { SUGGESTIONS, answer, answerQuery, conversation, describe, execute, interpret, type Proposal } from '@/state/assistant';
import { routineActions } from '@/state/actions';
import { useActiveElder, useRecords } from '@/state/data';
import { radius, spacing, touch, type, type Domain } from '@/theme';
import { makeStyles, useTextScaleFactor, useTheme } from '@/theme/provider';
import { formatClock } from '@/utils/dates';
import { successHaptic } from '@/utils/haptics';

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
};

/** BUDDY: centro de mando conversacional del cuidador. Entiende, propone, pregunta lo que falta y ejecuta al confirmar. */
export default function Buddy() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const scale = useTextScaleFactor();
  const insets = useSafeAreaInsets();
  const elder = useActiveElder();
  const messages = useRecords('messages').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const meds = useRecords('medications');
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [bump, setBump] = useState(0);
  const [mood, setMood] = useState<RobotMood>('idle');
  const scroll = useRef<ScrollView>(null);
  const undoRef = useRef<(() => void)[]>([]);
  const contacts = useRecords('contacts');
  const primary = contacts.find((c) => c.primary) ?? contacts[0];
  const open = useMemo(() => [...messages].reverse().find((m) => m.proposalState === 'open'), [messages]);
  const proposal: Proposal | null = open?.proposal ? JSON.parse(open.proposal) : null;

  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length, typing]);

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

  const reply = (msg: string, extra: Parameters<typeof conversation.add>[2] = {}) => {
    setTyping(true);
    setMood('think');
    // Pausa breve y honesta: se muestra que BUDDY responde (no simula un análisis).
    setTimeout(() => {
      conversation.add('buddy', msg, extra);
      setTyping(false);
      setMood('talk');
      setTimeout(() => setMood('idle'), 1400);
    }, 350);
  };

  const askNext = (p: Proposal, messageId: string) => {
    conversation.update(messageId, { proposal: JSON.stringify(p) });
    const q = p.missing[0];
    if (q) reply(q.question, { quickReplies: q.quickReplies });
  };

  const send = (raw: string) => {
    const msg = raw.trim();
    if (!msg) return;
    setText('');
    setBump((b) => b + 1);
    conversation.add('user', msg);
    // Si hay una propuesta esperando un dato, el mensaje es la respuesta.
    if (proposal && open && proposal.missing.length) {
      askNext(answer(proposal, msg), open.id);
      return;
    }
    const r = interpret(msg);
    if (!r.understood) return reply(r.reply ?? '', { quickReplies: EXAMPLES.slice(0, 3) });
    const first = r.actions[0];
    if (first.type === 'emergency') return reply(strings.buddy.emergency, { quickReplies: [strings.buddy.call123, ...(primary ? [strings.buddy.callContact(primary.name)] : [])] });
    if (first.type === 'open_scan') {
      reply(strings.buddy.openingCamera);
      return router.push('/medication/scan');
    }
    if (first.type === 'suggest_routine') return reply(strings.buddy.suggestIntro, { proposal: JSON.stringify({ suggestions: true }), proposalState: null });
    if (first.type === 'query_summary') return reply(answerQuery(first.topic, first.match));
    if (open) conversation.update(open.id, { proposalState: 'cancelled' });
    const p: Proposal = { actions: r.actions, missing: r.missing };
    setTyping(true);
    setTimeout(() => {
      const m = conversation.add('buddy', strings.buddy.proposalIntro, { proposal: JSON.stringify(p), proposalState: 'open' });
      setTyping(false);
      const q = p.missing[0];
      if (q) setTimeout(() => conversation.add('buddy', q.question, { quickReplies: q.quickReplies }), 250);
      return m;
    }, 350);
  };

  const confirm = (msgId: string, p: Proposal) => {
    const results = p.actions.map((a) => execute(a));
    conversation.update(msgId, { proposalState: 'confirmed' });
    successHaptic();
    setMood('celebrate');
    setTimeout(() => setMood('idle'), 1600);
    const undos = results.map((r) => r.undo).filter(Boolean) as (() => void)[];
    undoRef.current = undos;
    reply(results.map((r) => r.summary).join(' '), { quickReplies: undos.length ? [strings.buddy.seeRoutine, strings.common.undo] : [strings.buddy.seeRoutine] });
  };
  const quick = (q: string) => {
    if (q === strings.common.undo) {
      undoRef.current.forEach((u) => u());
      undoRef.current = [];
      conversation.add('user', strings.common.undo);
      return reply(strings.buddy.undone);
    }
    if (q === strings.buddy.seeRoutine) return router.push('/routine' as Href);
    if (q === strings.buddy.call123) return Linking.openURL('tel:123');
    if (primary && q === strings.buddy.callContact(primary.name)) return Linking.openURL(`tel:${primary.phone.replace(/\s/g, '')}`);
    send(q);
  };

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (r.canceled || !r.assets[0]?.uri) return;
    const uri = await savePhoto(r.assets[0].uri);
    conversation.add('user', strings.buddy.photoSent, { imageUri: uri });
    reply(strings.buddy.photoReply);
    router.push({ pathname: '/medication/new', params: { photo: uri } });
  };

  const chips = meds.length ? strings.buddy.chipsFull : strings.buddy.chipsEmpty;
  const lastQuick = messages.at(-1)?.from === 'buddy' ? messages.at(-1)?.quickReplies ?? [] : [];

  return (
    <View style={s.root}>
      {/* Encabezado de vidrio */}
      <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
        <BuddyRobot size={56} compact mood={mood} bump={bump} shadow={false} flying={false} />
        <View style={s.flex}>
          <AppText variant="h3">{strings.brand.name}</AppText>
          <AppText variant="caption" color={t.c.muted}>{strings.summary.caring(elder.firstName)}</AppText>
        </View>
        {messages.length ? (
          <Pressable onPress={() => conversation.clear()} accessibilityRole="button" accessibilityLabel={strings.buddy.clear} style={s.headerBtn}>
            <Icon name="trash" color={t.c.muted} size={20} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView ref={scroll} style={s.flex} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled">
        {!messages.length ? (
          <View style={s.emptyWrap}>
            <BuddyRobot size={120} mood="wave" />
            <AppText variant="h2" align="center">{strings.buddy.emptyTitle(elder.firstName)}</AppText>
            <AppText variant="secondary" color={t.c.muted} align="center">{strings.buddy.emptyBody}</AppText>
            {EXAMPLES.map((e) => (
              <Pressable key={e} onPress={() => send(e)} accessibilityRole="button" accessibilityLabel={e} style={s.example}>
                <Icon name="sparkle" color={t.ink.mint} size={18} />
                <AppText variant="secondaryStrong" style={s.flex}>{`“${e}”`}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}

        {messages.map((m) => {
          const mine = m.from === 'user';
          const p = m.proposal ? (JSON.parse(m.proposal) as Proposal & { suggestions?: boolean }) : null;
          return (
            <Animated.View key={m.id} entering={ZoomIn.duration(220)} style={[s.msgRow, mine && s.mineRow]}>
              <View style={[s.bubble, mine ? s.mine : s.theirs]}>
                {m.imageUri ? <AppText variant="caption" color={mine ? t.c.onPrimary : t.c.muted}>{strings.buddy.photoSent}</AppText> : null}
                <AppText variant="secondary" color={mine ? t.c.onPrimary : t.c.text}>{m.text}</AppText>
              </View>
              {p?.actions ? <ProposalCard proposal={p} state={m.proposalState} onConfirm={() => confirm(m.id, p)} onCancel={() => conversation.update(m.id, { proposalState: 'cancelled' })} onChange={() => setText(strings.buddy.changeHint)} /> : null}
              {p?.suggestions ? <Suggestions /> : null}
            </Animated.View>
          );
        })}
        {typing ? <Typing /> : null}
        {lastQuick.length ? (
          <Animated.View entering={FadeInDown.duration(200)} style={s.quick}>
            {lastQuick.map((q) => (
              <Chip key={q} label={q} onPress={() => quick(q)} tone="mint" />
            ))}
          </Animated.View>
        ) : null}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipsBar} keyboardShouldPersistTaps="handled">
        {chips.map((c) => (
          <Chip key={c} label={c} onPress={() => (c === strings.buddy.scanChip ? router.push('/medication/scan') : setText(c))} />
        ))}
      </ScrollView>

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
          placeholder={strings.buddy.placeholder}
          placeholderTextColor={t.dark ? '#7F99A0' : '#7A8797'}
          accessibilityLabel={strings.buddy.placeholder}
          style={[s.input, { fontSize: type.secondary.fontSize * scale, color: t.c.text }]}
          multiline
          onSubmitEditing={() => send(text)}
          returnKeyType="send"
          blurOnSubmit
        />
        <Pressable onPress={() => send(text)} disabled={!text.trim()} accessibilityRole="button" accessibilityLabel={strings.buddy.send} style={[s.send, !text.trim() && s.disabled]}>
          <Icon name="send" color={t.hc ? t.c.bg : '#FFFFFF'} size={20} />
        </Pressable>
      </View>
    </View>
  );
}

function ProposalCard({ proposal, state, onConfirm, onCancel, onChange }: { proposal: Proposal; state: string | null; onConfirm: () => void; onCancel: () => void; onChange: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const ready = !proposal.missing.some((m) => !m.optional);
  return (
    <View style={s.proposal}>
      {proposal.actions.map((a, i) => {
        const meta = DOMAIN[a.type] ?? { d: 'activity' as Domain, icon: 'sparkle' as IconName };
        const d = t.domains[meta.d];
        return (
          <View key={i} style={[s.action, { backgroundColor: t.hc ? t.c.bg : d.gradient[0], borderColor: t.hc ? t.c.text : d.accent }]}>
            <Icon name={meta.icon} color={t.hc ? t.c.text : d.accent} />
            <AppText variant="secondaryStrong" color={d.text} style={s.flex}>{describe(a)}</AppText>
          </View>
        );
      })}
      {state === 'open' ? (
        <View style={s.row}>
          <Button label={strings.common.confirm} icon="check" size="md" disabled={!ready} onPress={onConfirm} style={s.grow} />
          <Button label={strings.common.change} size="md" variant="ghost" onPress={onChange} style={s.grow} />
          <Button label={strings.common.cancel} size="sm" variant="ghost" onPress={onCancel} />
        </View>
      ) : (
        <AppText variant="caption" color={state === 'confirmed' ? t.ink.mint : t.c.muted}>
          {state === 'confirmed' ? strings.buddy.confirmed : strings.buddy.cancelled}
        </AppText>
      )}
    </View>
  );
}

function Suggestions() {
  const t = useTheme();
  const s = useStyles();
  const [added, setAdded] = useState<string[]>([]);
  return (
    <View style={s.proposal}>
      {SUGGESTIONS.map((sg) => (
        <View key={sg.title} style={[s.action, { backgroundColor: t.hc ? t.c.bg : t.domains.activity.gradient[0], borderColor: t.hc ? t.c.text : t.domains.activity.accent }]}>
          <View style={s.flex}>
            <AppText variant="secondaryStrong" color={t.domains.activity.text}>{`${sg.title} · ${formatClock(sg.time)}`}</AppText>
            <AppText variant="caption" color={t.domains.activity.muted}>{sg.why}</AppText>
          </View>
          {added.includes(sg.title) ? (
            <Icon name="check" color={t.ink.mint} />
          ) : (
            <Button label={strings.buddy.addToRoutine} size="sm" variant="ghost" onPress={() => { routineActions.addActivity({ kind: sg.kind, title: sg.title, time: sg.time, minutes: sg.minutes }); setAdded([...added, sg.title]); }} />
          )}
        </View>
      ))}
      <AppText variant="caption" color={t.c.muted}>{strings.buddy.noMedicalAdvice}</AppText>
    </View>
  );
}

function Typing() {
  const s = useStyles();
  return (
    <View style={[s.msgRow]} accessibilityLabel={strings.buddy.typing}>
      <View style={[s.bubble, s.theirs, s.typing]}>
        <BuddyRobot size={56} compact mood="think" shadow={false} flying={false} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    grow: { flexGrow: 1, flexBasis: 110 },
    root: { flex: 1, backgroundColor: t.c.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.screen, paddingBottom: spacing.xs, backgroundColor: t.c.glass, borderBottomWidth: t.borderWidth, borderBottomColor: t.c.border },
    headerBtn: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
    list: { padding: spacing.screen, gap: spacing.sm, paddingBottom: spacing.md },
    emptyWrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg, paddingHorizontal: spacing.screen },
    example: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch', minHeight: touch.min, padding: spacing.md, borderRadius: radius.button, backgroundColor: t.c.surface, ...t.hairline },
    msgRow: { gap: spacing.xs, alignItems: 'flex-start' },
    mineRow: { alignItems: 'flex-end' },
    bubble: { maxWidth: '88%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20 },
    mine: { backgroundColor: t.hc ? t.c.text : t.c.primary, borderBottomRightRadius: 6 },
    theirs: { backgroundColor: t.c.surface, borderBottomLeftRadius: 6, ...t.hairline },
    typing: { paddingVertical: 2, paddingHorizontal: spacing.xs },
    proposal: { alignSelf: 'stretch', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.card, backgroundColor: t.c.surface, ...t.hairline, ...t.shadow.soft },
    action: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderLeftWidth: 4, borderWidth: t.hc ? 2 : 0 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
    quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chipsBar: { flexGrow: 0 },
    chips: { paddingHorizontal: spacing.screen, gap: spacing.xs, paddingVertical: spacing.xs },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, marginHorizontal: spacing.md, marginBottom: spacing.xs, padding: spacing.xs, minHeight: touch.timeRow, borderRadius: 28, backgroundColor: t.c.surface },
    tool: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
    input: { flex: 1, minHeight: touch.min, maxHeight: 120, paddingVertical: spacing.sm, fontFamily: 'Manrope_600SemiBold' },
    send: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.hc ? t.c.text : t.c.primary },
    disabled: { opacity: 0.4 },
  }),
);
