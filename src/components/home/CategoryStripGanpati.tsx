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
 * CategoryStripGanpati — Category browser row locked to reference design:
 * - Solid filled orange glyphs (no circle badge background behind them)
 * - Bold uppercase labels placed tightly beneath the icon
 * - Thin subtle vertical divider line between each item
 * - Clean rounded white card container
 */
export function CategoryStripGanpati() {
  const t = useTranslations("categoryStrip");

  return (
    <nav
      aria-label="Festive Category Navigation — Ganeshotsav"
      className="min-w-0 w-full max-w-full rounded-[2rem] sm:rounded-[2.5rem] bg-[#fffdfa]/98 border border-amber-200/70 px-3 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-md dark:bg-[#1a0c06]/98 dark:border-amber-800/40 dark:shadow-[0_16px_45px_rgba(0,0,0,0.5)] sm:px-5 sm:py-3.5 lg:px-6 lg:py-4"
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
                className="relative w-[6.6rem] shrink-0 snap-start px-1 sm:w-[7.6rem] lg:w-auto lg:px-1.5"
              >
                {/* Thin vertical divider line between category items */}
                {index > 0 ? (
                  <span
                    className="absolute bottom-[20%] left-0 top-[20%] hidden w-px bg-amber-200/70 lg:block dark:bg-amber-800/40"
                    aria-hidden="true"
                  />
                ) : null}

                <Link
                  href={`/requests/category/${cat.slug}`}
                  aria-label={label}
                  className="group flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-1 text-center transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-950 sm:gap-2 lg:min-h-[4.8rem]"
                >
                  {/* Solid filled orange glyph sitting directly on background, no circle container */}
                  <span className="flex size-7.5 sm:size-8.5 items-center justify-center text-[#c2410c] dark:text-[#f97316] transition-transform duration-200 ease-out group-hover:scale-110">
                    {visual ? (
                      <visual.Icon
                        className="size-5.5 sm:size-6 text-[#c2410c] dark:text-[#f97316]"
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>

                  {/* Bold uppercase label tight beneath icon */}
                  <span className="line-clamp-1 text-[0.62rem] sm:text-[0.68rem] lg:text-[0.74rem] font-bold uppercase tracking-wider text-[#291b12] transition-colors duration-200 group-hover:text-[#c2410c] dark:text-stone-200 dark:group-hover:text-amber-200">
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
