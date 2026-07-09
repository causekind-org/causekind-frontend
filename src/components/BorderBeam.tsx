"use client";

import { motion, type Transition } from "framer-motion";

/**
 * BorderBeam — a beam of light that travels continuously along the border
 * of its (relatively-positioned, overflow-hidden) parent, via CSS
 * `offset-path` animated by framer-motion. The gradient div is masked so
 * it only paints on the 1px border ring, not the card interior.
 */
export function BorderBeam({
  size = 180,
  duration = 8,
  delay = 0,
  colorFrom = "#f0b97a",
  colorTo = "#b04a15",
  reverse = false,
  className = "",
}: {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  reverse?: boolean;
  className?: string;
}) {
  const transition: Transition = {
    repeat: Infinity,
    ease: "linear",
    duration,
    delay: -delay,
  };

  return (
    <div
      className={`pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] ${className}`}
    >
      <motion.div
        className="absolute aspect-square"
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
        }}
        animate={{ offsetDistance: reverse ? ["100%", "0%"] : ["0%", "100%"] }}
        transition={transition}
      />
    </div>
  );
}
