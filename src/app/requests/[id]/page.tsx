import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, MapPin, Package, UserRound } from "lucide-react";
import { ApiError, getPublicItemRequest, type PublicItemRequest } from "@/lib/api";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { safeInternalPath } from "@/lib/safeRedirect";
import HelpAction from "./HelpAction";
import RetryButton from "./RetryButton";

type Props = {
  params: Promise<{ id: string }>;
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
  const { id } = await params;
  const res = await load(id);
  if (res.kind !== "ok") return { title: "Request — CauseKind", robots: { index: false } };
  return {
    title: `${res.req.title} — CauseKind`,
    description: `An in-kind request in ${res.req.city || "India"}. Browse freely; sign in when you're ready to offer an item.`,
    alternates: { canonical: `/requests/${res.req.id}` },
  };
}

export default async function RequestDetailPage({ params, searchParams }: Props) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const res = await load(id);
  const back = backHref(from);

  return (
    <div className="min-h-screen bg-[#f2ede7] text-stone-900 dark:bg-zinc-950 dark:text-stone-100">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={back}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-stone-600 hover:text-[var(--ck-role-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:text-stone-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to requests
        </Link>

        {res.kind === "gone" ? (
          <section className="mt-4 rounded-xl border border-stone-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h1 className="text-xl font-semibold">This request is no longer open</h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
              It may have been fulfilled, closed or withdrawn. There are other people and
              organisations you can still help.
            </p>
            <Link href={back} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[var(--ck-role-accent)] px-4 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2">
              Browse open requests
            </Link>
          </section>
        ) : res.kind === "error" ? (
          <section className="mt-4 rounded-xl border border-stone-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <h1 className="text-xl font-semibold">We couldn&apos;t load this request</h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">Please try again in a moment.</p>
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
  const isNgo = req.requesterType === "NGO";
  const who = isNgo ? (req.organizationName || "A registered organisation") : (req.doneeFirstName || "A neighbour");
  const visual = CATEGORY_VISUALS[req.category];
  const urgent = req.urgency === "CRITICAL" || req.emergency;
  const posted = req.createdAt ? new Date(req.createdAt) : null;

  return (
    <article className="mt-4 min-w-0 rounded-xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04] sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--ck-role-accent)]">
          {isNgo ? <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> : <UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
          {isNgo ? "NGO request" : "Person request"}
        </span>
        {urgent && (
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
            Urgent
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
            Requested by {who}
          </p>
        </div>
      </div>

      {req.description && (
        <p className="mt-5 whitespace-pre-line break-words text-[0.95rem] leading-relaxed text-stone-700 [overflow-wrap:anywhere] dark:text-stone-300">
          {req.description}
        </p>
      )}

      <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-stone-100 pt-5 text-sm dark:border-white/10 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-stone-500 dark:text-stone-400">Quantity requested</dt>
          <dd className="font-semibold tabular-nums">{req.quantity.toLocaleString("en-IN")}</dd>
        </div>
        {req.category && (
          <div>
            <dt className="text-xs text-stone-500 dark:text-stone-400">Category</dt>
            <dd className="font-semibold">{req.category}</dd>
          </div>
        )}
        {req.city && (
          <div>
            <dt className="text-xs text-stone-500 dark:text-stone-400">City</dt>
            <dd className="inline-flex items-center gap-1 font-semibold"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{req.city}</dd>
          </div>
        )}
        {posted && !Number.isNaN(posted.getTime()) && (
          <div>
            <dt className="text-xs text-stone-500 dark:text-stone-400">Posted</dt>
            <dd className="inline-flex items-center gap-1 font-semibold">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {posted.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-5 text-xs text-stone-500 dark:text-stone-400">
        Exact address and contact details stay private. They are shared only during a confirmed handover.
      </p>

      <div className="mt-5">
        <HelpAction requestId={req.id} />
      </div>
    </article>
  );
}
