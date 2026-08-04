"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * A shared vertical rule with a light beam travelling down it.
 *
 * <p>This replaces the two `BorderBeam` card outlines in the Vision & Mission
 * block. The distinction is the point: `BorderBeam` traces the border of ONE
 * card, so two of them read as two separate objects each doing its own thing.
 * A single beam running down the rule BETWEEN the columns reads as one system
 * with a current flowing through it — which is what "vision and mission" should
 * look like next to each other.
 *
 * <p>Lives in its own client component because `about/page.tsx` is an async
 * server component: it awaits `getTranslations`, so it cannot host motion hooks.
 * Keeping only the animation on the client leaves the copy server-rendered.
 */
export function BeamDivider() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 overflow-hidden bg-white/10"
    >
      {!reduceMotion && (
        <motion.span
          className="absolute inset-x-0 h-24"
          // Terracotta into blue: the same two accents the columns themselves
          // use, so the beam visibly hands over from one side to the other.
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, #f0b97a 35%, #7fb2f0 65%, transparent 100%)",
          }}
          initial={{ top: "-30%" }}
          animate={{ top: ["-30%", "100%"] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.9 }}
        />
      )}
    </div>
  );
}
