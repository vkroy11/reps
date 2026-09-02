import { useWindowDimensions } from 'react-native';
import { breakpoint } from '../tokens';

export interface Breakpoint {
  width: number;
  /** From 960px up: path rail on the left, technique on the right. */
  isWide: boolean;
}

/**
 * The single place that decides phone layout versus wide layout. Adaptive
 * primitives read this instead of checking Platform.OS, so the same component
 * gets the right pattern on a tablet and on a browser window.
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();

  return { width, isWide: width >= breakpoint.wide };
}
