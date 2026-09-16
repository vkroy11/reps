import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Pulls a published JS bundle on launch, so a bug fix does not need a store
 * build. The native binary still has to contain `expo-updates` — this only
 * swaps the JavaScript after that first build.
 *
 * Failures are swallowed: a learner whose update check fails should still get
 * the embedded bundle rather than a stuck splash.
 */
export function useExpoUpdates() {
  useEffect(() => {
    if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) return;

    let cancelled = false;

    void (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable || cancelled) return;

        await Updates.fetchUpdateAsync();
        if (cancelled) return;

        await Updates.reloadAsync();
      } catch {
        // Stay on whatever bundle launched.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
