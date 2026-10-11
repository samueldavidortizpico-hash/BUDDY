import { Text, type TextProps, type TextStyle } from 'react-native';

import { maxFontScale, type, type TypeVariant } from '@/theme';
import { useTextScaleFactor, useTheme } from '@/theme/provider';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: string;
  align?: TextStyle['textAlign'];
}

const HEADERS: TypeVariant[] = ['display', 'h1', 'h2'];

/**
 * Texto de BUDDY: escala tipográfica + tamaño elegido en Ajustes > Apariencia + escala del sistema.
 * La suma nunca pasa de ×2 (texto al 200 %); los números héroe tienen tope propio para no romper su tarjeta.
 */
export function AppText({ variant = 'body', color, align, style, accessibilityRole, ...rest }: AppTextProps) {
  const t = useTheme();
  const scale = useTextScaleFactor();
  const base = type[variant];
  const cap = maxFontScale[variant] ?? 2;
  const appScale = Math.min(scale, cap);
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={Math.max(1, cap / appScale)}
      accessibilityRole={accessibilityRole ?? (HEADERS.includes(variant) ? 'header' : undefined)}
      style={[
        base,
        { color: color ?? t.c.text, textAlign: align, fontSize: base.fontSize * appScale, lineHeight: base.lineHeight * appScale },
        style,
      ]}
      {...rest}
    />
  );
}
