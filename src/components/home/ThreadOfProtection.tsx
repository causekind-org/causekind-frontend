"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { PublicItemRequest } from "@/lib/api";
import { daysWaiting, waitingLabel } from "@/lib/raksha-bandhan";

/**
 * The Raksha Bandhan hero pieces.
 *
 * <p><b>What is here, and what used to be.</b> This originally also drew a gold
 * thread across the hero — a line from the headline to the card, knotted at the
 * join, so the bond the festival is about was literal rather than described.
 * It was removed after seeing it at real hero sizes: the line crossed the
 * headline and the photograph instead of reading as a connection between them,
 * so it looked like a stray rule ruled through the copy.
 *
 * <p>What survives is the part that carried the idea anyway. The card in the
 * hero's right column is not decoration and not a statistic — it is the single
 * need on the board that has gone unclaimed the longest. The hero stops
 * describing a bond and points at a missing one, which is the whole argument,
 * and it turns out not to need a line drawn to it.
 */

/* ── 1. Campaign quotes ───────────────────────────────────────────────────── */

/**
 * Replaces the hero's usual quote cycle for the campaign window.
 *
 * <p>The everyday quotes are about giving in the abstract — Wilde, Churchill,
 * Mother Teresa. These say what a thread means on a platform where the bond is
 * literally one donor and one donee, which is the only reason to mark the day
 * here rather than decorate around it.
 *
 * <p>Attributed to the occasion rather than to a person, deliberately: putting a
 * name against copy written this week would be a small lie. The lines avoid
 * casting donors and donees as brothers and sisters — that is sentimentality
 * about a relationship this platform does not arrange, and the people on the
 * board asked for a blanket, not a sibling.
 */
export const RAKSHA_BANDHAN_QUOTES = [
  { text: "A thread is a promise you can see.", author: "Raksha Bandhan" },
  { text: "Protection is not a feeling. It is a blanket that arrives.", author: "Raksha Bandhan" },
  { text: "Someone nearby asked once, and is still waiting.", author: "Raksha Bandhan" },
  { text: "The bond is not the thread. It is the following through.", author: "Raksha Bandhan" },
] as const;

/* ── 2. The longest-unclaimed need ────────────────────────────────────────── */

/**
 * The single longest-unclaimed need, shown where the hero's money card would be.
 *
 * <p>That column holds the monetary campaign card and `FEATURES.money` is false,
 * so roughly 40% of the desktop hero renders as nothing every other day of the
 * year. Filling it with a real request rather than a statistic is the whole
 * argument of this campaign: a rakhi is tied to a person, not to an audience, so
 * what the hero marks the day with should be a person.
 *
 * <p>Renders nothing when there is no request to show. An empty state here would
 * be a card announcing that nobody is waiting, which is a claim the page cannot
 * make — the list can be empty because the board is empty, because the fetch
 * failed, or because every row lacked a usable date.
 *
 * <p>The donee is named by first name only. That is all the public projection
 * carries, deliberately: `PublicItemRequest` omits the coordinates, pincode,
 * donee id and verification state that the authenticated board exposes.
 */
export function WaitingLongestCard({ request }: { request: PublicItemRequest | null }) {
  if (!request) return null;

  const days = daysWaiting(request.createdAt);
  if (days === null) return null;

  return (
    <div className="ck-thread-card w-full max-w-[320px] rounded-[2rem] border border-white/50 bg-white/75 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70">
      <div className="flex items-center gap-2">
        {/* A short length of untied thread — dashes, no knot. It is the only
            thread motif left in the hero, and it reads as the tie this need has
            not been given yet, which is what the label beside it says. */}
        <span
          aria-hidden="true"
          className="h-[3px] w-9 rounded-full"
          style={{
            background:
              "repeating-linear-gradient(90deg, #c9962f 0px, #c9962f 5px, transparent 5px, transparent 9px)",
          }}
        />
        <span className="text-[11px] font-black uppercase tracking-wider text-[#9a6b12] dark:text-[#e8b45a]">
          No one yet
        </span>
      </div>

      <p className="mt-4 font-jakarta text-2xl font-extrabold leading-tight tracking-tight text-stone-900 dark:text-white">
        {request.title}
      </p>

      <p className="mt-1.5 text-sm font-semibold text-stone-700 dark:text-stone-200">
        {request.doneeFirstName} · {request.city}
      </p>

      <p className="mt-3 text-xs font-bold uppercase tracking-wider tabular-nums text-[#9a6b12] dark:text-[#e8b45a]">
        {waitingLabel(days)}
      </p>

      <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        This one went unmatched and was put on the open board. It is still there.
      </p>

      <Link
        href={`/requests/${request.id}/offer`}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#9a6b12] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#7d560d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a6b12]"
      >
        Tie a thread here
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
