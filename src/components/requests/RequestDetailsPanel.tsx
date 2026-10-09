"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PhotoThumbs } from "@/components/PhotoThumbs";
import { getRequestActivity, type ItemRequest, type RequestActivityEntry } from "@/lib/api";

// The statuses that first mark each station as reached, for its date.
const VERIFIED = ["VERIFIED_PRIVATE_MATCHING", "POTENTIAL_MATCH_FOUND", "AWAITING_MATCH_APPROVAL",
  "PUBLICATION_CONSENT_REQUIRED", "PUBLIC_REQUEST"];
const MATCHED = ["RESERVED", "MATCH_IN_PROGRESS", "FULFILMENT_IN_PROGRESS", "PARTIALLY_MATCHED"];
const PARTIAL = ["PARTIALLY_FULFILLED"];
const RECEIVED = ["FULLY_FULFILLED", "FULFILLED"];

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null;

function firstAt(entries: RequestActivityEntry[], statuses: string[]) {
  return entries.find(e => statuses.includes(e.toStatus))?.changedAt ?? null;
}

const TIER_LABEL: Record<string, string> = {
  TIER_1_BASIC: "Basic", TIER_2_MODERATE: "Moderate", TIER_3_HIGH_VALUE: "High value", TIER_4_EMERGENCY: "Emergency",
};

/**
 * The donee dashboard's request details: the need, where it goes, and its
 * progress with the date each step was reached (from GET /item-requests/{id}/activity).
 * The donee counterpart of ListingDetailsPanel; replaces the horizontal journey
 * rail above the row (owner, 2026-10-09).
 */
export function RequestDetailsPanel({ request: r, stage: baseStage, state: baseState, partial, fulfilled, requested, review }: {
  request: ItemRequest;
  stage: number;
  state: "draft" | "active" | "done" | "broken";
  /** Part of the request has arrived: adds the "Partial" station. */
  partial: boolean;
  fulfilled: number;
  requested: number;
  /** An item waiting on the donee: shown inside the Matched step, which becomes current. */
  review?: ReactNode;
}) {
  const [activity, setActivity] = useState<RequestActivityEntry[] | null>(null);

  useEffect(() => {
    let live = true;
    getRequestActivity(r.id).then(a => { if (live) setActivity(a); }).catch(() => { if (live) setActivity([]); });
    return () => { live = false; };
  }, [r.id, r.status]);

  const entries = activity ?? [];
  const stage = review ? Math.max(baseStage, 2) : baseStage;
  const state = review ? "active" : baseState;
  const posted = entries.find(e => e.toStatus === "PENDING_VERIFICATION")?.changedAt ?? r.createdAt;
  const stations = partial
    ? [["Posted", posted], ["Verified", firstAt(entries, VERIFIED)], ["Matched", firstAt(entries, MATCHED)],
      ["Partial", firstAt(entries, PARTIAL)], ["Received", firstAt(entries, RECEIVED)]] as const
    : [["Posted", posted], ["Verified", firstAt(entries, VERIFIED)], ["Matched", firstAt(entries, MATCHED)],
      ["Received", firstAt(entries, RECEIVED)]] as const;

  const facts = [
    `${fulfilled} of ${requested} received`,
    `${r.urgency.charAt(0)}${r.urgency.slice(1).toLowerCase()} urgency`,
    r.isEmergency && (r.emergencyNature ? `Emergency: ${r.emergencyNature.replaceAll("_", " ").toLowerCase()}` : "Emergency"),
  ].filter(Boolean) as string[];
  const delivery = [
    `Location: ${[r.city, r.pincode].filter(Boolean).join(", ")}`,
    r.pickupRadiusKm != null && `Donors within ${r.pickupRadiusKm} km`,
    r.verificationTier && `Verification: ${TIER_LABEL[r.verificationTier] ?? r.verificationTier}`,
    r.verificationDueAt && stage <= 1 && state !== "broken" && `Review due by ${fmt(r.verificationDueAt)}`,
  ].filter(Boolean) as string[];
  const heading = "text-3xs font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400";

  return (
    <div className="mt-3 border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* A match waiting on this user: a banner flush across the top (owner, 2026-10-09, design A). */}
      {review}
      <div className="grid gap-5 p-4 sm:grid-cols-3 sm:p-5">
      <div className="flex min-w-0 flex-col gap-2.5">
        <h3 className={heading}>Request</h3>
        <PhotoThumbs photos={r.imageUrl ? [r.imageUrl] : []} alt={r.title} size={72} />
        {r.description && <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300">{r.description}</p>}
        <p className="text-2xs text-stone-500 dark:text-stone-400">{facts.join(" · ")}</p>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <h3 className={heading}>Delivery</h3>
        {delivery.map(line => <p key={line} className="text-xs text-stone-700 dark:text-stone-300">{line}</p>)}
      </div>

      <div className="flex min-w-0 flex-col">
        <h3 className={`${heading} mb-3`}>Progress</h3>
        <ol>
          {stations.map(([name, at], i) => {
            const reached = i < stage || (i === stage && state === "done");
            const current = i === stage && state !== "done";
            const broken = current && state === "broken";
            const isLast = i === stations.length - 1;
            const date = broken ? "Stopped here" : current && !at ? "Now" : reached || current ? fmt(at) : "Upcoming";
            return (
              <li key={name} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`h-3 w-3 shrink-0 rounded-full border-2 ${broken ? "border-red-500 bg-red-500" :
                    reached ? (isLast ? "border-emerald-500 bg-emerald-500" : "border-[#1e3a60] bg-[#1e3a60] dark:border-blue-400 dark:bg-blue-400") :
                      current ? "border-[#1e3a60] bg-white dark:border-blue-400 dark:bg-zinc-900" :
                        "border-stone-300 dark:border-zinc-700"}`} />
                  {!isLast && <span className={`w-0.5 flex-1 ${i < stage ? "bg-[#1e3a60] dark:bg-blue-400" : "bg-stone-200 dark:bg-zinc-800"}`} />}
                </div>
                <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-3"}`}>
                  <p className={`text-xs font-semibold ${broken ? "text-red-600" : reached || current ? "text-stone-800 dark:text-stone-200" : "text-stone-500"}`}>
                    {name}
                    {review && name === "Matched" && (
                      <span className="ms-2 bg-[#1e3a60]/10 px-2 py-0.5 text-3xs font-black text-[#1e3a60] dark:bg-blue-400/15 dark:text-blue-300">Waiting for you</span>
                    )}
                  </p>
                  {review && name === "Matched" ? <p className="mt-0.5 text-2xs font-semibold text-[#1e3a60] dark:text-blue-300">Waiting for your reply</p> : date && <p className="mt-0.5 text-2xs text-stone-500 dark:text-stone-400">{date}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      </div>
    </div>
  );
}
