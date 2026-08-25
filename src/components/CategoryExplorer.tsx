"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import AnimatedCategoryIcon, { ICON_MOTION_PARENT_PROPS } from "./AnimatedCategoryIcon";

/**
 * The nine categories as a browsable grid. Used on the /requests hub, and as
 * cross-navigation at the foot of each category page — where `exclude` drops the
 * page you are already on.
 */
export default function CategoryExplorer({
  exclude,
  heading = "Browse by category",
  blurb = "What each category means, what actually helps, and how to prepare an item before you hand it over.",
}: {
  exclude?: string;
  heading?: string;
  blurb?: string;
}) {
  const cats = exclude ? IN_KIND_CATEGORIES.filter((c) => c.name !== exclude) : IN_KIND_CATEGORIES;

  return (
    <section className="w-full">
      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">{heading}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">{blurb}</p>

      <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {cats.map((cat) => {
          const visual = CATEGORY_VISUALS[cat.name];
          return (
            <motion.li key={cat.slug} {...ICON_MOTION_PARENT_PROPS}>
              <Link
                href={`/requests/category/${cat.slug}`}
                className="group flex h-full flex-col gap-2 rounded-2xl border border-stone-200/80 bg-white/70 p-3.5 transition-colors hover:border-[var(--ck-role-accent)]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              >
                <span className={`inline-flex w-fit rounded-lg p-2 ${visual.iconBg} ${visual.text}`}>
                  <AnimatedCategoryIcon category={cat.name} iconClassName="w-4 h-4" />
                </span>
                <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">{cat.name}</span>
                <span className="text-xs leading-snug text-stone-500 dark:text-stone-400 line-clamp-2">
                  {cat.tagline}
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
