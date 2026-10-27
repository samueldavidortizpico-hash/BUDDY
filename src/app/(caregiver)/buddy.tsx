import * as ImagePicker from 'expo-image-picker';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { BottomSheet } from '@/components/feedback';
import { Icon, type IconName } from '@/components/icon';
import { IconTile } from '@/components/icon-tile';
import { LockedPreview } from '@/components/plus-lock';
import { BuddyRobot } from '@/components/robot';
import { ScreenHeader } from '@/components/screen-header';
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
import { useHasFeature } from '@/state/entitlements';
import { useActiveElder, useRecords } from '@/state/data';
import { radius, spacing, touch, type, type Tone } from '@/theme';
import { makeStyles, useTextScaleFactor, useTheme } from '@/theme/provider';
import { formatClock } from '@/utils/dates';

const B = strings.buddy;
/** Acciones rápidas del chat vacío (V4). "mood" deja la frase escrita para que el administrador ajuste la hora. */
const QUICK: { key: MenuKey | 'mood'; icon: IconName; tone: Tone }[] = [
  { key: 'medication', icon: 'meds', tone: 'coral' },
  { key: 'water', icon: 'drop', tone: 'sky' },
  { key: 'mood', icon: 'smile', tone: 'lavender' },
  { key: 'appointment', icon: 'calendar', tone: 'yellow' },
  { key: 'contact', icon: 'phone', tone: 'mint' },
  { key: 'day', icon: 'heart', tone: 'petrol' },
];
/** Mensajes visibles antes de "Ver mensajes anteriores". */
const VISIBLE = 10;

/**
 * BUDDY: asistente del administrador para configurar (V3.0). Pantalla completa del stack, SIN barra de pestañas (antes
 * era una pestaña y la barra flotante tapaba el compositor). Regiones: encabezado con "Volver" (≤ 64 de alto), historial
 * breve y plegable, tarjeta de tarea activa FIJA sobre el compositor, y compositor anclado: sobre la safe area con el
 * teclado cerrado y justo encima del teclado al abrirlo. Escribir es opcional: todo se puede hacer con el menú de
 * 8 acciones y las respuestas predeterminadas.
 */
export default function Buddy() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const scale = useTextScaleFactor();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const elder = useActiveElder();
  // V4.3: el chat de BUDDY es del plan Plus; en Gratis se ve una vista previa con candado.
  const hasChat = useHasFeature('chat');
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
  // Con el teclado abierto el compositor va pegado a él (sin la safe area inferior) y la lista baja al último mensaje.
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      setKeyboard(true);
      setAtEnd(true);
    });
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
    openLocation: () => router.push('/location' as Href),
    call: (phone) => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`),
    primary: primary ? { name: primary.name, phone: primary.phone } : undefined,
  });

  // Al final con cada mensaje nuevo, al enviar y al abrir el teclado (salvo que el cuidador esté leyendo arriba).
  useEffect(() => {
    if (!atEnd) return;
    const id = setTimeout(() => list.current?.scrollToEnd({ animated: !reduce }), 80);
    return () => clearTimeout(id);
  }, [messages.length, chat.typing, atEnd, reduce, keyboard, bump]);

  if (!elder?.setupDone) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <ScreenHeader title={strings.brand.name} fallback="/summary" />
        </View>
        <View style={s.emptyWrap}>
          <IconTile icon="chat" domain="activity" size={72} />
          <AppText variant="h2" align="center">{strings.summary.emptyTitle}</AppText>
          <Button label={strings.summary.steps.register} onPress={() => router.push('/setup')} />
        </View>
      </View>
    );
  }

  if (!hasChat) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <ScreenHeader title={strings.brand.name} subtitle={B.assistantOf(elder.firstName)} fallback="/summary" leading={<BuddyRobot size={40} />} />
        </View>
        <View style={s.lockedWrap}>
          <LockedPreview feature="chat" title={B.lockedTitle} body={B.lockedBody}>
            <View style={s.previewChat}>
              {B.previewMessages.map((m, i) => (
                <View key={i} style={[s.bubble, i % 2 === 0 ? s.mine : s.theirs, i % 2 === 0 ? s.previewMine : null]}>
                  <AppText variant="secondary" color={i % 2 === 0 ? t.c.onPrimary : t.c.text}>{m}</AppText>
                </View>
              ))}
            </View>
          </LockedPreview>
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
      <View style={[s.header, { paddingTop: insets.top }]}>
        <ScreenHeader
          title={strings.brand.name}
          subtitle={B.assistantOf(elder.firstName)}
          fallback="/summary"
          leading={<BuddyRobot size={40} />}
          right={
            <>
              <PreviewSheetButton compact />
              {messages.length ? (
                <Pressable onPress={() => conversation.clear()} accessibilityRole="button" accessibilityLabel={B.clear} style={s.headerBtn}>
                  <Icon name="trash" color={t.c.muted} size={20} />
                </Pressable>
              ) : null}
            </>
          }
        />
      </View>

      <KeyboardAvoidingView style={[s.flex, { paddingBottom: keyboard ? 0 : insets.bottom }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
            ListHeaderComponent={hidden ? <Button label={B.olderMessages(hidden)} size="sm" variant="ghost" onPress={() => setShowAll(true)} style={s.older} /> : undefined}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                {/* Saludo corto y seis acciones rápidas; el menú completo sigue en "+". */}
                <AppText variant="h2" align="center">{B.hello(elder.firstName)}</AppText>
                <View style={s.chips}>
                  {QUICK.map((q) => (
                    <Button
                      key={q.key}
                      label={q.key === 'mood' ? B.quick.mood : q.key === 'day' ? B.quick.day : B.menu[q.key]}
                      icon={q.icon}
                      size="sm"
                      variant="tonal"
                      tone={q.tone}
                      onPress={() => (q.key === 'mood' ? setText(B.quick.moodText(elder.firstName)) : pickMenu(q.key as MenuKey))}
                    />
                  ))}
                </View>
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
            // Tope ×1.5: con más, el texto no cabe en el compositor junto a sus botones. Hasta 4 líneas, luego desplaza.
            style={[s.input, { fontSize: type.secondary.fontSize * Math.min(scale, 1.5), maxHeight: 4 * type.secondary.lineHeight * Math.min(scale, 1.5) + spacing.sm * 2, color: t.c.text }]}
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

  const time = new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return (
    <Animated.View entering={reduce ? undefined : FadeIn.duration(180)} style={[s.msgRow, mine && s.mineRow]}>
      <View style={[s.messageLine, mine && s.messageMine]}>
        {!mine ? <IconTile icon="sparkle" domain="activity" size={30} /> : null}
        <View style={[s.messageContent, mine && s.messageContentMine]}>
          <View style={[s.bubble, mine ? s.mine : s.theirs]}>
            {m.imageUri ? <AppText variant="caption" color={mine ? t.c.onPrimary : t.c.muted}>{B.photoSent}</AppText> : null}
            <AppText variant="secondary" color={mine ? t.c.onPrimary : t.c.text}>{m.text}</AppText>
          </View>
          <AppText variant="meta" color={t.c.muted} style={mine ? s.timeMine : s.time}>{time}</AppText>
        </View>
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
  const reduce = useReducedMotion();
  const a = useSharedValue(0.4);
  const b = useSharedValue(0.4);
  const c = useSharedValue(0.4);
  useEffect(() => {
    if (reduce) return;
    [a, b, c].forEach((v, i) => v.set(withDelay(i * 160, withRepeat(withSequence(withTiming(1, { duration: 240 }), withTiming(0.4, { duration: 240 })), -1, false))));
  }, [a, b, c, reduce]);
  const sa = useAnimatedStyle(() => ({ opacity: a.get(), transform: [{ translateY: -3 * a.get() }] }));
  const sb = useAnimatedStyle(() => ({ opacity: b.get(), transform: [{ translateY: -3 * b.get() }] }));
  const sc = useAnimatedStyle(() => ({ opacity: c.get(), transform: [{ translateY: -3 * c.get() }] }));
  return (
    <View style={s.msgRow} accessibilityLabel={B.typing} accessibilityLiveRegion="polite">
      <View style={s.typingRow}>
        <IconTile icon="sparkle" domain="activity" size={30} />
        <View style={[s.bubble, s.theirs, s.typing]}>
          <AppText variant="caption" color="text">{B.typing}</AppText>
          <View style={s.dots}>
            {[sa, sb, sc].map((style, i) => <Animated.View key={i} style={[s.dot, reduce && { opacity: 1, transform: [{ translateY: 0 }] }, style]} />)}
          </View>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, flexShrink: 1, minWidth: 0 },
    root: { flex: 1, backgroundColor: t.c.bg },
    header: { paddingHorizontal: spacing.screen, backgroundColor: t.c.glass, borderBottomWidth: t.borderWidth, borderBottomColor: t.c.border },
    headerBtn: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
    list: { padding: spacing.screen, paddingBottom: spacing.md, flexGrow: 1, gap: spacing.sm },
    older: { alignSelf: 'center' },
    lockedWrap: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
    previewChat: { gap: spacing.sm, padding: spacing.md },
    previewMine: { alignSelf: 'flex-end' },
    emptyWrap: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
    chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs },
    msgRow: { width: '100%', gap: spacing.xs, alignItems: 'flex-start' },
    mineRow: { alignItems: 'flex-end' },
    messageLine: { width: '100%', flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
    messageMine: { justifyContent: 'flex-end' },
    messageContent: { maxWidth: '85%', flexShrink: 1, minWidth: 0, gap: 2 },
    messageContentMine: { alignItems: 'flex-end' },
    time: { paddingLeft: spacing.xs },
    timeMine: { paddingRight: spacing.xs, textAlign: 'right' },
    bubble: { width: '100%', maxWidth: '100%', minWidth: 0, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20 },
    mine: { alignSelf: 'flex-end', backgroundColor: t.hc ? t.c.text : t.c.primary, borderBottomRightRadius: 6 },
    theirs: { alignSelf: 'flex-start', backgroundColor: t.c.surface, borderBottomLeftRadius: 6, ...t.hairline },
    typing: { width: undefined, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
    typingRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    dots: { flexDirection: 'row', gap: 4 },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: t.c.muted },
    done: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md, backgroundColor: t.c.surface },
    doneActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.xs, flexBasis: '100%' },
    suggestions: { alignSelf: 'stretch', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.card, backgroundColor: t.c.surface, ...t.hairline },
    action: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderLeftWidth: 4, borderWidth: t.hc ? 2 : 0 },
    quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
    toEnd: { position: 'absolute', bottom: spacing.sm, alignSelf: 'center' },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.sm, padding: 2, minHeight: touch.secondary, borderRadius: 28, backgroundColor: t.c.surface },
    tool: { width: touch.min - 4, height: touch.min, alignItems: 'center', justifyContent: 'center' },
    // minWidth 0: sin él, en web el campo no se encoge y empuja el botón enviar fuera del compositor.
    input: { flex: 1, minWidth: 0, minHeight: touch.min, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, fontFamily: 'Manrope_600SemiBold' },
    send: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.hc ? t.c.text : t.c.primary },
    disabled: { opacity: 0.4 },
  }),
);
