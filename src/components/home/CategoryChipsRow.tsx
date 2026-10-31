"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import AnimatedCategoryIcon from "@/components/AnimatedCategoryIcon";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS } from "@/lib/categoryVisuals";

export type CategoryChipsRowProps = {
  categories?: readonly string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categoryCounts?: Record<string, number>;
  totalCount?: number;
  allLabel?: string;
  activeClassName?: string;
  disableEmpty?: boolean;
  className?: string;
  groupAriaLabel?: string;
};

export function CategoryChipsRow({
  categories = ALL_REQUEST_CATEGORIES,
  selectedCategory,
  onSelectCategory,
  categoryCounts = {},
  allLabel = "All Categories",
  activeClassName = "bg-[var(--ck-home-accent,#b04a15)] text-white shadow-sm shadow-[var(--ck-home-deep,#431407)]/20 ring-2 ring-[var(--ck-home-accent,#b04a15)]/30",
  disableEmpty = false,
  className = "",
  groupAriaLabel = "Filter by category",
}: CategoryChipsRowProps) {
  const isAllSelected = selectedCategory === "All";

  return (
    <div className={`relative ck-live-needs-filters ${className}`} role="group" aria-label={groupAriaLabel}>
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
        <button
          type="button"
          onClick={() => onSelectCategory("All")}
          aria-pressed={isAllSelected}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
            isAllSelected
              ? activeClassName
              : "bg-white/80 dark:bg-zinc-900/80 text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          {allLabel}
        </button>

        {categories.map((cat) => {
          const visual = CATEGORY_VISUALS[cat];
          const isSelected = selectedCategory === cat;
          const count = categoryCounts[cat] ?? 0;
          const isEmpty = count === 0 && !isSelected;
          const isDisabled = disableEmpty && isEmpty;

          return (
            <button
              key={cat}
              type="button"
              disabled={isDisabled}
              aria-disabled={isDisabled}
              aria-pressed={isSelected}
              onClick={() => {
                if (!isDisabled) onSelectCategory(cat);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                isDisabled
                  ? "cursor-not-allowed bg-transparent text-stone-400 dark:text-stone-600 border border-stone-200/60 dark:border-zinc-800/60 opacity-50"
                  : isSelected
                  ? `${activeClassName} cursor-pointer`
                  : isEmpty
                  ? "bg-transparent text-stone-400 dark:text-stone-600 border border-stone-200/70 dark:border-zinc-800/70 hover:bg-stone-50 dark:hover:bg-zinc-900 cursor-pointer"
                  : "bg-white/80 dark:bg-zinc-900/80 text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center ${
                  isSelected
                    ? "text-white"
                    : isEmpty
                    ? "text-stone-300 dark:text-stone-700"
                    : visual?.text ?? "text-stone-500"
                }`}
              >
                <AnimatedCategoryIcon category={cat} iconClassName="w-3.5 h-3.5" />
              </span>
              {cat}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 text-3xs font-black tabular-nums ${
                    isSelected
                      ? "bg-white/25 text-white"
                      : "bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-stone-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
