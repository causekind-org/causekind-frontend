"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Loader2, MapPin } from "lucide-react";
import { getHandover, type HandoverRecord } from "@/lib/api";
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { MATCH_METHODS, OFFER_METHODS, hasCoordinates, mapsHref, methodLabel } from "@/features/handover/adapters";
import type { Delivery } from "./deliveries";

/**
 * Everything on record about one delivery, for the donee's History page: who gave
 * it, how many were offered and received, when each step happened, how it was
 * handed over, and what the item was.
 *
 * <p>A donee can't read status history (that endpoint is admin-only), so the
 * timeline is assembled from the timestamps the offer, its handover record and the
 * match already carry. Steps with no timestamp are left out rather than guessed.
 */

const CONDITION_RATING: Record<string, string> = {
  AS_DESCRIBED: "Exactly as described",
  MINOR_DIFF: "Small differences — still happy with it",
  MAJOR_DIFF: "Significantly different — had concerns",
};

/** next/image throws on a host missing from next.config's remotePatterns — skip those photos instead. */
function isAllowedImage(src: string): boolean {
  try {
    const { protocol, hostname } = new URL(src);
    return protocol === "https:" && (hostname.endsWith(".amazonaws.com") || hostname === "images.unsplash.com");
  } catch {
    return false;
  }
}

const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;

const humanize = (value: string | null | undefined) => {
  if (!value) return null;
  const s = value.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

type TimelineEntry = { label: string; at: string | null | undefined; detail?: string | null };

type Details = {
  code: string;
  hubHref: string;
  timeline: TimelineEntry[];
  handover: { label: string; value: React.ReactNode }[];
  item: { label: string; value: string | null | undefined }[];
  photos: string[];
};

function offerDetails(d: Extract<Delivery, { kind: "offer" }>, h: HandoverRecord | null): Details {
  const o = d.offer;
  const c = h?.confirmation ?? null;
  const i = o.itemDetails;
  return {
    code: `CK-${String(o.id).padStart(5, "0")}`,
    hubHref: `/offers/${o.id}/handover`,
    timeline: [
      { label: "Offer made", at: o.submittedAt ?? o.createdAt },
      { label: "Handover scheduled for", at: h?.scheduledDateTime },
      { label: "Donor confirmed handing it over", at: c?.donorConfirmedAt },
      { label: "You confirmed receiving it", at: c?.doneeConfirmedAt,
        detail: c?.doneeConfirmedQty != null ? `${c.doneeConfirmedQty} received` : null },
      { label: "Completed", at: o.status === "COMPLETED" ? o.closedAt : null },
    ],
    handover: h ? [
      { label: "Method", value: methodLabel(h.method, OFFER_METHODS) },
      { label: "Place", value: h.locationAddress || hasCoordinates(h.locationLatitude, h.locationLongitude)
          ? <Place address={h.locationAddress} lat={h.locationLatitude} lng={h.locationLongitude} /> : null },
      { label: "Courier", value: [h.courierName, h.trackingNumber && `tracking ${h.trackingNumber}`].filter(Boolean).join(" · ") || null },
      { label: "Delivered to", value: h.delivery?.address
          ? <Place address={h.delivery.address} lat={h.delivery.latitude} lng={h.delivery.longitude} /> : null },
      { label: "Courier contact", value: [h.delivery?.contactName, h.delivery?.contactPhone].filter(Boolean).join(" · ") || null },
      { label: "Transport arranged by", value: humanize(h.transportArrangedBy) },
      { label: "Transport cost paid by", value: humanize(h.transportCostBornBy) },
      { label: "Handover code checked", value: c ? (c.otpVerified ? "Yes" : "No") : null },
      { label: "Your rating", value: c?.doneeConditionRating ? CONDITION_RATING[c.doneeConditionRating] ?? humanize(c.doneeConditionRating) : null },
      { label: "Rescheduled", value: h.rescheduleCount > 0 ? `${h.rescheduleCount} time${h.rescheduleCount === 1 ? "" : "s"}` : null },
    ] : [],
    item: [
      { label: "Condition", value: i?.condition },
      { label: "Working status", value: i?.workingStatus },
      { label: "Approximate age", value: i?.approximateAge },
      { label: "Brand / model", value: [i?.brand, i?.model].filter(Boolean).join(" ") || null },
      { label: "Accessories", value: i?.accessoriesIncluded },
      { label: "Known defects", value: i?.knownDefects },
      { label: "Donor's notes", value: i?.specNotes },
      { label: "Pickup area", value: [i?.pickupLocality, i?.pickupCity].filter(Boolean).join(", ") || null },
    ],
    photos: (o.media ?? []).filter(m => m.mediaType === "IMAGE" && m.mediaUrl).map(m => m.mediaUrl).filter(isAllowedImage),
  };
}

function matchDetails(d: Extract<Delivery, { kind: "match" }>): Details {
  const m = d.match;
  return {
    code: `CK-M${String(m.id).padStart(5, "0")}`,
    hubHref: `/matches/${m.id}/handover`,
    timeline: [
      { label: "Matched", at: m.createdAt },
      { label: "Handover scheduled for", at: m.pickupDateTime },
      { label: "Donor confirmed handing it over", at: m.donorConfirmedAt },
      { label: "You confirmed receiving it", at: m.doneeConfirmedAt,
        detail: m.doneeConfirmedQty != null ? `${m.doneeConfirmedQty} received` : null },
      { label: "Completed", at: m.closedAt },
    ],
    handover: [
      { label: "Method", value: methodLabel(m.handoverMethod, MATCH_METHODS) },
      { label: "Place", value: m.handoverAddress || hasCoordinates(m.handoverLatitude, m.handoverLongitude)
          ? <Place address={m.handoverAddress} lat={m.handoverLatitude} lng={m.handoverLongitude} /> : null },
      { label: "Delivered to", value: m.deliveryAddress
          ? <Place address={m.deliveryAddress} lat={m.delivery?.latitude ?? null} lng={m.delivery?.longitude ?? null} /> : null },
      { label: "Courier contact", value: [m.delivery?.contactName, m.delivery?.contactPhone].filter(Boolean).join(" · ") || null },
      { label: "Transport arranged by", value: humanize(m.transportArrangedBy) },
      { label: "Transport cost paid by", value: humanize(m.transportCostBornBy) },
      { label: "Handover code checked", value: m.doneeConfirmedAt ? (m.deliveryOtpVerified ? "Yes" : "No") : null },
      { label: "Your rating", value: m.doneeConditionRating ? CONDITION_RATING[m.doneeConditionRating] ?? humanize(m.doneeConditionRating) : null },
      { label: "Your notes", value: m.doneeConditionNotes },
      { label: "Delivery record", value: m.verifiedDeliveryCertificate },
    ],
    item: [
      { label: "Item", value: m.listingTitle },
      { label: "Condition", value: m.listingCondition },
      { label: "Working status", value: m.listingWorkingStatus },
      { label: "Approximate age", value: m.listingApproximateAge },
      { label: "Brand / model", value: [m.listingBrand, m.listingModel].filter(Boolean).join(" ") || null },
      { label: "Accessories", value: m.listingAccessoriesIncluded },
      { label: "Known defects", value: m.listingKnownDefects },
      { label: "Description", value: m.listingDescription },
    ],
    photos: (m.donorImages ?? []).map(s => s.trim()).filter(isAllowedImage),
  };
}

function Place({ address, lat, lng }: { address: string | null; lat: number | null; lng: number | null }) {
  if (!address && !hasCoordinates(lat, lng)) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {address && <span>{address}</span>}
      {hasCoordinates(lat, lng) && (
        <a href={mapsHref(lat!, lng!)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-[var(--ck-role-accent)] hover:underline">
          <MapPin className="h-3.5 w-3.5" aria-hidden /> Map
        </a>
      )}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-3xs font-bold uppercase tracking-wider text-stone-400">{title}</h3>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  const shown = rows.filter(r => r.value != null && r.value !== "");
  if (shown.length === 0) return <p className="text-sm text-stone-400">Nothing recorded.</p>;
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[minmax(0,11rem)_1fr]">
      {shown.map(r => (
        <div key={r.label} className="contents">
          <dt className="text-stone-500 dark:text-stone-400">{r.label}</dt>
          <dd className="mb-1.5 min-w-0 break-words font-medium text-stone-800 dark:text-stone-200 sm:mb-0">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DeliveryDetailsDialog({ delivery, open, requestTitle, doneeName, onOpenChange }: {
  /** The last delivery opened. Kept after closing so the exit animation has content. */
  delivery: Delivery | null;
  open: boolean;
  requestTitle: string;
  doneeName: string;
  onOpenChange: (open: boolean) => void;
}) {
  const offerId = delivery?.kind === "offer" ? delivery.id : null;
  const [handover, setHandover] = useState<{ offerId: number; record: HandoverRecord | null; failed: boolean } | null>(null);

  // The handover record is fetched on open, not with the page — most rows are never opened.
  useEffect(() => {
    if (offerId == null) return;
    let cancelled = false;
    getHandover(offerId)
      .then(record => { if (!cancelled) setHandover({ offerId, record, failed: false }); })
      .catch(() => { if (!cancelled) setHandover({ offerId, record: null, failed: true }); });
    return () => { cancelled = true; };
  }, [offerId]);

  const loadingHandover = offerId != null && handover?.offerId !== offerId;
  const handoverFailed = offerId != null && handover?.offerId === offerId && handover.failed;
  const details = delivery == null ? null
    : delivery.kind === "offer"
      ? offerDetails(delivery, handover?.offerId === delivery.id ? handover.record : null)
      : matchDetails(delivery);
  const timeline = details?.timeline.filter(t => t.at) ?? [];
  const short = delivery?.received != null && delivery.offered != null && delivery.received < delivery.offered;

  return (
    <Dialog open={open && delivery != null} onOpenChange={onOpenChange}>
      {/* Keyed per delivery: DialogContent notes which button opened it on its
          first render, to hand focus back on close — a new row needs a new note. */}
      {delivery && details && (
      <DialogContent key={delivery.key} className="max-w-xl">
          <>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-stone-900 dark:text-stone-100">
                Delivery from {delivery.donorName}
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                For “{requestTitle}” · {details.code} · {delivery.kind === "offer" ? "Donation offer" : "Item match"}
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-5">
              {/* Quantities first — the part of the record most likely to be questioned. */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <p className="text-3xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Received</p>
                  <p className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{delivery.received ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <p className="text-3xs font-bold uppercase tracking-wider text-stone-500">Offered</p>
                  <p className="text-xl font-bold tabular-nums text-stone-700 dark:text-stone-200">{delivery.offered ?? "—"}</p>
                </div>
              </div>
              {short && (
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {delivery.offered! - delivery.received!} fewer arrived than the donor offered.
                </p>
              )}

              <Section title="People">
                <Rows rows={[
                  { label: "Donor", value: delivery.donorName },
                  { label: "Recipient", value: `${doneeName} (you)` },
                ]} />
              </Section>

              <Section title="Timeline">
                {timeline.length === 0 ? (
                  <p className="text-sm text-stone-400">{loadingHandover ? "Loading…" : "No dates recorded."}</p>
                ) : (
                  <ol className="space-y-2 border-l-2 border-stone-200 pl-4 dark:border-zinc-700">
                    {timeline.map(t => (
                      <li key={t.label} className="relative text-sm">
                        <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-[var(--ck-role-accent)]" aria-hidden />
                        <span className="font-medium text-stone-800 dark:text-stone-200">{t.label}</span>
                        <span className="block text-xs text-stone-500 tabular-nums">
                          {when(t.at)}{t.detail ? ` · ${t.detail}` : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>

              <Section title="Handover">
                {loadingHandover ? (
                  <p className="flex items-center gap-2 text-sm text-stone-400"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading…</p>
                ) : handoverFailed ? (
                  <p className="text-sm text-stone-400">The handover record couldn&apos;t be loaded. Try again, or open it below.</p>
                ) : (
                  <Rows rows={details.handover} />
                )}
              </Section>

              <Section title="The item">
                <Rows rows={details.item} />
                {details.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-4">
                    {details.photos.slice(0, 8).map(src => (
                      <a key={src} href={src} target="_blank" rel="noopener noreferrer"
                        className="relative block aspect-square overflow-hidden rounded-lg bg-stone-100 dark:bg-zinc-800">
                        <Image src={src} alt="" fill sizes="(min-width: 640px) 8rem, 30vw" className="object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </Section>
            </DialogBody>

            <DialogFooter>
              <Link href={details.hubHref}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-50 dark:border-zinc-700 dark:text-stone-300 dark:hover:bg-zinc-800">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Open handover record
              </Link>
            </DialogFooter>
          </>
      </DialogContent>
      )}
    </Dialog>
  );
}
