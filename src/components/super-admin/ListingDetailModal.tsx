"use client";

import { serverDate } from "@/lib/serverTime";
import { useEffect, useState } from "react";
import {
  adminGetItemListings, adminGetListingPhotos, adminGetListingVideo,
  type ItemListing, type ListingPhoto, type OfferVideoStatus, type SuperAdminRow,
} from "@/lib/api";
import { saTheme, type SaTheme } from "@/components/super-admin/saTheme";
import { Loader2, X } from "lucide-react";

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return serverDate(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  return String(v);
}

function Row({ label, value, t }: { label: string; value: unknown; t: SaTheme }) {
  return (
    <div className={`flex justify-between gap-3 border-b py-1.5 last:border-0 ${t.cardFlat}`}>
      <span className={`shrink-0 text-xs ${t.muted}`}>{label}</span>
      <span className={`whitespace-pre-wrap break-words text-xs font-semibold text-right ${t.text}`}>{fmt(value)}</span>
    </div>
  );
}

function Section({ title, t, children }: { title: string; t: SaTheme; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3">
      <p className={`mb-1 text-[11px] font-bold uppercase tracking-wide ${t.muted}`}>{title}</p>
      {children}
    </div>
  );
}

/**
 * Super-admin read of one listing: every field the donor filled in plus all
 * photos (rejected/pending ones too, with their screening status) and the
 * video. The raw `/super-admin/item-listings` row only carries the table
 * columns, so the full record comes from the ADMIN endpoints — `/admin/items`
 * filtered by the row's status (there is no single-listing admin GET), and
 * `/admin/items/{id}/photos|video`, which skip the donor-ownership check.
 * View only; edits stay in the table.
 */
export function ListingDetailModal({
  row, isDark, onClose, onOpenProfile,
}: {
  row: SuperAdminRow;
  isDark: boolean;
  onClose: () => void;
  onOpenProfile: (donorId: number) => void;
}) {
  const t = saTheme(isDark);
  const id = Number(row.id);
  const [listing, setListing] = useState<ItemListing | null>(null);
  const [photos, setPhotos] = useState<ListingPhoto[] | null>(null);
  const [video, setVideo] = useState<OfferVideoStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomed, setZoomed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [list, ph, vid] = await Promise.allSettled([
        adminGetItemListings(typeof row.status === "string" ? row.status : undefined),
        adminGetListingPhotos(id),
        adminGetListingVideo(id),
      ]);
      if (cancelled) return;
      if (list.status === "fulfilled") setListing(list.value.find((l) => l.id === id) ?? null);
      else setError("Could not load the listing details.");
      setPhotos(ph.status === "fulfilled" ? ph.value : []);
      setVideo(vid.status === "fulfilled" ? vid.value : null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, row.status]);

  const l = listing;
  // Photo rows first; listings that predate them only have the legacy URLs.
  const legacy = !photos?.length ? (l?.photoUrls ?? []) : [];
  const donorId = (l?.donorId ?? row.donorId) as number | null | undefined;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${t.card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex shrink-0 items-center justify-between px-5 py-4 border-b ${t.cardFlat}`}>
          <div className="min-w-0">
            <h3 className={`truncate text-sm font-bold ${t.heading}`}>{fmt(l?.title ?? row.title)}</h3>
            <p className={`text-xs ${t.muted}`}>
              Listing #{id} · {fmt(l?.donorName ?? row.donorName)} · {fmt(l?.status ?? row.status)}
            </p>
          </div>
          <button onClick={onClose} className={`shrink-0 rounded-lg p-1.5 transition-colors ${t.btn}`} aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className={`flex items-center justify-center gap-2 py-12 text-xs ${t.muted}`}>
              <Loader2 className="size-4 animate-spin" /> Loading listing…
            </div>
          ) : (
            <>
              {error && <div className={`m-5 rounded-lg border p-2.5 text-xs ${t.dangerPanel}`}>{error}</div>}

              <Section title={`Photos (${photos?.length || legacy.length})`} t={t}>
                {!photos?.length && !legacy.length ? (
                  <p className={`text-xs ${t.muted}`}>No photos uploaded.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {(photos ?? []).map((p) => (
                      <div key={p.id} className={`overflow-hidden rounded-lg border ${t.cardFlat}`}>
                        {p.url ? (
                          <button type="button" onClick={() => setZoomed(p.url)} className="block w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned URL */}
                            <img src={p.url} alt="" className="aspect-square w-full object-cover" />
                          </button>
                        ) : (
                          <div className={`flex aspect-square items-center justify-center text-[10px] ${t.muted}`}>No preview</div>
                        )}
                        <p className={`px-1.5 py-1 text-[10px] ${p.status === "APPROVED" ? t.muted : "text-red-500 font-semibold"}`}>
                          {p.primary ? "★ Cover · " : ""}{p.status}{p.moderationCode ? ` (${p.moderationCode})` : ""}
                        </p>
                      </div>
                    ))}
                    {legacy.map((url) => (
                      <button key={url} type="button" onClick={() => setZoomed(url)} className={`overflow-hidden rounded-lg border ${t.cardFlat}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- stored listing photo URL */}
                        <img src={url} alt="" className="aspect-square w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </Section>

              {video && (
                <Section title="Video" t={t}>
                  {video.playbackUrl ? (
                    <video src={video.playbackUrl} controls className="max-h-72 w-full rounded-lg bg-black" />
                  ) : (
                    <p className={`text-xs ${t.muted}`}>
                      Status: {video.status}{video.moderationCode ? ` (${video.moderationCode})` : ""} — no playable file.
                    </p>
                  )}
                </Section>
              )}

              {l && (
                <>
                  <Section title="Item" t={t}>
                    <Row label="Category" value={[l.category, l.subcategory].filter(Boolean).join(" › ")} t={t} />
                    <Row label="Quantity" value={l.quantity} t={t} />
                    <Row label="Brand" value={l.brand} t={t} />
                    <Row label="Model" value={l.model} t={t} />
                    <Row label="Dimensions" value={l.dimensions} t={t} />
                    <Row label="Weight" value={l.approximateWeight} t={t} />
                    <Row label="Description" value={l.description} t={t} />
                  </Section>
                  <Section title="Condition" t={t}>
                    <Row label="Condition" value={l.condition} t={t} />
                    <Row label="Age" value={l.approximateAge} t={t} />
                    <Row label="Working status" value={l.workingStatus} t={t} />
                    <Row label="Known defects" value={l.knownDefects} t={t} />
                    <Row label="Accessories" value={l.accessoriesIncluded} t={t} />
                  </Section>
                  <Section title="Pickup & handover" t={t}>
                    <Row label="Pickup days" value={l.pickupDays} t={t} />
                    <Row label="Time slots" value={l.pickupTimeSlots} t={t} />
                    <Row label="Pickup availability" value={l.pickupAvailability} t={t} />
                    <Row label="Donor can drop off" value={l.donorDropOffAvailable} t={t} />
                    <Row label="Max travel (km)" value={l.maxTravelDistance} t={t} />
                    <Row label="Delivery radius (km)" value={l.maximumDeliveryRadius} t={t} />
                    <Row label="Transport paid by" value={l.transportPayerPreference} t={t} />
                    <Row label="Packaging" value={l.packagingAvailable} t={t} />
                    <Row label="Special handling" value={l.specialHandling} t={t} />
                    <Row label="Preferred handover date" value={l.preferredHandoverDate} t={t} />
                    <Row label="Preferred handover slots" value={l.preferredHandoverSlots} t={t} />
                    <Row label="Recipient restrictions" value={l.recipientRestrictions} t={t} />
                  </Section>
                  <Section title="Location" t={t}>
                    <Row label="Locality" value={l.locality} t={t} />
                    <Row label="City" value={l.city} t={t} />
                    <Row label="Pincode" value={l.pincode} t={t} />
                    <Row label="Coordinates" value={l.latitude != null && l.longitude != null ? `${l.latitude}, ${l.longitude}` : null} t={t} />
                  </Section>
                  <Section title="Status" t={t}>
                    <Row label="Status" value={l.status} t={t} />
                    <Row label="Rejection reason" value={l.rejectionReason} t={t} />
                    <Row label="Rejected by AI" value={l.rejectedByAi} t={t} />
                    <Row label="Donor email" value={l.donorEmail} t={t} />
                    <Row label="Created" value={l.createdAt} t={t} />
                    <Row label="Submitted" value={l.submittedAt} t={t} />
                    <Row label="Available until" value={l.availabilityExpiry} t={t} />
                    <Row label="Declarations accepted" value={l.declarationsAccepted} t={t} />
                  </Section>
                </>
              )}
            </>
          )}
        </div>

        {donorId != null && (
          <div className={`shrink-0 px-5 py-3.5 border-t ${t.cardFlat}`}>
            <button
              onClick={() => onOpenProfile(Number(donorId))}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${t.btnAccent}`}
            >
              Open donor&apos;s full profile
            </button>
          </div>
        )}
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => { e.stopPropagation(); setZoomed(null); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- presigned URL */}
          <img src={zoomed} alt="Listing photo" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
