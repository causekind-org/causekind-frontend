"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MAX_GHOSTS, STACK_OFFSET_PX, ghostVariants } from "@/features/wizard-kit/wizardMotion";

/**
 * Renders the active step card on top of a pile of completed ones.
 *
 * <p>The pile is decorative: each "ghost" is an empty surface, not a copy of the
 * step it stands for. Duplicating real content would double it for screen
 * readers and give two sources of truth to keep in sync, for a strip of card
 * edge that is 10px tall.
 *
 * <p>Ghosts are siblings of `children`, never wrappers. Wrapping the form in a
 * scaled element — which is what ScrollStack does — would break the wizard's
 * three sticky elements and shrink every input below the 44px touch target.
 */
export function StepCardStack({ depth, children }: { depth: number; children: React.ReactNode }) {
  const reduced = !!useReducedMotion();
  const ghosts = Math.min(Math.max(depth, 0), MAX_GHOSTS);

  return (
    // Outer box reserves the room the pile occupies above the card, so it can
    // never ride up under the sticky progress header.
    <div style={{ paddingTop: ghosts * STACK_OFFSET_PX }}>
      {/*
        Inner positioning context wraps ONLY the card. This nesting is the fix
        for a doubled offset: when the ghosts were absolutely positioned against
        the padded box, `top: 0` resolved to the top of the PADDING box — already
        `ghosts × 10px` above the card — and then translateY(-depth × 10) moved
        them up again. The furthest ghost ended up twice as high as intended and
        slid under the sticky header, so only the nearest two were ever visible.

        Anchored here, `inset-0` matches the card's box exactly, and each ghost's
        translateY IS its real offset.
      */}
      <div className="relative">
        <AnimatePresence initial={false}>
          {Array.from({ length: ghosts }, (_, i) => {
            // i = 0 is the furthest back, so the nearest ghost is depth 1 and
            // leaves first when the donor goes Back.
            const depthFromTop = ghosts - i;
            return (
              <motion.div
                key={`ghost-${depthFromTop}`}
                custom={depthFromTop}
                variants={ghostVariants(reduced)}
                initial={reduced ? "resting" : "hidden"}
                animate="resting"
                exit="hidden"
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)] dark:border-zinc-800 dark:bg-zinc-900"
                style={{ transformOrigin: "top center", zIndex: i }}
              />
            );
          })}
        </AnimatePresence>

        {/* Above every ghost, and the only thing in normal flow — so it alone
            determines the height the ghosts inherit. */}
        <div className="relative" style={{ zIndex: MAX_GHOSTS + 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
