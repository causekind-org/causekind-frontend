import type { Transition, Variants } from "framer-motion";

/**
 * Motion vocabulary for the wizard.
 *
 * <p>Everything here is transform/opacity only, so a step change never triggers
 * layout. Directional travel is passed as `custom` to AnimatePresence rather
 * than baked into two sets of variants.
 *
 * <p>Reduced motion is handled by swapping the whole variant set, not by
 * shortening durations: a user who asks for no motion should get none, not a
 * faster slide. Callers pass `useReducedMotion()` straight through.
 */

export const EASE = [0.22, 1, 0.36, 1] as const;
export const STEP_MS = 240;

export const stepTransition: Transition = { duration: STEP_MS / 1000, ease: EASE };
export const instantTransition: Transition = { duration: 0 };

/** `direction` is +1 forward, -1 back. RTL is handled by the caller flipping it. */
export function stepVariants(reduced: boolean): Variants {
  if (reduced) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1, transition: { duration: 0.12 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    enter: (direction: number) => ({ x: direction >= 0 ? 18 : -18, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: stepTransition },
    exit: (direction: number) => ({ x: direction >= 0 ? -18 : 18, opacity: 0, transition: stepTransition }),
  };
}

/**
 * The step card itself. Travels like the step content but also lifts slightly,
 * so the card reads as a distinct object being swapped rather than text sliding.
 * Kept to scale/opacity/x — no shadow or filter animation, which would repaint.
 */
export function cardVariants(reduced: boolean): Variants {
  if (reduced) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1, transition: { duration: 0.12 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    enter: (direction: number) => ({ x: direction >= 0 ? 22 : -22, opacity: 0, scale: 0.985 }),
    center: { x: 0, opacity: 1, scale: 1, transition: stepTransition },
    exit: (direction: number) => ({ x: direction >= 0 ? -22 : 22, opacity: 0, scale: 0.985, transition: stepTransition }),
  };
}

/**
 * Completed-step pile behind the active card.
 *
 * <p>Ghosts are siblings of the real card, never ancestors. That distinction is
 * the whole reason this works: ScrollStack scales the card *containing* the
 * form, and a transformed ancestor breaks `position: sticky` inside it and
 * shrinks every touch target. Here the transform only ever lands on empty
 * decorative surfaces.
 */
export const STACK_OFFSET_PX = 10;
export const STACK_SCALE_STEP = 0.03;
export const STACK_OPACITY_STEP = 0.2;
/** Past three, another 10px peek is noise rather than information. */
export const MAX_GHOSTS = 3;

/** `depth` is 1 for the card immediately behind the active one. */
export function ghostVariants(reduced: boolean): Variants {
  return {
    // Entering from flat-and-invisible reads as the step you just left dropping
    // onto the pile.
    hidden: { y: 0, scale: 1, opacity: 0 },
    resting: (depth: number) => ({
      y: -depth * STACK_OFFSET_PX,
      scale: 1 - depth * STACK_SCALE_STEP,
      opacity: Math.max(0.15, 0.95 - depth * STACK_OPACITY_STEP),
      transition: reduced ? instantTransition : stepTransition,
    }),
  };
}

/** Conditional field reveal — opacity plus height so siblings settle smoothly. */
export function revealVariants(reduced: boolean): Variants {
  if (reduced) {
    return { hidden: { opacity: 0, height: 0 }, shown: { opacity: 1, height: "auto" } };
  }
  return {
    hidden: { opacity: 0, height: 0 },
    shown: { opacity: 1, height: "auto", transition: { duration: 0.2, ease: EASE } },
  };
}

/** Inline error: short fade + a few px of travel. */
export function errorVariants(reduced: boolean): Variants {
  if (reduced) {
    return { hidden: { opacity: 0 }, shown: { opacity: 1 } };
  }
  return {
    hidden: { opacity: 0, y: -3 },
    shown: { opacity: 1, y: 0, transition: { duration: 0.16, ease: EASE } },
  };
}

/** One-time pop when a progress node becomes complete. */
export function completedNodeAnimation(reduced: boolean) {
  return reduced
    ? { scale: 1 }
    : { scale: [0.82, 1.08, 1], transition: { duration: 0.32, ease: EASE, times: [0, 0.6, 1] } };
}

/** Press feedback. Applied via whileTap so it costs nothing until pressed. */
export function pressProps(reduced: boolean) {
  return reduced ? {} : { whileTap: { scale: 0.98 } };
}

/**
 * One-shot highlight on a field the AI filled. Ends on `transparent` so it
 * leaves no lingering background to fight the theme.
 */
export function aiHighlightAnimation(reduced: boolean) {
  if (reduced) return {};
  return {
    animate: {
      backgroundColor: [
        "rgba(var(--ck-role-accent-rgb, 176 74 21) / 0.14)",
        "rgba(0,0,0,0)",
      ],
    },
    transition: { duration: 0.7, ease: "easeOut" as const },
  };
}

/**
 * Scroll a step's own container, not `window` — the wizard has its own scroll
 * region on desktop and blindly scrolling the page moved the wrong thing.
 */
export function scrollIntoWizardView(el: HTMLElement | null, reduced: boolean) {
  if (!el) return;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
}
