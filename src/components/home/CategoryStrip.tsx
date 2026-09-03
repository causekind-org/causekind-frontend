"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";

/**
 * The reference showed eight categories. CauseKind has nine, and Furniture is
 * not an afterthought: it belongs next to Household because visitors scan this
 * rail by the kind of object they have in front of them.
 */
const DISPLAY_ORDER = [
  "Education",
  "Clothing",
  "Household",
  "Furniture",
  "Medical aid",
  "Livelihood",
  "Relief",
  "Electronics",
  "Sports",
] as const;

const ORDER_INDEX = new Map<string, number>(
  DISPLAY_ORDER.map((name, index) => [name, index]),
);

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  Education: "education",
  Clothing: "clothing",
  Household: "household",
  Furniture: "furniture",
  "Medical aid": "medicalAid",
  Livelihood: "livelihood",
  Relief: "relief",
  Electronics: "electronics",
  Sports: "sports",
};

const DISPLAY_CATEGORIES = [...IN_KIND_CATEGORIES].sort((a, b) => {
  const aIndex = ORDER_INDEX.get(a.name) ?? DISPLAY_ORDER.length;
  const bIndex = ORDER_INDEX.get(b.name) ?? DISPLAY_ORDER.length;
  return aIndex - bIndex;
});

/** All nine public need categories: one row on desktop, a clear swipe rail on phones. */
export function CategoryStrip() {
  const t = useTranslations("categoryStrip");

  return (
    <nav
      aria-label={t("ariaLabel")}
      className="w-full rounded-[1.5rem] bg-white/96 px-3 py-3.5 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_14px_38px_rgba(79,47,25,0.13)] backdrop-blur-sm dark:bg-stone-950/94 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_14px_38px_rgba(0,0,0,0.28)] sm:px-4 lg:px-5 lg:py-[clamp(0.5rem,1.5vh,1rem)]"
    >
      <p className="px-2 pb-2.5 text-[0.65rem] font-bold uppercase tracking-[0.17em] text-[#1e3a60] dark:text-[#a9c5e4] lg:sr-only">
        {t("heading")}
      </p>

      <div className="overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible lg:pb-0">
        <ul className="flex w-max snap-x snap-mandatory lg:grid lg:w-full lg:grid-cols-9 lg:snap-none">
          {DISPLAY_CATEGORIES.map((cat, index) => {
            const Icon = CATEGORY_VISUALS[cat.name]?.Icon;
            const labelKey = CATEGORY_LABEL_KEYS[cat.name];
            const label = labelKey ? t(`categories.${labelKey}`) : cat.name;

            return (
              <li
                key={cat.slug}
                className={`w-[7.35rem] shrink-0 snap-start px-1.5 sm:w-[8rem] lg:w-auto lg:px-1 ${
                  index > 0
                    ? "lg:border-l lg:border-stone-200 lg:dark:border-white/10"
                    : ""
                }`}
              >
                <Link
                  href={`/requests/category/${cat.slug}`}
                  aria-label={label}
                  className="group flex min-h-[5.4rem] flex-col items-center justify-center gap-2 rounded-xl px-1.5 py-2 text-center transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#b04a15]/6 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-white/5 dark:focus-visible:ring-offset-stone-950 lg:min-h-[clamp(3.25rem,6.8vh,4.8rem)]"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#f7eee6] text-[#b04a15] transition-transform duration-200 ease-out group-hover:-translate-y-0.5 dark:bg-[#b04a15]/16 dark:text-[#ee9b69] lg:size-9 lg:bg-transparent lg:dark:bg-transparent">
                    {Icon ? (
                      <Icon className="size-5.5 lg:size-6" strokeWidth={1.55} aria-hidden />
                    ) : null}
                  </span>
                  <span className="max-w-full text-[0.61rem] font-bold uppercase leading-tight tracking-[0.055em] text-stone-800 dark:text-stone-200 sm:text-[0.66rem] lg:text-[0.6rem] xl:text-[0.66rem]">
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
