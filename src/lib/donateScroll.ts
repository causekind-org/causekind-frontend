/**
 * Getting a visitor from a "Donate Now" button to the donation form itself.
 *
 * <p>The form already carries `id="donate-form"`, and MoneyHero already scrolled
 * to it. What was missing is a way to ask for it from ANOTHER page, and a single
 * place where the reduced-motion rule is applied — the hero's own call had none.
 *
 * <p><b>Why a query param and not a hash.</b> `/donate/money#donate-form` works,
 * and is kept working for anyone who deep-links or shares that URL. But the
 * browser honours a hash itself, instantly, before React has mounted — there is
 * no smooth scroll left to perform. A query param carries the same intent
 * without the browser acting on it, so the page can wait for layout and then
 * animate. See `useDonateScrollTarget`.
 */

/** The donation form's anchor, as it appears on MoneyDonationForm's section. */
export const DONATE_FORM_ID = "donate-form";

/** The query parameter that asks the donate page to scroll somewhere on arrival. */
export const DONATE_SCROLL_PARAM = "scroll";

/**
 * Where every "Donate Now" button points.
 *
 * <p>One constant so a route change is one edit. Note it is NOT `/donate` —
 * that route is still behind `FEATURES.money` and renders "Coming Soon".
 */
export const DONATE_HREF = `/donate/money?${DONATE_SCROLL_PARAM}=${DONATE_FORM_ID}`;

/**
 * The imperative reduced-motion check.
 *
 * <p>The repo's JSX uses framer-motion's `useReducedMotion()`; this is the
 * matchMedia form used where the decision is imperative rather than rendered,
 * matching ImpactCarousel and the wizards.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Scrolls to a section by id and puts keyboard focus inside it.
 *
 * <p>Scrolling moves the eye but not the caret: without the focus call a
 * keyboard or screen-reader user is left wherever they were, and their next Tab
 * continues from the top of the page rather than from the form they asked for.
 * `preventScroll` stops that focus from cancelling the smooth scroll we just
 * started, and the tabindex is only added when the target is not already
 * focusable.
 *
 * @returns whether the element was found — the caller can retry if it was not.
 */
export function scrollToSection(id: string): boolean {
  if (typeof document === "undefined") return false;
  const el = document.getElementById(id);
  if (!el) return false;

  el.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });

  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  (el as HTMLElement).focus({ preventScroll: true });
  return true;
}
