"use client";

import type { ComponentProps, ComponentType } from "react";
import Link from "next/link";
import {
  Armchair,
  BookOpen,
  BriefcaseBusiness,
  HandHeart,
  House,
  Monitor,
  Shirt,
  Stethoscope,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";

type CategoryIconProps = ComponentProps<"svg"> & { strokeWidth?: number };

function BasketballIcon({ className, strokeWidth = 1.7, ...props }: CategoryIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M8.2 3.6c1.3 2.1 1.7 4.2 1.2 6.4-.6 2.6-2.4 4.7-5.4 6.2" />
      <path d="M15.8 20.4c-1.3-2.1-1.7-4.2-1.2-6.4.6-2.6 2.4-4.7 5.4-6.2" />
      <path d="M3.1 9.8c2.6.2 4.8 1.2 6.6 3 1.7 1.7 2.7 4.4 3 8" />
      <path d="M20.9 14.2c-2.6-.2-4.8-1.2-6.6-3-1.7-1.7-2.7-4.4-3-8" />
    </svg>
  );
}

/** Exact visual order from the supplied marketing reference. */
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

const HERO_CATEGORY_ICONS: Record<string, ComponentType<CategoryIconProps>> = {
  "Medical aid": Stethoscope,
  Education: BookOpen,
  Livelihood: BriefcaseBusiness,
  Clothing: Shirt,
  Household: House,
  Relief: HandHeart,
  Electronics: Monitor,
  Furniture: Armchair,
  Sports: BasketballIcon,
};

const DISPLAY_CATEGORIES = [...IN_KIND_CATEGORIES].sort((a, b) => {
  const aIndex = ORDER_INDEX.get(a.name) ?? DISPLAY_ORDER.length;
  const bIndex = ORDER_INDEX.get(b.name) ?? DISPLAY_ORDER.length;
  return aIndex - bIndex;
});

/** Nine real category routes: one row on desktop, a snap rail on narrow screens. */
export function CategoryStrip() {
  const t = useTranslations("categoryStrip");

  return (
    <nav
      aria-label={t("ariaLabel")}
      className="min-w-0 w-full max-w-full rounded-[1.55rem] bg-[#fffdf9]/96 px-2.5 py-2 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_16px_42px_rgba(91,50,22,0.14),0_0_0_1px_rgba(110,62,30,0.045)] backdrop-blur-[3px] dark:bg-stone-950/95 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_16px_42px_rgba(0,0,0,0.3)] sm:px-3 lg:rounded-[2rem] lg:px-[clamp(1rem,2.2vw,2.75rem)] lg:py-[clamp(0.55rem,1.3vh,0.95rem)]"
    >
      <p className="sr-only">{t("heading")}</p>

      <div className="min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible">
        <ul className="flex w-max snap-x snap-mandatory lg:grid lg:w-full lg:grid-cols-9 lg:snap-none">
          {DISPLAY_CATEGORIES.map((cat, index) => {
            const Icon = HERO_CATEGORY_ICONS[cat.name];
            const labelKey = CATEGORY_LABEL_KEYS[cat.name];
            const label = labelKey ? t(`categories.${labelKey}`) : cat.name;

            return (
              <li
                key={cat.slug}
                className="relative w-[6rem] shrink-0 snap-start px-1 sm:w-[7.4rem] lg:w-auto lg:px-1.5"
              >
                {index > 0 ? (
                  <span
                    className="absolute bottom-[18%] left-0 top-[18%] hidden w-px bg-[#c65729]/18 lg:block dark:bg-white/10"
                    aria-hidden
                  />
                ) : null}

                <Link
                  href={`/requests/category/${cat.slug}`}
                  aria-label={label}
                  className="group flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-center transition-[transform,background-color] duration-200 ease-out hover:-translate-y-1 hover:bg-[#c54805]/5 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c54805] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf9] dark:hover:bg-white/5 dark:focus-visible:ring-offset-stone-950 sm:gap-1.5 lg:min-h-[clamp(4.8rem,9.7vh,6.6rem)] lg:gap-2"
                >
                  <span className="flex size-8 items-center justify-center text-[#bd4c20] transition-transform duration-200 ease-out group-hover:-translate-y-0.5 dark:text-[#f09a67] lg:size-10">
                    <Icon className="size-6 lg:size-7" strokeWidth={1.7} aria-hidden />
                  </span>
                  <span className="max-w-full text-[0.58rem] font-extrabold uppercase leading-tight tracking-[0.04em] text-[#27221e] dark:text-stone-200 sm:text-[0.62rem] lg:text-[clamp(0.58rem,0.63vw,0.76rem)]">
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
