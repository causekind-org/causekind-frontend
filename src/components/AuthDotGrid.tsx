"use client";

// @ts-expect-error — DotGrid is the JS/CSS React Bits variant (no types shipped)
import DotGrid from "@/components/DotGrid";

/* Interactive dot-grid background for the light auth form panel (login,
   register, forgot-password). It fills its positioned parent and sits behind
   the form card. The canvas is pointer-events:none and DotGrid listens on
   `window`, so the cursor drives the shock/inertia effect while the card and
   its inputs above stay fully interactive.

   Tuned for the light #faf8f5 surface: a soft warm-stone base so the dots read
   as a quiet texture, and the brand orange as the active/cursor colour. */
export function AuthDotGrid() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
      <DotGrid
        dotSize={5}
        gap={15}
        baseColor="#e5ddd1"
        activeColor="#b04a15"
        proximity={120}
        speedTrigger={100}
        shockRadius={250}
        shockStrength={5}
        maxSpeed={5000}
        resistance={750}
        returnDuration={1.5}
      />
    </div>
  );
}
