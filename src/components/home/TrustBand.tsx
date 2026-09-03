"use client";

import { HeartHandshake, MapPin, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * The reassurance band from the marketing reference, under the category rail.
 *
 * <p>It replaces the inline `TrustBar` that used to sit in the hero's copy
 * column. Same job — say why this is safe before anyone is asked to act — but
 * the reference gives each claim a subline, and three of those do not fit on
 * one line beside the headline.
 *
 * <p>Deliberately static. Wiring it to `PlatformStats` would put a live counter
 * here that can read zero on a quiet week, which is worse than no number.
 */
export function TrustBand() {
  const t = useTranslations("trustBand");

  const items = [
    { Icon: ShieldCheck, title: t("trustedTitle"), body: t("trustedBody") },
    { Icon: MapPin, title: t("impactTitle"), body: t("impactBody") },
    { Icon: HeartHandshake, title: t("togetherTitle"), body: t("togetherBody") },
  ];

  return (
    <section
      aria-label={t("label")}
      // The peach ground is the brand terra at a tenth, not a new literal: the
      // hero palette is one token by decision, and a second warm colour here
      // would be exactly the drift that decision exists to prevent.
      className="rounded-[1.5rem] bg-[rgba(176,74,21,0.10)] px-4 py-4 dark:bg-[rgba(176,74,21,0.16)] sm:px-6 lg:px-7 lg:py-5"
    >
      <ul className="grid gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-0">
        {items.map(({ Icon, title, body }, index) => (
          <li
            key={title}
            className={`flex items-center gap-3.5 sm:gap-4 ${
              index > 0
                ? "lg:border-l lg:border-[#b04a15]/18 lg:pl-7 dark:lg:border-white/12"
                : ""
            } ${index < 2 ? "lg:pr-7" : ""}`}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-[#b04a15] shadow-[0_1px_2px_rgba(73,42,20,0.12)] dark:bg-stone-900 dark:text-[#ee9b69] sm:size-12">
              <Icon className="size-5 sm:size-5.5" strokeWidth={1.6} aria-hidden />
            </span>

            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight text-stone-900 dark:text-stone-100 sm:text-[0.95rem]">
                {title}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-stone-600 [text-wrap:pretty] dark:text-stone-400 sm:text-[0.8rem]">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
