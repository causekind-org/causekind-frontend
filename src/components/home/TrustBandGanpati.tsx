"use client";

import { useTranslations } from "next-intl";
import { ModakIcon, LotusIcon, GhantiIcon } from "@/components/home/GanpatiVisuals";

/**
 * TrustBandGanpati — Festive Ganpati skin for the trust & reassurance band.
 * Retains the 3-stat reassurance layout ("Trusted & Verified", "Hyperlocal Giving", "Zero Commission"),
 * swapping icons for sacred Modak, Ghanti (temple bell), and Lotus (sacred flower), with a festive golden saffron tint.
 */
export function TrustBandGanpati() {
  const t = useTranslations("trustBand");

  const items = [
    {
      Icon: ModakIcon,
      title: t("trustedTitle"),
      body: t("trustedBody"),
      badgeBg: "bg-amber-100 dark:bg-amber-950/60 border border-amber-300/40",
      textColor: "text-amber-800 dark:text-amber-300",
    },
    {
      Icon: GhantiIcon,
      title: t("impactTitle"),
      body: t("impactBody"),
      badgeBg: "bg-orange-100 dark:bg-orange-950/60 border border-orange-300/40",
      textColor: "text-orange-800 dark:text-orange-300",
    },
    {
      Icon: LotusIcon,
      title: t("togetherTitle"),
      body: t("togetherBody"),
      badgeBg: "bg-yellow-100 dark:bg-yellow-950/60 border border-yellow-300/40",
      textColor: "text-yellow-800 dark:text-yellow-300",
    },
  ];

  return (
    <section
      aria-label="Festive Reassurance — CauseKind"
      className="rounded-[1.25rem] bg-gradient-to-r from-amber-50/90 via-orange-50/85 to-amber-50/90 border border-amber-200/50 px-2 py-2.5 backdrop-blur-[3px] dark:from-[#2a1309]/90 dark:via-[#1e0e06]/90 dark:to-[#2a1309]/90 dark:border-amber-900/30 sm:px-4 sm:py-3.5 lg:rounded-2xl lg:px-[clamp(1.5rem,3vw,4rem)] lg:py-[clamp(0.6rem,1.4vh,1.1rem)] shadow-[0_4px_20px_rgba(217,119,6,0.08)]"
    >
      <ul className="grid grid-cols-3 gap-0">
        {items.map(({ Icon, title, body, badgeBg, textColor }, index) => (
          <li
            key={title}
            className={`flex min-w-0 items-center justify-center gap-1.5 px-1 sm:gap-3 sm:px-3 lg:gap-4 lg:px-[clamp(1rem,2.8vw,3.6rem)] ${
              index > 0 ? "border-l border-amber-300/35 dark:border-amber-700/25" : ""
            }`}
          >
            <span
              className="relative flex size-8 sm:size-10 lg:size-[clamp(2.8rem,3.5vw,4.15rem)] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#fde68a] via-[#f97316] to-[#b45309] p-[1.5px] shadow-[0_4px_14px_rgba(217,119,6,0.25)] dark:from-[#f59e0b] dark:via-[#c2410c] dark:to-[#7c2d12]"
            >
              <span className="flex size-full items-center justify-center rounded-full bg-amber-50/95 dark:bg-[#1f0d06] shadow-inner">
                <Icon className="size-4 sm:size-5 lg:size-[clamp(1.25rem,1.7vw,2rem)]" />
              </span>
            </span>

            <div className="min-w-0">
              <p className={`text-[0.58rem] font-black leading-tight sm:text-xs lg:text-[clamp(0.72rem,0.9vw,1.05rem)] ${textColor}`}>
                {title}
              </p>
              <p className="mt-0.5 hidden text-[0.65rem] leading-snug text-stone-600 dark:text-stone-300 sm:block lg:text-[clamp(0.64rem,0.72vw,0.86rem)]">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
