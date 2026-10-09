"use client";

import { useEffect, useState } from "react";
import Link from "@/components/AppLink";
import { getListingActivity, type ItemListing, type ListingActivityEntry } from "@/lib/api";

const STATIONS = ["Listed", "Verified", "Matching", "Matched", "Donated"];

// The statuses that first mark each station as reached, for its date.
const VERIFIED = ["ELIGIBLE_FOR_MATCHING", "AVAILABLE"];
const MATCHED = ["SOFT_RESERVED", "RESERVED", "MATCHED", "PARTIALLY_DONATED"];
const DONATED = ["DONATED", "FULFILLED"];

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null;

function firstAt(entries: ListingActivityEntry[], statuses: string[]) {
  return entries.find(e => statuses.includes(e.toStatus))?.changedAt ?? null;
}

const label = (v?: string | null) => (v ? v.replaceAll("_", " ").toLowerCase().replace(/^\w/, c => c.toUpperCase()) : null);

/**
 * The donor dashboard's expandable listing details: item, pickup, and the listing's
 * progress with the date each step was reached (from GET /items/{id}/activity).
 * Replaces the horizontal journey rail above the row (owner, 2026-10-09).
 */
export function ListingDetailsPanel({ listing: l, stage, state }: {
  listing: ItemListing;
  stage: number;
  state: "active" | "done" | "broken";
}) {
  const [activity, setActivity] = useState<ListingActivityEntry[] | null>(null);

  useEffect(() => {
    let live = true;
    getListingActivity(l.id).then(a => { if (live) setActivity(a); }).catch(() => { if (live) setActivity([]); });
    return () => { live = false; };
  }, [l.id, l.status]);

  const entries = activity ?? [];
  const verifiedAt = firstAt(entries, VERIFIED);
  const dates = [
    fmt(l.submittedAt ?? l.createdAt),
    fmt(verifiedAt),
    verifiedAt ? `Since ${fmt(verifiedAt)}` : null,
    fmt(firstAt(entries, MATCHED)),
    fmt(firstAt(entries, DONATED)),
  ];
  const photos = (l.photoUrls ?? []).slice(0, 3);
  const facts = [
    l.brand && `Brand: ${l.brand}`,
    l.approximateAge && `Age: ${l.approximateAge}`,
    l.workingStatus && `Working: ${label(l.workingStatus)}`,
  ].filter(Boolean);
  const pickup = [
    (l.locality || l.pincode) && `Locality: ${[l.locality, l.pincode].filter(Boolean).join(", ")}`,
    (l.pickupDays || l.pickupTimeSlots) && `Days: ${[l.pickupDays, l.pickupTimeSlots].filter(Boolean).join(" · ")}`,
    l.maximumDeliveryRadius != null && `Will deliver within ${l.maximumDeliveryRadius} km`,
    l.transportPayerPreference && `Transport paid by: ${label(l.transportPayerPreference)}`,
    l.availabilityExpiry && `Available until ${fmt(l.availabilityExpiry)}`,
  ].filter(Boolean) as string[];
  const heading = "text-3xs font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400";

  return (
    <div className="mt-3 grid gap-5 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-3 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex min-w-0 flex-col gap-2.5">
        <h3 className={heading}>Item</h3>
        {photos.length > 0 && (
          <div className="flex gap-2">
            {photos.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`${l.title} photo ${i + 1}`}
                className="h-[72px] w-[72px] rounded-xl object-cover" />
            ))}
          </div>
        )}
        {l.description && <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300">{l.description}</p>}
        {facts.length > 0 && <p className="text-2xs text-stone-500 dark:text-stone-400">{facts.join(" · ")}</p>}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <h3 className={heading}>Pickup</h3>
        {pickup.length > 0
          ? pickup.map(line => <p key={line} className="text-xs text-stone-700 dark:text-stone-300">{line}</p>)
          : <p className="text-xs text-stone-500">No pickup details yet.</p>}
        {state !== "broken" && !DONATED.includes(l.status) && (
          <Link href={`/items/${l.id}/edit`}
            className="mt-auto inline-flex min-h-[44px] w-fit items-center rounded-xl bg-[var(--ck-role-accent)] px-4 text-xs font-bold text-white hover:opacity-90">
            Edit listing
          </Link>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <h3 className={`${heading} mb-3`}>Progress</h3>
        <ol>
          {STATIONS.map((name, i) => {
            const reached = i < stage || (i === stage && state === "done");
            const current = i === stage && state !== "done";
            const broken = current && state === "broken";
            const isLast = i === STATIONS.length - 1;
            const date = broken ? "Stopped here" : current && !dates[i] ? "Now" : reached || current ? dates[i] : "Upcoming";
            return (
              <li key={name} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`h-3 w-3 shrink-0 rounded-full border-2 ${broken ? "border-red-500 bg-red-500" :
                    reached ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-accent)]" :
                      current ? "border-[var(--ck-role-accent)] bg-white dark:bg-zinc-900" :
                        "border-stone-300 dark:border-zinc-700"}`} />
                  {!isLast && <span className={`w-0.5 flex-1 ${i < stage ? "bg-[var(--ck-role-accent)]" : "bg-stone-200 dark:bg-zinc-800"}`} />}
                </div>
                <div className={isLast ? "" : "pb-3"}>
                  <p className={`text-xs font-semibold ${broken ? "text-red-600" : reached || current ? "text-stone-800 dark:text-stone-200" : "text-stone-500"}`}>{name}</p>
                  {date && <p className="mt-0.5 text-2xs text-stone-500 dark:text-stone-400">{date}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
