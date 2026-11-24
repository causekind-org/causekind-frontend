"use client";

import { motion, MotionProps, useInView, useReducedMotion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

type AnimatedWrapperProps = {
  children: React.ReactNode;
  className?: string;
  /** optional custom variants (expects `hidden` and `visible` keys) */
  variants?: MotionProps["variants"];
  delay?: number;
  duration?: number;
  direction?: Direction;
  inView?: boolean;
  threshold?: number | "some" | "all";
  /** Never hide, even below the fold (first-screen text). */
  eager?: boolean;
};

const OFFSETS: Record<Direction, { x?: number; y?: number; scale?: number }> = {
  up:    { y: 30, scale: 0.97 },
  down:  { y: -30, scale: 0.97 },
  left:  { x: 30, scale: 0.97 },
  right: { x: -30, scale: 0.97 },
  none:  { scale: 0.97 },
};

/** How far below the first screen an element must start to be animated in. */
const BELOW_FOLD_MARGIN = 100;

/**
 * Content is visible by default: the server HTML and the first client render
 * carry no hidden state, so text never waits for JavaScript.
 *
 * After hydration, only an element that starts clearly below the fold
 * (top > viewport height + 100px) is hidden — instantly, while off screen —
 * and animates in when it scrolls into view. Elements on or near the first
 * screen stay as they are (no animation reset). Reduced motion: never hidden.
 * (`inView={false}` used to animate on mount; on the first screen that is now
 * a no-op, and below the fold it behaves like `inView`.)
 */
export const AnimatedWrapper: React.FC<AnimatedWrapperProps> = ({
  children,
  className = "",
  variants,
  delay = 0,
  direction = "up",
  threshold = 0.15,
  eager = false,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: threshold });
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (eager || prefersReducedMotion || !ref.current) return;
    if (ref.current.getBoundingClientRect().top > window.innerHeight + BELOW_FOLD_MARGIN) setArmed(true);
  }, [eager, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const resolved = variants ?? {
    hidden: { opacity: 0, ...OFFSETS[direction], transition: { duration: 0 } },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 90, damping: 18, mass: 0.9, delay },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      variants={resolved}
      animate={armed && !seen ? "hidden" : "visible"}
    >
      {children}
    </motion.div>
  );
};
