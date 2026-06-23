"use client";

import { motion, Variants } from "framer-motion";
import React from "react";

/** Wraps a list of items and staggers their entrance animations. */
type StaggerContainerProps = {
  children: React.ReactNode;
  className?: string;
  /** delay before first child animates (seconds) */
  delayStart?: number;
  /** stagger between each child (seconds) */
  staggerDelay?: number;
  /** trigger when scrolled into view */
  inView?: boolean;
};

const containerVariants = (delayStart: number, staggerDelay: number): Variants => ({
  hidden: {},
  visible: {
    transition: {
      delayChildren: delayStart,
      staggerChildren: staggerDelay,
    },
  },
});
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 90,
      damping: 18,
      mass: 0.9,
    },
  },
};
export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className = "",
  delayStart = 0,
  staggerDelay = 0.1,
  inView = false,
}) => {
  const cv = containerVariants(delayStart, staggerDelay);

  if (inView) {
    return (
      <motion.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={cv}
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
      variants={cv}
    >
      {children}
    </motion.div>
  );
};
