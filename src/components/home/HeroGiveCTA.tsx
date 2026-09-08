"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";

/**
 * The homepage's primary call to action.
 *
 * <p><b>Why it exists.</b> The hero had no call to action at all — not one
 * `href` — while every link to the need board sat further down the page. The
 * strongest thing this platform can show a visitor is real, verified, nearby
 * needs, and it was asking them to scroll to find it.
 *
 * <p>Each category goes straight to its own page, which is public, indexable and
 * needs no account. That is the whole argument against a downloadable lead
 * magnet here: someone can see the actual thing in one click, and a PDF cannot
 * compete with that.
 *
 * <p><b>Reuses the registry, not the card grid.</b> `CategoryExplorer` renders
 * the same nine categories, but as light-surface cards with taglines. Forcing it
 * into a dark hero would mean overriding nearly every class it sets — a second
 * component wearing a prop. What matters for drift is that both derive from
 * `IN_KIND_CATEGORIES` and both build `/requests/category/<slug>`, and they do.
 */
export function HeroGiveCTA() {
  const t = useTranslations("heroGive");

  return (
    <motion.div
      className="w-full max-w-xl"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 75, damping: 20, delay: 0.4 }}
    >
      <p className="text-white/90 text-sm sm:text-base font-bold">{t("heading")}</p>
      <p className="mt-1 text-white/65 text-xs sm:text-sm leading-relaxed">{t("blurb")}</p>

      <ul className="mt-3 flex flex-wrap gap-2">
        {IN_KIND_CATEGORIES.map((cat) => (
          <li key={cat.slug}>
            <Link
              href={`/requests/category/${cat.slug}`}
              className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-2xs sm:text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20 hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {cat.name}
            </Link>
          </li>
        ))}
      </ul>

      {/* Someone who does not want to choose a category should still have a way
          in — the category chips are a shortcut, not a gate. */}
      <Link
        href="/requests"
        className="mt-3.5 inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#f0b97a] hover:text-white transition-colors"
      >
        {t("seeAll")}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </motion.div>
  );
}
