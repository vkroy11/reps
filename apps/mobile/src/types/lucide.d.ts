/**
 * Types for Lucide's per-icon deep imports.
 *
 * Lucide ships ~1794 icons and Metro does not tree-shake, so importing from
 * the package barrel pulled 1.9 MB into the bundle for three glyphs (measured:
 * 4.7 MB -> 2.8 MB). The deep paths ship no declarations, hence this shim.
 */
declare module 'lucide-react-native/dist/esm/icons/*' {
  import type { ComponentType } from 'react';
  import type { SvgProps } from 'react-native-svg';

  const Icon: ComponentType<SvgProps & { size?: number; strokeWidth?: number; color?: string }>;

  export default Icon;
}
