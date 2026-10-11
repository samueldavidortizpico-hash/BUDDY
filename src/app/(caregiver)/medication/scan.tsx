import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { BuddyRobot } from '@/components/robot';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { savePhoto } from '@/infrastructure/local/media';
import { strings } from '@/i18n';
import { radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { successHaptic } from '@/utils/haptics';

const C = strings.scan;

/** Foto del envase. No hay lectura automática: la foto acompaña al formulario para completarlo a mano. */
export default function Scan() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { elderId } = useLocalSearchParams<{ elderId?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);

  const done = async (uri: string) => {
    setBusy(true);
    const saved = await savePhoto(uri);
    successHaptic();
    router.replace({ pathname: '/medication/new', params: { elderId: elderId ?? '', photo: saved } });
  };

  const capture = async () => {
    if (!camera.current || !ready || busy) return;
    const photo = await camera.current.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) await done(photo.uri);
  };

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled && r.assets[0]?.uri) await done(r.assets[0].uri);
  };

  const manual = () => router.replace({ pathname: '/medication/new', params: { elderId: elderId ?? '', mode: 'manual' } });

  if (!permission?.granted) {
    return (
      <ScreenContainer header={<ScreenHeader title={C.title} />}>
        <View style={s.permission}>
          <BuddyRobot size={120} mood={permission && !permission.canAskAgain ? 'worry' : 'look'} />
          <AppText variant="h2" align="center">
            {C.permissionTitle}
          </AppText>
          <AppText variant="body" color={t.c.muted} align="center">
            {permission && !permission.canAskAgain ? C.denied : C.permissionBody}
          </AppText>
          {!permission || permission.canAskAgain ? <Button label={C.allow} icon="camera" onPress={requestPermission} style={s.full} /> : null}
          <Button label={C.gallery} icon="image" variant="tonal" tone="coral" onPress={pick} style={s.full} />
          <Button label={C.manual} variant="ghost" size="md" onPress={manual} style={s.full} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <View style={s.root}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} onCameraReady={() => setReady(true)} />
      <View style={[s.top, { paddingTop: insets.top + spacing.xs }]}>
        <ScreenHeader title={C.title} />
      </View>
      <View pointerEvents="none" style={s.guideWrap}>
        <View style={s.guide} />
        <AppText variant="secondaryStrong" color="#FFFFFF" align="center" style={s.guideText}>
          {C.guide}
        </AppText>
      </View>
      <View style={[s.controls, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable onPress={pick} accessibilityRole="button" accessibilityLabel={C.gallery} style={s.side}>
          <Icon name="image" color="#FFFFFF" size={28} />
        </Pressable>
        <Pressable onPress={capture} disabled={!ready || busy} accessibilityRole="button" accessibilityLabel={C.capture} style={s.shutter}>
          <View style={s.shutterInner} />
        </Pressable>
        <Pressable onPress={() => setTorch((v) => !v)} accessibilityRole="button" accessibilityLabel={torch ? C.torchOff : C.torchOn} accessibilityState={{ checked: torch }} style={[s.side, torch && s.sideOn]}>
          <Icon name="flash" color={torch ? '#0D3946' : '#FFFFFF'} size={26} />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000000' },
    full: { alignSelf: 'stretch' },
    permission: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
    top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: spacing.screen, backgroundColor: t.hc ? t.c.bg : 'rgba(0,0,0,0.25)' },
    guideWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    guide: { width: '78%', aspectRatio: 1.4, borderRadius: radius.card, borderWidth: 3, borderColor: '#5ED9B5', borderStyle: 'dashed' },
    guideText: { backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
    controls: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingTop: spacing.lg, backgroundColor: 'rgba(0,0,0,0.4)' },
    side: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    sideOn: { backgroundColor: '#F6D27A' },
    shutter: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
    shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF' },
  }),
);

export const scanTouch = touch.min;
