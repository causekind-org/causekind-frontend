"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";

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
      className="min-w-0 w-full max-w-full rounded-[1.55rem] bg-[#fffdf9]/96 px-2.5 py-2 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_16px_42px_rgba(var(--ck-home-shadow-rgb,91,50,22),0.14),0_0_0_1px_rgba(var(--ck-home-shadow-rgb,110,62,30),0.045)] backdrop-blur-[3px] dark:bg-stone-950/95 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_16px_42px_rgba(0,0,0,0.3)] sm:px-3 lg:rounded-[2rem] lg:px-[clamp(1rem,2.2vw,2.75rem)] lg:py-[clamp(0.55rem,1.3vh,0.95rem)]"
    >
      <p className="sr-only">{t("heading")}</p>

      <div className="min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible">
        <ul className="flex w-max snap-x snap-mandatory lg:grid lg:w-full lg:grid-cols-9 lg:snap-none">
          {DISPLAY_CATEGORIES.map((cat, index) => {
            // Same registry the Live Needs filter pills draw from, so the two
            // surfaces cannot disagree about what a category looks like.
            // Optional: an unknown category degrades to a label-only tile
            // rather than throwing on visual.Icon.
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
                    className="absolute bottom-[18%] left-0 top-[18%] hidden w-px bg-[var(--ck-home-accent,#c65729)]/18 lg:block dark:bg-white/10"
                    aria-hidden
                  />
                ) : null}

                <Link
                  href={`/requests/category/${cat.slug}`}
                  aria-label={label}
                  className="group flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-center transition-[transform,background-color] duration-200 ease-out hover:-translate-y-1 hover:bg-[var(--ck-home-hover,#c54805)]/5 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-home-accent,#c54805)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf9] dark:hover:bg-white/5 dark:focus-visible:ring-offset-stone-950 sm:gap-1.5 lg:min-h-[clamp(4.8rem,9.7vh,6.6rem)] lg:gap-2"
                >
                  {/* One ink for all nine, not each category's own colour.
                      CATEGORY_VISUALS gives every category a semantic hue —
                      blue medical, green livelihood, red household — which
                      earns its place on a card or a pill, where the colour
                      tells you what you are looking at. Nine of them in a row
                      read as a rainbow toolbar and belong to no palette. The
                      label already says which category it is, so here the icon
                      follows the page: terracotta for a guest, navy once a
                      donee is signed in. The rest of the app is untouched. */}
                  <span
                    className="flex size-8 items-center justify-center text-[var(--ck-home-ink,#bd4c20)] transition-transform duration-200 ease-out group-hover:-translate-y-0.5 dark:text-[var(--ck-home-highlight,#f09a67)] lg:size-10"
                  >
                    {/* react-icons are solid fills, so there is no strokeWidth to
                        set — the glyphs read heavier than the outlines they
                        replace. Stepped down one size to compensate; the wrapper
                        keeps size-8/lg:size-10 so hit target, row height and the
                        label baseline are unchanged. */}
                    {visual ? <visual.Icon className="size-5 lg:size-6" aria-hidden /> : null}
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
