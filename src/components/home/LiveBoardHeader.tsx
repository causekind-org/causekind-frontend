"use client";

import React, { type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import LetterSwap from "@/components/LetterSwap";

export type LiveBoardTrustCard = {
  title: string;
  description: string;
  icon?: ReactNode;
  iconBoxClassName?: string;
};

export type LiveBoardHeaderProps = {
  badgeLabel: string;
  badgeDotClassName?: string;
  badgeClassName?: string;
  headlinePrimary: string;
  headlineAccent: string;
  headlineAccentClassName?: string;
  animateHeading?: boolean;
  subtitle: string;
  headingId?: string;
  trustCard: LiveBoardTrustCard;
  className?: string;
};

export function LiveBoardHeader({
  badgeLabel,
  badgeDotClassName = "bg-current",
  badgeClassName,
  headlinePrimary,
  headlineAccent,
  headlineAccentClassName = "text-[var(--ck-home-ink,#b04a15)] dark:text-[var(--ck-home-ink,#e07b3a)]",
  animateHeading = false,
  subtitle,
  headingId,
  trustCard,
  className = "",
}: LiveBoardHeaderProps) {
  const defaultBadgeClass =
    "mb-5 hidden w-max items-center gap-2 rounded-full bg-[var(--ck-home-accent,#b04a15)]/[0.07] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ck-home-ink,#b04a15)] ring-1 ring-[var(--ck-home-accent,#b04a15)]/15 lg:inline-flex dark:bg-white/5 dark:text-[var(--ck-home-ink,#e07b3a)] dark:ring-white/10";

  return (
    <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 ck-live-needs-header-gap ${className}`}>
      <div className="max-w-2xl min-w-0">
        <p className={badgeClassName ?? defaultBadgeClass}>
          <span className={`size-1.5 rounded-full ${badgeDotClassName}`} aria-hidden="true" />
          {badgeLabel}
        </p>

        <h2
          id={headingId}
          className="text-[1.625rem] lg:text-6xl font-semibold [font-family:var(--font-source-serif-4),Georgia,serif] tracking-[-0.03em] lg:tracking-[-0.035em] text-stone-900 dark:text-stone-50 leading-[1.12] lg:leading-[1.02]"
        >
          {animateHeading ? <LetterSwap text={headlinePrimary} /> : headlinePrimary}{" "}
          <span className={headlineAccentClassName}>
            {animateHeading ? <LetterSwap text={headlineAccent} /> : headlineAccent}
          </span>
        </h2>

        <p className="mt-3 text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3.5 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm border border-stone-200/80 dark:border-zinc-800 rounded-[1.25rem] p-4 shrink-0 lg:shadow-xs">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            trustCard.iconBoxClassName ??
            "bg-[var(--ck-home-accent,#b04a15)]/10 dark:bg-[var(--ck-home-accent,#b04a15)]/20 text-[var(--ck-home-ink,#b04a15)] dark:text-[var(--ck-home-ink,#e07b3a)]"
          }`}
        >
          {trustCard.icon ?? <ShieldCheck className="w-5 h-5" aria-hidden="true" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-stone-900 dark:text-stone-100 leading-tight">
            {trustCard.title}
          </p>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            {trustCard.description}
          </p>
        </div>
      </div>
    </div>
  );
}
