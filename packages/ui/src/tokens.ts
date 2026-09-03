/**
 * Design tokens. Every value in the app comes from here.
 *
 * Colours are named for their role, not their hue, which is what makes a dark
 * theme a swap rather than a rewrite. Ratios below were measured against
 * WCAG 2.1 relative luminance - see REPS_UI_PLAN.md §3.2.
 */

export const color = {
  /** CTA fill, current path node, links. White on this is 5.17. */
  brand: '#2563EB',
  /** CTA lower edge and pressed fill. White on this is 6.70. */
  brandPressed: '#1D4ED8',
  /** Selected chip fill, focus ring. */
  brandSoft: '#DBEAFE',

  /**
   * Done nodes, ring fill, streak bar. Fills and strokes only - as text on
   * white it measures 1.98 and fails badly. Use progressText instead.
   */
  progress: '#84CC16',
  progressSoft: '#ECFCCB',
  /** The readable lime for text: 4.99 on white. */
  progressText: '#4D7C0F',

  /** Flame icon and streak ring. Fill only; 2.15 as text on white. */
  streak: '#F59E0B',
  /** The readable amber for text: 5.02 on white. */
  streakText: '#B45309',

  /**
   * Destructive fill. Deliberately not #EF4444, which is 3.76 under white
   * text and fails AA. This is 4.83.
   */
  danger: '#DC2626',
  dangerPressed: '#991B1B',

  /** Headings and body. 17.06 on the page background. */
  textPrimary: '#0F172A',
  /** Supporting copy. 4.55 on the page background - the floor for text. */
  textSecondary: '#64748B',
  textOnBrand: '#FFFFFF',
  /** Non-semantic icons only. 2.45 on the page, so never text. */
  iconDecorative: '#94A3B8',

  surfacePage: '#F8FAFC',
  surfaceCard: '#FFFFFF',
  /** A card recessed into the page: filter rows, inert panels, ghost buttons. */
  surfaceSunken: '#F1F5F9',
  surfaceLocked: '#E2E8F0',

  borderDefault: '#E2E8F0',
  borderStrong: '#CBD5E1',
} as const;

export type ColorToken = keyof typeof color;

export const space = { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { chip: 8, input: 12, card: 16, cta: 20, sheet: 28, full: 999 } as const;

/** Minimum 44 per Apple's HIG; the primary CTA gets 56. */
export const hit = { min: 44, comfortable: 48, cta: 56 } as const;

export const font = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  extrabold: 'Nunito_800ExtraBold',
} as const;

export const typeScale = {
  display: { fontSize: 32, lineHeight: 38, fontFamily: font.extrabold, letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontFamily: font.extrabold, letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 24, fontFamily: font.semibold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: font.regular },
  label: { fontSize: 15, lineHeight: 20, fontFamily: font.extrabold },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: font.semibold },
  overline: { fontSize: 11, lineHeight: 14, fontFamily: font.extrabold, letterSpacing: 1 },
} as const;

export type TypeVariant = keyof typeof typeScale;

/** Springs for anything a finger touches; timed curves for anything the system starts. */
export const duration = {
  instant: 90,
  fast: 160,
  base: 240,
  slow: 380,
  celebrate: 700,
} as const;

/** Bezier control points; callers build the Easing at the use site. */
export const easing = {
  standard: [0.2, 0, 0, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
};

export const springConfig = {
  /** No overshoot. Presses should feel immediate, not bouncy. */
  press: { damping: 20, stiffness: 300, mass: 0.6 },
  /** Deliberate overshoot. Used in exactly one place, so it means something. */
  pop: { damping: 12, stiffness: 180, mass: 0.9 },
} as const;

/** Two panes from here up. */
export const breakpoint = { wide: 960 } as const;
