"use client";

import { useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, ChevronDown } from "lucide-react";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import { MATCH_RADIUS_KM } from "@/lib/constants";

/* ─── Brand tokens ───────────────────────────────────────────────────
   The ink (#1e3a60) is the band's flood fill and has to vary by breakpoint,
   so it lives in the `lg:bg-[#1e3a60]` class rather than here — a style
   attribute cannot be breakpoint-conditional. Both values are the logo's, and
   are the only things this band still shares with the rest of the site. */
const TERRACOTTA = "#b04a15";

/** How many category pills to show before collapsing the rest into "+N more". */
const PILL_LIMIT = 6;

/* ─── Category pill ──────────────────────────────────────────────────────
   The `<Link>` is the OUTERMOST element and carries the padding, so the whole
   visible pill is the hit target.

   The previous version had this inverted: `motion.div` held the padding and
   background while the `<Link>` wrapped only the icon and text, so the padded
   ring around the label looked clickable and was not.

   `motion.div` survives purely as an entrance wrapper. It cannot be the
   interactive element, and hover/focus lift lives in CSS rather than
   `whileHover` for two reasons: `whileHover` never fires for a keyboard user,
   and a transform driven by Framer would fight the one the entrance spring is
   still settling. `motion-reduce:` opts the whole thing out.

   Restyled for the Marquee band (2026-08-21): flat uppercase type, an
   underline on hover instead of a bordered capsule, light-on-ink at `lg` and
   dark-on-paper below it. `px-3`, `min-h-11` and the focus ring are NOT
   cosmetic — `min-h-11` is the 44px touch floor and the tests assert all three,
   because they are the pill's hit target and keyboard affordance. */
function CategoryPill({
  label,
  href,
  delay,
  reduceMotion,
}: {
  label: string;
  href: string;
  delay: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 18,
        // Stagger is entrance choreography, not information — it goes with the
        // travel under reduced motion.
        delay: reduceMotion ? 0 : delay / 1000,
      }}
    >
      <Link
        href={href}
        // Announces the destination rather than just the category, since the
        // visible text alone ("Medical aid") does not say it is a link to a
        // board of requests.
        aria-label={`Browse ${label} requests`}
        className="flex min-h-11 items-center px-3 text-xs font-extrabold uppercase tracking-[0.1em]
                   text-stone-500 underline-offset-4 transition-colors duration-150
                   hover:text-[#b04a15] hover:underline
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]
                   focus-visible:ring-offset-2
                   dark:text-stone-400 dark:focus-visible:ring-offset-zinc-950
                   lg:text-white/45 lg:hover:text-white lg:focus-visible:ring-offset-[#1e3a60]
                   dark:lg:text-white/45"
      >
        {label}
      </Link>
    </motion.div>
  );
}

/* ─── "Show N more" toggle ───────────────────────────────────────────────
   A button, deliberately styled apart from the pills.

   Only rendered below `lg` — the wide layout shows all nine and has nothing to
   toggle, so the control is absent from the DOM there rather than hidden with
   a class that would leave it in the tab order. */
function MoreCategoriesToggle({
  expanded,
  count,
  controls,
  onToggle,
  buttonRef,
}: {
  expanded: boolean;
  count: number;
  controls: string;
  onToggle: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controls}
      className="inline-flex min-h-11 items-center gap-1.5 px-3 text-xs font-extrabold uppercase
                 tracking-[0.1em] text-[#b04a15] transition-colors
                 hover:underline underline-offset-4
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]
                 focus-visible:ring-offset-2
                 dark:focus-visible:ring-offset-zinc-950"
    >
      <ChevronDown
        className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${
          expanded ? "rotate-180" : ""
        }`}
        aria-hidden="true"
      />
      {/* Wording is the accessible name and is asserted by the tests: it has
          to say how many are hidden. Restyling the control is fine; shortening
          this to "+3 more" is not. */}
      {expanded ? "Show fewer categories" : `Show ${count} more categories`}
    </button>
  );
}

/* ─── One stat in the Marquee rail ──────────────────────────────────────
   A left bar in terracotta, a large value, a small caps label. Square by
   design: the whole direction rests on there being no rounded corner in the
   band, so do not soften these. */
function MarqueeStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-l-[3px] pl-3.5" style={{ borderColor: TERRACOTTA }}>
      <b className="block text-3xl font-extrabold leading-none tracking-[-0.03em] text-stone-900 lg:text-[40px] lg:text-white dark:text-stone-100 dark:lg:text-white">
        {value}
      </b>
      <span className="mt-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400 lg:text-white/60 dark:lg:text-white/60">
        {label}
      </span>
    </div>
  );
}

/* ─── Main exported section ─────────────────────────────────────────── */
/**
 * The "Be the change" band, rebuilt 2026-08-21 in the "Marquee" direction.
 *
 * <p><b>This band deliberately does NOT follow the site's design system.</b>
 * It was redesigned from scratch on the brief that nothing may look like the
 * rest of the site: ink flood fill, oversized uppercase display type, zero
 * border-radius. Only the two brand colours are shared, so the logo still
 * belongs. Do not "harmonise" it back toward the surrounding sections without
 * checking that intent first.
 *
 * <p>What it replaced, and why nothing here refetches platform stats: the old
 * six-check journey rail and the trust-signal matrix were both removed, and the
 * live `getPlatformStats()` call left with them. The three values below are
 * static facts — a policy, a constant, and a policy — not measurements.
 */
export function BeTheChangeSection({
  /**
   * Mobile only: tuck the panel under the Hero's rounded lower edge.
   * Passed by the caller ONLY when the two are direct visual neighbours — it is
   * never inferred from sibling order, so enabling FEATURES.money (which puts
   * the Campaigns rail between them) cannot silently produce a bad overlap.
   */
  overlapHero = false,
  /**
   * Emit the guest tour's `data-tour` anchors.
   *
   * <p>This component is mounted TWICE by HomeClient — once in the desktop
   * branch, once in the mobile one. Emitting anchors unconditionally would put
   * each `data-tour` in the DOM twice, and `document.querySelector` returns the
   * FIRST match: the desktop copy, which is `hidden lg:block`. A `display: none`
   * element reports a zero rect, so the tour's spotlight would collapse to
   * nothing. Only the mobile instance may pass this.
   */
  tourAnchors = false,
}: { overlapHero?: boolean; tourAnchors?: boolean } = {}) {
  const { user } = useAuth();

  // Category-pill overflow, below `lg` only. `useId` rather than a literal
  // string because HomeClient mounts this component twice — a hardcoded id
  // would put two of the same `aria-controls` target in the document and the
  // toggle would resolve to whichever came first.
  const pillsReduceMotion = useReducedMotion() ?? false;
  const overflowId = useId();
  const [pillsExpanded, setPillsExpanded] = useState(false);
  // Focus must survive the collapse: the revealed group unmounts, and if focus
  // had moved into it the document would drop focus to <body>.
  const toggleRef = useRef<HTMLButtonElement>(null);

  /**
   * Derived from the real category list, never hand-written.
   *
   * <p>`CATEGORY_VISUALS` already calls itself the single source of truth for
   * category icons, so nothing needs mapping by hand: adding a category updates
   * the pills and the overflow count together.
   *
   * <p>Source is `IN_KIND_CATEGORIES` rather than `ALL_REQUEST_CATEGORIES`
   * because a pill needs a destination as well as a name, and that file owns
   * the canonical name → slug pairing. Slugifying the label here would be a
   * second mapping free to drift from the routes that actually exist — and
   * `inKindCategories.ts` already throws at import if the two lists disagree,
   * so taking the names from there means a missing editorial entry is a build
   * failure rather than a pill linking to a 404.
   */
  const firstCategories = IN_KIND_CATEGORIES.slice(0, PILL_LIMIT);
  const overflowCategories = IN_KIND_CATEGORIES.slice(PILL_LIMIT);

  return (
    <section
      // `isolate` is load-bearing, not decoration. This section's inner
      // container carries `relative z-10`; without a stacking context here that
      // inner value escapes into the composition wrapper, ties with the Hero,
      // and — being later in the DOM — paints the panel OVER the image.
      // Isolating traps every inner z-index below the Hero's z-20.
      //
      // The ink flood is `lg:` only. Below that the band keeps the light ground
      // so the hero overlap panel still tucks under the Hero's rounded edge;
      // an ink panel there would read as a dark seam across the composition.
      className={`relative w-full overflow-hidden pb-6 lg:bg-[#1e3a60] lg:py-14 ${
        overlapHero ? "ck-hero-overlap isolate z-10" : "pt-6"
      }`}
    >
      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10">

        {/* ── Elevated content surface (MOBILE ONLY). Reset entirely at `lg`,
             where the section itself is the ink surface. ── */}
        <div
          className={`-mx-6 rounded-b-[1.75rem] bg-white px-6 pb-6 sm:-mx-10 sm:px-10
                     dark:bg-zinc-900
                     lg:mx-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:pb-0 dark:lg:bg-transparent ${
                       // Square top on purpose. A rounded cap reads as a panel
                       // sitting ON the image; underlapping, the top edge is
                       // hidden behind the Hero and must never draw a curve
                       // across it.
                       overlapHero ? "ck-hero-overlap-panel" : ""
                     }`}
        >

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-14">

            {/* ── Headline ── */}
            <div>
              <p
                className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.24em]"
                style={{ color: TERRACOTTA }}
              >
                Be the change
              </p>
              <h2
                className="font-extrabold uppercase text-stone-900 dark:text-stone-100 lg:text-white dark:lg:text-white"
                style={{
                  // Fluid rather than stepped: the display size has to survive
                  // every width between a 360px phone and the 86px the design
                  // calls for at desktop, without jumping at a breakpoint.
                  fontSize: "clamp(2rem, 1rem + 5.6vw, 86px)",
                  lineHeight: 0.92,
                  letterSpacing: "-0.045em",
                }}
              >
                Verified.<br />
                <span style={{ color: TERRACOTTA }}>Local.</span><br />
                In your hands.
              </h2>
            </div>

            {/* ── Stat rail. Carries the guest tour's "Why you can trust it"
                 step, whose copy — reviewed before it goes live, matched within
                 10 km — is a description of exactly these three. ── */}
            <div
              className="flex flex-col gap-6 lg:gap-7 lg:pt-2"
              data-tour={tourAnchors ? "guest-signals" : undefined}
            >
              <MarqueeStat value="100%" label="Admin-verified listings" />
              {/* Read from the shared constant, never retyped: the match radius
                  is also enforced server-side, and two copies would drift. */}
              <MarqueeStat value={`${MATCH_RADIUS_KM} km`} label="Match radius" />
              <MarqueeStat value="Zero" label="Middlemen" />
            </div>

          </div>

          {/* ── The one supporting line. Everything the removed six-check rail
               said, in a sentence. ── */}
          <p className="mt-10 max-w-3xl text-base font-medium leading-relaxed text-stone-600 dark:text-stone-300 lg:mt-14 lg:text-xl lg:text-white/80 dark:lg:text-white/80">
            Real things, not cash. Handed over in person. Every handover issues an impact certificate.
          </p>

          <div className="mt-6 h-px bg-stone-200 dark:bg-stone-800 lg:mt-8 lg:bg-white/15" />

          {/* ── Category links — every one goes to its own In-Kind page ──
               A <nav> with a list: this is a set of navigation choices, and a
               screen reader user benefits from being told how many there are
               and being able to skip past them. */}
          <nav
            aria-label="Browse in-kind categories"
            className="mt-4"
            data-tour={tourAnchors ? "guest-categories" : undefined}
          >
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:gap-x-6">
              {firstCategories.map((category, i) => (
                <li key={category.slug}>
                  <CategoryPill
                    label={category.name}
                    href={`/requests/category/${category.slug}`}
                    delay={i * 80}
                    reduceMotion={pillsReduceMotion}
                  />
                </li>
              ))}

              {/*
                The overflow three, in a nested list so `aria-controls` has a
                single element to point at. `<li>` containing `<ul>` is valid;
                `display: contents` stops the nesting from creating a box, so
                the three wrap into the same flex row as the first six rather
                than forming a second row of their own.

                All nine are always in the DOM. Below `lg` when collapsed the
                last three are CSS-hidden, which keeps every category link
                crawlable and means none is ever rendered twice.
              */}
              {overflowCategories.length > 0 && (
                <li className="contents">
                  <ul id={overflowId} className="contents">
                    {overflowCategories.map((category, i) => (
                      <li
                        key={category.slug}
                        // Hidden, not merely invisible: `display: none` takes
                        // them out of the tab order too, so a keyboard user
                        // cannot land on one they cannot see.
                        className={pillsExpanded ? undefined : "max-lg:hidden"}
                      >
                        <CategoryPill
                          label={category.name}
                          href={`/requests/category/${category.slug}`}
                          delay={(PILL_LIMIT + i) * 80}
                          reduceMotion={pillsReduceMotion}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              )}

              {/* Below `lg` only — the wide layout shows all nine, so there is
                  nothing to toggle and the control is absent from the DOM
                  rather than hidden while still focusable. */}
              {overflowCategories.length > 0 && (
                <li className="lg:hidden">
                  <MoreCategoriesToggle
                    expanded={pillsExpanded}
                    count={overflowCategories.length}
                    controls={overflowId}
                    buttonRef={toggleRef}
                    onToggle={() => {
                      setPillsExpanded(v => !v);
                      // Focus must stay on the control: without this a click
                      // leaves focus on a button whose label has just changed,
                      // and a screen reader announces the new state against the
                      // old position.
                      toggleRef.current?.focus();
                    }}
                  />
                </li>
              )}
            </ul>
          </nav>

          {/* ── CTA row — only shown when NOT logged in.
               Kept when the trust-signal rail it used to live in was removed:
               the request was to drop the duplicated numbers, not the band's
               only call to action. Square, to match the direction. ── */}
          {!user && (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {/* Desktop only: on mobile the AudiencePathways cards directly
                  above already offer "Join as a donor" (and give the donee a
                  door too), so this would be the same destination twice within
                  a screen. "Browse requests" below stays at every width - it is
                  not a duplicate, and the requests board is public. */}
              <Link
                href="/register"
                className="hidden min-h-11 lg:inline-flex items-center gap-1.5 px-5 text-sm font-extrabold uppercase
                           tracking-[0.08em] text-white transition-opacity duration-200
                           hover:opacity-90 active:scale-95
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white
                           focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e3a60]"
                style={{ background: TERRACOTTA }}
              >
                Join as donor <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/requests"
                className="inline-flex min-h-11 items-center gap-1.5 border px-5 text-sm font-extrabold
                           uppercase tracking-[0.08em] transition-colors duration-200
                           border-stone-300 text-stone-700 hover:border-[#b04a15] hover:text-[#b04a15]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]
                           focus-visible:ring-offset-2
                           dark:border-stone-700 dark:text-stone-300
                           lg:border-white/30 lg:text-white lg:hover:border-white lg:hover:text-white
                           lg:focus-visible:ring-white lg:focus-visible:ring-offset-[#1e3a60]"
              >
                Browse requests <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

        </div>{/* ── end elevated surface ── */}
      </div>
    </section>
  );
}
