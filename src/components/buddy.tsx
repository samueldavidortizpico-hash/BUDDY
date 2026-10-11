/**
 * Avatares de BUDDY y de personas. El arte del robot vive solo en ./robot (`ROBOT_SOURCE`).
 * El PNG del Figma dice "BUDY" en el logotipo: solo se usa el recorte del robot; el nombre se escribe como texto.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ink, palette, shadow, spacing, type as typeScale } from '@/theme';

import { AppText } from './app-text';
import { BuddyRobot, RobotArt } from './robot';

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
  return (
    <View
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label || undefined}
      style={[{ width: px, height: px, borderRadius: px / 2 }, size === 'hero' ? shadow.hero : shadow.soft, style]}
    >
      <View
        style={[
          styles.clip,
          { borderRadius: px / 2 },
          border ? { borderWidth: border, borderColor: palette.white } : null,
        ]}
      >
        <View style={{ marginTop: px * 0.1 }}>
          <RobotArt size={px * 0.82} mood="idle" look={0} animated={false} />
        </View>
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

/** Robot grande de portada (compatibilidad): el robot volador con halo y destellos. */
export function BuddyHero({ size = AVATAR_SIZES.hero }: { size?: number }) {
  return (
    <View style={styles.hero}>
      <BuddyRobot size={size} glow sparkles />
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
  clip: { flex: 1, overflow: 'hidden', backgroundColor: palette.mintPale, alignItems: 'center', justifyContent: 'center' },
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
