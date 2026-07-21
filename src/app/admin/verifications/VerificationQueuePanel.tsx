"use client";

import { useEffect, useState } from "react";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import {
  adminGetItemRequests, adminApproveItemRequest, adminRejectItemRequest,
  adminGetItemRequestVerification, adminUpdateChecklistItem, adminOverrideTier,
  adminHoldItemRequest, adminResumeItemRequestReview,
  type ItemRequest, type AdminRequestVerificationDetail,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { AiReviewPanel } from "@/components/admin/AiReviewPanel";
import { PhotoStrip } from "@/components/admin/PhotoStrip";
import {
  Check, X, ChevronDown, ChevronUp, Clock, User, FileText, Gauge,
  AlertTriangle, Loader2, ShieldCheck, Pause, Play, ListChecks, ExternalLink, Sparkles,
} from "lucide-react";

const TIERS = [
  { key: "ALL", label: "All Tiers" },
  { key: "TIER_4_EMERGENCY", label: "Tier 4 — Emergency" },
  { key: "TIER_3_HIGH_VALUE", label: "Tier 3 — High Value" },
  { key: "TIER_2_MODERATE", label: "Tier 2 — Moderate" },
  { key: "TIER_1_BASIC", label: "Tier 1 — Basic" },
];

const TIER_LABELS: Record<string, string> = {
  TIER_1_BASIC: "Tier 1 — Basic",
  TIER_2_MODERATE: "Tier 2 — Moderate",
  TIER_3_HIGH_VALUE: "Tier 3 — High Value",
  TIER_4_EMERGENCY: "Tier 4 — Emergency",
};

const STATUS_FILTERS = [
  { key: "PENDING_VERIFICATION", label: "Needs Review" },
  { key: "ON_HOLD", label: "On Hold" },
  { key: "ALL", label: "All" },
];

function formatDue(dueAt: string | null): { label: string; color: string } {
  if (!dueAt) return { label: "—", color: "text-stone-400" };
  const diffMs = new Date(dueAt).getTime() - Date.now();
  const hours = diffMs / 3_600_000;
  if (hours < 0) return { label: `${Math.abs(hours).toFixed(0)}h overdue`, color: "text-red-600 font-bold" };
  if (hours < 4) return { label: `${hours.toFixed(1)}h left`, color: "text-red-500 font-bold" };
  if (hours < 24) return { label: `${hours.toFixed(0)}h left`, color: "text-amber-600 font-semibold" };
  return { label: `${(hours / 24).toFixed(1)}d left`, color: "text-stone-500" };
}

type ExpandedState = { detail: AdminRequestVerificationDetail; loading: boolean };

// Drafts a professional, donee-facing rejection reason from the verification
// evidence on file: failed checklist steps (with the admin's notes), fraud
// flags, and any missing-info signals from the need assessment. Returns "" when
// there is nothing concrete to cite — the admin then writes the reason manually.
function draftRejectReason(detail: AdminRequestVerificationDetail | undefined): string {
  if (!detail) return "";
  const failed = detail.checklist.filter((i) => i.status === "FAIL");
  const flags = detail.fraudFlags;
  const missing = detail.needAssessment?.missingInfoFlags;
  if (failed.length === 0 && flags.length === 0 && !missing) return "";

  const lines: string[] = [
    "After a careful review of your request and the documents you provided, we are unable to approve it at this time.",
  ];
  if (failed.length > 0) {
    lines.push("", "The following verification checks were not successful:");
    failed.forEach((f) => lines.push(`• ${f.action}${f.note ? ` — ${f.note}` : ""}`));
  }
  if (flags.length > 0) {
    lines.push("", "Additional concerns noted during review:");
    flags.forEach((f) => lines.push(`• ${f.description}`));
  }
  if (missing) {
    lines.push("", `Information that was missing or incomplete: ${missing}.`);
  }
  lines.push(
    "",
    "You are welcome to submit a new request once the points above have been addressed. If you believe this decision was made in error, please contact CauseKind support and we will take another look."
  );
  return lines.join("\n");
}

export function VerificationQueuePanel() {
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING_VERIFICATION");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [expandedData, setExpandedData] = useState<Record<number, ExpandedState>>({});
  const [acting, setActing] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [holdId, setHoldId] = useState<number | null>(null);
  const [holdReason, setHoldReason] = useState("");

  useEntityUpdates(["REQUEST"], () => load());

  async function load() {
    setLoading(true);
    try {
      const status = statusFilter === "ALL" ? undefined : statusFilter;
      const data = await adminGetItemRequests(status);
      setRequests(data.sort((a, b) => new Date(a.verificationDueAt ?? a.createdAt).getTime() - new Date(b.verificationDueAt ?? b.createdAt).getTime()));
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  const filtered = tierFilter === "ALL" ? requests : requests.filter((r) => r.verificationTier === tierFilter);

  async function toggleExpand(id: number) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!expandedData[id]) {
      setExpandedData((prev) => ({ ...prev, [id]: { detail: prev[id]?.detail as AdminRequestVerificationDetail, loading: true } }));
      try {
        const detail = await adminGetItemRequestVerification(id);
        setExpandedData((prev) => ({ ...prev, [id]: { detail, loading: false } }));
      } catch {
        toast.error("Failed to load verification detail");
        setExpanded(null);
      }
    }
  }

  async function refreshExpanded(id: number) {
    try {
      const detail = await adminGetItemRequestVerification(id);
      setExpandedData((prev) => ({ ...prev, [id]: { detail, loading: false } }));
    } catch { /* keep stale data on transient failure */ }
  }

  function handleChecklistUpdate(requestId: number, itemId: number, status: "PASS" | "FAIL") {
    // Optimistic: flip the button instantly, sync with the server in the background.
    // Previously this awaited the update AND a full detail refetch before any visual
    // change — two round trips of dead air per click.
    setExpandedData((prev) => {
      const cur = prev[requestId];
      if (!cur?.detail) return prev;
      return {
        ...prev,
        [requestId]: {
          ...cur,
          detail: {
            ...cur.detail,
            checklist: cur.detail.checklist.map((i) => (i.id === itemId ? { ...i, status } : i)),
          },
        },
      };
    });
    adminUpdateChecklistItem(requestId, itemId, status).catch(() => {
      toast.error("Failed to update checklist item");
      refreshExpanded(requestId); // roll back to server truth
    });
  }

  async function handleApprove(id: number) {
    setActing(id);
    try {
      await adminApproveItemRequest(id);
      toast.success("Request approved — searching private inventory for a match");
      setExpanded(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setActing(null);
    }
  }

  async function handleReject() {
    if (!rejectId || rejectReason.trim().length < 5) { toast.error("Enter a reason (min 5 characters)"); return; }
    setActing(rejectId);
    try {
      await adminRejectItemRequest(rejectId, rejectReason.trim());
      toast.success("Request rejected");
      setRejectId(null); setRejectReason(""); setExpanded(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rejection failed");
    } finally {
      setActing(null);
    }
  }

  async function handleHold() {
    if (!holdId || holdReason.trim().length < 5) { toast.error("Enter a reason (min 5 characters)"); return; }
    setActing(holdId);
    try {
      await adminHoldItemRequest(holdId, holdReason.trim());
      toast.success("Request placed on hold");
      setHoldId(null); setHoldReason("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place on hold");
    } finally {
      setActing(null);
    }
  }

  async function handleResume(id: number) {
    setActing(id);
    try {
      await adminResumeItemRequestReview(id);
      toast.success("Review resumed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resume review");
    } finally {
      setActing(null);
    }
  }

  async function handleOverrideTier(requestId: number, tier: string) {
    const reason = window.prompt(`Override tier to ${TIER_LABELS[tier] ?? tier} — why?`);
    if (!reason || reason.trim().length < 3) return;
    setActing(requestId);
    try {
      await adminOverrideTier(requestId, tier, reason.trim());
      toast.success("Tier overridden — checklist regenerated");
      await refreshExpanded(requestId);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tier override failed");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${statusFilter === f.key ? "bg-[#b04a15] text-white border-[#b04a15]" : "bg-white dark:bg-zinc-800 border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-stone-300"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}
          className="text-xs font-bold px-3 py-1.5 rounded-full border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-stone-600 dark:text-stone-300">
          {TIERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-stone-400" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-20 text-stone-400">No requests in this view.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const due = formatDue(r.verificationDueAt);
            const isExpanded = expanded === r.id;
            const state = expandedData[r.id];
            return (
              <div key={r.id} className={`rounded-2xl border overflow-hidden ${r.isEmergency ? "border-red-300 dark:border-red-800" : "border-stone-200 dark:border-zinc-700"} bg-white dark:bg-zinc-900`}>
                <div className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-800/50" onClick={() => toggleExpand(r.id)}>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.isEmergency && (
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> EMERGENCY
                        </span>
                      )}
                      {r.verificationTier && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1e3a60]/10 text-[#1e3a60] dark:text-blue-300">
                          {TIER_LABELS[r.verificationTier] ?? r.verificationTier}
                        </span>
                      )}
                      <span className={`text-xs flex items-center gap-1 ${due.color}`}><Clock className="w-3 h-3" /> {due.label}</span>
                      <span className="text-xs text-stone-400">#{r.id}</span>
                    </div>
                    <p className="font-semibold text-sm">{r.title}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-stone-500">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {r.doneeName}</span>
                      <span>{r.category} · Qty {r.quantity} · {r.city}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-stone-400 shrink-0 mt-1" />}
                </div>

                {isExpanded && (
                  <div className="border-t dark:border-zinc-700 p-4 space-y-4 bg-stone-50 dark:bg-zinc-900/50">
                    <AiReviewPanel
                      entity="request"
                      id={r.id}
                      onUseReason={(reason) => { setRejectId(r.id); setRejectReason(reason); }}
                    />
                    {!state || state.loading ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-stone-400" /></div>
                    ) : (
                      <VerificationDetail
                        request={r}
                        detail={state.detail}
                        onChecklistUpdate={(itemId, status) => handleChecklistUpdate(r.id, itemId, status)}
                        onOverrideTier={(tier) => handleOverrideTier(r.id, tier)}
                      />
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t dark:border-zinc-700">
                      {r.status === "ON_HOLD" ? (
                        <button onClick={() => handleResume(r.id)} disabled={acting === r.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a60] text-white text-xs font-bold disabled:opacity-50">
                          <Play className="w-3.5 h-3.5" /> Resume Review
                        </button>
                      ) : (
                        <>
                          <button onClick={() => handleApprove(r.id)} disabled={acting === r.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-bold disabled:opacity-50">
                            {acting === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
                          </button>
                          <button onClick={() => setRejectId(r.id)} disabled={acting === r.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold disabled:opacity-50">
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button onClick={() => setHoldId(r.id)} disabled={acting === r.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-stone-300 text-xs font-bold disabled:opacity-50">
                            <Pause className="w-3.5 h-3.5" /> Hold
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <Modal title="Reject Request" onClose={() => setRejectId(null)}>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={6}
            placeholder="Reason for rejection…" className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-sm" />
          <div className="flex items-center justify-between gap-2 mt-3">
            <button
              onClick={() => {
                const draft = draftRejectReason(expandedData[rejectId]?.detail);
                if (!draft) {
                  toast.error("No failed checks or flags on file — please write the reason manually.");
                  return;
                }
                setRejectReason(draft);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 text-xs font-bold hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-colors"
              title="Draft a reason from the failed checklist steps, fraud flags and missing information"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Draft
            </button>
            <div className="flex gap-2">
              <button onClick={() => setRejectId(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-stone-500">Cancel</button>
              <button onClick={handleReject} disabled={acting === rejectId} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50">Confirm Reject</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Hold modal */}
      {holdId && (
        <Modal title="Place Request On Hold" onClose={() => setHoldId(null)}>
          <textarea value={holdReason} onChange={(e) => setHoldReason(e.target.value)} rows={3}
            placeholder="What's pending — a call, more documents, etc.?" className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-sm" />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setHoldId(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-stone-500">Cancel</button>
            <button onClick={handleHold} disabled={acting === holdId} className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-bold disabled:opacity-50">Confirm Hold</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="font-bold text-sm mb-3">{title}</p>
        {children}
      </div>
    </div>
  );
}

function VerificationDetail({
  request, detail, onChecklistUpdate, onOverrideTier,
}: {
  request: ItemRequest;
  detail: AdminRequestVerificationDetail;
  onChecklistUpdate: (itemId: number, status: "PASS" | "FAIL") => void;
  onOverrideTier: (tier: string) => void;
}) {
  const checklistDone = detail.checklist.length > 0 && detail.checklist.every((i) => i.status === "PASS");
  const checklistFailed = detail.checklist.some((i) => i.status === "FAIL");

  return (
    <>
      {/* Tier & Timing summary — full-width now that the Aadhaar reveal card is gone.
          The uploaded residence-proof document itself is still visible below via the
          generic "Supporting documents" PhotoStrip section. */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 text-xs space-y-1.5 border border-stone-100 dark:border-zinc-700">
        <p className="font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1"><Gauge className="w-3 h-3" /> Tier & Timing</p>
        <p>{TIER_LABELS[detail.tier ?? ""] ?? detail.tier ?? "—"}</p>
        {detail.tierOverriddenBy && <p className="text-stone-400">Overridden by {detail.tierOverriddenBy}: {detail.tierOverrideReason}</p>}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {TIERS.filter((t) => t.key !== "ALL" && t.key !== detail.tier).map((t) => (
            <button key={t.key} onClick={() => onOverrideTier(t.key)}
              className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-stone-200 dark:border-zinc-600 text-stone-500 hover:border-[#b04a15] hover:text-[#b04a15]">
              → {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submitted by */}
      <div className="rounded-xl border border-stone-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 mb-1.5">Submitted by</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#b04a15]/10 text-sm font-black text-[#b04a15]">
              {request.doneeName?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-stone-700 dark:text-stone-200">{request.doneeName ?? "Unknown donee"}</span>
              <span className="block truncate text-[11px] text-stone-500 dark:text-stone-400">{detail.doneeEmail ?? "—"}</span>
            </span>
          </div>
          <div className="text-right text-[11px] text-stone-500 dark:text-stone-400">
            <span className="block">{request.city || "Location not given"}</span>
            {request.pincode && <span className="block">PIN {request.pincode}</span>}
          </div>
        </div>
        {detail.doneeId && (
          <a
            href={`/admin/dashboard?journeyUser=${detail.doneeId}`}
            className="mt-2 inline-block text-[11px] font-semibold text-[#b04a15] hover:underline"
          >
            View donee&apos;s full journey →
          </a>
        )}
      </div>

      {/* What the donee submitted */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 text-xs border border-stone-100 dark:border-zinc-700">
        <p className="font-bold mb-2">What the donee submitted</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div><span className="text-stone-400">Category: </span><strong className="text-stone-700 dark:text-stone-200">{request.category}</strong></div>
          <div><span className="text-stone-400">Quantity: </span><strong className="text-stone-700 dark:text-stone-200">{request.quantity}</strong></div>
          <div><span className="text-stone-400">Urgency: </span><strong className="text-stone-700 dark:text-stone-200">{request.urgency}</strong></div>
          {request.isEmergency && (
            <div><span className="text-stone-400">Emergency: </span><strong className="text-red-600">{request.emergencyNature ?? "Yes"}</strong></div>
          )}
          <div><span className="text-stone-400">City: </span><strong className="text-stone-700 dark:text-stone-200">{request.city}</strong></div>
          {request.pincode && <div><span className="text-stone-400">PIN: </span><strong className="text-stone-700 dark:text-stone-200">{request.pincode}</strong></div>}
        </div>
        {request.description && (
          <p className="mt-2 text-stone-600 dark:text-stone-400"><span className="text-stone-400">Description: </span>{request.description}</p>
        )}
      </div>

      {/* Need assessment */}
      {detail.needAssessment && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 text-xs border border-stone-100 dark:border-zinc-700 space-y-2">
          <p className="font-bold flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Need Assessment ({detail.needAssessment.modelVersion})</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Metric label="Need" value={detail.needAssessment.needScore} />
            <Metric label="Fraud risk" value={detail.needAssessment.fraudScore} invert />
            <Metric label="Duplicate" value={detail.needAssessment.duplicateScore} invert />
            <Metric label="Docs complete" value={detail.needAssessment.documentConfidence} />
          </div>
          <p className="text-stone-500">Recommendation: <strong>{detail.needAssessment.recommendation.replace(/_/g, " ")}</strong></p>
          {detail.needAssessment.evidenceNotes && <p className="text-stone-500">{detail.needAssessment.evidenceNotes}</p>}
          {detail.needAssessment.missingInfoFlags && <p className="text-amber-600">Missing: {detail.needAssessment.missingInfoFlags}</p>}
        </div>
      )}

      {/* Fraud flags */}
      {detail.fraudFlags.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-3 text-xs border border-red-200 dark:border-red-900 space-y-1.5">
          <p className="font-bold text-red-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Fraud Flags</p>
          {detail.fraudFlags.map((f) => (
            <p key={f.id} className="text-red-700">• <strong>{f.flagType.replace(/_/g, " ")}</strong> — {f.description}</p>
          ))}
        </div>
      )}

      {/* Supporting documents — images go in the shared lightbox strip, non-image docs (PDFs etc.) as labeled links */}
      {detail.documents.length > 0 && (() => {
        const imageDocs = detail.documents.filter((d) => !isPdfUrl(d.url));
        const otherDocs = detail.documents.filter((d) => isPdfUrl(d.url));
        return (
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 text-xs border border-stone-100 dark:border-zinc-700 space-y-2">
            <p className="font-bold flex items-center gap-1"><FileText className="w-3 h-3" /> Documents ({detail.documents.length})</p>
            {imageDocs.length > 0 && (
              <PhotoStrip images={imageDocs.map((d) => d.url)} />
            )}
            {otherDocs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {otherDocs.map((d) => (
                  <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-stone-300 hover:bg-[#b04a15]/10 hover:text-[#b04a15] transition-colors">
                    <ExternalLink className="w-3 h-3" /> {d.docType.replace(/_/g, " ")}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Verification form */}
      {detail.verification && <VerificationFormGrid v={detail.verification} isEmergency={request.isEmergency} />}

      {/* Checklist */}
      {detail.checklist.length > 0 && (
        <div className={`rounded-xl p-3 text-xs border space-y-2 ${checklistFailed ? "bg-red-50 dark:bg-red-950/10 border-red-200" : checklistDone ? "bg-green-50 dark:bg-green-950/10 border-green-200" : "bg-white dark:bg-zinc-800 border-stone-100 dark:border-zinc-700"}`}>
          <p className="font-bold flex items-center gap-1"><ListChecks className="w-3 h-3" /> Verification Checklist
            {checklistDone && <span className="text-green-600 ml-1">— all steps passed, ready to approve</span>}
          </p>
          {detail.checklist.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-2 py-1.5 border-t border-stone-100 dark:border-zinc-700 first:border-t-0">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-700 dark:text-stone-200">{item.stepNumber}. {item.action}</p>
                <p className="text-stone-400">{item.howToVerify}</p>
                {item.note && <p className="text-stone-500 italic">Note: {item.note}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onChecklistUpdate(item.id, "PASS")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all duration-150 active:scale-90 ${item.status === "PASS" ? "bg-green-600 text-white scale-105 shadow-sm" : "border border-stone-200 dark:border-zinc-600 text-stone-500 hover:border-green-500 hover:text-green-600"}`}>
                  PASS
                </button>
                <button onClick={() => onChecklistUpdate(item.id, "FAIL")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all duration-150 active:scale-90 ${item.status === "FAIL" ? "bg-red-600 text-white scale-105 shadow-sm" : "border border-stone-200 dark:border-zinc-600 text-stone-500 hover:border-red-500 hover:text-red-600"}`}>
                  FAIL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Metric({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const good = invert ? value < 30 : value >= 70;
  const bad = invert ? value >= 60 : value < 40;
  const color = bad ? "text-red-600" : good ? "text-green-600" : "text-amber-600";
  return (
    <div className="text-center">
      <p className={`text-lg font-black ${color}`}>{value.toFixed(0)}</p>
      <p className="text-[10px] text-stone-400 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function VerificationFormGrid({ v, isEmergency }: { v: NonNullable<AdminRequestVerificationDetail["verification"]>; isEmergency: boolean }) {
  const rows: [string, string | number | null | undefined][] = isEmergency ? [
    ["People affected", v.peopleAffected],
    ["What was lost/damaged", v.lostDamagedDescription],
    ["Priority items", v.priorityItems],
  ] : [
    ["Household size", v.householdSize],
    ["Dependents", v.dependents],
    ["Age", v.age],
    ["Gender", v.gender],
    ["Housing type", v.housingType],
    ["Address landmark", v.addressLandmark],
    ["Beneficiary", v.beneficiaryDetails],
    ["Reason cannot buy", v.reasonCannotBuy],
    ["Supporting institution", v.supportingInstitution],
    ["Monthly income", v.monthlyIncome],
    ["Landlord contact", v.landlordNameContact],
    // "Family size" dropped from display (2026-07-20) — same question as "Household
    // size" above, kept in sync automatically now instead of asked twice.
    // "Number of earners" is now derived (household size − dependents) rather than
    // asked separately, but still shown here since it's still meaningful to admins.
    ["Number of earners", v.numberOfEarners],
    ["Income source", v.incomeSource],
    // Form no longer collects this separately (2026-07-20, folded into "Beneficiary"
    // above) — kept here since the grid below hides empty rows automatically, so this
    // still surfaces the value on older submissions without adding an empty row on new ones.
    ["Medical condition", v.medicalCondition],
    ["Referrer", v.referrerName ? `${v.referrerName} (${v.referrerContact ?? "no phone"})` : null],
    ["Alt. contact", v.altContactName ? `${v.altContactName} (${v.altContactPhone ?? "no phone"})` : null],
    ["Detailed story", v.detailedStory],
    ["Maps pin", v.mapsPin],
  ];
  const populated = rows.filter(([, val]) => val !== null && val !== undefined && val !== "");
  if (populated.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 text-xs border border-stone-100 dark:border-zinc-700">
      <p className="font-bold mb-2">Household & Situation</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {populated.map(([label, val]) => (
          <div key={label}><span className="text-stone-400">{label}: </span><strong className="text-stone-700 dark:text-stone-200">{String(val)}</strong></div>
        ))}
      </div>
    </div>
  );
}


function isPdfUrl(url: string) {
  return /\.pdf(\?|$)/i.test(url);
}
