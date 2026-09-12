"use client";

import { useCallback, useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

/**
 * CountUp — a number that springs from `from` to `to` when it scrolls into view.
 *
 * <p><b>Ported from React Bits</b> (`TextAnimations/CountUp`, MIT). Three
 * changes, all forced by this codebase rather than by taste:
 *
 * <ul>
 *   <li><b>`framer-motion`, not `motion/react`.</b> Upstream imports the newer
 *       package name. This project has `framer-motion@12` and not `motion`, and
 *       the two export the same three hooks, so the import is retargeted rather
 *       than a dependency added for one component.</li>
 *   <li><b>Typed.</b> Upstream ships `.jsx`.</li>
 *   <li><b>Server-safe first paint.</b> Upstream renders `<span />` empty and
 *       fills it in an effect, so the number is missing until hydration — on a
 *       percentage sitting next to a bar that is a visible blank. This renders
 *       the starting value as real children, which is also what a reader with
 *       JavaScript off is left with.</li>
 * </ul>
 *
 * <p><b>Why it does not re-render.</b> The spring is written straight to
 * `textContent` on each frame instead of through state. Sixty state updates a
 * second per instance would re-render the card, its bar and its siblings; this
 * touches one text node and nothing else in React knows it moved.
 */
export type CountUpProps = {
  to: number;
  from?: number;
  direction?: "up" | "down";
  /** Seconds to wait after the element enters view. */
  delay?: number;
  /** Seconds; drives the spring's damping and stiffness rather than a tween. */
  duration?: number;
  className?: string;
  /** Gate the count on something other than visibility. */
  startWhen?: boolean;
  /** Thousands separator. Empty string leaves the number ungrouped. */
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
};

export default function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 2,
  className = "",
  startWhen = true,
  separator = "",
  onStart,
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? to : from);

  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);
  const springValue = useSpring(motionValue, { damping, stiffness });

  const isInView = useInView(ref, { once: true, margin: "0px" });

  const getDecimalPlaces = (num: number) => {
    const str = num.toString();
    if (str.includes(".")) {
      const decimals = str.split(".")[1];
      if (parseInt(decimals) !== 0) return decimals.length;
    }
    return 0;
  };

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    (latest: number) => {
      const hasDecimals = maxDecimals > 0;
      const formatted = Intl.NumberFormat("en-US", {
        useGrouping: !!separator,
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0,
      }).format(latest);
      return separator ? formatted.replace(/,/g, separator) : formatted;
    },
    [maxDecimals, separator]
  );

  const initial = formatValue(direction === "down" ? to : from);

  useEffect(() => {
    if (ref.current) ref.current.textContent = initial;
  }, [initial]);

  useEffect(() => {
    if (!isInView || !startWhen) return;
    onStart?.();
    const startId = setTimeout(() => {
      motionValue.set(direction === "down" ? from : to);
    }, delay * 1000);
    const endId = setTimeout(() => onEnd?.(), delay * 1000 + duration * 1000);
    return () => {
      clearTimeout(startId);
      clearTimeout(endId);
    };
  }, [isInView, startWhen, motionValue, direction, from, to, delay, duration, onStart, onEnd]);

  useEffect(() => {
    // `textContent`, not state — see the note on the component above.
    return springValue.on("change", (latest: number) => {
      if (ref.current) ref.current.textContent = formatValue(latest);
    });
  }, [springValue, formatValue]);

  return (
    <span className={className} ref={ref}>
      {initial}
    </span>
  );
}
