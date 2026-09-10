import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, HandCoins, Plus, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import AnimatedCategoryIcon, { ICON_MOTION_PARENT_PROPS } from "./AnimatedCategoryIcon";
import { useAuth } from "@/hooks/useAuth";
import { getMyItemRequests, getAvailableDonorListings, type ItemRequest, type ItemListing } from "@/lib/api";

function NgoDonateMegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [myRequests, setMyRequests] = useState<ItemRequest[]>([]);
  const [donorListings, setDonorListings] = useState<ItemListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getMyItemRequests().catch(() => []),
      getAvailableDonorListings().catch(() => []),
    ]).then(([mine, donorItems]) => {
      if (alive) {
        setMyRequests(mine);
        setDonorListings(donorItems);
        setLoading(false);
      }
    });
    return () => { alive = false; };
  }, []);

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* ── Left Column: NGO's Own Requests / Campaigns (col-span-6) ── */}
      <section className="col-span-6 flex flex-col justify-between" aria-labelledby="donate-mega-ngo-requests">
        <div>
          <div className="flex items-center justify-between border-b border-stone-200/70 dark:border-white/10 pb-2">
            <h3 id="donate-mega-ngo-requests" className="text-xs font-semibold uppercase tracking-wider text-[var(--ck-role-accent)]">
              Your Organization&apos;s Requests
            </h3>
            <Link
              href="/requests/new"
              onClick={onNavigate}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ck-role-accent)] px-3 py-1 text-2xs font-bold text-white hover:brightness-110 transition-all shadow-xs"
            >
              <Plus className="h-3 w-3" />
              Post Request
            </Link>
          </div>
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
            Physical items and campaigns requested by your organization.
          </p>

          <div className="mt-3 space-y-2">
            {myRequests.slice(0, 3).map((req) => (
              <Link
                key={req.id}
                href="/requests"
                onClick={onNavigate}
                className="group flex items-center justify-between rounded-xl border border-stone-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-3 hover:border-[var(--ck-role-accent)]/40 hover:bg-stone-50/80 dark:hover:bg-zinc-800/60 transition-all shadow-2xs"
              >
                <div className="min-w-0 pr-3">
                  <p className="truncate text-xs font-bold text-stone-800 dark:text-stone-100 group-hover:text-[var(--ck-role-accent)] transition-colors">
                    {req.title}
                  </p>
                  <p className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {req.category} · Qty {req.quantity} · {req.city}
                  </p>
                </div>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-4xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {req.status === "FULFILLED" ? "Received" : req.status === "PUBLIC_REQUEST" ? "Live" : "Active"}
                </span>
              </Link>
            ))}

            {myRequests.length === 0 && !loading && (
              <div className="rounded-xl border border-dashed border-stone-200 dark:border-zinc-800 p-4 text-center">
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  No active requests posted yet
                </p>
                <p className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5 max-w-xs mx-auto">
                  Post a request for equipment, medical supplies, or relief packages to connect with donors.
                </p>
              </div>
            )}
          </div>
        </div>

        <Link
          href="/requests"
          onClick={onNavigate}
          className="group mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ck-role-accent)] hover:underline"
        >
          View all your requests
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
        </Link>
      </section>

      {/* ── Right Column: Available Donor Listings (col-span-6) ── */}
      <section className="col-span-6 flex flex-col justify-between" aria-labelledby="donate-mega-donor-listings">
        <div>
          <div className="border-b border-stone-200/70 dark:border-white/10 pb-2">
            <h3 id="donate-mega-donor-listings" className="text-xs font-semibold uppercase tracking-wider text-[var(--ck-role-accent)]">
              Available Donor Listings
            </h3>
          </div>
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
            Real items recently listed by verified donors on CauseKind available to match.
          </p>

          <div className="mt-3 space-y-2">
            {donorListings.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href="/requests"
                onClick={onNavigate}
                className="group flex items-center justify-between rounded-xl border border-stone-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-3 hover:border-[var(--ck-role-accent)]/40 hover:bg-stone-50/80 dark:hover:bg-zinc-800/60 transition-all shadow-2xs"
              >
                <div className="min-w-0 pr-3">
                  <p className="truncate text-xs font-bold text-stone-800 dark:text-stone-100 group-hover:text-[var(--ck-role-accent)] transition-colors">
                    {item.title}
                  </p>
                  <p className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {item.category} · {item.city} · Donated by {item.donorName}
                  </p>
                </div>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-4xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Available
                </span>
              </Link>
            ))}

            {donorListings.length === 0 && !loading && (
              <div className="rounded-xl border border-dashed border-stone-200 dark:border-zinc-800 p-4 text-center">
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Browse donor offerings
                </p>
                <p className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5 max-w-xs mx-auto">
                  Explore verified in-kind items on the community board to request a match.
                </p>
              </div>
            )}
          </div>
        </div>

        <Link
          href="/requests"
          onClick={onNavigate}
          className="group mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ck-role-accent)] hover:underline"
        >
          Explore all donor items
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
        </Link>
      </section>
    </div>
  );
}

export default function DonateMegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
  const { user } = useAuth();
  const isNgo = user?.role === "NGO" || user?.role === "NGO_PARTNER";

  if (isNgo) {
    return <NgoDonateMegaMenu onNavigate={onNavigate} />;
  }

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
