import Home from 'lucide-react-native/dist/esm/icons/house';
import Notebook from 'lucide-react-native/dist/esm/icons/notebook-pen';
import Route from 'lucide-react-native/dist/esm/icons/route';
import User from 'lucide-react-native/dist/esm/icons/user-round';

/**
 * Deep-imported per glyph: the Lucide barrel bundles all ~1794 icons because
 * Metro does not tree-shake, which measured 1.9 MB for three icons.
 */
export const TabIcon = { Home, Route, Notebook, User };
