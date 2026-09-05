import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Size the web document to the visible viewport. A no-op on native.
 *
 * Android Chrome's `100dvh` is taller than the screen, so a bottom tab bar
 * is laid out under the system gesture area.
 */
export function useWebViewport(): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const apply = () => {
      const px = `${window.visualViewport?.height ?? window.innerHeight}px`;
      document.documentElement.style.setProperty('--app-height', px);
      document.documentElement.style.height = px;
      document.body.style.height = px;
      const root = document.getElementById('root');
      if (root) root.style.height = px;
    };

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);

    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
    };
  }, []);
}
