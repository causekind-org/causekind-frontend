"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { BadgeCheck, FileSearch, MapPin, ShieldQuestion } from "lucide-react";

import { SubscribeForm } from "@/components/SubscribeForm";

/**
 * The donor magnet's landing page.
 *
 * <p>The offer is a verification checklist, and the page has to earn it by being
 * useful before the form appears. A page that only says "give us your email for
 * a checklist" is asking for trust it has not shown.
 *
 * <p><b>It does not claim CauseKind is the only safe way to give.</b> The
 * checklist is written to be useful to someone donating anywhere, including
 * somewhere else entirely — which is the point. A verification guide that
 * quietly concludes "so use us" is an advert, and people can tell.
 *
 * <p>The capture posts `source: "ngo-checklist"`, which the server's
 * MagnetCatalog maps to the checklist itself. That string is the contract between
 * the two, and is pinned by a test on each side.
 */
export default function GiveSafelyClient() {
  const t = useTranslations("giveSafely");

  const points = [
    { Icon: FileSearch, key: "registration" },
    { Icon: MapPin, key: "destination" },
    { Icon: BadgeCheck, key: "proof" },
    { Icon: ShieldQuestion, key: "urgency" },
  ] as const;

  return (
    <main className="bg-[#faf8f5] dark:bg-zinc-950 min-h-screen">
      <div className="mx-auto max-w-3xl px-6 sm:px-10 py-16 sm:py-24">
        <p className="text-3xs font-black uppercase tracking-[0.24em] text-[#b04a15] dark:text-[#e07b3a]">
          {t("eyebrow")}
        </p>

        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-stone-900 dark:text-stone-100">
          {t("heading")}
        </h1>

        <p className="mt-4 text-base sm:text-lg leading-relaxed text-stone-600 dark:text-stone-400">
          {t("standfirst")}
        </p>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {points.map(({ Icon, key }) => (
            <li
              key={key}
              className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-zinc-900 p-5"
            >
              <Icon className="h-5 w-5 text-[#b04a15] dark:text-[#e07b3a]" aria-hidden />
              <p className="mt-3 text-sm font-bold text-stone-900 dark:text-stone-100">
                {t(`points.${key}.title`)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                {t(`points.${key}.body`)}
              </p>
            </li>
          ))}
        </ul>

        <section className="mt-12 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-zinc-900 p-6 sm:p-8">
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-100">
            {t("form.heading")}
          </h2>
          <p className="mt-1.5 mb-5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {t("form.standfirst")}
          </p>

          <SubscribeForm
            audience="DONOR"
            source="ngo-checklist"
            consentText={t("form.consent")}
            submitLabel={t("form.submit")}
            sendingLabel={t("form.sending")}
            successText={t("form.success")}
            errorText={t("form.error")}
            emailPlaceholder={t("form.emailPlaceholder")}
          />
        </section>

        {/* Someone who came here to check a charity may simply want to give now.
            Not gating that behind the form is the same principle as the copy:
            be useful first. */}
        <p className="mt-8 text-sm text-stone-600 dark:text-stone-400">
          {t("browse.prefix")}{" "}
          <Link href="/requests" className="font-bold text-[#b04a15] dark:text-[#e07b3a] underline underline-offset-2">
            {t("browse.link")}
          </Link>
        </p>
      </div>
    </main>
  );
}
