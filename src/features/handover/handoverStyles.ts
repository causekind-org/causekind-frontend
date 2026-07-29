/**
 * Shared class strings for handover controls.
 *
 * <p>These exist because `ui/button`'s tokens are the app-wide terracotta and
 * this feature is role-themed, and because two of its default states were wrong
 * here:
 *
 * <p>1. `disabled:opacity-50` on a terracotta fill produces a **faded peach**
 *    that still reads as an available primary action. A disabled Save must look
 *    inert, so it drops to a neutral grey surface entirely.
 * <p>2. The accent must follow the viewer's role, which `bg-primary` cannot do.
 *
 * Everything else — radius, focus ring width, icon sizing, transition — comes
 * from `buttonVariants`, so these are `className` additions, not a second
 * button implementation.
 */

/** Filled primary action in the role accent. 44px min target. */
export const handoverPrimary = [
  "min-h-[44px] bg-[var(--handover-accent)] text-[var(--handover-on-accent)]",
  "hover:bg-[var(--handover-accent-hover)]",
  "focus-visible:ring-[var(--handover-ring)]/50 focus-visible:border-[var(--handover-ring)]",
  // Neutral, unmistakably inert — not a translucent version of the live button.
  "disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none",
].join(" ");

/** Quiet secondary action — visible border, no fill. */
export const handoverSecondary = [
  "min-h-[44px] border border-border bg-transparent text-foreground",
  "hover:bg-muted",
  "focus-visible:ring-[var(--handover-ring)]/50",
  "disabled:opacity-100 disabled:text-muted-foreground",
].join(" ");

/** Destructive action. Red keeps its meaning regardless of role. */
export const handoverDestructive = [
  "min-h-[44px] bg-destructive text-white hover:bg-destructive/90",
  "focus-visible:ring-destructive/40",
  "disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100",
].join(" ");

/**
 * Select trigger and options.
 *
 * <p>The selected/focused option uses `--handover-soft` with `--handover-on-soft`
 * on top — a soft role-tinted fill with dark readable text and the check icon.
 * A native `<select>` could not do this: its menu is drawn by the OS and paints
 * the highlighted row in the browser's own blue, which is what the old dialog
 * looked wrong with.
 */
export const handoverSelectTrigger = [
  "min-h-[44px] h-auto w-full border-input bg-background text-base text-foreground",
  "data-[placeholder]:text-muted-foreground",
  "focus-visible:ring-[var(--handover-ring)]/50 focus-visible:border-[var(--handover-ring)]",
].join(" ");

export const handoverSelectItem = [
  "min-h-[44px] text-base",
  "focus:bg-[var(--handover-soft)] focus:text-[var(--handover-on-soft)]",
  "data-[state=checked]:bg-[var(--handover-soft)] data-[state=checked]:text-[var(--handover-on-soft)]",
  "data-[state=checked]:font-semibold",
].join(" ");

/** Text inputs: readable value, visible border, muted-but-legible placeholder. */
export const handoverInput = [
  "min-h-[44px] h-auto w-full border-input bg-background text-base text-foreground",
  "placeholder:text-muted-foreground",
  "focus-visible:ring-[var(--handover-ring)]/50 focus-visible:border-[var(--handover-ring)]",
].join(" ");

export const handoverLabel = "block text-sm font-semibold text-foreground";
