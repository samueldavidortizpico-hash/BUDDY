import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ink, palette, shadow, spacing } from '@/theme';

import { AppText } from './app-text';
import { BuddyAvatar, PersonAvatar } from './buddy';

export const ChatBubble = memo(function ChatBubble({ from, text, time }: { from: 'buddy' | 'user'; text: string; time: string }) {
  const mine = from === 'user';
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={[styles.row, mine && styles.rowMine]}>
      {!mine ? <BuddyAvatar size={36} label="" /> : null}
      <View
        accessible
        accessibilityLabel={`${mine ? 'Tú' : 'BUDDY'}: ${text}. ${time}`}
        style={[styles.bubble, mine ? styles.mine : styles.theirs]}
      >
        <AppText variant="body">{text}</AppText>
        <AppText variant="meta" color={ink.muted} align="right">
          {time}
        </AppText>
      </View>
      {mine ? <PersonAvatar size={36} label="" /> : null}
    </Animated.View>
  );
});

function Dot({ index }: { index: number }) {
  const reduceMotion = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    v.set(withDelay(
      index * 160,
      withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0, { duration: 320 })), -1),
    ));
  }, [index, reduceMotion, v]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + v.value * 0.65, transform: [{ translateY: -3 * v.value }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** Tres puntos mientras BUDDY "escribe". */
export function TypingIndicator() {
  return (
    <Animated.View entering={FadeInDown.duration(200)} style={styles.row} accessible accessibilityLabel="BUDDY está escribiendo" accessibilityLiveRegion="polite">
      <BuddyAvatar size={36} label="" />
      <View style={[styles.bubble, styles.theirs, styles.typing]}>
        <Dot index={0} />
        <Dot index={1} />
        <Dot index={2} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, marginBottom: spacing.sm },
  rowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: 2, ...shadow.soft },
  theirs: { backgroundColor: palette.white, borderTopLeftRadius: 7, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  mine: { backgroundColor: palette.mintPale, borderTopLeftRadius: 18, borderTopRightRadius: 7, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  typing: { flexDirection: 'row', gap: 6, paddingVertical: spacing.md },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.mintDark },
});
