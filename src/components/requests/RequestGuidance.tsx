"use client";

import { CheckCircle2 } from "lucide-react";

/**
 * What actually decides whether a request is approved, told to the person
 * writing it.
 *
 * <p><b>Why this exists.</b> Donees already have accounts, so there is no lead to
 * capture here and no list to join — the useful thing is simply to help them
 * succeed. The most common way a request stalls is not a bad request; it is a
 * mandatory document a machine could not read, which drops it out of the fast
 * path and into a queue.
 *
 * <p><b>Every claim here is checked against the gate.</b> Auto-approval requires
 * tier 1 or 2, both mandatory documents AI-verified, and no hard escalation
 * ({@code NeedAssessmentService}). Optional documents are not part of that, which
 * is why this does not imply they speed anything up.
 *
 * <p><b>It deliberately does not pressure anyone.</b> The backend treats optional
 * evidence as a fact and never a penalty — the code calls this "anti-coercion" in
 * as many words. Copy that says "each one helps you get approved faster" quietly
 * reverses that, and asks people in difficulty to hand over more of their private
 * life than is required. It also says plainly that a failed check is not a
 * rejection, because being told a document "doesn't look valid" is alarming if
 * nobody explains that a human still looks.
 */
export function RequestGuidance({ autoApprovalPossible }: {
  /** True for tiers 1–2, where a request can complete without waiting for an admin. */
  autoApprovalPossible: boolean;
}) {
  const points = [
    "Photograph the whole document, flat and in good light. Most delays are a required document that was too dark or cut off to read — not a problem with the request itself.",
    "Make sure the text is readable. If a name or address cannot be made out, someone has to check it by hand.",
    autoApprovalPossible
      ? "If both required documents are clear, your request can be approved without waiting for anyone."
      : "Requests like yours are always reviewed by a person, so clear documents mainly save them going back and forth with you.",
    "If a check says a document doesn't look right, that is not a rejection. A person reviews it either way — it only means the quick route is unavailable.",
  ];

  return (
    <div className="rounded-xl sm:rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-zinc-900 p-3 sm:p-4">
      <p className="text-xs font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
        Getting this approved
      </p>
      <ul className="mt-2.5 space-y-2">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2">
            <CheckCircle2
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b04a15] dark:text-[#e07b3a]"
              aria-hidden
            />
            <span className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              {point}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
