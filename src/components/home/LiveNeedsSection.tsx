"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { NewRequestLink } from "@/components/NewRequestLink";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  MapPin,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { loginUrlFor } from "@/lib/safeRedirect";
import type { PlatformStats, PublicItemRequest } from "@/lib/api";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { useAuth } from "@/hooks/useAuth";
import AnimatedCategoryIcon from "@/components/AnimatedCategoryIcon";

/**
 * How many needs the homepage grid shows before handing off to /requests.
 *
 * The same number at every breakpoint, deliberately. A smaller mobile cap
 * would make any "N more" wording wrong at one width or the other, and the
 * component cannot know the viewport without a media-query hook. Six compact
 * cards make a long mobile section; that is what a feed looks like.
 */
const NEEDS_SHOWN = 6;

export function LiveNeedsSection({
  initialRequests = [],
}: {
  initialRequests?: PublicItemRequest[];
  /**
   * Still accepted so HomeClient's call site is unchanged, but no longer read:
   * the only thing this section took from it was `totalDonations`, which was
   * rendering as the "0+ Needs Fulfilled" counter described below.
   */
  stats?: PlatformStats | null;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });
  const reduceMotion = useReducedMotion();

  /*
   * Who, if anyone, is offered the "post a need" action in the empty state.
   *
   * A need (ItemRequest, /requests/new) is a DONEE's to create; a DONOR creates
   * listings at /items/new instead. This CTA previously rendered for everyone
   * and was mislabelled "Add new listing" while pointing at the donee wizard,
   * so a donor was being offered an action that is not theirs.
   *
   * Fails closed while auth resolves: useAuth starts { user: null,
   * isLoading: true } and only then hydrates from localStorage["ck_user"], so
   * testing !user alone flashes the guest CTA at a signed-in donor for a frame.
   *
   * Role is normalised because the string circulates both bare and ROLE_-
   * prefixed; comparing it raw misreads ROLE_DONEE as a donor.
   */
  const { user, isLoading: authLoading } = useAuth();
  const role = (user?.role ?? "").toUpperCase().replace(/^ROLE_/, "");
  const emptyStateCta = authLoading
    ? null
    : user === null
      ? { href: loginUrlFor("/requests/new"), label: "Post a need" }
      : role === "DONEE"
        ? { href: "/requests/new", label: "Post a need" }
        : null;

  // Purely backend-driven now — whatever the API returns (including an empty
  // array) is what renders. No local fallback/dummy data masking a real empty state.
  const allNeeds = initialRequests ?? [];

  /*
   * The filtered list and the six we show are derived separately, on purpose.
   *
   * The API caps nothing — `getPublicApproved` returns every PUBLIC_REQUEST —
   * so at any real volume this grid is a sample. Slicing inside the same memo
   * that filters would leave us with no honest denominator: the eyebrow would
   * still announce the true total while the grid quietly showed six, and the
   * category pill counts would promise nine and deliver six.
   */
  const filteredNeeds = useMemo(
    () =>
      selectedCategory === "All"
        ? allNeeds
        : allNeeds.filter((n) => n.category === selectedCategory),
    [allNeeds, selectedCategory],
  );
  const displayedNeeds = filteredNeeds.slice(0, NEEDS_SHOWN);
  const hiddenCount = filteredNeeds.length - displayedNeeds.length;

  const cardCount = displayedNeeds.length;

  /*
   * How many open needs sit behind each category pill.
   *
   * Without this every pill looked equally clickable and most of them led
   * straight to "No open requests in X right now" — nine invitations, one of
   * which goes anywhere. A pill with a count is an offer; a pill without one is
   * information.
   */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const need of allNeeds) {
      counts[need.category] = (counts[need.category] ?? 0) + 1;
    }
    return counts;
  }, [allNeeds]);

  return (
    <section
      ref={sectionRef}
      id="live-needs-section"
      aria-labelledby="live-needs-heading"
      // Was #fbf9f4 — a shade off the sections either side. Same one cream.
      className="relative w-full lg:bg-[var(--surface-cream,#faf8f5)] lg:dark:bg-zinc-950 ck-live-needs-section overflow-hidden transition-colors"
    >
      {/* The two warm ambient blurs are gone — see the note in
          ComingSoonMagnets. Every section was tinting its own background a
          slightly different warm colour, which is most of why the page read as
          a stack of separate pages rather than one surface. */}

      <div className="relative mx-auto max-w-7xl px-0 lg:px-8">
        {/* ── Section Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 ck-live-needs-header-gap">
          <div className="max-w-2xl min-w-0">
            <h2
              id="live-needs-heading"
              className="text-2xl lg:text-5xl font-black tracking-tight text-stone-900 dark:text-stone-50 leading-[1.12]"
            >
              Real people. Real needs.{" "}
              <span className="text-[var(--ck-home-ink,#b04a15)] dark:text-[var(--ck-home-ink,#e07b3a)]">Right now.</span>
            </h2>

            <p className="mt-3 text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
              Every request here is posted by a verified individual or community school in India. No cash,
              no guesswork — offer the exact item they are waiting for today.
            </p>
          </div>

          {/*
            One claim we can stand behind, rather than a pair of counters.

            This was "100% VERIFIED DONEES" beside "0+ NEEDS FULFILLED", where
            the second number came from `stats?.totalDonations ?? 0`. A zero
            rendered as proof reads as "nothing has ever happened here" — the
            opposite of what a trust badge is for. Put numbers back when they
            argue for us.
          */}
          <div className="flex items-center gap-3.5 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm border border-stone-200/80 dark:border-zinc-800 rounded-[1.25rem] p-4 shrink-0 lg:shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[var(--ck-home-accent,#b04a15)]/10 dark:bg-[var(--ck-home-accent,#b04a15)]/20 flex items-center justify-center text-[var(--ck-home-ink,#b04a15)] dark:text-[var(--ck-home-ink,#e07b3a)] shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-stone-900 dark:text-stone-100 leading-tight">
                Every donee is verified
              </p>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                ID and address checked before a need is posted
              </p>
            </div>
          </div>
        </div>

        {/* ── Category Filter Pills Row ── */}
        <div className="relative ck-live-needs-filters">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === "All"
                  ? "bg-[var(--ck-home-accent,#b04a15)] text-white shadow-sm shadow-[var(--ck-home-deep,#431407)]/20 ring-2 ring-[var(--ck-home-accent,#b04a15)]/30"
                  : "bg-white/80 dark:bg-zinc-900/80 text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              All Categories
            </button>

            {ALL_REQUEST_CATEGORIES.map((cat) => {
              const visual = CATEGORY_VISUALS[cat];
              const isSelected = selectedCategory === cat;
              const count = categoryCounts[cat] ?? 0;
              // Still clickable when empty — the empty state explains itself and
              // is a legitimate place to land — but it no longer looks like the
              // same offer as a category that has something waiting.
              const isEmpty = count === 0 && !isSelected;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-[var(--ck-home-accent,#b04a15)] text-white shadow-sm shadow-[var(--ck-home-deep,#431407)]/20 ring-2 ring-[var(--ck-home-accent,#b04a15)]/30"
                      : isEmpty
                        ? "bg-transparent text-stone-400 dark:text-stone-600 border border-stone-200/70 dark:border-zinc-800/70 hover:bg-stone-50 dark:hover:bg-zinc-900"
                        : "bg-white/80 dark:bg-zinc-900/80 text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center ${
                      isSelected ? "text-white" : isEmpty ? "text-stone-300 dark:text-stone-700" : visual?.text ?? "text-stone-500"
                    }`}
                  >
                    <AnimatedCategoryIcon category={cat} iconClassName="w-3.5 h-3.5" />
                  </span>
                  {cat}
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1.5 text-3xs font-black tabular-nums ${
                        isSelected ? "bg-white/25 text-white" : "bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-stone-400"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── The needs themselves ────────────────────────────────────────────
            A grid, not a carousel. The carousel was a fixed-height stage
            (`.ck-live-needs-carousel`, clamp(200px, 26svh, 280px)) holding
            absolutely-positioned cards: content taller than the stage escaped
            it and landed on top of the donor band below — visibly, in
            production. It was also built for a dozen needs while the board
            usually holds a handful.

            A grid is honest at any count: one need fills one cell, more needs
            wrap onto more rows, and every card is sized by its own content so
            nothing can overlap what follows. ── */}
        {cardCount === 0 ? (
          <div className="mx-auto flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/50 px-6 py-10 text-center max-w-2xl">
            <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center text-stone-400 dark:text-stone-500">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm sm:text-base font-bold text-stone-700 dark:text-stone-200">
              No open requests in {selectedCategory} right now
            </p>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm">
              {emptyStateCta
                ? "Be the first to post one, or check back soon — new needs are added regularly."
                : "Check back soon — new needs are added regularly. Try another category in the meantime."}
            </p>
            {emptyStateCta ? (
              <NewRequestLink
                href={emptyStateCta.href}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--ck-home-accent,#b04a15)] hover:bg-[var(--ck-home-hover,#963c0d)] text-white font-extrabold px-5 py-2.5 text-xs uppercase tracking-wider transition-all shadow-md shadow-[var(--ck-home-deep,#431407)]/20 active:scale-95"
              >
                <span>{emptyStateCta.label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </NewRequestLink>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayedNeeds.map((need, idx) => {
              const visual = CATEGORY_VISUALS[need.category];
              const isUrgent = need.urgency === "CRITICAL" || need.emergency;
              const offerUrl = loginUrlFor(`/requests/${need.id}/offer`);

              return (
                <motion.article
                  key={need.id}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
                  animate={isInView ? { opacity: 1, y: 0 } : undefined}
                  transition={{ duration: 0.45, delay: Math.min(idx, 5) * 0.06 }}
                  className="flex flex-col rounded-[1.25rem] bg-white dark:bg-zinc-900/95 border border-[var(--ck-home-soft,#e8e2d5)] dark:border-zinc-800 p-4 lg:p-6 lg:bg-white/95 lg:border-stone-200/90 lg:shadow-sm lg:shadow-[var(--ck-home-deep,#431407)]/5 dark:lg:shadow-black/20"
                >
                  <div className="grow">
                    {/* Top Bar: Category Pill & Urgent Tag */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-3xs font-extrabold uppercase tracking-wider ${
                          visual?.iconBg ?? "bg-stone-100"
                        } ${visual?.text ?? "text-stone-700"}`}
                      >
                        <AnimatedCategoryIcon category={need.category} iconClassName="w-3.5 h-3.5" />
                        {need.category}
                      </span>

                      {isUrgent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.5 text-3xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                          Urgent
                        </span>
                      )}
                    </div>

                    {/* Title — a third of the row is narrower than the old
                        980px stage, so the display size comes down with it. */}
                    <h3 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-50 leading-snug text-pretty">
                      <TranslatedText text={need.title} />
                    </h3>

                    {/* Description snippet if available */}
                    {need.description && (
                      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                        <TranslatedText text={need.description} />
                      </p>
                    )}
                  </div>

                  {/* Card Meta & CTA. The block above grows, so every footer in
                      the row sits on the same line however long a title wraps. */}
                  <div className="mt-5 pt-4 border-t border-stone-100 dark:border-zinc-800/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                      <div className="flex items-center gap-1.5 truncate font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
                        <span className="truncate">
                          <TranslatedText text={need.city} />
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 font-medium">
                        <span>
                          Qty:{" "}
                          <strong className="text-stone-800 dark:text-stone-200 font-bold">
                            {need.quantity}
                          </strong>
                        </span>
                        {need.doneeFirstName && (
                          <>
                            <span className="text-stone-300 dark:text-stone-700">·</span>
                            <span className="truncate text-stone-400 dark:text-stone-500 text-3xs">
                              By {need.doneeFirstName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Every card is now fully visible, so every CTA is live and
                        keyboard-reachable — the carousel had to disable the
                        blurred neighbours' links. */}
                    <Link
                      href={offerUrl}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ck-home-surface,#fff7ed)]/70 hover:bg-[var(--ck-home-hover,#b04a15)] dark:bg-zinc-800/80 dark:hover:bg-[var(--ck-home-hover,#b04a15)] border border-[var(--ck-home-soft,#fed7aa)]/50 hover:border-transparent dark:border-zinc-700/60 py-2.5 px-3.5 text-xs font-bold text-[var(--ck-home-ink,#b04a15)] hover:text-white dark:text-[var(--ck-home-highlight,#fdba74)] dark:hover:text-white transition-all duration-200 shadow-2xs group/btn active:scale-[0.98]"
                    >
                      <Lock className="w-3.5 h-3.5 shrink-0 opacity-80 group-hover/btn:opacity-100" />
                      <span>Log in to offer this item</span>
                      <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover/btn:translate-x-1 shrink-0" />
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {/* The grid is a sample, so it says so. Without this the eyebrow
            announces the true total while six cards render, and the pill counts
            promise more than the grid delivers. Nothing renders when the grid
            is already showing everything. */}
        {hiddenCount > 0 && (
          <Link
            href="/requests"
            className="mt-4 inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs sm:text-sm text-stone-500 dark:text-stone-400 hover:text-[var(--ck-home-ink,#b04a15)] dark:hover:text-[var(--ck-home-ink,#e07b3a)] transition-colors group/more"
          >
            <span className="font-bold text-stone-700 dark:text-stone-200 tabular-nums">
              {hiddenCount} more open {hiddenCount === 1 ? "need" : "needs"}
            </span>
            {selectedCategory !== "All" && <span>in {selectedCategory}</span>}
            <span className="text-stone-300 dark:text-stone-700">·</span>
            <span className="font-semibold">See them all</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/more:translate-x-1" />
          </Link>
        )}

        {/* ── Footer Link: Explore All Needs ── */}
        <div className="ck-live-needs-footer-gap flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-stone-100/70 dark:bg-zinc-900/60 border border-stone-200/70 dark:border-zinc-800 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--ck-home-accent,#b04a15)]/10 flex items-center justify-center text-[var(--ck-home-ink,#b04a15)] shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200">
                Have gently-used goods at home?
              </p>
              <p className="text-3xs sm:text-xs text-stone-500 dark:text-stone-400">
                Browse our complete live request directory or post an offer directly.
              </p>
            </div>
          </div>

          <Link
            href="/requests"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--ck-home-accent,#b04a15)] hover:bg-[var(--ck-home-hover,#963c0d)] text-white font-extrabold px-5 py-2.5 text-xs uppercase tracking-wider transition-all shadow-md shadow-[var(--ck-home-deep,#431407)]/20 active:scale-95 shrink-0"
          >
            <span>See all open requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}