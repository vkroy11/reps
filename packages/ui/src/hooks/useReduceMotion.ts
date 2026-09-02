import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Honouring Reduce Motion is an accessibility requirement, not a nicety.
 * Components collapse springs to an instant opacity swap when this is true,
 * which is also the cheapest way to make animation-heavy screens testable.
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
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
