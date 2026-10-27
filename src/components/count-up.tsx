import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { motion } from '@/theme';

import { AppText, type AppTextProps } from './app-text';

/**
 * Número que cuenta hasta su valor en 600 ms con curva de salida (V4.3). Cifras tabulares para que no baile el ancho.
 * Con "reducir movimiento" muestra el valor final. `format` da el texto (por ejemplo "$7.000").
 */
export function CountUp({ value, format = (n) => String(n), style, ...text }: { value: number; format?: (n: number) => string } & Omit<AppTextProps, 'children'>) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = from.current;
    const t0 = Date.now();
    let frame = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / motion.countUp);
      const eased = 1 - (1 - p) ** 3;
      setShown(Math.round(start + (value - start) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);
  return (
    <AppText {...text} style={[{ fontVariant: ['tabular-nums'] }, style]} accessibilityLabel={format(value)}>
      {format(shown)}
    </AppText>
  );
}
