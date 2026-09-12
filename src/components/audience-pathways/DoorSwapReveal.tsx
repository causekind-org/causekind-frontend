"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Re-plays a short staggered entrance for the page below the door switcher
 * every time the door changes.
 *
 * <p><b>Why `key` and not `AnimatePresence`.</b> The two doors do not render the
 * same sections — the donor side is live needs, campaigns and unclaimed, the
 * donee side is one panel — so there is no shared element to cross-fade. Keying
 * on the door simply remounts the slot, which is both the simplest correct
 * thing and what makes the entrance run again on every switch.
 *
 * <p><b>It has to keep the column's rhythm.</b> Its children are direct flex
 * items of `HomeClient`'s mobile column, spaced by that column's `gap-11`.
 * Wrapping them collapses them into one flex item, so this wrapper carries the
 * same `flex flex-col gap-11` — without it every section below the switcher
 * loses its 44px join and they all butt together.
 *
 * <p>Under `prefers-reduced-motion` it renders its children and nothing else.
 */
export function DoorSwapReveal({
  door,
  children,
}: {
  /** Changing this is what re-plays the entrance. */
  door: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className="flex flex-col gap-11">{children}</div>;
  }

  return (
    <motion.div
      key={door}
      className="flex flex-col gap-11"
      initial="hidden"
      animate="shown"
      variants={{
        hidden: {},
        // Children only — a parent opacity here would fade the whole column as
        // one block and lose the stagger it exists for.
        shown: { transition: { staggerChildren: 0.075, delayChildren: 0.04 } },
      }}
    >
      {/*
        Falsy children are dropped, not wrapped. Every section in this slot is
        conditional (`FEATURES.money && …`, `rakshaBandhan && …`), so React hands
        this `false` for the ones that are off. Wrapping those in a motion.div
        would leave empty flex items in the column, each still eating a 44px gap.
      */}
      {Array.isArray(children)
        ? children.filter(Boolean).map((child, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 14 },
                shown: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.22, 0.61, 0.36, 1] } },
              }}
            >
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}

export default DoorSwapReveal;
