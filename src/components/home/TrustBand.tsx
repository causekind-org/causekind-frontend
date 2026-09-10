"use client";

import { Heart, ShieldCheck, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

/** The three reassurance statements forming the quiet lower edge of the hero. */
export function TrustBand() {
  const t = useTranslations("trustBand");

  const items = [
    { Icon: ShieldCheck, title: t("trustedTitle"), body: t("trustedBody") },
    { Icon: UsersRound, title: t("impactTitle"), body: t("impactBody") },
    { Icon: Heart, title: t("togetherTitle"), body: t("togetherBody") },
  ];

  return (
    <section
      aria-label={t("label")}
      className="rounded-[1.25rem] bg-[#faf1e8]/84 px-1 py-2 backdrop-blur-[2px] dark:bg-[#231a15]/86 sm:px-3 sm:py-3 lg:rounded-none lg:bg-transparent lg:px-[clamp(1rem,3vw,4rem)] lg:py-[clamp(0.45rem,1.25vh,1rem)] lg:backdrop-blur-none lg:dark:bg-transparent"
    >
      <ul className="grid grid-cols-3 gap-0">
        {items.map(({ Icon, title, body }, index) => (
          <li
            key={title}
            className={`flex min-w-0 items-center justify-center gap-2 px-1.5 sm:gap-3 sm:px-3 lg:gap-4 lg:px-[clamp(1rem,2.8vw,3.6rem)] ${
              index > 0 ? "border-l border-[var(--ck-home-accent,#c65729)]/18 dark:border-white/10" : ""
            }`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--ck-home-soft,#fce1c5)] text-[var(--ck-home-ink,#c54805)] dark:bg-[var(--ck-home-accent,#c54805)]/22 dark:text-[var(--ck-home-highlight,#f2a06e)] sm:size-10 lg:size-[clamp(2.8rem,3.5vw,4.15rem)]">
              <Icon className="size-4 sm:size-5 lg:size-[clamp(1.25rem,1.7vw,2rem)]" strokeWidth={1.7} aria-hidden />
            </span>

            <div className="min-w-0">
              <p className="text-[0.58rem] font-extrabold leading-tight text-[#211b17] dark:text-stone-100 sm:text-xs lg:text-[clamp(0.72rem,0.9vw,1.05rem)]">
                {title}
              </p>
              <p className="mt-0.5 hidden text-[0.65rem] leading-snug text-[#49423d] dark:text-stone-400 sm:block lg:text-[clamp(0.64rem,0.72vw,0.86rem)]">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
