"use client";

import { motion, useReducedMotion } from "framer-motion";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * A single digit that rolls into place like a slot reel.
 *
 * <p>Built as a full 0–9 column translated by whole rows rather than as a
 * cross-fade between two glyphs, so the intermediate digits are genuinely
 * visible on the way past — that flick of 0-1-2 is the entire effect, and a
 * cross-fade does not produce it.
 *
 * <p><b>Accessibility.</b> The reel is `aria-hidden` and the real value is
 * carried by a visually-hidden span. Otherwise a screen reader meets ten
 * digits per step and reads "one two three four five six seven eight nine"
 * where the design says "1".
 *
 * <p><b>Reduced motion.</b> Renders the target digit alone, with no column and
 * no transform. A number arriving instantly is the same information.
 */
export function SlotNumber({
  value,
  /** Roll only once the step is reached, so all four don't fire at once. */
  active,
  className = "",
}: {
  value: number;
  active: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const digit = Math.max(0, Math.min(9, Math.floor(value)));

  if (reduceMotion) {
    return <span className={className}>{digit}</span>;
  }

  return (
    <span className={`relative inline-flex overflow-hidden ${className}`} style={{ lineHeight: 1 }}>
      {/* Reserves the column's width and height from the real glyph, so the
          box does not depend on a hardcoded em value that drifts with the font. */}
      <span className="invisible" aria-hidden>
        {digit}
      </span>
      <motion.span
        aria-hidden
        className="absolute inset-x-0 top-0 flex flex-col items-center"
        initial={false}
        /*
         * The reel starts parked on 0 and lands on the target.
         *
         * The multiplier is 10, not 100, and that is the whole trick: a
         * percentage `y` resolves against the *animating element's own* height,
         * and this element is the full ten-digit column. One row is therefore
         * 10% of it, not 100%. Using 100 per digit scrolls ten rows per digit
         * and parks the reel in the empty space past the 9 — which renders as a
         * blank where the number should be, with no error anywhere.
         *
         * Expressed in percent rather than px so it stays correct at any font
         * size without measuring the line box.
         */
        animate={{ y: active ? `-${digit * 10}%` : "0%" }}
        transition={
          active
            ? // Heavier than a UI spring on purpose: a reel has mass, and the
            // slight overshoot-and-settle is what sells it.
            { type: "spring", stiffness: 140, damping: 17, mass: 1.1 }
            : { duration: 0.2 }
        }
      >
        {DIGITS.map((d) => (
          <span key={d} className="block" style={{ lineHeight: 1 }}>
            {d}
          </span>
        ))}
      </motion.span>
      <span className="sr-only">{digit}</span>
    </span>
  );
}
