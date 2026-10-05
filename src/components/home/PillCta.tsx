import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Landing primary/secondary action: a full pill with its arrow nested in its
 * own circle flush to the right padding ("button-in-button"). On hover the
 * circle drifts up-right; on press the whole pill sinks slightly.
 *
 * <p>`solid` uses `--rust-action`, the theme-aware brand token, so no `dark:`
 * variant is needed for the fill.
 */
export default function PillCta({
  href,
  children,
  variant = "solid",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "solid" | "ghost";
  className?: string;
}) {
  const shell =
    variant === "solid"
      ? "bg-rust-action text-[#fff6ed] shadow-[0_18px_40px_-18px_rgba(176,74,21,0.55)]"
      : "bg-white/60 text-stone-900 ring-1 ring-black/[0.06] dark:bg-white/5 dark:text-stone-100 dark:ring-white/10";
  const bead =
    variant === "solid" ? "bg-white/15" : "bg-black/[0.05] dark:bg-white/10";

  return (
    <Link
      href={href}
      className={`ck-pill-cta group inline-flex min-h-11 items-center gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-sm font-semibold transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${shell} ${className}`}
    >
      <span>{children}</span>
      <span
        aria-hidden
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-px group-hover:translate-x-1 group-hover:scale-105 ${bead}`}
      >
        <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
      </span>
    </Link>
  );
}
