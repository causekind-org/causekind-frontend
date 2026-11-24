import { serverDate } from "@/lib/serverTime";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Building2, CalendarDays, Home, MapPin, Package, Siren, UserRound, Users, Wallet, type LucideIcon } from "lucide-react";
import { ApiError, getPublicItemRequest, type PublicItemRequest } from "@/lib/api";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { safeInternalPath } from "@/lib/safeRedirect";
import HelpAction from "./HelpAction";
import RetryButton from "./RetryButton";

import { UiText, useUiText } from "@/components/UiText";
import { capTitle } from "@/lib/requestTitle";
type Props = {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

/**
 * The public detail page for one request — what "View need" opens.
 *
 * Reads `/item-requests/public/{id}`, the same reduced projection as the board:
 * no pincode, coordinates, contact details or verification material. A guest can
 * read everything here; only acting on it ("I can help") needs an account.
 *
 * A request that is no longer publicly open (fulfilled, closed, withdrawn,
 * private) comes back 404, and the page says so plainly rather than erroring.
 */

type Loaded =
  | { kind: "ok"; req: PublicItemRequest }
  | { kind: "gone" }
  | { kind: "error" };

async function load(rawId: string): Promise<Loaded> {
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) return { kind: "gone" };
  try {
    return { kind: "ok", req: await getPublicItemRequest(id) };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return { kind: "gone" };
    return { kind: "error" };
  }
}

/** Back to the board with its filters and page, but only ever to the board. */
function backHref(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const safe = safeInternalPath(value);
  if (safe && (safe === "/requests" || safe.startsWith("/requests?"))) return safe;
  return "/requests";
}


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const res = await load(id);
  const mt = await getTranslations("requestsArea");
  if (res.kind !== "ok") return { title: mt("metaRequestTitle"), robots: { index: false } };
  // A person's request shows a first name, a city and a free-text need, so it
  // stays out of search. Only an explicit "NGO" is indexable: a missing or
  // unknown requesterType falls on the private side.
  const indexable = res.req.requesterType === "NGO";
  return {
    title: capTitle(res.req.title),
    description: mt("metaRequestDescription", { city: res.req.city || mt("india") }),
    alternates: { canonical: `/requests/${res.req.id}` },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function RequestDetailPage({ params, searchParams }: Props) {
  const [{ id, locale }, { from }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const res = await load(id);
  const back = backHref(from);

  return (
    <div className="min-h-screen bg-[#f2ede7] text-stone-900 dark:bg-zinc-950 dark:text-stone-100">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={back}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-stone-600 hover:text-[var(--ck-role-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:text-stone-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> <UiText>Back to requests</UiText>
        </Link>

        {res.kind === "gone" ? (
          <section className="mt-4 rounded-xl border border-stone-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h1 className="text-xl font-semibold"><UiText>This request is no longer open</UiText></h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
              <UiText>It may have been fulfilled, closed or withdrawn. There are other people and
              organisations you can still help.</UiText>
            </p>
            <Link href={back} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[var(--ck-role-accent)] px-4 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2">
              <UiText>Browse open requests</UiText>
            </Link>
          </section>
        ) : res.kind === "error" ? (
          <section className="mt-4 rounded-xl border border-stone-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h1 className="text-xl font-semibold"><UiText>We couldn&apos;t load this request</UiText></h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300"><UiText>Please try again in a moment.</UiText></p>
            <RetryButton />
          </section>
        ) : (
          <RequestDetail req={res.req} />
        )}
      </div>
    </div>
  );
}

function RequestDetail({ req }: { req: PublicItemRequest }) {
  const rt = useTranslations("requestsArea");
  const ui = useUiText();
  const isNgo = req.requesterType === "NGO";
  const who = isNgo ? (req.organizationName || ui("A registered organisation")) : (req.doneeFirstName || ui("A neighbour"));
  const visual = CATEGORY_VISUALS[req.category];
  const urgent = req.urgency === "CRITICAL" || req.emergency;
  const posted = req.createdAt ? serverDate(req.createdAt) : null;

  return (
    <article className="mt-4 min-w-0 rounded-xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04] sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--ck-role-accent)]">
          {isNgo ? <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> : <UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
          {isNgo ? ui("NGO request") : ui("Person request")}
        </span>
        {urgent && (
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
            <UiText>Urgent</UiText>
          </span>
        )}
      </div>

      <div className="mt-4 flex min-w-0 items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--ck-role-accent)]/10 text-[var(--ck-role-accent)]" aria-hidden="true">
          {visual ? <visual.Icon className="h-6 w-6" /> : <Package className="h-6 w-6" />}
        </span>
        <div className="min-w-0">
          <h1 className="break-words text-[clamp(1.4rem,1.2rem+1vw,2rem)] font-medium leading-tight [font-family:var(--font-lora),Georgia,serif]">
            {req.title}
          </h1>
          {/* Organisation identity only. No profile link: no public NGO profile route exists. */}
          <p className="mt-1 break-words text-sm font-medium text-stone-700 dark:text-stone-300">
            {rt("requestedBy", { who })}
          </p>
        </div>
      </div>

      {/* Same three sections a signed-in donor sees on the offer page
          (owner-approved for guests, 24 Nov 2026). No donee photo here. */}
      {req.description && (
        <section className="mt-6">
          <h2 className="mb-2 text-2xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400"><UiText>Request Description</UiText></h2>
          <div className="rounded-xl border-l-4 border-indigo-300 bg-indigo-50 px-3.5 py-4 sm:px-5 dark:border-indigo-600 dark:bg-indigo-950/30">
            <p className="whitespace-pre-line break-words text-sm italic leading-relaxed text-stone-700 [overflow-wrap:anywhere] dark:text-stone-300">&ldquo;{req.description}&rdquo;</p>
          </div>
        </section>
      )}

      <AboutThisNeed req={req} />

      <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-stone-100 pt-5 text-sm dark:border-white/10 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-stone-500 dark:text-stone-400"><UiText>Quantity requested</UiText></dt>
          <dd className="font-semibold tabular-nums">{req.quantity.toLocaleString("en-IN")}</dd>
        </div>
        {req.category && (
          <div>
            <dt className="text-xs text-stone-500 dark:text-stone-400"><UiText>Category</UiText></dt>
            <dd className="font-semibold">{req.category}</dd>
          </div>
        )}
        {req.city && (
          <div>
            <dt className="text-xs text-stone-500 dark:text-stone-400"><UiText>City</UiText></dt>
            <dd className="inline-flex items-center gap-1 font-semibold"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{req.city}</dd>
          </div>
        )}
        {posted && !Number.isNaN(posted.getTime()) && (
          <div>
            <dt className="text-xs text-stone-500 dark:text-stone-400"><UiText>Posted</UiText></dt>
            <dd className="inline-flex items-center gap-1 font-semibold">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {posted.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-5 text-xs text-stone-500 dark:text-stone-400">
        <UiText>Exact address and contact details stay private. They are shared only during a confirmed handover.</UiText>
      </p>

      <div className="mt-5">
        <HelpAction requestId={req.id} />
      </div>
    </article>
  );
}

/**
 * "About This Need" and "Why they can't purchase this themselves", in the same
 * layout as the offer page's section, minus the donee photo (guests never get
 * it). Hidden entirely when the request has none of these facts.
 */
function AboutThisNeed({ req }: { req: PublicItemRequest }) {
  const rt = useTranslations("offerFlow");
  const ui = useUiText();
  const tierLabel: Record<string, string> = {
    TIER_1_BASIC: ui("Tier 1 verified"),
    TIER_2_MODERATE: ui("Tier 2 verified"),
    TIER_3_HIGH_VALUE: ui("Tier 3 verified · high value"),
    TIER_4_EMERGENCY: ui("Tier 4 verified · emergency"),
  };
  const housingLabel: Record<string, string> = {
    OWNED: ui("Own home"),
    RENTED: ui("Rented home"),
    SHELTER: ui("Living in a shelter"),
    TEMPORARY: ui("Temporary housing"),
  };
  const facts: { icon: LucideIcon; label: string; value: string }[] = [];
  if (req.householdSize != null) facts.push({ icon: Home, label: ui("Household"), value: rt("householdMembers", { count: req.householdSize }) });
  if (req.dependents != null) facts.push({ icon: UserRound, label: ui("Dependents"), value: String(req.dependents) });
  if (req.peopleAffected != null) facts.push({ icon: Users, label: ui("People affected"), value: String(req.peopleAffected) });
  if (req.housingType && housingLabel[req.housingType]) facts.push({ icon: Home, label: ui("Housing"), value: housingLabel[req.housingType] });
  if (req.numberOfEarners != null)
    facts.push({
      icon: Wallet,
      label: ui("Earning members"),
      value: req.numberOfEarners === 0 ? ui("None", "earners") : req.numberOfEarners === 1 ? ui("Single earner") : String(req.numberOfEarners),
    });
  const hasBadges = !!req.verificationTier || req.emergency;
  if (facts.length === 0 && !req.reasonCannotBuy && !hasBadges) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-2xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400"><UiText>About This Need</UiText></h2>
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="p-3.5 sm:p-5">
          {hasBadges && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {req.verificationTier && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-2xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {tierLabel[req.verificationTier] ?? ui("Verified")}
                </span>
              )}
              {req.emergency && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-2xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                  <Siren className="h-3.5 w-3.5" aria-hidden="true" />
                  <UiText>Emergency need</UiText>
                </span>
              )}
            </div>
          )}
          {facts.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {facts.map(({ icon: FactIcon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-white/10" aria-hidden="true">
                    <FactIcon className="h-4 w-4 text-stone-500 dark:text-stone-400" />
                  </span>
                  <div>
                    <dt className="text-3xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</dt>
                    <dd className="text-sm font-semibold text-stone-800 dark:text-stone-200">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400"><UiText>Household details for this request are kept private.</UiText></p>
          )}
        </div>
        {req.reasonCannotBuy && (
          <div className="border-t border-stone-100 bg-amber-50/60 px-3.5 py-4 sm:px-5 dark:border-white/10 dark:bg-amber-950/20">
            <h3 className="mb-1.5 text-3xs font-bold uppercase tracking-wide text-amber-800/80 dark:text-amber-400/80">
              <UiText>Why they can&rsquo;t purchase this themselves</UiText>
            </h3>
            <p className="whitespace-pre-line break-words text-sm italic leading-relaxed text-stone-700 [overflow-wrap:anywhere] dark:text-stone-300">
              &ldquo;{req.reasonCannotBuy}&rdquo;
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
