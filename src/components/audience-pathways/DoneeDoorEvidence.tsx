"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileCheck2, UserSearch, ClipboardList } from "lucide-react";
import LetterSwap from "@/components/LetterSwap";

/**
 * What the mobile landing shows below the switcher when the donee door is
 * picked.
 *
 * <p>This is the one genuinely new surface in the Doors build. Everything under
 * the hero today is donor-facing — live needs, campaigns, unclaimed — so a
 * visitor who says "I need something" currently has nothing to read.
 *
 * <p>The three beats are the real request lifecycle, not marketing: a request
 * is verified by a person, then offered privately to matching donors, and only
 * reaches the public board if that fails. That order is the product and it is
 * invisible on the site today. See the need-first architecture notes in
 * `project-brain/`.
 */
export function DoneeDoorEvidence() {
  const t = useTranslations("doneeDoor");

  const steps = [
    { Icon: FileCheck2, title: t("step1Title"), body: t("step1Body") },
    { Icon: UserSearch, title: t("step2Title"), body: t("step2Body") },
    { Icon: ClipboardList, title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="h-0.5 w-[22px] shrink-0 rounded-full bg-teal-700 dark:bg-teal-400" />
        <span className="text-3xs font-extrabold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
          {t("eyebrow")}
        </span>
      </div>
      <h2 className="mt-3 text-2xl font-extrabold leading-[1.2] tracking-tight text-stone-900 dark:text-stone-50">
        <LetterSwap text={t("heading")} />
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300 [text-wrap:pretty]">
        {t("body")}
      </p>

      <ol className="mt-5 grid gap-3">
        {steps.map(({ Icon, title, body }) => (
          <li
            key={title}
            className="flex gap-3.5 rounded-[1.25rem] border border-[var(--ck-home-soft,#e8e2d5)] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-700/10 text-teal-700 dark:bg-teal-400/15 dark:text-teal-400">
              <Icon className="size-5" strokeWidth={1.8} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-extrabold leading-snug text-stone-900 dark:text-stone-50">
                {title}
              </p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-stone-600 dark:text-stone-300">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-5 text-[0.8125rem] leading-relaxed text-stone-500 dark:text-stone-400 [text-wrap:pretty]">
        {t("costNote")}
      </p>

      <Link
        href="/register?role=DONEE"
        className="ck-cta-live mt-4 flex min-h-[3.125rem] items-center justify-center rounded-[0.8125rem] bg-teal-700 text-[0.9375rem] font-extrabold text-white transition-transform active:scale-[0.97] hover:bg-teal-800"
      >
        {t("cta")}
      </Link>
    </div>
  );
}

export default DoneeDoorEvidence;
