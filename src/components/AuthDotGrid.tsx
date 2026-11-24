/* Static dot-grid texture for the light auth form panel (login, register,
   forgot-password). It fills its positioned parent and sits behind the form
   card.

   2026-11-20: this was the interactive React Bits DotGrid (GSAP + canvas,
   cursor shock effect). On a mid-range phone it cost about 4 s of main-thread
   work on every auth page — more than the form itself — so it is now a plain
   CSS pattern with the same dot size, spacing and colour, and no JavaScript.
   DotGrid.jsx is left in place, unused. */
export function AuthDotGrid() {
  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none opacity-90 dark:opacity-0"
      aria-hidden
      style={{
        backgroundImage: "radial-gradient(circle, #e5ddd1 2.5px, transparent 3px)",
        backgroundSize: "20px 20px",
        backgroundPosition: "center",
      }}
    />
  );
}
