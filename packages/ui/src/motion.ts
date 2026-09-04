import { Easing } from 'react-native-reanimated';
import { easing } from './tokens';

/**
 * `easing` in tokens.ts holds bare control points; this builds them once here
 * so the compound sequences below share one curve object instead of each
 * calling Easing.bezier at its own use site.
 */
function bezier(points: readonly [number, number, number, number]) {
  return Easing.bezier(points[0], points[1], points[2], points[3]);
}

export const standardEasing = bezier(easing.standard);
export const exitEasing = bezier(easing.exit);

/**
 * The compound sequences, kept beside the primitives they are built from so
 * there is still one source per value.
 */
export const motion = {
  /** The trail travelling to a newly reached disc. Long enough to read as travel. */
  trailFill: { duration: 1000, easing: standardEasing },
  /** A mastery ring topping up on the active disc. */
  masteryRing: { duration: 800, easing: standardEasing },
  /** One period of the gate's glow once its techniques are done. */
  gateGlowPeriod: 2600,
  /** How far a newly unlocked disc rises into place. */
  unlockRise: 26,
  unlockScaleFrom: 0.7,
  /** Cross-fade of the full-bleed panel between questionnaire steps. */
  panelFade: { duration: 450, easing: standardEasing },
  /** How long a single-select answer stays visible before advancing itself. */
  autoAdvance: 340,
  /** A progress ring topping up. */
  ring: { duration: 500, easing: standardEasing },
  /** Answer cards arriving, staggered by this much each. */
  cardStagger: 80,
  cardEntrance: { duration: 340, easing: standardEasing },
  /** Pip floating in place. Long and shallow, so it never pulls the eye. */
  floatPeriod: 4000,
  floatDistance: 5,
} as const;

/** Reduce Motion collapses any of the above to an instant state swap. */
export const instant = { duration: 0 } as const;
