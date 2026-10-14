"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * The thread — CauseKind's connective motif.
 *
 * <p><b>What it is and why it exists.</b> The hero already draws a dotted arc
 * between two pins: "you have something useful" on one side, "someone nearby
 * needs it" on the other. That arc is the single clearest statement of what
 * this platform does, and it was appearing exactly once and then never again.
 *
 * <p>This component is that same line, continued. It runs down the left gutter
 * of each narrative section, drawing itself as the section is scrolled through,
 * so the whole page reads as one unbroken connection from "a thing exists" to
 * "a person received it". It is the reason the page is a story rather than a
 * stack of sections — and it is CauseKind's own, not a library effect.
 *
 * <p><b>It carries meaning, so it is not decoration.</b> The thread is solid
 * where a step has actually happened and dashed where it is still pending —
 * the same vocabulary the need board uses for matched versus waiting. A reader
 * who never looks at it directly still absorbs "this connects to that".
 *
 * <p><b>Cost.</b> One SVG path, one IntersectionObserver, and a single
 * `stroke-dashoffset` driven off scroll position. No layout is read during
 * scroll and nothing animates a layout property. Under reduced motion the path
 * renders complete and static — the connection is the information, the drawing
 * of it is not.
 */
export function NeedThread({
  /** Dashed rather than solid: this stretch of the journey has not happened yet. */
  pending = false,
  /** Height in the flow. The thread is decorative in the accessibility tree. */
  className = "",
}: {
  pending?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const reduceMotion = useReducedMotion();
  const [drawn, setDrawn] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const host = hostRef.current;
    if (!host) return;

    let raf = 0;
    let active = false;

    /** Progress of the host through the viewport, 0 (entering) → 1 (leaving). */
    const measure = () => {
      raf = 0;
      const r = host.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Starts drawing as the top edge reaches the bottom of the viewport and
      // completes as the bottom edge reaches the middle — so the line is always
      // finished slightly before the next section's content arrives.
      const total = r.height + vh * 0.5;
      const travelled = vh - r.top;
      setDrawn(Math.max(0, Math.min(1, travelled / (total || 1))));
    };

    const onScroll = () => {
      if (raf || !active) return;
      raf = requestAnimationFrame(measure);
    };

    // Only listen while the thread is actually on screen. A page with several
    // of these must not attach several always-live scroll handlers.
    const io = new IntersectionObserver(
      (entries) => {
        active = entries.some((e) => e.isIntersecting);
        if (active) measure();
      },
      { rootMargin: "20% 0px" },
    );
    io.observe(host);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduceMotion]);

  const progress = reduceMotion ? 1 : drawn;

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
    >
      <svg
        viewBox="0 0 8 100"
        preserveAspectRatio="none"
        className="h-full w-2 overflow-visible"
      >
        {/* The track the thread runs along — always present, so the line has
            somewhere to go rather than appearing out of nothing. */}
        <path
          d="M4 0 V100"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="text-[var(--ck-thread-track,rgba(176,74,21,0.12))]"
          vectorEffect="non-scaling-stroke"
        />
        <path
          ref={pathRef}
          d="M4 0 V100"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          // Dashed while pending, solid once the step is real. `pathLength`
          // normalises the path to 1 so the dash maths is resolution-independent
          // and survives the non-uniform viewBox scaling.
          pathLength={1}
          strokeDasharray={pending ? "0.012 0.018" : "1"}
          strokeDashoffset={pending ? 0 : 1 - progress}
          style={{
            opacity: pending ? 0.5 * progress + 0.25 : 1,
            transition: reduceMotion ? undefined : "opacity 200ms linear",
          }}
          className="text-[var(--ck-thread,#c54805)]"
        />
      </svg>
    </div>
  );
}
