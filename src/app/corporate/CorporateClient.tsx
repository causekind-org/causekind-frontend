"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, HardDrive, QrCode, Sofa } from "lucide-react";

import { SubscribeForm } from "@/components/SubscribeForm";

/**
 * The corporate magnet's landing page.
 *
 * <p><b>It leads with the certificate, not with giving.</b> A company clearing an
 * office can donate anywhere; what it usually cannot get is auditable proof that a
 * specific item reached a specific verified need. This platform already produces
 * exactly that, and it is the one thing a generic "donate your old laptops" pitch
 * cannot match — so it is the offer, not a footnote.
 *
 * <p>Nothing here claims anything about tax treatment. That varies by entity, and
 * being wrong about it on a page aimed at finance teams is worse than staying
 * quiet.
 *
 * <p>The capture posts `source: "office-pack"`, which the server's MagnetCatalog
 * maps to the pack itself. Change one and the other stops matching, which is why
 * the string is the contract between them.
 */
export default function CorporateClient() {
  const t = useTranslations("corporate");

  const points = [
    { Icon: Sofa, key: "bulk" },
    { Icon: HardDrive, key: "wipe" },
    { Icon: BadgeCheck, key: "handover" },
    { Icon: QrCode, key: "certificate" },
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
            audience="CORPORATE"
            source="office-pack"
            consentText={t("form.consent")}
            submitLabel={t("form.submit")}
            sendingLabel={t("form.sending")}
            successText={t("form.success")}
            errorText={t("form.error")}
            emailPlaceholder={t("form.emailPlaceholder")}
          />
        </section>
      </div>
    </main>
  );
}
