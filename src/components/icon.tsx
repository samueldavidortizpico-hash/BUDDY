/** Los 24 iconos del prototipo de Figma (trazo 1.8, redondeado), portados a react-native-svg. */
import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { ink } from '@/theme';

export type IconName =
  | 'arrow' | 'back' | 'bell' | 'calendar' | 'camera' | 'care' | 'chat' | 'check'
  | 'chevron' | 'clock' | 'close' | 'heart' | 'home' | 'location' | 'meds' | 'menu'
  | 'mic' | 'phone' | 'plus' | 'search' | 'settings' | 'shield' | 'user' | 'warning';

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
  warning: (
    <><Path d="M10.3 3.5 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.5a2 2 0 0 0-3.4 0Z" /><Path d="M12 9v4M12 17h.01" /></>
  ),
};

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Icono decorativo: el texto o la etiqueta del control que lo contiene da el significado. */
export function Icon({ name, size = 22, color = ink.text, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      {PATHS[name]}
    </Svg>
  );
}
