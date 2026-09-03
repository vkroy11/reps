import { color } from './tokens';

/**
 * A full-bleed colour panel for one questionnaire step.
 *
 * `onDark` is carried explicitly rather than derived from the background hex.
 * Guessing contrast from a colour at runtime is how a CTA ends up white-on-white
 * the first time someone adds a panel, and the answer is already known here.
 */
export interface Panel {
  /** The whole screen behind the step. */
  bg: string;
  /** Headings and answers. */
  ink: string;
  /** Supporting copy, and the ring's numeral when it sits on ink2. */
  ink2: string;
  /** Back button and inert tracks - a hole punched in the panel. */
  ghost: string;
  /** Cards and tiles sitting on the panel. */
  tile: string;
  onDark: boolean;
}

export type PanelKey = 'skill' | 'goal' | 'level' | 'time' | 'formats';

/**
 * Each step owns a colour, so moving through the questionnaire feels like
 * moving rather than re-rendering. Every value is an existing token: the
 * sequence is brand → page → progressSoft → brandSoft → page, which puts the
 * two saturated panels at the start and the two-thirds mark.
 */
export const panels: Record<PanelKey, Panel> = {
  skill: {
    bg: color.brand,
    ink: color.textOnBrand,
    ink2: 'rgba(255,255,255,0.76)',
    ghost: 'rgba(255,255,255,0.16)',
    tile: 'rgba(255,255,255,0.14)',
    onDark: true,
  },
  goal: {
    bg: color.surfacePage,
    ink: color.textPrimary,
    ink2: color.textSecondary,
    ghost: color.surfaceSunken,
    tile: color.surfaceCard,
    onDark: false,
  },
  level: {
    bg: color.progressSoft,
    ink: color.textPrimary,
    ink2: color.progressText,
    ghost: 'rgba(255,255,255,0.6)',
    tile: color.surfaceCard,
    onDark: false,
  },
  time: {
    bg: color.brandSoft,
    ink: color.textPrimary,
    ink2: color.brandPressed,
    ghost: 'rgba(255,255,255,0.6)',
    tile: color.surfaceCard,
    onDark: false,
  },
  formats: {
    bg: color.surfacePage,
    ink: color.textPrimary,
    ink2: color.textSecondary,
    ghost: color.surfaceSunken,
    tile: color.surfaceCard,
    onDark: false,
  },
};

/** The accent that reads on a given panel: the panel's own ink when dark. */
export function accentOn(panel: Panel): string {
  return panel.onDark ? color.textOnBrand : color.brand;
}

/**
 * The text colour for something filled with `accentOn(panel)`.
 *
 * Not `panel.bg`, which is the tempting shortcut. On the `time` panel that
 * would put brandSoft on brand and measure 4.32 - under the 4.5 floor, since a
 * 15px bold label is below WCAG's large-text threshold of 18.66px. Both
 * branches here measure 5.17.
 */
export function inkOn(panel: Panel): string {
  return panel.onDark ? color.brand : color.textOnBrand;
}

/** The inert track behind a ring or bar on a given panel. */
export function trackOn(panel: Panel): string {
  return panel.onDark ? 'rgba(255,255,255,0.28)' : color.surfaceLocked;
}
