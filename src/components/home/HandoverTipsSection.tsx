"use client";

import React from "react";
import Link from "@/components/AppLink";
import { MapPin, Ban, ScanSearch, MessagesSquare, Users, Flag } from "lucide-react";
import { DoneeSectionHeading, DONEE_CARD, DONEE_PILL_BUTTON, DONEE_SECTION } from "./DoneeSectionHeading";

const TIPS = [
  { icon: MapPin, title: "Meet in a safe place", text: "Choose a public place, or collect through your NGO." },
  { icon: Ban, title: "Never pay anything", text: "CauseKind is free. No donor should ask you for money." },
  { icon: ScanSearch, title: "Check before confirming", text: "Look at the item before marking it received." },
  { icon: MessagesSquare, title: "Keep chats on CauseKind", text: "Avoid sharing personal details you don't need to." },
  { icon: Users, title: "Bring someone along", text: "If you can, take a family member or friend with you." },
  { icon: Flag, title: "Report problems", text: "If something feels wrong, report it and we'll step in." },
] as const;

/**
 * The only report flow is per offer (`/offers/[id]/issues`), which needs an
 * offer to report against; from the landing page the contact page is the
 * general way to reach the team.
 */
const REPORT_HREF = "/contact";

/** Donee landing only: safety tips for collecting an item. */
export function HandoverTipsSection() {
  return (
    <section
      id="handover-tips"
      aria-labelledby="handover-tips-heading"
      data-ck-role-theme="donee"
      className={DONEE_SECTION}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <DoneeSectionHeading id="handover-tips-heading" eyebrow="Stay safe" title="Tips for a safe handover." />

        <ul className="mt-8 sm:mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {TIPS.map((tip) => {
            const Icon = tip.icon;
            return (
              <li key={tip.title} className={`${DONEE_CARD} flex items-start gap-4 p-5`}>
                <span className="w-10 h-10 shrink-0 rounded-xl bg-[var(--ck-role-soft)] text-[var(--ck-role-accent)] flex items-center justify-center">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">{tip.title}</h3>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">{tip.text}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 sm:mt-8 rounded-2xl bg-[var(--ck-role-soft)] px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--ck-role-on-soft)]">
            Something not right with a handover? We&apos;re here to help.
          </p>
          <Link href={REPORT_HREF} className={`${DONEE_PILL_BUTTON} self-start sm:self-auto`}>
            <Flag className="w-4 h-4" aria-hidden="true" />
            Report a problem
          </Link>
        </div>
      </div>
    </section>
  );
}
