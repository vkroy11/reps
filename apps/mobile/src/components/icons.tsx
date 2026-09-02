import { color } from '@reps/ui';
import ChevronLeft from 'lucide-react-native/dist/esm/icons/chevron-left';
import RotateCcw from 'lucide-react-native/dist/esm/icons/rotate-ccw';
import WifiOff from 'lucide-react-native/dist/esm/icons/wifi-off';

/**
 * Icons are deep-imported one glyph at a time. Lucide ships ~1794 icons and
 * Metro does not tree-shake, so a barrel import costs 1.9 MB for three
 * glyphs - measured, not assumed.
 *
 * Lucide is ISC AND MIT: about 117 icons derive from Feather and carry
 * `Copyright (c) 2013-present Cole Bemis`. Both notices belong in the
 * acknowledgements before submission.
 */
export function BackIcon({ size = 26 }: { size?: number }) {
  return <ChevronLeft size={size} color={color.textSecondary} strokeWidth={2.4} />;
}

export function RetryIcon({ size = 20 }: { size?: number }) {
  return <RotateCcw size={size} color={color.brand} strokeWidth={2.2} />;
}

export function OfflineIcon({ size = 20 }: { size?: number }) {
  return <WifiOff size={size} color={color.streakText} strokeWidth={2.2} />;
}
