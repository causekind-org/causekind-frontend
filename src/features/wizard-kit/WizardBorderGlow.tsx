import "./WizardBorderGlow.css";

/**
 * Constant border glow for the wizard's active step card.
 *
 * <p>Adapted from the React Bits `BorderGlow` component, but the interaction
 * model is deliberately gone. Upstream tracks the pointer, reads
 * `getBoundingClientRect()`, computes edge proximity and a cursor angle, drives
 * a directional conic mask, runs an intro sweep on `requestAnimationFrame`, and
 * is only visible on hover. On a form that must work on touch, none of that
 * survives contact with reality — there is no hover, and a glow that appears
 * only when a mouse is near is a glow most users never see.
 *
 * <p>So this is a **full-perimeter, always-on, CSS-only** treatment. Pinning the
 * upstream `--edge-proximity` to 100 would not have been enough: the conic mask
 * would still have lit one fixed arc rather than the whole border.
 *
 * <p>Consequences worth stating, because they are the reason this is a plain
 * div: no state, no refs, no effects, no listeners, no measurement, no
 * animation frame, no `will-change`. It cannot re-render, so it cannot make
 * typing, scrolling, uploads or step transitions cost anything.
 *
 * <p>Colour comes entirely from CSS custom properties keyed off
 * `data-ck-role-theme` on `<html>` (set before first paint) and the `.dark`
 * class. No JS theme listener and no `getComputedStyle` — which also avoids the
 * upstream `parseHSL()` trap, since that helper cannot parse a `var()`.
 *
 * <p>Purely decorative: `aria-hidden`, no role, no text, no focusable content,
 * `pointer-events: none`. It must never be how a user identifies the active
 * step, or reads validation state — the semantic red/green/amber states remain
 * the only authority on that.
 */
export function WizardBorderGlow() {
  return <div className="ck-wizard-glow" aria-hidden="true" />;
}
