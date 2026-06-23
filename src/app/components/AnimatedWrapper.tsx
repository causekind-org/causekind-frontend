"use client";

import { motion, MotionProps, Variants } from "framer-motion";
import React from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

type AnimatedWrapperProps = {
  children: React.ReactNode;
  className?: string;
  /** optional custom variants */
  variants?: MotionProps["variants"];
  /** delay in seconds */
  delay?: number;
  /** duration in seconds */
  duration?: number;
  /** slide direction */
  direction?: Direction;
  /** use scroll-triggered animation instead of mount animation */
  inView?: boolean;
  /** amount of element visible before triggering (0–1) */
  threshold?: number;
};

function buildVariants(direction: Direction, duration: number, delay: number): Variants {
  const offsets: Record<Direction, { x?: number; y?: number; scale?: number }> = {
    up:    { y: 30, scale: 0.97 },
    down:  { y: -30, scale: 0.97 },
    left:  { x: 30, scale: 0.97 },
    right: { x: -30, scale: 0.97 },
    none:  { scale: 0.97 },
  };
  const hidden = { opacity: 0, ...offsets[direction] };
  const visible = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 90,
      damping: 18,
      mass: 0.9,
      delay,
    },
  };
  return { hidden, visible };
}

export const AnimatedWrapper: React.FC<AnimatedWrapperProps> = ({
  children,
  className = "",
  variants,
  delay = 0,
  duration = 0.5,
  direction = "up",
  inView = false,
  threshold = 0.15,
}) => {
  const resolvedVariants = variants ?? buildVariants(direction, duration, delay);

  if (inView) {
    return (
      <motion.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: threshold }}
        variants={resolvedVariants}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={resolvedVariants}
    >
      {children}
    </motion.div>
  );
};
