import { cn } from "@/lib/utils";

/**
 * Loading placeholder. `animate-pulse` is the one exception to the project's
 * "no looping animation" rule — it communicates ongoing work and is removed the
 * moment content arrives.
 *
 * <p>The pulse stops under `prefers-reduced-motion` because `styles.css`
 * explicitly targets `[data-slot="skeleton"]` in its reduced-motion block —
 * *not* because Tailwind does it, which this comment previously claimed and
 * which is not true of `animate-pulse`. The `data-slot` attribute below is that
 * hook, so removing it silently reinstates the pulse for users who asked for no
 * motion.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
