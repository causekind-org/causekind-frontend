"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import AnimatedCategoryIcon, { ICON_MOTION_PARENT_PROPS } from "./AnimatedCategoryIcon";

/**
 * Body of the desktop "In-Kind" mega panel. The panel chrome, positioning and
 * open/close animation live in Navbar alongside the About panel so the two
 * share one controller and can never both be open.
 */
export default function InKindMegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-8 grid grid-cols-3 gap-1.5">
        {IN_KIND_CATEGORIES.map((cat) => {
          const visual = CATEGORY_VISUALS[cat.name];
          return (
            <motion.div key={cat.slug} {...ICON_MOTION_PARENT_PROPS}>
              <Link
                href={`/requests/category/${cat.slug}`}
                onClick={onNavigate}
                className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-stone-100/70 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)]"
              >
                <span
                  className={`mt-0.5 shrink-0 rounded-lg p-2 ${visual.iconBg} ${visual.text}`}
                >
                  <AnimatedCategoryIcon category={cat.name} iconClassName="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">
                    {cat.name}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-stone-500 dark:text-stone-400">
                    {cat.tagline}
                  </span>
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="col-span-4 rounded-2xl border border-stone-200/70 bg-stone-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ck-role-accent)]">
          Before you give
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          Every category has its own quiet rules — what genuinely helps, what
          ends up thrown away, and how to prepare an item so it arrives ready to
          use.
        </p>
        <BrowseAllLink onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/**
 * The panel's one call to action.
 *
 * Deliberately not a button and not inside a pill or card — a filled container
 * here would compete with the nine category cards to its left and make the
 * panel read as two equal choices. The emphasis comes from motion instead:
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
