"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";

type Props = {
  /** Canonical category name — must have a CATEGORY_VISUALS entry. */
  category: string;
  className?: string;
  /** Tailwind size classes for the icon itself. */
  iconClassName?: string;
};

/**
 * The category icon, with motion.
 *
 * Three behaviours, chosen by capability rather than by breakpoint:
 *
 * - **Fine pointer** (mouse/trackpad): animates on hover *and* on focus, so the
 *   keyboard path is not a second-class one.
 * - **Coarse pointer** (touch): there is no hover, so a hover-only icon is a
 *   static icon on every phone. Instead it loops gently — but only while in the
 *   viewport, via `useInView`, so nine offscreen icons cost nothing.
 * - **Reduced motion**: a plain icon. No motion element at all, not a motion
 *   element with zeroed values.
 *
 * The pointer check runs in an effect, never during render — `matchMedia` does
 * not exist on the server and reading it during render would desync hydration.
 */
export default function AnimatedCategoryIcon({ category, className = "", iconClassName = "w-5 h-5" }: Props) {
  const visual = CATEGORY_VISUALS[category];
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const reduceMotion = useReducedMotion();
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setCoarse(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // A missing visual is a registry bug, not a render-time crash. inKindCategories
  // asserts against exactly this at import, so it should be unreachable.
  if (!visual) return null;
  const { Icon } = visual;

  if (reduceMotion) {
    return (
      <span ref={ref} className={className} aria-hidden="true">
        <Icon className={iconClassName} />
      </span>
    );
  }

  // Touch devices get the ambient loop; pointer devices react to the parent.
  // Never both — a looping icon that also reacts to hover reads as broken.
  const loop = coarse && inView;

  // On a fine pointer the icon itself is never hovered or focused — the
  // surrounding link is. So it defines variants and stays silent, letting the
  // parent motion element propagate the `active` label down (see
  // ICON_MOTION_PARENT_PROPS). Setting `animate` here would break that
  // propagation, so it is only set for the touch loop, where there is no parent
  // gesture to inherit.
  return (
    <motion.span
      ref={ref}
      className={`inline-flex ${className}`}
      aria-hidden="true"
      variants={{
        rest: { scale: 1, rotate: 0 },
        active: { scale: 1.18, rotate: -6 },
      }}
      animate={loop ? { scale: [1, 1.1, 1], rotate: [0, -5, 0] } : undefined}
      transition={
        loop
          ? { duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }
          : { type: "spring", stiffness: 420, damping: 18 }
      }
    >
      <Icon className={iconClassName} />
    </motion.span>
  );
}

/**
 * Spread onto the motion element wrapping an `AnimatedCategoryIcon` — usually
 * the link or button that actually receives hover and keyboard focus. This is
 * what makes the icon animate on Tab as well as on mouse-over.
 */
export const ICON_MOTION_PARENT_PROPS = {
  initial: "rest",
  animate: "rest",
  whileHover: "active",
  whileFocus: "active",
} as const;
