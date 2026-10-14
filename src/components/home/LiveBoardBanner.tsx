"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export type LiveBoardBannerProps = {
  heading: string;
  subtext: string;
  buttonLabel: string;
  buttonHref: string;
  buttonClassName?: string;
  icon?: ReactNode;
  iconBoxClassName?: string;
  className?: string;
};

export function LiveBoardBanner({
  heading,
  subtext,
  buttonLabel,
  buttonHref,
  buttonClassName,
  icon,
  iconBoxClassName,
  className = "",
}: LiveBoardBannerProps) {
  const defaultButtonClass =
    "inline-flex items-center gap-2 rounded-full bg-[var(--ck-home-accent,#b04a15)] hover:bg-[var(--ck-home-hover,#963c0d)] text-white font-extrabold px-5 py-2.5 lg:min-h-12 lg:px-7 text-xs uppercase tracking-wider transition-all lg:duration-500 lg:ease-[cubic-bezier(0.32,0.72,0,1)] shadow-md shadow-[var(--ck-home-deep,#431407)]/20 active:scale-95 lg:active:scale-[0.98] shrink-0";

  const defaultIconBoxClass =
    "w-9 h-9 rounded-xl bg-[var(--ck-home-accent,#b04a15)]/10 flex items-center justify-center text-[var(--ck-home-ink,#b04a15)] shrink-0";

  return (
    <div
      className={`ck-live-needs-footer-gap flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl lg:rounded-[2rem] lg:p-2 lg:pl-6 bg-stone-100/70 dark:bg-zinc-900/60 border border-stone-200/70 dark:border-zinc-800 p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className={iconBoxClassName ?? defaultIconBoxClass}>
          {icon ?? <CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
        </div>
        <div>
          <p className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200">
            {heading}
          </p>
          <p className="text-3xs sm:text-xs text-stone-500 dark:text-stone-400">
            {subtext}
          </p>
        </div>
      </div>

      <Link
        href={buttonHref}
        className={buttonClassName ?? defaultButtonClass}
      >
        <span>{buttonLabel}</span>
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
