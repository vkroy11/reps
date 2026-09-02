import Home from 'lucide-react-native/icons/house';
import Notebook from 'lucide-react-native/icons/notebook-pen';
import Route from 'lucide-react-native/icons/route';
import User from 'lucide-react-native/icons/user-round';

/**
 * One glyph per import via Lucide's supported `icons/*` subpath: the barrel
 * bundles all ~1794 icons because Metro does not tree-shake, which measured
 * 1.9 MB for three icons.
 */
export const TabIcon = { Home, Route, Notebook, User };
