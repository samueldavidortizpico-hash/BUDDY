import * as ImagePicker from 'expo-image-picker';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { tabBarSpace } from '@/components/bottom-tab-bar';
import { BottomSheet } from '@/components/feedback';
import { Icon } from '@/components/icon';
import { BuddyRobot } from '@/components/robot';
import type { MenuKey } from '@/domain/assistant/draft';
import type { AssistantMessage } from '@/domain/types';
import { ActionMenu, TaskCard } from '@/features/chat/task-card';
import { MedInfoCard, type MedInfoPayload } from '@/features/chat/med-info';
import { DONE, MENU, useBuddyChat } from '@/features/chat/use-chat';
import { PreviewSheetButton } from '@/features/elder/phone-preview';
import { savePhoto } from '@/infrastructure/local/media';
import { strings } from '@/i18n';
import { SUGGESTIONS, conversation, type RoutineSegment } from '@/state/assistant';
import { routineActions } from '@/state/actions';
import { useActiveElder, useRecords } from '@/state/data';
import { radius, spacing, touch, type } from '@/theme';
import { makeStyles, useTextScaleFactor, useTheme } from '@/theme/provider';
import { formatClock } from '@/utils/dates';

const B = strings.buddy;
/** Mensajes visibles antes de "Ver mensajes anteriores". */
const VISIBLE = 10;

/**
 * BUDDY: centro de mando del cuidador (V2.4). Cuatro regiones: encabezado compacto, historial breve y plegable,
 * tarjeta de tarea activa FIJA sobre el compositor (pregunta, respuestas tocables, confirmación) y compositor.
 * Escribir es opcional: todo se puede hacer con el menú de 8 acciones y las respuestas predeterminadas.
 */
export default function Buddy() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const scale = useTextScaleFactor();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const elder = useActiveElder();
  const records = useRecords('messages');
  const messages = useMemo(() => [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [records]);
  const contacts = useRecords('contacts');
  const primary = contacts.find((c) => c.primary) ?? contacts[0];
  const [text, setText] = useState('');
  const [bump, setBump] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [atEnd, setAtEnd] = useState(true);
  const [listH, setListH] = useState(0);
  // La barra flota sobre el contenido: el chat reserva su alto, salvo con el teclado abierto (lo tapa o se oculta).
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const list = useRef<FlatList<AssistantMessage>>(null);

  const openRoutine = (seg: RoutineSegment) => router.push({ pathname: '/routine', params: { seg } } as unknown as Href);
  const chat = useBuddyChat({
    openScan: () => router.push('/medication/scan'),
    openRoutine,
    openPreview: () => router.push('/handoff' as Href),
    openFeed: () => router.push('/alerts' as Href),
    openFood: () => router.push('/food' as Href),
    call: (phone) => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`),
    primary: primary ? { name: primary.name, phone: primary.phone } : undefined,
  });

  // Al final con cada mensaje nuevo (salvo que el cuidador esté leyendo arriba).
  useEffect(() => {
    if (!atEnd) return;
    const id = setTimeout(() => list.current?.scrollToEnd({ animated: !reduce }), 80);
    return () => clearTimeout(id);
  }, [messages.length, chat.typing, atEnd, reduce]);

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
    setAtEnd(true);
    chat.send(raw);
  };

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (r.canceled || !r.assets[0]?.uri) return;
    const uri = await savePhoto(r.assets[0].uri);
    conversation.add('user', B.photoSent, { imageUri: uri });
    router.push({ pathname: '/medication/new', params: { photo: uri } });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setAtEnd(contentSize.height - (contentOffset.y + layoutMeasurement.height) < 160);
  };

  const hidden = showAll ? 0 : Math.max(0, messages.length - VISIBLE);
  const visible = hidden ? messages.slice(hidden) : messages;
  const last = messages.at(-1);
  const lastQuick = !chat.draft && last?.from === 'buddy' && !chat.typing ? (last.quickReplies ?? []) : [];
  const pickMenu = (key: MenuKey) => {
    setMenuOpen(false);
    setAtEnd(true);
    chat.menu(key);
  };

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
        <BuddyRobot size={56} compact mood={chat.mood} bump={bump} shadow={false} flying={false} />
        <View style={s.flex}>
          <AppText variant="h3" maxScale={1.4} numberOfLines={1}>{strings.brand.name}</AppText>
          <AppText variant="caption" color={t.c.muted} numberOfLines={1} maxScale={1.4}>{strings.summary.caring(elder.firstName)}</AppText>
        </View>
        <PreviewSheetButton compact />
        {messages.length ? (
          <Pressable onPress={() => conversation.clear()} accessibilityRole="button" accessibilityLabel={B.clear} style={s.headerBtn}>
            <Icon name="trash" color={t.c.muted} size={20} />
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView style={[s.flex, { paddingBottom: keyboard ? 0 : tabBarSpace(insets.bottom) }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.flex}>
          <FlatList
            ref={list}
            testID="chat-list"
            data={visible}
            keyExtractor={(m) => m.id}
            style={s.flex}
            contentContainerStyle={s.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onScroll={onScroll}
            onLayout={(e) => setListH(e.nativeEvent.layout.height)}
            scrollEventThrottle={64}
            ListHeaderComponent={hidden ? <Button label={B.olderMessages(hidden)} size="sm" variant="ghost" onPress={() => setShowAll(true)} style={s.older} /> : null}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                {/* El robot ya está en el encabezado: aquí solo el título y las 8 acciones, que caben sin desplazar. */}
                <AppText variant="h2" align="center">{B.emptyTitle(elder.firstName)}</AppText>
                <ActionMenu onPick={pickMenu} />
              </View>
            }
            renderItem={({ item: m }) => <Message m={m} onMenu={pickMenu} onSee={openRoutine} onUndo={chat.undo} />}
            ListFooterComponent={
              <>
                {chat.typing ? <Typing /> : null}
                {lastQuick.length ? (
                  <Animated.View entering={reduce ? undefined : FadeInDown.duration(200)} style={s.quick}>
                    {lastQuick.map((q) => (
                      <Button key={q} label={q} size="sm" variant="tonal" tone="mint" onPress={() => chat.quick(q)} />
                    ))}
                  </Animated.View>
                ) : null}
              </>
            }
          />
          {atEnd || listH < 140 ? null : (
            <Animated.View entering={reduce ? undefined : FadeIn.duration(160)} style={s.toEnd}>
              <Button
                label={B.goToEnd}
                icon="arrow"
                size="sm"
                variant="tonal"
                onPress={() => {
                  setAtEnd(true);
                  list.current?.scrollToEnd({ animated: !reduce });
                }}
              />
            </Animated.View>
          )}
        </View>

        {chat.draft ? <TaskCard draft={chat.draft} hint={chat.hint} onAnswer={chat.answer} onConfirm={chat.confirm} onCancel={chat.cancel} onEdit={chat.edit} /> : null}

        <View style={[s.composer, t.hairline]}>
          <Pressable onPress={() => setMenuOpen(true)} accessibilityRole="button" accessibilityLabel={B.openMenu} style={s.tool}>
            <Icon name="plus" color={t.c.text} />
          </Pressable>
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
            // Tope ×1.5: con más, el texto no cabe en el compositor junto a sus botones.
            style={[s.input, { fontSize: type.secondary.fontSize * Math.min(scale, 1.5), color: t.c.text }]}
            multiline
            onSubmitEditing={() => send(text)}
            returnKeyType="send"
            submitBehavior="blurAndSubmit"
          />
          <Pressable
            onPress={() => send(text)}
            disabled={!text.trim()}
            accessibilityRole="button"
            accessibilityLabel={B.send}
            accessibilityState={{ disabled: !text.trim() }}
            style={[s.send, !text.trim() && s.disabled]}
          >
            <Icon name="send" color={t.hc ? t.c.bg : '#FFFFFF'} size={20} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={B.menuTitle}>
        <ActionMenu onPick={pickMenu} />
      </BottomSheet>
    </View>
  );
}

function Message({ m, onMenu, onSee, onUndo }: { m: AssistantMessage; onMenu: (key: MenuKey) => void; onSee: (seg: RoutineSegment) => void; onUndo: (id: string) => void }) {
  const t = useTheme();
  const s = useStyles();
  const reduce = useReducedMotion();
  const mine = m.from === 'user';
  const p = m.proposal ? (JSON.parse(m.proposal) as { kind?: string; segment?: RoutineSegment; suggestions?: boolean }) : null;
  if (p?.kind === 'medinfo') return <MedInfoCard p={p as unknown as MedInfoPayload} />;

  // Tarea terminada: una sola línea con Ver y Deshacer.
  if (p?.kind === DONE) {
    const undone = m.proposalState === 'cancelled';
    return (
      <Animated.View testID="task-done" entering={reduce ? undefined : FadeIn.duration(200)} style={[s.done, t.hairline]}>
        <Icon name={undone ? 'close' : 'check'} color={undone ? t.c.muted : t.ink.mint} size={20} />
        {/* Texto completo: puede incluir la revisión de BUDDY ("No encontré coincidencias…"), que no se recorta. */}
        <AppText variant="captionStrong" style={s.flex} color={undone ? t.c.muted : t.c.text}>
          {m.text}
        </AppText>
        <View style={s.doneActions}>
          {undone ? (
            <AppText variant="caption" color={t.c.muted}>{B.cancelled}</AppText>
          ) : (
            <>
              <Button label={B.see} size="sm" variant="ghost" onPress={() => onSee(p.segment ?? 'meds')} />
              <Button label={strings.common.undo} size="sm" variant="ghost" onPress={() => onUndo(m.id)} />
            </>
          )}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={reduce ? undefined : FadeIn.duration(180)} style={[s.msgRow, mine && s.mineRow]}>
      <View style={[s.bubble, mine ? s.mine : s.theirs]}>
        {m.imageUri ? <AppText variant="caption" color={mine ? t.c.onPrimary : t.c.muted}>{B.photoSent}</AppText> : null}
        <AppText variant="secondary" color={mine ? t.c.onPrimary : t.c.text}>{m.text}</AppText>
      </View>
      {p?.kind === MENU ? <ActionMenu onPick={onMenu} /> : null}
      {p?.suggestions ? <Suggestions /> : null}
    </Animated.View>
  );
}

/** Sugerencias generales de bienestar (no son consejos médicos). */
function Suggestions() {
  const t = useTheme();
  const s = useStyles();
  const [added, setAdded] = useState<string[]>([]);
  return (
    <View style={s.suggestions}>
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
        <BuddyRobot size={48} compact mood="think" shadow={false} flying={false} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    root: { flex: 1, backgroundColor: t.c.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.screen, paddingBottom: spacing.xs, backgroundColor: t.c.glass, borderBottomWidth: t.borderWidth, borderBottomColor: t.c.border },
    headerBtn: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
    list: { padding: spacing.screen, paddingBottom: spacing.md, flexGrow: 1, gap: spacing.sm },
    older: { alignSelf: 'center' },
    emptyWrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
    msgRow: { gap: spacing.xs, alignItems: 'flex-start' },
    mineRow: { alignItems: 'flex-end' },
    bubble: { maxWidth: '88%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20 },
    mine: { backgroundColor: t.hc ? t.c.text : t.c.primary, borderBottomRightRadius: 6 },
    theirs: { backgroundColor: t.c.surface, borderBottomLeftRadius: 6, ...t.hairline },
    typing: { paddingVertical: 2, paddingHorizontal: spacing.xs },
    done: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md, backgroundColor: t.c.surface },
    doneActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs, flexGrow: 1 },
    suggestions: { alignSelf: 'stretch', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.card, backgroundColor: t.c.surface, ...t.hairline },
    action: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderLeftWidth: 4, borderWidth: t.hc ? 2 : 0 },
    quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
    toEnd: { position: 'absolute', bottom: spacing.sm, alignSelf: 'center' },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginHorizontal: spacing.md, marginBottom: spacing.xs, padding: spacing.xs, minHeight: touch.timeRow, borderRadius: 28, backgroundColor: t.c.surface },
    tool: { width: touch.min - 4, height: touch.min, alignItems: 'center', justifyContent: 'center' },
    input: { flex: 1, minHeight: touch.min, maxHeight: 120, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, fontFamily: 'Manrope_600SemiBold' },
    send: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.hc ? t.c.text : t.c.primary },
    disabled: { opacity: 0.4 },
  }),
);
