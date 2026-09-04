"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, HandCoins, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { FEATURES } from "@/lib/features";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import AnimatedCategoryIcon, { ICON_MOTION_PARENT_PROPS } from "./AnimatedCategoryIcon";

/**
 * Body of the desktop "Donate" mega panel. The panel chrome, positioning and
 * open/close animation live in Navbar alongside the About panel so the two
 * share one controller and can never both be open.
 *
 * <p><b>Two sections, one question.</b> The panel used to be the in-kind
 * categories plus an advice card. It now answers "what kind of donation?"
 * first — money on the start side, in-kind on the end side — because that is
 * the fork a visitor is actually at when they reach for this menu. The
 * categories are unchanged in content and order; they are simply rendered
 * tighter, since they are now one section of two rather than the whole panel.
 *
 * <p><b>Why the money section shows even while `FEATURES.money` is false.</b>
 * The rest of the site drops money entries entirely when the flag is off — the
 * `/campaigns` nav link is filtered out of the array in Navbar, for instance.
 * This one is kept and badged "coming soon" instead: a visitor asking "can I
 * give money?" is better served by a visible, honest answer than by a menu that
 * silently omits the option. The link still resolves to `/donate/money`, which
 * is itself gated and renders the branded ComingSoon screen, so nothing
 * half-built is reachable. Flip the flag and the badge disappears on its own.
 */
export default function DonateMegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* ── Money donation ─────────────────────────────────────────────── */}
      <section className="col-span-4" aria-labelledby="donate-mega-money">
        <SectionHeading id="donate-mega-money">{t("nav.moneyDonation")}</SectionHeading>

        <Link
          href="/donate/money"
          onClick={onNavigate}
          className="group mt-3 flex h-[calc(100%-2.75rem)] flex-col rounded-2xl border border-stone-200/70 bg-stone-50/80 p-5 transition-colors hover:border-[var(--ck-role-accent)]/40 hover:bg-stone-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
        >
          <span className="flex items-center gap-3">
            <span className="shrink-0 rounded-lg bg-[var(--ck-role-accent)]/10 p-2 text-[var(--ck-role-accent)]">
              <HandCoins className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              Fund the trust directly
            </span>
          </span>

          <span className="mt-3 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Give money to Sahas Charitable Trust — 12AA and 80G certified, funding
            education, healthcare and social welfare. Every rupee is accounted for.
          </span>

          {!FEATURES.money && (
            <span className="mt-3 inline-flex w-max items-center gap-1.5 rounded-full bg-[var(--ck-role-accent)]/10 px-2.5 py-1 text-3xs font-bold uppercase tracking-wider text-[var(--ck-role-accent)]">
              <Clock className="h-3 w-3" aria-hidden />
              Coming soon
            </span>
          )}

          <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-semibold text-[var(--ck-role-accent)]">
            Donate money
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              aria-hidden="true"
            />
          </span>
        </Link>
      </section>

      {/* ── In-kind donation ───────────────────────────────────────────── */}
      <section className="col-span-8" aria-labelledby="donate-mega-inkind">
        <SectionHeading id="donate-mega-inkind">{t("nav.inKindDonation")}</SectionHeading>

        <p className="mt-1 text-xs leading-snug text-stone-500 dark:text-stone-400">
          Every category has its own quiet rules — what genuinely helps, what ends
          up thrown away, and how to prepare an item so it arrives ready to use.
        </p>

        {/* Same nine categories, same order. Tighter than before: p-2 rather
            than p-3 and a smaller icon well, so two sections fit the panel
            without it growing taller than the one it replaced. */}
        <div className="mt-3 grid grid-cols-3 gap-1">
          {IN_KIND_CATEGORIES.map((cat) => {
            const visual = CATEGORY_VISUALS[cat.name];
            return (
              <motion.div key={cat.slug} {...ICON_MOTION_PARENT_PROPS}>
                <Link
                  href={`/requests/category/${cat.slug}`}
                  onClick={onNavigate}
                  className="group flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-stone-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:hover:bg-white/5"
                >
                  <span className={`mt-0.5 shrink-0 rounded-md p-1.5 ${visual.iconBg} ${visual.text}`}>
                    <AnimatedCategoryIcon category={cat.name} iconClassName="w-3.5 h-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-stone-800 dark:text-stone-100">
                      {cat.name}
                    </span>
                    <span className="mt-0.5 block text-3xs leading-snug text-stone-500 dark:text-stone-400">
                      {cat.tagline}
                    </span>
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <BrowseAllLink onNavigate={onNavigate} />
      </section>
    </div>
  );
}

/**
 * The one shared label style for the two sections.
 *
 * Carries an `id` so each `<section>` can point `aria-labelledby` at it — the
 * panel is two sibling groups of links now, and without a name a screen reader
 * reads eighteen links in a row with nothing marking where money ends and
 * in-kind begins.
 */
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3
      id={id}
      className="border-b border-stone-200/70 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--ck-role-accent)] dark:border-white/10"
    >
      {children}
    </h3>
  );
}

/**
 * The in-kind section's call to action.
 *
 * Deliberately not a button and not inside a pill or card — a filled container
 * here would compete with the nine category cards above it. The emphasis comes
 * from motion instead:
 *
 * - a slow sheen sweeping across the text at rest, so the eye finds it with no
 *   box around it;
 * - an underline that wipes in from the start edge on hover *and* focus;
 * - the arrow detaching slightly, which reads as "this goes somewhere".
 *
 * Under `prefers-reduced-motion` the sheen stops and the underline is simply
 * present — the affordance survives, the movement does not.
 */
function BrowseAllLink({ onNavigate }: { onNavigate?: () => void }) {
  const reduceMotion = useReducedMotion();

  // Hover and focus are driven by CSS `group-*` variants rather than
  // framer-motion gestures on purpose: the element that actually receives
  // focus is the <Link>, so a `whileFocus` on any wrapper would silently never
  // fire and the keyboard path would be dead. framer-motion is left to do the
  // one thing CSS cannot here — the resting sheen.
  return (
    <Link
      href="/requests"
      onClick={onNavigate}
      className="group relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ck-role-accent)] outline-none"
    >
      {/* The sheen rides on background-clip, so it lights the glyphs
          themselves rather than a rectangle behind them. */}
      <motion.span
        className="bg-clip-text"
        style={{
          backgroundImage:
            "linear-gradient(100deg, var(--ck-role-accent) 35%, color-mix(in oklab, var(--ck-role-accent) 30%, white) 50%, var(--ck-role-accent) 65%)",
          backgroundSize: "260% 100%",
          WebkitTextFillColor: reduceMotion ? undefined : "transparent",
        }}
        animate={reduceMotion ? undefined : { backgroundPosition: ["140% 0%", "-40% 0%"] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
      >
        Browse all live needs
      </motion.span>

      <ArrowRight
        className="w-3.5 h-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        aria-hidden="true"
      />

      {/* Wipes in from the start edge. Absolutely positioned so it can never
          shift the line box. Reduced motion gets it standing still at half
          opacity — the affordance without the movement. */}
      <span
        aria-hidden="true"
        className="absolute -bottom-1 inset-x-0 h-px origin-left scale-x-0 rounded-full bg-[var(--ck-role-accent)] opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:scale-x-100 group-hover:opacity-100 group-focus-visible:scale-x-100 group-focus-visible:opacity-100 motion-reduce:scale-x-100 motion-reduce:opacity-45 motion-reduce:transition-none"
      />
    </Link>
  );
}
