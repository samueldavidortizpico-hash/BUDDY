import { useEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { AppText } from '@/components/app-text';
import { Notice } from '@/components/blocks';
import { BuddyAvatar } from '@/components/buddy';
import { Button, IconButton } from '@/components/button';
import { ChatBubble, TypingIndicator } from '@/components/chat';
import { Chip } from '@/components/chip';
import { BottomSheet, useToast } from '@/components/feedback';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenContainer } from '@/components/screen-container';
import { SUGGESTIONS, useChat } from '@/features/chat/hooks';
import { useTextScale } from '@/features/profile/hooks';
import type { ChatMessage } from '@/types/domain';
import { fonts, gradients, ink, palette, radius, shadow, spacing, touch } from '@/theme';
import { formatClock, toClock } from '@/utils/dates';
import { tapHaptic } from '@/utils/haptics';

const LISTEN_MS = 2600;

function VoiceButton({ listening, onPress }: { listening: boolean; onPress: () => void }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (listening && !reduceMotion) pulse.set(withRepeat(withTiming(1, { duration: 1100 }), -1));
    else {
      cancelAnimation(pulse);
      pulse.set(0);
    }
  }, [listening, reduceMotion, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 0.5 }] }));
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={listening ? 'Detener micrófono' : 'Hablar con BUDDY (voz próximamente)'}
      accessibilityState={{ selected: listening }}
      style={styles.mic}
    >
      <Animated.View style={[styles.micRing, ring]} />
      <LinearGradient colors={gradients.voice} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.round]} />
      <Icon name="mic" size={24} color={ink.inverse} />
    </PressableScale>
  );
}

export default function Chat() {
  const toast = useToast();
  const scale = useTextScale();
  const { messages, typing, send, reset } = useChat();
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [menu, setMenu] = useState(false);
  const list = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (!listening) return;
    const id = setTimeout(() => {
      setListening(false);
      toast({ message: 'La voz estará disponible próximamente. Por ahora, escribe tu mensaje.', icon: 'mic' });
    }, LISTEN_MS);
    return () => clearTimeout(id);
  }, [listening, toast]);

  const submit = (value: string) => {
    if (send(value)) {
      tapHaptic();
      setText('');
    }
  };

  const header = (
    <View style={styles.header}>
      <BuddyAvatar size={48} />
      <View style={styles.flex}>
        <AppText variant="h3" accessibilityRole="header">
          BUDDY
        </AppText>
        <View style={styles.online}>
          <View style={styles.dot} />
          <AppText variant="caption" color={ink.muted}>
            {typing ? 'Escribiendo…' : 'Siempre contigo'}
          </AppText>
        </View>
      </View>
      <IconButton icon="menu" label="Opciones" onPress={() => setMenu(true)} />
    </View>
  );

  return (
    <ScreenContainer gradient="chat" scroll={false} keyboard insideTabs header={header} contentStyle={styles.noPad}>
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <ChatBubble from={item.from} text={item.text} time={formatClock(toClock(new Date(item.at)))} />}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.listHead}>
            <Notice text="BUDDY de demostración: responde con mensajes locales, sin inteligencia artificial y sin consejos médicos." />
            <AppText variant="eyebrow" color={ink.muted} align="center">
              HOY
            </AppText>
          </View>
        }
        ListFooterComponent={typing ? <TypingIndicator /> : null}
        accessibilityLabel="Conversación con BUDDY"
      />

      <View style={styles.composer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions} keyboardShouldPersistTaps="handled">
          {SUGGESTIONS.map((s) => (
            <Chip key={s} role="button" label={s} onPress={() => submit(s)} accessibilityHint="Enviar esta pregunta a BUDDY" />
          ))}
        </ScrollView>

        <View style={[styles.panel, listening && styles.panelListening]}>
          <VoiceButton listening={listening} onPress={() => setListening((l) => !l)} />
          {listening ? (
            <View style={styles.flex} accessibilityLiveRegion="polite">
              <AppText variant="bodyStrong">Te escucho…</AppText>
              <AppText variant="caption" color={ink.muted}>
                La voz estará disponible próximamente
              </AppText>
            </View>
          ) : (
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Escribe tu mensaje…"
              placeholderTextColor={ink.muted}
              accessibilityLabel="Escribe tu mensaje para BUDDY"
              returnKeyType="send"
              onSubmitEditing={() => submit(text)}
              multiline
              maxLength={500}
              style={[styles.input, { fontSize: 17 * scale }]}
            />
          )}
          <IconButton
            icon="arrow"
            label="Enviar"
            variant="mint"
            showLabel={false}
            disabled={!text.trim() || listening}
            onPress={() => submit(text)}
          />
        </View>
      </View>

      <BottomSheet visible={menu} onClose={() => setMenu(false)} title="Opciones del chat">
        <Notice text="Las respuestas son ejemplos locales. BUDDY no diagnostica ni indica dosis; ante cualquier duda, consulta con tu médico." />
        <Button
          label="Borrar conversación"
          variant="danger"
          icon="close"
          onPress={() => {
            reset();
            setMenu(false);
            toast({ message: 'Conversación reiniciada.', icon: 'check' });
          }}
        />
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  noPad: { paddingHorizontal: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 72 },
  online: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.success },
  messages: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  listHead: { gap: spacing.md, marginBottom: spacing.md },
  composer: { gap: spacing.sm, paddingBottom: spacing.sm },
  suggestions: { gap: spacing.xs, paddingHorizontal: spacing.lg },
  panel: {
    marginHorizontal: spacing.lg,
    minHeight: 72,
    borderRadius: 22,
    backgroundColor: palette.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    ...shadow.elevated,
  },
  panelListening: { borderWidth: 2, borderColor: palette.mint },
  mic: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  micRing: { position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: palette.mint },
  round: { borderRadius: radius.pill },
  input: {
    flex: 1,
    minHeight: touch.min,
    maxHeight: 120,
    color: ink.text,
    fontFamily: fonts.semibold,
    paddingVertical: spacing.xs,
  },
});
