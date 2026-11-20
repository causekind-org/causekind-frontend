"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
  /**
   * Kept for callers that marked first-screen text. Every Reveal now renders
   * visible in the server HTML; `eager` additionally never hides, even when
   * the element is below the fold.
   */
  eager?: boolean;
}

const offsets: Record<string, { x?: number; y?: number }> = {
  up:    { y: 28 },
  down:  { y: -28 },
  left:  { x: 28 },
  right: { x: -28 },
  none:  {},
};

/** How far below the first screen an element must start to be animated in. */
const BELOW_FOLD_MARGIN = 100;

/**
 * Text is visible by default: the server HTML and the first client render
 * carry no hidden state, so the content never waits for JavaScript.
 *
 * After hydration, only an element that starts clearly below the fold
 * (top > viewport height + 100px) is hidden — instantly, while off screen —
 * and then animates in when scrolled into view. Anything on or near the
 * first screen stays as it is, with no animation reset. Reduced motion:
 * never hidden.
 */
export function Reveal({ children, delay = 0, className = "", direction = "up", eager = false }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.08 });
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (eager || reduceMotion || !ref.current) return;
    if (ref.current.getBoundingClientRect().top > window.innerHeight + BELOW_FOLD_MARGIN) setArmed(true);
  }, [eager, reduceMotion]);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const hidden = { opacity: 0, ...offsets[direction], transition: { duration: 0 } };
  const visible = {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 20, mass: 0.85, delay: delay / 1000 },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={armed && !inView ? hidden : visible}
    >
      {children}
    </motion.div>
  );
}
