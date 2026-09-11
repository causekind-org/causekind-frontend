"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";

const DISPLAY_ORDER = [
  "Medical aid",
  "Education",
  "Livelihood",
  "Clothing",
  "Household",
  "Relief",
  "Electronics",
  "Furniture",
  "Sports",
] as const;

const ORDER_INDEX = new Map<string, number>(
  DISPLAY_ORDER.map((name, index) => [name, index]),
);

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  "Medical aid": "medicalAid",
  Education: "education",
  Livelihood: "livelihood",
  Clothing: "clothing",
  Household: "household",
  Relief: "relief",
  Electronics: "electronics",
  Furniture: "furniture",
  Sports: "sports",
};

const DISPLAY_CATEGORIES = [...IN_KIND_CATEGORIES].sort((a, b) => {
  const aIndex = ORDER_INDEX.get(a.name) ?? DISPLAY_ORDER.length;
  const bIndex = ORDER_INDEX.get(b.name) ?? DISPLAY_ORDER.length;
  return aIndex - bIndex;
});

/**
 * CategoryStripGanpati — Festive Ganpati skin for category browser rail.
 * Same 9 categories and routes, styled with warm saffron, maroon, and auspicious gold accents.
 */
export function CategoryStripGanpati() {
  const t = useTranslations("categoryStrip");

  return (
    <nav
      aria-label="Festive Category Navigation — Ganeshotsav"
      className="min-w-0 w-full max-w-full rounded-[1.55rem] bg-gradient-to-r from-[#fff9f0]/98 via-[#fffdf9]/98 to-[#fff9f0]/98 border border-amber-300/40 px-2.5 py-2 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_16px_42px_rgba(180,83,9,0.12),0_0_0_1px_rgba(217,119,6,0.08)] backdrop-blur-[3px] dark:from-[#1c0d06]/95 dark:via-[#160803]/95 dark:to-[#1c0d06]/95 dark:border-amber-800/35 dark:shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_16px_42px_rgba(0,0,0,0.4)] sm:px-3 lg:rounded-[2rem] lg:px-[clamp(1rem,2.2vw,2.75rem)] lg:py-[clamp(0.55rem,1.3vh,0.95rem)]"
    >
      <p className="sr-only">{t("heading")}</p>

      <div className="min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible">
        <ul className="flex w-max snap-x snap-mandatory lg:grid lg:w-full lg:grid-cols-9 lg:snap-none">
          {DISPLAY_CATEGORIES.map((cat, index) => {
            const visual = CATEGORY_VISUALS[cat.name];
            const labelKey = CATEGORY_LABEL_KEYS[cat.name];
            const label = labelKey ? t(`categories.${labelKey}`) : cat.name;

            return (
              <li
                key={cat.slug}
                className="relative w-[6rem] shrink-0 snap-start px-1 sm:w-[7.4rem] lg:w-auto lg:px-1.5"
              >
                {index > 0 ? (
                  <span
                    className="absolute bottom-[18%] left-0 top-[18%] hidden w-px bg-gradient-to-b from-amber-300/10 via-amber-400/40 to-amber-300/10 lg:block dark:from-amber-600/10 dark:via-amber-500/30 dark:to-amber-600/10"
                    aria-hidden
                  />
                ) : null}

                <Link
                  href={`/requests/category/${cat.slug}`}
                  aria-label={label}
                  className="group flex min-h-[4.4rem] flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-1.5 text-center transition-all duration-200 ease-out hover:-translate-y-1 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf9] sm:gap-2 lg:min-h-[clamp(5rem,10vh,6.8rem)]"
                >
                  {/* Terracotta / Saffron Medallion Badge */}
                  <span className="relative flex size-9 sm:size-10 lg:size-11 items-center justify-center rounded-full bg-gradient-to-br from-[#fde68a] via-[#f97316] to-[#b45309] p-[1.5px] shadow-[0_3px_10px_rgba(217,119,6,0.22)] transition-all duration-200 group-hover:scale-110 group-hover:shadow-[0_0_18px_rgba(234,88,12,0.5)] dark:from-[#f59e0b] dark:via-[#c2410c] dark:to-[#7c2d12]">
                    <span className="flex size-full items-center justify-center rounded-full bg-amber-50/95 dark:bg-[#1f0d06] text-[#b45309] dark:text-[#fcd34d] transition-colors duration-200 group-hover:bg-gradient-to-br group-hover:from-[#fef3c7] group-hover:to-[#fed7aa] dark:group-hover:from-[#2e1309] dark:group-hover:to-[#3e190c] group-hover:text-[#9a3412]">
                      {visual ? <visual.Icon className="size-4.5 sm:size-5 lg:size-5.5" aria-hidden="true" /> : null}
                    </span>
                  </span>

                  <span className="line-clamp-1 text-[0.62rem] font-bold tracking-tight text-stone-800 transition-colors duration-200 group-hover:text-amber-900 dark:text-stone-200 dark:group-hover:text-amber-200 sm:text-xs lg:text-[clamp(0.68rem,0.85vw,0.85rem)]">
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
