import { StyleSheet, View } from 'react-native';

import { radius, touch, type Domain } from '@/theme';
import { useTheme } from '@/theme/provider';

import { Icon, type IconName } from './icon';

/** Mosaico de icono (V4): cuadro redondeado con el color vivo del dominio. Decorativo: el texto al lado lo nombra. */
export function IconTile({ icon, domain, size = touch.tile }: { icon: IconName; domain: Domain | 'petrol' | 'slate'; size?: number }) {
  const t = useTheme();
  const tile = t.tiles[domain];
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size >= 56 ? radius.icon : radius.tile, backgroundColor: tile.bg }, t.hc && t.hairline]}>
      <Icon name={icon} color={tile.fg} size={Math.round(size * 0.5)} strokeWidth={2.2} />
    </View>
  );
}

const styles = StyleSheet.create({ tile: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 } });
