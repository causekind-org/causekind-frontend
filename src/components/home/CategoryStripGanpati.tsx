"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Ambulance,
  GraduationCap,
  Wrench,
  Shirt,
  Home,
  HandHeart,
  Laptop,
  Armchair,
  Volleyball,
  type LucideIcon,
} from "lucide-react";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";

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

/**
 * Outline linework icons matching reference mockup
 */
const GANPATI_OUTLINE_ICONS: Record<string, LucideIcon> = {
  "Medical aid": Ambulance,
  Education: GraduationCap,
  Livelihood: Wrench,
  Clothing: Shirt,
  Household: Home,
  Relief: HandHeart,
  Electronics: Laptop,
  Furniture: Armchair,
  Sports: Volleyball,
};

const DISPLAY_CATEGORIES = [...IN_KIND_CATEGORIES].sort((a, b) => {
  const aIndex = ORDER_INDEX.get(a.name) ?? DISPLAY_ORDER.length;
  const bIndex = ORDER_INDEX.get(b.name) ?? DISPLAY_ORDER.length;
  return aIndex - bIndex;
});

/**
 * CategoryStripGanpati — Festive Ganpati skin for category browser rail.
 * Recreated to match the reference mockup:
 * - Larger circles with cream/white fill and thin orange outline border.
 * - Orange linework outline icon style inside (not solid filled).
 * - Generous spacing between items for an airy, premium look.
 */
export function CategoryStripGanpati() {
  const t = useTranslations("categoryStrip");

  return (
    <nav
      aria-label="Festive Category Navigation — Ganeshotsav"
      className="min-w-0 w-full max-w-full rounded-[2rem] sm:rounded-[3rem] bg-[#fffdfa]/98 border border-amber-200/80 px-3 py-3.5 shadow-[0_16px_45px_rgba(217,119,6,0.12),0_1px_4px_rgba(0,0,0,0.03)] backdrop-blur-md dark:bg-[#1a0c06]/98 dark:border-amber-800/40 dark:shadow-[0_16px_45px_rgba(0,0,0,0.5)] sm:px-6 sm:py-4 lg:px-8 lg:py-5"
    >
      <p className="sr-only">{t("heading")}</p>

      <div className="min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible">
        <ul className="flex w-max snap-x snap-mandatory lg:grid lg:w-full lg:grid-cols-9 lg:snap-none">
          {DISPLAY_CATEGORIES.map((cat, index) => {
            const Icon = GANPATI_OUTLINE_ICONS[cat.name];
            const labelKey = CATEGORY_LABEL_KEYS[cat.name];
            const label = labelKey ? t(`categories.${labelKey}`) : cat.name;

            return (
              <li
                key={cat.slug}
                className="relative w-[6.8rem] shrink-0 snap-start px-1.5 sm:w-[8.2rem] lg:w-auto lg:px-2"
              >
                {index > 0 ? (
                  <span
                    className="absolute bottom-[20%] left-0 top-[20%] hidden w-px bg-amber-200/60 lg:block dark:bg-amber-800/40"
                    aria-hidden
                  />
                ) : null}

                <Link
                  href={`/requests/category/${cat.slug}`}
                  aria-label={label}
                  className="group flex min-h-[5.4rem] flex-col items-center justify-center gap-2.5 rounded-2xl px-1 py-1.5 text-center transition-all duration-200 ease-out hover:-translate-y-1 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:gap-3 lg:min-h-[6.6rem]"
                >
                  {/* Large Light Cream Circle with Thin Orange Outline Border */}
                  <span className="relative flex size-13 sm:size-14 lg:size-[3.5rem] items-center justify-center rounded-full border border-orange-500/80 bg-[#fffdfa] dark:bg-[#220e06] text-[#ea580c] dark:text-[#fb923c] shadow-xs transition-all duration-200 ease-out group-hover:scale-105 group-hover:border-orange-600 group-hover:shadow-[0_0_18px_rgba(234,88,12,0.28)]">
                    {Icon ? (
                      <Icon
                        className="size-6 sm:size-6.5 lg:size-7 text-[#ea580c] dark:text-[#f97316] stroke-[1.65] transition-transform duration-200 group-hover:scale-110"
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>

                  <span className="line-clamp-1 text-[0.74rem] font-semibold tracking-tight text-[#291b12] transition-colors duration-200 group-hover:text-[#c2410c] dark:text-stone-200 dark:group-hover:text-amber-200 sm:text-xs lg:text-[0.84rem]">
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
