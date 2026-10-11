import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTextScale } from '@/features/profile/hooks';
import { ink, type, type TypeVariant } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: string;
  align?: TextStyle['textAlign'];
}

const HEADERS: TypeVariant[] = ['display', 'h1', 'h2'];

/**
 * Texto de BUDDY: aplica la escala tipográfica, respeta el tamaño de texto del sistema
 * (allowFontScaling) y multiplica por el tamaño elegido en Perfil > Accesibilidad.
 */
export function AppText({ variant = 'body', color = ink.text, align, style, accessibilityRole, ...rest }: AppTextProps) {
  const scale = useTextScale();
  const base = type[variant];
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={2}
      accessibilityRole={accessibilityRole ?? (HEADERS.includes(variant) ? 'header' : undefined)}
      style={[
        base,
        { color, textAlign: align, fontSize: base.fontSize * scale, lineHeight: base.lineHeight * scale },
        style,
      ]}
      {...rest}
    />
  );
}
