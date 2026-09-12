"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileCheck2, UserSearch, ClipboardList } from "lucide-react";

import { LotusIcon } from "@/components/home/GanpatiVisuals";

/**
 * DoneeDoorEvidenceGanpati — Ganeshotsav skin for what the mobile landing shows
 * below the switcher when the donee door is picked.
 *
 * <p>Sibling to `DoneeDoorEvidence`, picked by `isGanpatiActive()` in
 * `HomeClient` the same way every other festive surface is. The copy is
 * unchanged (`doneeDoor.*`) because it is not marketing — it is the real
 * request lifecycle, and a festival does not change it.
 *
 * <p><b>The three icons stay.</b> `FileCheck2`, `UserSearch` and
 * `ClipboardList` each say what their step does; swapping them for modaks and
 * diyas would make three identical festive badges and lose the sequence. The
 * festival is carried by the badge ring instead — the same gold gradient ring
 * `TrustBandGanpati` uses — so the steps read as themselves inside a festive
 * frame.
 *
 * <p><b>Temple maroon, not teal and no longer leaf green</b>, matching
 * `MobileDoorsGanpati`: the donee side keeps one accent across the door and the
 * evidence below it. Teal never had a place in this palette; leaf green did,
 * but only as a leaf. Every other green in this theme is foliage — toran
 * leaves, garland gradients — so a solid green CTA here read as a success
 * state rather than as a banana leaf. One step below `GANPATI_CONFIG.colors.maroon`.
 */
export function DoneeDoorEvidenceGanpati() {
  const t = useTranslations("doneeDoor");

  const steps = [
    { Icon: FileCheck2, title: t("step1Title"), body: t("step1Body") },
    { Icon: UserSearch, title: t("step2Title"), body: t("step2Body") },
    { Icon: ClipboardList, title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <div className="relative">
      <div className="flex items-center gap-2.5">
        <span className="h-0.5 w-[22px] shrink-0 rounded-full bg-gradient-to-r from-[#6b1717] to-[#92400e] dark:from-[#f87171] dark:to-[#fbbf24]" />
        <span className="text-[0.5625rem] font-extrabold uppercase tracking-[0.16em] text-[#6b1717] dark:text-[#f87171]">
          {t("eyebrow")}
        </span>
        <LotusIcon className="size-3.5 shrink-0" />
      </div>

      <h2 className="mt-3 font-serif text-[1.6rem] font-extrabold leading-[1.18] tracking-tight text-[#1a0f05] dark:text-stone-50">
        {t("heading")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#4a3726] dark:text-stone-300 [text-wrap:pretty]">
        {t("body")}
      </p>

      <ol className="mt-5 grid gap-3">
        {steps.map(({ Icon, title, body }, i) => (
          <li
            key={title}
            className="relative flex gap-3.5 overflow-hidden rounded-[1.25rem] border border-amber-300/55 bg-gradient-to-br from-[#fffaf3] to-[#fff5e8] p-4 shadow-[0_6px_20px_rgba(217,119,6,0.08)] dark:border-amber-900/40 dark:from-[#1f0e06] dark:to-[#170a04]"
          >
            {/* Maroon wash on the step that is actually the product's promise
                — the private match — so the middle card carries a little more
                weight than its neighbours without changing size. */}
            {i === 1 && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_70%_at_0%_100%,rgba(107,23,23,0.09),transparent_62%)]"
              />
            )}

            {/* Gold gradient ring, the same badge shape TrustBandGanpati uses,
                so the two festive surfaces on this column share a vocabulary. */}
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#fde68a] via-[#f97316] to-[#b45309] p-[1.5px] shadow-[0_4px_14px_rgba(217,119,6,0.22)] dark:from-[#f59e0b] dark:via-[#c2410c] dark:to-[#7c2d12]">
              <span className="flex size-full items-center justify-center rounded-full bg-amber-50/95 dark:bg-[#1f0d06]">
                <Icon className="size-[1.15rem] text-[#6b1717] dark:text-[#f87171]" strokeWidth={1.8} aria-hidden />
              </span>
            </span>

            <div className="relative min-w-0">
              <p className="text-[0.9375rem] font-extrabold leading-snug text-[#1a0f05] dark:text-stone-50">
                {title}
              </p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-[#4a3726] dark:text-stone-300">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-5 text-[0.8125rem] leading-relaxed text-[#6b5744] dark:text-stone-400 [text-wrap:pretty]">
        {t("costNote")}
      </p>

      <Link
        href="/register?role=DONEE"
        className="mt-4 flex min-h-[3.125rem] items-center justify-center rounded-[0.8125rem] bg-gradient-to-r from-[#6b1717] via-[#7c2d12] to-[#92400e] text-[0.9375rem] font-extrabold text-white shadow-[0_8px_22px_rgba(107,23,23,0.30)] transition-transform active:scale-[0.97] hover:from-[#450a0a] hover:to-[#6b2410]"
      >
        {t("cta")}
      </Link>
    </div>
  );
}

export default DoneeDoorEvidenceGanpati;
