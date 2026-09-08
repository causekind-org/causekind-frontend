/**
 * The animated rule that separates one page section from the next.
 *
 * <p>A 1px brand-coloured line with a highlight sweeping slowly across it. All
 * of the effect lives in `.ck-section-divider` in `src/styles.css`; this
 * component exists only so the ~13 call sites do not each hand-roll the class,
 * the `aria-hidden`, and the full-bleed negative margin.
 *
 * <p>Deliberately NOT a client component, and deliberately not the horizontal
 * twin of {@link ../about/BeamDivider}. `BeamDivider` animates in JavaScript,
 * so it has to be a client component and has to gate itself on
 * `useReducedMotion()`. This one is pure CSS, so it stays a server component
 * and its reduced-motion behaviour is a `@media` block next to the rule — one
 * fewer client boundary on every page that uses it.
 *
 * <p>Colour comes from `--rust-action`, which is `#b04a15` in light and
 * `#e07b3a` in dark, so there is no `dark:` variant here or in the CSS.
 *
 * <p>`aria-hidden`, and neither `role="separator"` nor an `<hr>`: the divider
 * is decoration. The real boundary is already carried by the `<section>`
 * elements and their headings, and announcing "separator" at every one of them
 * would add noise a screen-reader user has no use for.
 */
export default function SectionDivider({
  bleed = false,
  className = "",
}: {
  /**
   * Cancels a `px-4` parent so the line spans edge to edge. Needed in
   * HomeClient's mobile tree, which is a padded flex column.
   */
  bleed?: boolean;
  /**
   * Margin overrides for the call site — chiefly `my-0` inside a flex column
   * that already owns its spacing through `gap-*`.
   */
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`ck-section-divider${bleed ? " -mx-4" : ""}${className ? ` ${className}` : ""}`}
    />
  );
}
