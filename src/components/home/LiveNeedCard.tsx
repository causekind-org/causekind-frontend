"use client";

import Link from "next/link";
import { motion, type MotionProps } from "framer-motion";
import { MapPin, Lock, ArrowRight } from "lucide-react";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import AnimatedCategoryIcon from "@/components/AnimatedCategoryIcon";

/** What one Live Board card shows. */
export type LiveNeedCardData = {
  category: string;
  title: string;
  description?: string | null;
  city: string;
  quantity: number;
  /** CRITICAL or an emergency: the red "Urgent" tag. */
  urgent: boolean;
  /** An NGO drive: the green "NGO drive" tag. */
  isDrive?: boolean;
  /** "By {name}" in the meta row, when known. */
  byName?: string | null;
};

/**
 * One need card from the Live Board ("Real people. Real needs. Right now."),
 * shared with the guest /requests directory so the two stay identical.
 *
 * <p>`locked` puts the lock icon before the label: the guest's "Log in to offer
 * this item". `onCardClick` makes the whole card act like its button (clicks on
 * the button itself are left to the link).
 */
export function LiveNeedCard({
  need,
  href,
  ctaLabel,
  locked = false,
  showCta = true,
  onCardClick,
  motionProps,
  className = "",
}: {
  need: LiveNeedCardData;
  href: string;
  ctaLabel: string;
  locked?: boolean;
  showCta?: boolean;
  onCardClick?: () => void;
  /** The Live Board's in-view entrance; omitted, the card renders still. */
  motionProps?: MotionProps;
  className?: string;
}) {
  const visual = CATEGORY_VISUALS[need.category];

  return (
    <motion.article
      {...motionProps}
      onClick={onCardClick ? (e) => { if (!(e.target as Element).closest("a,button")) onCardClick(); } : undefined}
      className={`flex min-w-0 flex-col rounded-[1.25rem] bg-white dark:bg-zinc-900/95 border border-[var(--ck-home-soft,#e8e2d5)] dark:border-zinc-800 p-4 lg:rounded-[2rem] lg:border-0 lg:bg-black/[0.03] lg:p-1.5 lg:ring-1 lg:ring-black/[0.05] dark:lg:bg-white/[0.04] dark:lg:ring-white/10 lg:transition-transform lg:duration-700 lg:ease-[cubic-bezier(0.32,0.72,0,1)] lg:hover:-translate-y-1 ${onCardClick ? "cursor-pointer" : ""} ${className}`}
    >
      {/* Double-bezel inner core at lg; `contents` keeps the mobile card exactly as it was. */}
      <div className="contents lg:flex lg:grow lg:flex-col lg:rounded-[calc(2rem-0.375rem)] lg:bg-white lg:p-6 lg:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_24px_48px_-28px_rgba(67,20,7,0.18)] dark:lg:bg-zinc-900">
      <div className="grow">
        {/* Top Bar: Category Pill & Urgent Tag */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-3xs font-extrabold uppercase tracking-wider ${
              visual?.iconBg ?? "bg-stone-100"
            } ${visual?.text ?? "text-stone-700"}`}
          >
            <AnimatedCategoryIcon category={need.category} iconClassName="w-3.5 h-3.5" />
            {need.category}
          </span>

          {need.isDrive && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-3xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              NGO drive
            </span>
          )}

          {need.urgent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.5 text-3xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              Urgent
            </span>
          )}
        </div>

        {/* Title — a third of the row is narrower than the old
            980px stage, so the display size comes down with it. */}
        <h3 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-50 leading-snug text-pretty [overflow-wrap:anywhere]">
          <TranslatedText text={need.title} />
        </h3>

        {/* Description snippet if available */}
        {need.description && (
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed [overflow-wrap:anywhere]">
            <TranslatedText text={need.description} />
          </p>
        )}
      </div>

      {/* Card Meta & CTA. The block above grows, so every footer in
          the row sits on the same line however long a title wraps. */}
      <div className="mt-5 pt-4 border-t border-stone-100 dark:border-zinc-800/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-1.5 truncate font-semibold">
            <MapPin className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
            <span className="truncate">
              <TranslatedText text={need.city} />
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-medium">
            <span>
              Qty:{" "}
              <strong className="text-stone-800 dark:text-stone-200 font-bold">
                {need.quantity}
              </strong>
            </span>
            {need.byName && (
              <>
                <span className="text-stone-300 dark:text-stone-700">·</span>
                <span className="truncate text-stone-400 dark:text-stone-500 text-3xs">
                  By {need.byName}
                </span>
              </>
            )}
          </div>
        </div>

        {showCta && (
        <Link
          href={href}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--ck-home-surface,#fff7ed)]/70 hover:bg-[var(--ck-home-hover,#b04a15)] dark:bg-zinc-800/80 dark:hover:bg-[var(--ck-home-hover,#b04a15)] border border-[var(--ck-home-soft,#fed7aa)]/50 hover:border-transparent dark:border-zinc-700/60 py-2.5 px-3.5 text-xs font-bold text-[var(--ck-home-ink,#b04a15)] hover:text-white dark:text-[var(--ck-home-highlight,#fdba74)] dark:hover:text-white transition-all duration-200 shadow-2xs group/btn active:scale-[0.98]"
        >
          {locked && <Lock className="w-3.5 h-3.5 shrink-0 opacity-80 group-hover/btn:opacity-100" />}
          <span>{ctaLabel}</span>
          <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover/btn:translate-x-1 shrink-0" />
        </Link>
        )}
      </div>
      </div>
    </motion.article>
  );
}

/** A skeleton in the same frame as {@link LiveNeedCard}, for loading grids. */
export function LiveNeedCardSkeleton() {
  const bar = "rounded bg-stone-200 motion-safe:animate-pulse dark:bg-zinc-800";
  return (
    <div className="flex min-w-0 flex-col rounded-[1.25rem] bg-white dark:bg-zinc-900/95 border border-[var(--ck-home-soft,#e8e2d5)] dark:border-zinc-800 p-4 lg:rounded-[2rem] lg:border-0 lg:bg-black/[0.03] lg:p-1.5 lg:ring-1 lg:ring-black/[0.05] dark:lg:bg-white/[0.04] dark:lg:ring-white/10">
      <div className="contents lg:flex lg:grow lg:flex-col lg:rounded-[calc(2rem-0.375rem)] lg:bg-white lg:p-6 lg:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_24px_48px_-28px_rgba(67,20,7,0.18)] dark:lg:bg-zinc-900">
        <div className="grow">
          <div className={`mb-4 h-6 w-28 rounded-full ${bar}`} />
          <div className={`h-6 w-4/5 ${bar}`} />
          <div className={`mt-3 h-3.5 w-full ${bar}`} />
          <div className={`mt-2 h-3.5 w-2/3 ${bar}`} />
        </div>
        <div className="mt-5 pt-4 border-t border-stone-100 dark:border-zinc-800/80 space-y-3">
          <div className="flex justify-between"><div className={`h-3 w-20 ${bar}`} /><div className={`h-3 w-16 ${bar}`} /></div>
          <div className={`h-9 w-full rounded-full ${bar}`} />
        </div>
      </div>
    </div>
  );
}
