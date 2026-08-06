"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, Check, Clock, Heart, PackageCheck, Pencil, ScanSearch, ShieldX, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EASE } from "@/features/wizard-kit/wizardMotion";
import type { DonationOffer } from "@/lib/api";

/**
 * What the donor sees after submitting.
 *
 * <p>Replaces a screen that fell through to `Status: {offer.status}` and printed
 * the raw enum — a donor who had just finished a five-step form was told
 * "SUBMITTED" and left to work out what that meant. Every status now maps to a
 * plain sentence about what is happening and who has it.
 *
 * <p>The journey rail is the point of the redesign: submitting is not the end of
 * anything, and a bare tick implies it is. Showing four stages with the current
 * one lit answers "what now?" before it is asked.
 */

type Stage = "screening" | "recipient" | "approved" | "closed";

const STAGES: { key: Exclude<Stage, "closed">; label: string; icon: LucideIcon }[] = [
  { key: "screening", label: "Checks", icon: ScanSearch },
  { key: "recipient", label: "Recipient", icon: Heart },
  { key: "approved", label: "Handover", icon: PackageCheck },
];

type Presentation = {
  stage: Stage;
  title: string;
  body: string;
  /** Accent for the badge; terracotta by default, amber/red for the exceptions. */
  tone: "accent" | "amber" | "red" | "green";
  icon: LucideIcon;
  /** True while the platform is still working — drives the pulse. */
  pending?: boolean;
  primary?: { label: string; action: "offers" | "edit" };
};

function present(status: string | undefined, rejectionReason: string | null | undefined): Presentation {
  switch (status) {
    case "SUBMITTED":
    case "AI_ELIGIBILITY_SCREENING":
    case "AI_COMPATIBILITY_SCREENING":
      return {
        stage: "screening", tone: "accent", icon: ScanSearch, pending: true,
        title: "Offer sent for checks",
        body: "We're reviewing your photos and details. This usually takes a few minutes — you don't need to wait here.",
        primary: { label: "View my offers", action: "offers" },
      };

    case "COMPATIBILITY_CHECKED":
    case "PENDING_ADMIN_APPROVAL":
      return {
        stage: "screening", tone: "accent", icon: Clock, pending: true,
        title: "With our team",
        body: "Your offer passed the automated checks and a person is taking a final look. We'll let you know as soon as that's done.",
        primary: { label: "View my offers", action: "offers" },
      };

    case "PENDING_DONEE_REVIEW":
    case "SOFT_RESERVED_PRIMARY":
    case "SOFT_RESERVED_BACKUP":
      return {
        stage: "recipient", tone: "green", icon: Heart, pending: true,
        title: "Sent to the recipient",
        body: "Your offer looks suitable and is now with the person who asked for it. They'll review it and decide.",
        primary: { label: "View my offers", action: "offers" },
      };

    case "DONEE_ACCEPTED":
    case "ADMIN_APPROVED":
    case "HANDOVER_IN_PROGRESS":
      return {
        stage: "approved", tone: "green", icon: PackageCheck,
        title: "Your offer was accepted",
        body: "Someone is receiving this because of you. Next comes arranging the handover.",
        primary: { label: "Go to my offers", action: "offers" },
      };

    case "NEEDS_INFORMATION":
      return {
        stage: "screening", tone: "amber", icon: Pencil,
        title: "A few more details needed",
        body: rejectionReason?.trim()
          ? rejectionReason
          : "Our team needs a little more information before this can go to the recipient.",
        primary: { label: "Update my offer", action: "edit" },
      };

    case "ADMIN_REJECTED":
    case "DONEE_DECLINED":
      return {
        stage: "closed", tone: "red", icon: ShieldX,
        title: status === "DONEE_DECLINED" ? "The recipient passed on this" : "This offer wasn't approved",
        body: rejectionReason?.trim()
          ? rejectionReason
          : "It happens, and it isn't a reflection on you. Plenty of other people are asking for things right now.",
        primary: { label: "Browse other requests", action: "offers" },
      };

    default:
      // Never print the raw status. An unmapped value is our gap, not the
      // donor's problem, and "SUBMITTED" meant nothing to them anyway.
      return {
        stage: "screening", tone: "accent", icon: Sparkles, pending: true,
        title: "Offer submitted",
        body: "Thank you — it's in the queue. You can follow its progress from your offers at any time.",
        primary: { label: "View my offers", action: "offers" },
      };
  }
}

const TONE = {
  accent: { bg: "bg-[var(--ck-role-soft)]", fg: "text-[var(--ck-role-accent)]", ring: "ring-[var(--ck-role-accent)]/25" },
  green: { bg: "bg-green-100 dark:bg-green-950/50", fg: "text-green-700 dark:text-green-400", ring: "ring-green-500/25" },
  amber: { bg: "bg-amber-100 dark:bg-amber-950/50", fg: "text-amber-700 dark:text-amber-400", ring: "ring-amber-500/25" },
  red: { bg: "bg-red-100 dark:bg-red-950/50", fg: "text-red-700 dark:text-red-400", ring: "ring-red-500/25" },
} as const;

export function OfferResult({
  offer, requestTitle, onViewOffers, onEdit,
}: {
  offer: DonationOffer | null;
  requestTitle: string | null;
  onViewOffers: () => void;
  onEdit: () => void;
}) {
  const reduced = !!useReducedMotion();
  const p = present(offer?.status, offer?.rejectionReason);
  const tone = TONE[p.tone];

  // One shared stagger, so the card assembles in a readable order instead of
  // everything appearing at once.
  const rise = (i: number) => reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.42, ease: EASE, delay: 0.06 * i },
      };

  const reachedIndex = p.stage === "closed"
    ? -1
    : STAGES.findIndex(s => s.key === p.stage);

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-8 sm:py-12">
      <motion.div
        {...(reduced
          ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
          : { initial: { opacity: 0, y: 16, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 },
              transition: { duration: 0.5, ease: EASE } })}
        className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04),0_16px_40px_-24px_rgba(28,25,23,0.3)] dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="px-5 pt-7 text-center sm:px-8 sm:pt-9">
          {/* Badge. The ring pulses only while something is genuinely in
              progress — a decorative pulse on a finished state would suggest
              the donor still has to wait for something. */}
          <motion.div
            {...(reduced
              ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
              : { initial: { scale: 0.6, opacity: 0 }, animate: { scale: 1, opacity: 1 },
                  transition: { duration: 0.45, ease: EASE } })}
            className={`relative mx-auto grid h-16 w-16 place-items-center rounded-full ring-8 ${tone.bg} ${tone.ring}`}
          >
            <p.icon className={`h-7 w-7 ${tone.fg}`} strokeWidth={2.2} aria-hidden />
            {p.pending && !reduced && (
              <motion.span
                aria-hidden
                className={`absolute inset-0 rounded-full ring-2 ${tone.ring}`}
                animate={{ scale: [1, 1.28], opacity: [0.55, 0] }}
                transition={{ duration: 2, ease: "easeOut", repeat: Infinity }}
              />
            )}
          </motion.div>

          <motion.h1
            {...rise(1)}
            className="mt-4 text-xl font-bold text-stone-900 dark:text-stone-100"
            style={{ fontFamily: "var(--font-source-serif-4), serif" }}
          >
            {p.title}
          </motion.h1>

          <motion.p {...rise(2)} className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            {p.body}
          </motion.p>

          {requestTitle && (
            <motion.p {...rise(3)} className="mt-3 text-2xs text-stone-400 dark:text-zinc-500">
              Towards <span className="font-bold text-stone-600 dark:text-stone-300">{requestTitle}</span>
            </motion.p>
          )}
        </div>

        {/* Journey. Hidden once the offer is closed — showing a path it will
            never walk would be a small cruelty. */}
        {p.stage !== "closed" && (
          <motion.ol {...rise(4)} className="mt-7 flex items-start justify-between gap-1 px-5 sm:px-8" aria-label="Offer progress">
            {STAGES.map((s, i) => {
              const done = i < reachedIndex;
              const current = i === reachedIndex;
              return (
                <li key={s.key} className="flex flex-1 flex-col items-center gap-1.5 text-center">
                  <div className="flex w-full items-center gap-1">
                    <span className={`h-0.5 flex-1 rounded-full ${i === 0 ? "bg-transparent" : done || current ? "bg-[var(--ck-role-accent)]" : "bg-stone-200 dark:bg-zinc-800"}`} />
                    <motion.span
                      {...(reduced ? {} : { initial: { scale: 0.7 }, animate: { scale: 1 },
                        transition: { duration: 0.35, ease: EASE, delay: 0.3 + i * 0.1 } })}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 ${
                        done ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-accent)] text-white"
                          : current ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-soft)] text-[var(--ck-role-accent)]"
                          : "border-stone-200 text-stone-300 dark:border-zinc-800 dark:text-zinc-700"}`}
                      aria-current={current ? "step" : undefined}
                    >
                      {done ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : <s.icon className="h-4 w-4" aria-hidden />}
                    </motion.span>
                    <span className={`h-0.5 flex-1 rounded-full ${i === STAGES.length - 1 ? "bg-transparent" : done ? "bg-[var(--ck-role-accent)]" : "bg-stone-200 dark:bg-zinc-800"}`} />
                  </div>
                  <span className={`text-3xs font-bold ${current ? "text-[var(--ck-role-accent)]" : "text-stone-400 dark:text-zinc-600"}`}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </motion.ol>
        )}

        <motion.div {...rise(5)} className="mt-7 border-t border-stone-100 p-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={p.primary?.action === "edit" ? onEdit : onViewOffers}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--ck-role-accent)] px-4 text-sm font-black text-white transition-colors hover:bg-[var(--ck-role-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
          >
            {p.primary?.label ?? "View my offers"}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </button>
        </motion.div>
      </motion.div>

      {p.pending && (
        <motion.p {...rise(6)} className="mt-4 text-center text-2xs text-stone-400 dark:text-zinc-600">
          We&apos;ll email you when there&apos;s news — nothing else to do right now.
        </motion.p>
      )}
    </div>
  );
}
