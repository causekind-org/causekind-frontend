"use client";

import { motion, useReducedMotion } from "framer-motion";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
}

const offsets: Record<string, { x?: number; y?: number }> = {
  up:    { y: 28 },
  down:  { y: -28 },
  left:  { x: 28 },
  right: { x: -28 },
  none:  {},
};

export function Reveal({ children, delay = 0, className = "", direction = "up" }: RevealProps) {
  /*
   * Reduced motion gets the destination, not the journey.
   *
   * <p>This is the single most-used motion primitive on the site — 28 files,
   * and most of the landing page's sections reveal through it — so honouring
   * the preference here is what makes the whole page calm rather than each
   * section having to remember. Without it, asking for reduced motion still
   * produced a spring-driven translate on essentially every block of content
   * on the homepage.
   *
   * <p>Not a shorter animation: the content renders in its final state, with
   * no offset and no transition, which is what the preference actually asks
   * for. `whileInView` is dropped entirely rather than given a zero duration —
   * a zero-duration variant still defers the paint until the element is
   * observed intersecting, so anything already on screen would flash.
   */
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offsets[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 20,
        mass: 0.85,
        delay: delay / 1000,
      }}
    >
      {children}
    </motion.div>
  );
}
