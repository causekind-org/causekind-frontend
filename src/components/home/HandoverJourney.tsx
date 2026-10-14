"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  CalendarClock,
  FileBadge2,
  HandHeart,
  MapPin,
  PackageOpen,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { TranslatedText } from "@/hooks/useDynamicTranslation";

/**
 * "Where does my support go?" — answered by following the object, not the money.
 *
 * <p><b>Why this section is shaped differently from every competitor's.</b>
 * Ketto, Give and DonateKart all have to answer "where does my money go",
 * because money is what they take: the honest answer involves platform fees,
 * disbursement schedules and trust in an intermediary, and the section is
 * always a pie chart or a paragraph. CauseKind does not take money for an
 * in-kind need. There is no pooling, no disbursement and no intermediary — one
 * person hands one object to one person, within about ten kilometres, and both
 * confirm it happened.
 *
 * <p>So the question has a better answer here than it does anywhere else in
 * the category, and the answer is a place, not a percentage. This section
 * spends its whole budget on making that concrete.
 *
 * <p><b>Every stage below is real.</b> They are the platform's own flow, not a
 * marketing simplification: stages 4–6 are literally `JOURNEY_STEPS` from
 * `features/handover/model.ts`, the OTP is `HandoverConfirmationPanel`, and the
 * certificate is the existing `/certificate` route. Nothing here describes
 * behaviour the product does not have.
 *
 * <p><b>Interaction contract.</b> The stages are real buttons in a tablist:
 * clickable, arrow-key navigable, and each one swaps the detail panel. On
 * desktop, scrolling through the section also advances them, so a reader who
 * never touches anything still sees the journey play — but scroll is an
 * accelerator, never the only way in. Under reduced motion the auto-advance is
 * off and the panel cross-fades instantly.
 */

type Stage = {
  key: string;
  /** Short label for the rail. */
  label: string;
  /** What actually happens, in the platform's own terms. */
  headline: string;
  detail: string;
  /** The fact that makes this stage checkable rather than a claim. */
  evidence: string;
  Icon: LucideIcon;
};

const STAGES: Stage[] = [
  {
    key: "listed",
    label: "Listed",
    headline: "Someone lists a thing they already own.",
    detail:
      "Not a pledge and not an amount — a specific object, photographed, with its condition stated. On the other side, a verified person posts what they actually need.",
    evidence: "Photos are required before a listing can be submitted.",
    Icon: PackageOpen,
  },
  {
    key: "verified",
    label: "Verified",
    headline: "A person reviews it before anyone sees it.",
    detail:
      "Every need and every listing passes an admin review queue. Recipients have their ID and address checked before a need can be posted at all.",
    evidence: "Admin-verified listings — the review queue is staffed, not automated.",
    Icon: BadgeCheck,
  },
  {
    key: "matched",
    label: "Matched",
    headline: "The need is matched to someone nearby.",
    detail:
      "Matching runs on proximity, because the object has to physically change hands. A need is offered privately to nearby donors first; only if that fails does it reach the public board.",
    evidence: "Roughly a 10 km match radius, so the handover stays local.",
    Icon: MapPin,
  },
  {
    key: "scheduled",
    label: "Scheduled",
    headline: "The two people agree a time and a place.",
    detail:
      "Both sides pick a meeting point and a slot inside the platform, with a chat thread and safety guidance attached. No addresses are exchanged until both have agreed.",
    evidence: "Scheduling and the meeting pin live inside the handover hub.",
    Icon: CalendarClock,
  },
  {
    key: "handover",
    label: "Handover",
    headline: "It changes hands in person, confirmed by a code.",
    detail:
      "The recipient reads back a one-time code at the moment of handover, and records the quantity and condition they actually received. Both sides have to confirm — one alone cannot close it.",
    evidence: "OTP-confirmed handover, entered by the recipient in person.",
    Icon: HandHeart,
  },
  {
    key: "certificate",
    label: "Certificate",
    headline: "A certificate is issued, and it can be checked.",
    detail:
      "Once both confirmations land, the handover produces a delivery certificate with its own number. It is verifiable afterwards, by anyone holding it.",
    evidence: "Every completed handover issues a certificate with a verifiable number.",
    Icon: FileBadge2,
  },
];

export function HandoverJourney() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  /** Once the reader takes control, scroll stops overriding them. */
  const [userDriven, setUserDriven] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  /*
   * Scroll advances the stage — until the reader clicks or keys, after which it
   * does not. Scroll-jacking is never introduced: the page scrolls normally and
   * this only reads the section's position to decide which stage is current.
   */
  useEffect(() => {
    if (reduceMotion || userDriven) return;
    const section = sectionRef.current;
    if (!section) return;

    let raf = 0;
    let onScreen = false;

    const measure = () => {
      raf = 0;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 as the section's top reaches the viewport middle, 1 as its bottom does.
      const span = r.height || 1;
      const p = (vh * 0.5 - r.top) / span;
      const idx = Math.floor(Math.max(0, Math.min(0.999, p)) * STAGES.length);
      setActive((prev) => (prev === idx ? prev : idx));
    };

    const onScroll = () => {
      if (raf || !onScreen) return;
      raf = requestAnimationFrame(measure);
    };

    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
        if (onScreen) measure();
      },
      { rootMargin: "0px" },
    );
    io.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduceMotion, userDriven]);

  const select = useCallback((i: number) => {
    setUserDriven(true);
    setActive(i);
  }, []);

  /** Roving-tabindex arrow navigation, per the tablist pattern. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = STAGES.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = active === last ? 0 : active + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = active === 0 ? last : active - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  };

  const stage = STAGES[active] ?? STAGES[0];

  return (
    <section
      ref={sectionRef}
      // Below lg this renders inside HomeClient's mobile column, which already
      // supplies a px-5 gutter and the page background — so the section drops
      // both there and brings them back at lg. Same convention as
      // LiveNeedsSection and ComingSoonMagnets; see the mobile tree comments.
      className="relative overflow-hidden py-0 lg:bg-white lg:py-28 dark:lg:bg-zinc-950"
      aria-labelledby={`${baseId}-heading`}
    >
      <div className="mx-auto max-w-6xl px-0 lg:px-6">
        <header className="max-w-2xl">
          <p className="text-3xs font-extrabold uppercase tracking-[0.18em] text-[var(--ck-home-ink,#b04a15)]">
            <TranslatedText text="Where support goes" />
          </p>
          <h2
            id={`${baseId}-heading`}
            className="mt-4 text-balance text-3xl font-black leading-[1.08] tracking-tight text-stone-900 sm:text-4xl lg:text-[2.9rem] dark:text-stone-50"
          >
            <TranslatedText text="Your support doesn't go into a pool." />
            <span className="mt-2 block text-[var(--ck-home-accent,#c54805)]">
              <TranslatedText text="It goes into someone's hands." />
            </span>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-stone-600 sm:text-lg dark:text-stone-300">
            <TranslatedText text="There is no fund to allocate and no disbursement to wait for, because CauseKind never holds the thing you gave. Here is the whole route it takes instead." />
          </p>
        </header>

        {/* ── The rail ─────────────────────────────────────────────────── */}
        <div
          role="tablist"
          aria-label="Stages of a handover"
          aria-orientation="horizontal"
          onKeyDown={onKeyDown}
          className="mt-12 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3"
        >
          {STAGES.map((s, i) => {
            const isActive = i === active;
            const isDone = i < active;
            return (
              <button
                key={s.key}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${s.key}`}
                aria-selected={isActive}
                aria-controls={`${baseId}-panel`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => select(i)}
                className={[
                  // 44px+ tall at every breakpoint, per the touch-target gate.
                  "group relative flex min-h-[4.5rem] cursor-pointer flex-col items-start justify-end gap-1 rounded-xl border p-3 text-left transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-home-accent,#c54805)] focus-visible:ring-offset-2",
                  isActive
                    ? "border-[var(--ck-home-accent,#c54805)] bg-[var(--ck-home-surface,#fff7ed)] dark:border-[var(--ck-home-accent,#c54805)] dark:bg-zinc-900"
                    : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800",
                ].join(" ")}
              >
                <s.Icon
                  className={[
                    "h-5 w-5 transition-colors",
                    isActive
                      ? "text-[var(--ck-home-accent,#c54805)]"
                      : isDone
                        ? "text-stone-500 dark:text-stone-400"
                        : "text-stone-300 dark:text-zinc-600",
                  ].join(" ")}
                  aria-hidden
                />
                <span
                  className={[
                    "text-xs font-bold leading-tight",
                    isActive
                      ? "text-stone-900 dark:text-stone-50"
                      : "text-stone-500 dark:text-stone-400",
                  ].join(" ")}
                >
                  <TranslatedText text={s.label} />
                </span>

                {/*
                  Progress is carried by a filled bar AND by the icon/label
                  weight above — never by colour alone, so it survives both
                  colour-blindness and a greyscale print.
                */}
                <span
                  aria-hidden
                  className="absolute inset-x-3 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800"
                >
                  <span
                    className="block h-full origin-left rounded-full bg-[var(--ck-home-accent,#c54805)] transition-transform duration-300 ease-out"
                    style={{ transform: `scaleX(${i <= active ? 1 : 0})` }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* ── The stage ────────────────────────────────────────────────── */}
        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${stage.key}`}
          tabIndex={0}
          className="relative mt-8 rounded-3xl border border-stone-200 bg-[var(--ck-gap-bg,#fbf7f2)] p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-home-accent,#c54805)] sm:p-10 dark:border-zinc-800 dark:bg-zinc-900"
        >
          {/*
            The thread motif is deliberately NOT drawn here.

            It was, and it was wrong twice over. Visually it rendered as
            disconnected segments, because a `pathLength`-normalised dash inside
            a `preserveAspectRatio="none"` viewBox does not stretch the way the
            gutter version does. More importantly it meant nothing in this
            position: in the gap section the thread joins rows that are actually
            related, whereas here the rail above already carries the sequence
            and a second line beside it was just a line. One animated element
            per view, and in this section that is the panel itself.
          */}
          <div>

            <motion.div
              // Keyed on the stage so the panel cross-fades on change. One
              // animated element for this view — the guidance's cap.
              key={stage.key}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-3xs font-extrabold uppercase tracking-wider text-[var(--ck-home-ink,#b04a15)] ring-1 ring-[var(--ck-home-soft,#fed7aa)] dark:bg-zinc-950 dark:ring-zinc-800">
                <TranslatedText text={`Stage ${active + 1} of ${STAGES.length}`} />
              </span>

              <h3 className="mt-4 text-balance text-2xl font-black leading-tight tracking-tight text-stone-900 sm:text-3xl dark:text-stone-50">
                <TranslatedText text={stage.headline} />
              </h3>

              <p className="mt-4 max-w-prose text-base leading-relaxed text-stone-600 dark:text-stone-300">
                <TranslatedText text={stage.detail} />
              </p>

              <p className="mt-6 flex items-start gap-2.5 text-sm font-semibold text-stone-700 dark:text-stone-200">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ck-home-accent,#c54805)]"
                  aria-hidden
                />
                <TranslatedText text={stage.evidence} />
              </p>
            </motion.div>
          </div>
        </div>

        <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">
          <TranslatedText text="Money campaigns work differently and are handled separately — " />
          <Link
            href="/donate/money"
            className="font-semibold text-[var(--ck-home-ink,#b04a15)] underline underline-offset-2 hover:text-[var(--ck-home-accent,#c54805)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-home-accent,#c54805)] focus-visible:ring-offset-2"
          >
            <TranslatedText text="see how those are run" />
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
