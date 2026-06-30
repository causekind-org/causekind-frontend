import type { Variants } from "framer-motion";

// ── Page transitions ──────────────────────────────────────────────────────────
export const pageSlideIn: Variants = {
  hidden:  { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, x: -20, transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } },
};

export const pageFadeUp: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } },
};

// ── Content reveal ────────────────────────────────────────────────────────────
export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35 } },
};

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

// ── Stagger containers ────────────────────────────────────────────────────────
export const staggerContainer: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

export const staggerContainerFast: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.04 } },
};

// ── Cards & list items ────────────────────────────────────────────────────────
export const cardReveal: Variants = {
  hidden:  { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export const listItem: Variants = {
  hidden:  { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

// ── Modal / overlay ───────────────────────────────────────────────────────────
export const modalOverlay: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18, delay: 0.05 } },
};

export const modalContent: Variants = {
  hidden:  { opacity: 0, scale: 0.95, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};

// ── Slide in from side (for drawers / panels) ─────────────────────────────────
export const slideInRight: Variants = {
  hidden:  { x: "100%" },
  visible: { x: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
  exit:    { x: "100%", transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } },
};

export const slideInLeft: Variants = {
  hidden:  { x: "-100%" },
  visible: { x: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
  exit:    { x: "-100%", transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } },
};

// ── Pop / spring (for buttons, badges, toasts) ────────────────────────────────
export const popIn: Variants = {
  hidden:  { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 380, damping: 22 } },
  exit:    { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

// ── Number counter (wrap value in motion.span, use useMotionValue + useSpring) ─
export const counterSpring = { stiffness: 80, damping: 20 };

// ── Reduced motion safe wrapper ───────────────────────────────────────────────
// Usage: wrap any variant with this helper before passing to motion component
export function respectReducedMotion<T extends Variants>(variants: T): T {
  if (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const flat: Variants = {};
    for (const key of Object.keys(variants)) {
      flat[key] = { opacity: (variants[key] as { opacity?: number }).opacity ?? 1, transition: { duration: 0 } };
    }
    return flat as T;
  }
  return variants;
}
