/**
 * The shell every landing-page section sits in.
 *
 * <p>The landing page used to read as a stack of separate pages, and the cause
 * was measurable rather than a matter of taste: each section brought its own
 * background, its own vertical padding and its own container width, so all
 * three changed at once at every join. Five near-identical creams were in use
 * (`#faf8f5`, `#fbf9f4`, `#f7f4f0`, `#fdf5ed`, `#fffdf9`), padding ranged from
 * `py-9` to `py-20` plus one section on its own `svh` clamp scale, and the
 * content edge moved between `max-w-5xl`, `6xl` and `7xl`.
 *
 * <p>This owns all three so a section cannot disagree with its neighbours:
 * <ul>
 *   <li><b>No background.</b> The page paints one paper — `--surface-cream`,
 *       `#faf8f5` — on the tree wrapper in `HomeClient`, and sections are
 *       transparent over it.</li>
 *   <li><b>One rhythm.</b> `py-16 sm:py-24`.</li>
 *   <li><b>One edge.</b> `max-w-7xl px-4 sm:px-6 lg:px-8`.</li>
 * </ul>
 *
 * <p>Two sections opt out deliberately and must keep doing so: the hero, which
 * sets the page rather than following it, and `ItemDonationScrolly`, whose dark
 * film band is the one intended break in the paper. Use `tone="dark"` for a
 * section that is meant to invert — it is a decision, not a default.
 *
 * <p>`SectionDivider` is gone from this page. With one paper and one rhythm the
 * space carries the boundary; a rule between some sections and not others was a
 * third boundary signal on top of the other two.
 */
export default function PageSection({
  children,
  tone = "paper",
  className = "",
  innerClassName = "",
  ...rest
}: {
  children: React.ReactNode;
  /**
   * `paper` is transparent over the page background. `dark` inverts, and is for
   * a section that has earned a break in the surface — today only the closing
   * call. Anything else being dark is a mistake worth questioning.
   */
  tone?: "paper" | "dark";
  /** Overrides on the full-bleed `<section>` — chiefly extra padding. */
  className?: string;
  /** Overrides on the centred container. */
  innerClassName?: string;
} & React.ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={`relative w-full py-16 sm:py-24 ${
        tone === "dark" ? "bg-stone-900 text-stone-100 dark:bg-black" : ""
      } ${className}`}
      {...rest}
    >
      <div className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${innerClassName}`}>
        {children}
      </div>
    </section>
  );
}
