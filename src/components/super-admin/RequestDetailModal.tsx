"use client";

import { useEffect, useState } from "react";
import {
  adminGetItemRequests, adminGetItemRequestVerification,
  type AdminRequestVerificationDetail, type ItemRequest,
} from "@/lib/api";
import { saTheme } from "@/components/super-admin/saTheme";
import { fmt, Row, Section } from "@/components/super-admin/ListingDetailModal";
import { Loader2, X } from "lucide-react";

/**
 * Super-admin read of one donee request: every field, the request photo, the
 * verification documents the donee uploaded, the AI need assessment and any
 * fraud flags. Same sources as the admin verification queue — `/admin/item-requests`
 * filtered by status (no single-request admin GET) and
 * `/admin/item-requests/{id}/verification`. View only.
 */
export function RequestDetailModal({
  requestId, status, title, isDark, onClose,
}: {
  requestId: number;
  status?: string | null;
  title?: string | null;
  isDark: boolean;
  onClose: () => void;
}) {
  const t = saTheme(isDark);
  const [req, setReq] = useState<ItemRequest | null>(null);
  const [ver, setVer] = useState<AdminRequestVerificationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomed, setZoomed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [list, v] = await Promise.allSettled([
        adminGetItemRequests(status ?? undefined),
        adminGetItemRequestVerification(requestId),
      ]);
      if (cancelled) return;
      if (list.status === "fulfilled") setReq(list.value.find((r) => r.id === requestId) ?? null);
      else setError("Could not load the request details.");
      setVer(v.status === "fulfilled" ? v.value : null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [requestId, status]);

  const r = req;
  const docs = ver?.documents ?? [];
  const na = ver?.needAssessment;

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
            <h3 className={`truncate text-sm font-bold ${t.heading}`}>{fmt(r?.title ?? title)}</h3>
            <p className={`text-xs ${t.muted}`}>
              Request #{requestId} · {fmt(r?.doneeName)} · {fmt(r?.status ?? status)}
            </p>
          </div>
          <button onClick={onClose} className={`shrink-0 rounded-lg p-1.5 transition-colors ${t.btn}`} aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className={`flex items-center justify-center gap-2 py-12 text-xs ${t.muted}`}>
              <Loader2 className="size-4 animate-spin" /> Loading request…
            </div>
          ) : (
            <>
              {error && <div className={`m-5 rounded-lg border p-2.5 text-xs ${t.dangerPanel}`}>{error}</div>}

              <Section title="Photo" t={t}>
                {r?.imageUrl ? (
                  <button type="button" onClick={() => setZoomed(r.imageUrl)} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element -- stored request photo URL */}
                    <img src={r.imageUrl} alt="" className="max-h-56 rounded-lg" />
                  </button>
                ) : (
                  <p className={`text-xs ${t.muted}`}>No photo uploaded.</p>
                )}
              </Section>

              <Section title={`Verification documents (${docs.length})`} t={t}>
                {!docs.length ? (
                  <p className={`text-xs ${t.muted}`}>No documents uploaded.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {docs.map((d) => (
                      <div key={d.id} className={`overflow-hidden rounded-lg border ${t.cardFlat}`}>
                        {/\.pdf($|\?)/i.test(d.url) ? (
                          <a href={d.url} target="_blank" rel="noreferrer"
                             className={`flex aspect-square items-center justify-center text-xs underline ${t.text}`}>Open PDF</a>
                        ) : (
                          <button type="button" onClick={() => setZoomed(d.url)} className="block w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element -- presigned document URL */}
                            <img src={d.url} alt="" className="aspect-square w-full object-cover" />
                          </button>
                        )}
                        <p className={`px-1.5 py-1 text-[10px] ${d.aiVerified === false ? "text-red-500 font-semibold" : t.muted}`}>
                          {d.docType}{d.aiVerified == null ? "" : d.aiVerified ? " · AI ok" : " · AI doubtful"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {r && (
                <>
                  <Section title="Request" t={t}>
                    <Row label="Category" value={r.category} t={t} />
                    <Row label="Quantity" value={r.quantity} t={t} />
                    <Row label="Fulfilled" value={r.fulfilledQuantity} t={t} />
                    <Row label="Remaining" value={r.remainingQuantity} t={t} />
                    <Row label="Urgency" value={r.urgency} t={t} />
                    <Row label="Description" value={r.description} t={t} />
                    <Row label="Requester type" value={r.requesterType} t={t} />
                    <Row label="Organisation" value={r.organizationName} t={t} />
                  </Section>
                  <Section title="Location" t={t}>
                    <Row label="City" value={r.city} t={t} />
                    <Row label="Pincode" value={r.pincode} t={t} />
                    <Row label="Pickup radius (km)" value={r.pickupRadiusKm} t={t} />
                    <Row label="Coordinates" value={r.latitude != null && r.longitude != null ? `${r.latitude}, ${r.longitude}` : null} t={t} />
                  </Section>
                </>
              )}

              {ver && (
                <Section title="Verification" t={t}>
                  <Row label="Tier" value={ver.tier} t={t} />
                  <Row label="Emergency" value={ver.isEmergency ? fmt(ver.emergencyNature) : false} t={t} />
                  <Row label="Incident date" value={ver.incidentDate} t={t} />
                  <Row label="Verification due" value={ver.verificationDueAt} t={t} />
                  <Row label="Required checks" value={`${ver.requiredChecksPassed}/${ver.requiredChecksTotal}`} t={t} />
                  <Row label="Blocker" value={ver.requiredChecksBlocker} t={t} />
                  <Row label="Tier override" value={ver.tierOverriddenBy ? `${ver.tierOverriddenBy}: ${fmt(ver.tierOverrideReason)}` : null} t={t} />
                  <Row label="Donee email" value={ver.doneeEmail} t={t} />
                </Section>
              )}

              {na && (
                <Section title="AI assessment" t={t}>
                  <Row label="Recommendation" value={na.recommendation} t={t} />
                  <Row label="Need score" value={na.needScore} t={t} />
                  <Row label="Fraud score" value={na.fraudScore} t={t} />
                  <Row label="Duplicate score" value={na.duplicateScore} t={t} />
                  <Row label="Evidence notes" value={na.evidenceNotes} t={t} />
                  <Row label="Missing info" value={na.missingInfoFlags} t={t} />
                </Section>
              )}

              {!!ver?.fraudFlags.length && (
                <Section title={`Fraud flags (${ver.fraudFlags.length})`} t={t}>
                  {ver.fraudFlags.map((f) => (
                    <Row key={f.id} label={f.flagType} value={f.description} t={t} />
                  ))}
                </Section>
              )}

              {r && (
                <Section title="Status" t={t}>
                  <Row label="Status" value={r.status} t={t} />
                  <Row label="Rejection reason" value={r.rejectionReason} t={t} />
                  <Row label="Created" value={r.createdAt} t={t} />
                </Section>
              )}
            </>
          )}
        </div>
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => { e.stopPropagation(); setZoomed(null); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- presigned URL */}
          <img src={zoomed} alt="Full size" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
