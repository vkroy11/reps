/**
 * Motion described as plain data.
 *
 * Deliberately free of any `react-native-reanimated` import, unlike motion.ts,
 * which needs `Easing`. That import drags in react-native-worklets, which does
 * not resolve under the package's Node test runner - so a curve defined there
 * cannot be unit tested, and these curves are exactly the ones worth testing.
 */

/**
 * The active path node's halo, as keyframes on a 0-1 clock.
 *
 * Both ends sit at opacity 0, which is the whole point: the driver runs 0 to 1
 * and wraps instantly back to 0, so the only way that wrap can be invisible is
 * for the halo to be transparent either side of it. Scale snaps 1.42 back to 1
 * at the same instant, unseen.
 *
 * The first version instead held the driver at 0 for the last 30% of each
 * cycle to create a rest gap - but 0 is the *opaque* end of the curve, so the
 * ring parked fully visible and hugging the node for half a second before
 * every sweep. It read as the animation freezing, because it was.
 */
export const haloPulse = {
  periodMs: 1600,
  clock: [0, 0.12, 0.4, 0.75, 1],
  opacity: [0, 0.45, 0.22, 0, 0],
  scale: [1, 1.1, 1.3, 1.42, 1.42],
} as const;
