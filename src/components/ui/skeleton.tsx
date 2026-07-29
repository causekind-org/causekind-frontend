import { cn } from "@/lib/utils";

/**
 * Loading placeholder. `animate-pulse` is the one exception to the project's
 * "no looping animation" rule — it communicates ongoing work and is removed the
 * moment content arrives. It stops under `prefers-reduced-motion` via Tailwind.
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
