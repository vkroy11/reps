import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Honouring Reduce Motion is an accessibility requirement, not a nicety.
 * Components collapse springs to an instant state swap when this is true,
 * which is also the cheapest way to make animation-heavy screens testable.
 *
 * Works on all three platforms: react-native-web implements
 * `isReduceMotionEnabled` against the `prefers-reduced-motion` media query and
 * emits `reduceMotionChanged` when it flips, so the browser honours the OS
 * setting without any extra wiring here.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {
        // Not available on every platform; defaulting to false is correct.
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      active = false;
      /*
        Optional-called on purpose. react-native-web's implementation returns
        `undefined` instead of a subscription when `window.matchMedia` is
        absent, which its own types do not admit - so an unguarded
        `.remove()` throws during teardown in any environment without it.
      */
      subscription?.remove();
    };
  }, []);

  return reduceMotion;
}
