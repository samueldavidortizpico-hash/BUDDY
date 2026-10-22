/** Iconos de BUDDY (trazo 1.8, redondeado) en react-native-svg: los 24 del prototipo de Figma más los de la v2.1. */
import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/provider';

export type IconName =
  | 'arrow' | 'back' | 'bell' | 'calendar' | 'camera' | 'care' | 'chat' | 'check'
  | 'chevron' | 'clock' | 'close' | 'heart' | 'home' | 'location' | 'meds' | 'menu'
  | 'mic' | 'phone' | 'plus' | 'search' | 'settings' | 'shield' | 'user' | 'warning'
  | 'sun' | 'moon' | 'contrast' | 'drop' | 'food' | 'walk' | 'eye' | 'eyeOff' | 'lock' | 'mail'
  | 'trash' | 'pause' | 'play' | 'watch' | 'image' | 'flash' | 'send' | 'sparkle' | 'minus'
  | 'box' | 'list' | 'bed' | 'smile' | 'users' | 'logout' | 'download' | 'info' | 'pencil' | 'chart' | 'copy';

const PATHS: Record<IconName, ReactNode> = {
  arrow: (<><Path d="M5 12h14" /><Path d="m14 7 5 5-5 5" /></>),
  back: <Path d="m15 18-6-6 6-6" />,
  bell: (<><Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><Path d="M10 21h4" /></>),
  calendar: (<><Rect x="3" y="5" width="18" height="16" rx="3" /><Path d="M8 3v4M16 3v4M3 10h18" /></>),
  camera: (
    <>
      <Path d="M14.5 5 13 3h-2L9.5 5H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
      <Circle cx="12" cy="13" r="4" />
    </>
  ),
  care: (<><Path d="M20 12v8H4v-8" /><Path d="M2 12 12 3l10 9" /><Path d="M9 20v-6h6v6" /></>),
  chat: <Path d="M21 12a8 8 0 0 1-8 8H6l-4 2 1.5-5A9 9 0 1 1 21 12Z" />,
  check: <Path d="m5 12 4 4L19 6" />,
  chevron: <Path d="m9 18 6-6-6-6" />,
  clock: (<><Circle cx="12" cy="12" r="9" /><Path d="M12 7v6l4 2" /></>),
  close: <Path d="m7 7 10 10M17 7 7 17" />,
  heart: (
    <Path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
  ),
  home: (<><Path d="m3 11 9-8 9 8" /><Path d="M5 10v10h14V10M9 20v-6h6v6" /></>),
  location: (<><Path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><Circle cx="12" cy="10" r="2.5" /></>),
  meds: (<><Path d="m7.2 3.5 13.3 13.3a3 3 0 0 1-4.2 4.2L3 7.7a3 3 0 0 1 4.2-4.2Z" /><Path d="m8.5 13.2 4.7-4.7" /></>),
  menu: <Path d="M4 7h16M4 12h16M4 17h16" />,
  mic: (<><Rect x="9" y="3" width="6" height="12" rx="3" /><Path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>),
  phone: (
    <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z" />
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  search: (<><Circle cx="11" cy="11" r="7" /><Path d="m20 20-4-4" /></>),
  settings: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6v.2h-4V21a1.8 1.8 0 0 0-1.1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1L4 17.1l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.7-1H2.7v-4H3a1.8 1.8 0 0 0 1.6-1.1 1.8 1.8 0 0 0-.4-2L4 6.8 6.8 4l.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 2.8v-.1h4V3a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1L20 6.9l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1h.2v4H21a1.8 1.8 0 0 0-1.6 1Z" />
    </>
  ),
  shield: <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
  user: (<><Circle cx="12" cy="8" r="4" /><Path d="M4 21a8 8 0 0 1 16 0" /></>),
  sun: (<><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  moon: <Path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  contrast: (<><Circle cx="12" cy="12" r="9" /><Path d="M12 3v18a9 9 0 0 0 0-18Z" fill="currentColor" /></>),
  drop: <Path d="M12 2.7s-6.5 7.1-6.5 11.8a6.5 6.5 0 0 0 13 0C18.5 9.8 12 2.7 12 2.7Z" />,
  food: (<><Path d="M4 3v8a3 3 0 0 0 3 3v7M7 3v7M10 3v8a3 3 0 0 1-3 3" /><Path d="M17 21V3c-2.2 0-3.5 2.8-3.5 6.5S15 14 17 14" /></>),
  walk: (<><Circle cx="13" cy="4" r="2" /><Path d="m9 21 3-6 3 2v4M7 12l3-4 4 1 2 4 3 1M10 8l-1 5" /></>),
  eye: (<><Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><Circle cx="12" cy="12" r="3" /></>),
  eyeOff: (<><Path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.8 3.7M6.6 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><Path d="m3 3 18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>),
  lock: (<><Rect x="4" y="11" width="16" height="10" rx="2.5" /><Path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  copy: (<><Rect x="8" y="8" width="13" height="13" rx="2.5" /><Path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8" /></>),
  mail: (<><Rect x="3" y="5" width="18" height="14" rx="2.5" /><Path d="m3.5 7 8.5 6 8.5-6" /></>),
  trash: (<><Path d="M4 7h16M10 11v6M14 11v6" /><Path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>),
  pause: (<><Rect x="6" y="5" width="4" height="14" rx="1" /><Rect x="14" y="5" width="4" height="14" rx="1" /></>),
  play: <Path d="M7 4.5v15l12-7.5-12-7.5Z" />,
  watch: (<><Rect x="6" y="6" width="12" height="12" rx="3.5" /><Path d="M9 6l1-4h4l1 4M9 18l1 4h4l1-4M12 10v2.5l1.5 1" /></>),
  image: (<><Rect x="3" y="4" width="18" height="16" rx="3" /><Circle cx="9" cy="10" r="2" /><Path d="m21 16-5-5-9 9" /></>),
  flash: <Path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  send: (<><Path d="m22 2-11 11" /><Path d="M22 2 15 22l-4-9-9-4 20-7Z" /></>),
  sparkle: <Path d="M12 3c.8 4.6 2.4 6.2 7 7-4.6.8-6.2 2.4-7 7-.8-4.6-2.4-6.2-7-7 4.6-.8 6.2-2.4 7-7Z" />,
  minus: <Path d="M5 12h14" />,
  box: (<><Path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" /><Path d="m3 7.5 9 4.5 9-4.5M12 12v9" /></>),
  list: <Path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  bed: (<><Path d="M3 18V6M3 14h18v4M21 14v-2a4 4 0 0 0-4-4h-6v6" /><Circle cx="7" cy="10.5" r="2" /></>),
  smile: (<><Circle cx="12" cy="12" r="9" /><Path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01" /></>),
  users: (<><Circle cx="9" cy="8" r="3.5" /><Path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5.5 5.5 0 0 1 3.5 6" /></>),
  logout: (<><Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><Path d="M10 17l-5-5 5-5M5 12h11" /></>),
  download: (<><Path d="M12 3v12M7 10l5 5 5-5" /><Path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>),
  info: (<><Circle cx="12" cy="12" r="9" /><Path d="M12 11v5M12 7.5h.01" /></>),
  pencil: <Path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />,
  chart: <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  warning: (
    <><Path d="M10.3 3.5 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.5a2 2 0 0 0-3.4 0Z" /><Path d="M12 9v4M12 17h.01" /></>
  ),
};

/** Oculto a lectores de pantalla (decorativo). En web se usa aria-hidden para no pasar props nativas al DOM. */
const HIDDEN = Platform.OS === 'web' ? { 'aria-hidden': true } : { accessible: false, importantForAccessibility: 'no-hide-descendants' as const };

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Icono decorativo: el texto o la etiqueta del control que lo contiene da el significado. */
export function Icon({ name, size = 22, color, strokeWidth = 1.8 }: IconProps) {
  const t = useTheme();
  const stroke = color ?? t.c.text;
  // El View posicionado garantiza que el icono quede sobre fondos absolutos (degradados) también en web.
  return (
    <View pointerEvents="none" style={{ width: size, height: size, flexShrink: 0 }} {...HIDDEN}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        color={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS[name]}
      </Svg>
    </View>
  );
}
