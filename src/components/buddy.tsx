/**
 * Robot BUDDY y avatares. El recurso del robot vive solo aquí: para reemplazar el arte
 * basta con cambiar `ROBOT` (y el recorte) sin tocar pantallas.
 * El PNG del Figma dice "BUDY" en el logotipo: solo se usa el recorte del robot; el nombre se escribe como texto.
 */
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';

import { ink, palette, shadow, spacing, type as typeScale } from '@/theme';

import { AppText } from './app-text';

const ROBOT = require('../../assets/branding/buddy-logo.png');
/**
 * Recorte del robot dentro del PNG (358×147): el robot ocupa x 13–125, y 5–133 y su centro está en (69, 69).
 * El Figma usaba la imagen al 244 % con left −2 %, lo que dejaba ver el borde de la "B"; aquí se muestran
 * 130 px de la imagen centrados en el robot.
 */
const CROP = { imageW: 358, imageH: 147, visible: 130, centerX: 69, centerY: 69 };
const DEMO_PHOTO = require('../../assets/images/carmen-demo.jpg');

export const AVATAR_SIZES = { small: 40, medium: 58, large: 92, hero: 238 } as const;

export function BuddyAvatar({
  size = 'small',
  label = 'BUDDY, tu asistente',
  border,
  style,
}: {
  size?: keyof typeof AVATAR_SIZES | number;
  label?: string;
  border?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const px = typeof size === 'number' ? size : AVATAR_SIZES[size];
  const k = px / CROP.visible;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[{ width: px, height: px, borderRadius: px / 2 }, size === 'hero' ? shadow.hero : shadow.soft, style]}
    >
      <View
        style={[
          styles.clip,
          { borderRadius: px / 2 },
          border ? { borderWidth: border, borderColor: 'rgba(255, 255, 255, 0.88)' } : null,
        ]}
      >
        <Image
          source={ROBOT}
          contentFit="fill"
          style={{
            position: 'absolute',
            width: CROP.imageW * k,
            height: CROP.imageH * k,
            left: px / 2 - CROP.centerX * k,
            top: px / 2 - CROP.centerY * k,
          }}
        />
      </View>
    </View>
  );
}

/** Marca: robot + wordmark BUDDY escrito como texto (doble D). */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <View style={styles.brand} accessible accessibilityRole="header" accessibilityLabel="BUDDY, siempre contigo">
      <BuddyAvatar size={size} label="" />
      <View>
        <AppText variant="h3" color={ink.title} style={styles.wordmark}>
          BUDDY
        </AppText>
        <AppText variant="meta" color={ink.muted}>
          Siempre contigo
        </AppText>
      </View>
    </View>
  );
}

/** Usa un bucle solo mientras la pantalla está enfocada y sin "reducir movimiento". */
function useLoop(start: (v: SharedValue<number>) => void, reset: number) {
  const value = useSharedValue(reset);
  const focused = useIsFocused();
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (focused && !reduceMotion) start(value);
    else {
      cancelAnimation(value);
      value.set(reset);
    }
    return () => cancelAnimation(value);
  }, [focused, reduceMotion, value, reset, start]);
  return value;
}

const floatLoop = (v: SharedValue<number>) => {
  v.set(withRepeat(
    withSequence(
      withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
    ),
    -1,
  ));
};
const breatheLoop = (v: SharedValue<number>) => {
  v.set(withRepeat(withTiming(1.06, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
};

/** Robot grande de portada: flota sobre un halo menta con orbes lavanda y coral que respiran. */
export function BuddyHero({ size = AVATAR_SIZES.hero }: { size?: number }) {
  const y = useLoop(floatLoop, 0);
  const s = useLoop(breatheLoop, 1);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: '-3deg' }] }));
  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const halo = size * 1.18;
  return (
    <View style={[styles.hero, { height: halo + spacing.lg }]}>
      <Animated.View style={[styles.glow, { width: halo, height: halo, borderRadius: halo / 2, backgroundColor: 'rgba(94, 217, 181, 0.25)' }, breathe]} />
      <Animated.View style={[styles.glow, styles.glowLavender, breathe]} />
      <Animated.View style={[styles.glow, styles.glowCoral, breathe]} />
      <Animated.View style={float}>
        <BuddyAvatar size={size} border={9} label="BUDDY, el robot asistente, saludando" />
      </Animated.View>
    </View>
  );
}

/** Foto de la usuaria FICTICIA de demostración, con iniciales como respaldo. Nunca en la portada. */
export function PersonAvatar({ size = 48, initials = 'CG', label = 'Carmen García (usuaria de demostración)' }: { size?: number; initials?: string; label?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[styles.person, { width: size, height: size, borderRadius: size / 2 }, shadow.soft]}
    >
      {failed ? (
        <AppText style={{ ...typeScale.captionStrong, fontSize: size * 0.34 }} color={ink.coral}>
          {initials}
        </AppText>
      ) : (
        <Image source={DEMO_PHOTO} contentFit="cover" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} />
      )}
    </View>
  );
}

/** Avatar de iniciales (cuidador). */
export function InitialsAvatar({ initials, size = 48, label }: { initials: string; size?: number; label: string }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={[styles.person, styles.initials, { width: size, height: size, borderRadius: size / 2 }, shadow.soft]}>
      <AppText variant="captionStrong" color={ink.coral}>
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { flex: 1, overflow: 'hidden', backgroundColor: palette.white },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmark: { letterSpacing: 0.5 },
  hero: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  glowLavender: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(139, 124, 246, 0.25)', right: 24, top: 18 },
  glowCoral: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(242, 140, 122, 0.28)', left: 30, bottom: 26 },
  person: {
    borderWidth: 3,
    borderColor: palette.white,
    backgroundColor: palette.coralPale,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { overflow: 'visible' },
});
