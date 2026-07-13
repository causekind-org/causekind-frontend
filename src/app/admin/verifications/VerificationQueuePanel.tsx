"use client";

import { useEffect, useState } from "react";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import {
  adminGetItemRequests, adminApproveItemRequest, adminRejectItemRequest,
  adminGetItemRequestVerification, adminUpdateChecklistItem, adminOverrideTier,
  adminHoldItemRequest, adminResumeItemRequestReview, adminRevealAadhaar,
  type ItemRequest, type AdminRequestVerificationDetail,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import {
  Check, X, ChevronDown, ChevronUp, Clock, User, FileText, Gauge,
  AlertTriangle, Loader2, ShieldCheck, Lock, Pause, Play, ListChecks, Eye, EyeOff,
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

  async function handleChecklistUpdate(requestId: number, itemId: number, status: "PASS" | "FAIL") {
    try {
      await adminUpdateChecklistItem(requestId, itemId, status);
      await refreshExpanded(requestId);
    } catch {
      toast.error("Failed to update checklist item");
    }
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
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
            placeholder="Reason for rejection…" className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-sm" />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setRejectId(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-stone-500">Cancel</button>
            <button onClick={handleReject} disabled={acting === rejectId} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50">Confirm Reject</button>
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

  // Deliberately local-only, never persisted: cleared the instant this card collapses
  // (this component unmounts) since expanded is a single id, not a set — see the parent.
  const [revealedAadhaar, setRevealedAadhaar] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  async function handleRevealAadhaar() {
    if (revealedAadhaar) { setRevealedAadhaar(null); return; } // toggle off — re-hide
    setRevealing(true);
    try {
      const { aadhaarNumber } = await adminRevealAadhaar(request.doneeId);
      setRevealedAadhaar(aadhaarNumber);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reveal Aadhaar number");
    } finally {
      setRevealing(false);
    }
  }

  return (
    <>
      {/* Tier + Aadhaar summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 text-xs space-y-1 border border-stone-100 dark:border-zinc-700">
          <p className="font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1"><Lock className="w-3 h-3" /> Identity (admin-only)</p>
          {detail.doneeAadhaarOnFile ? (
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono">
                {revealedAadhaar ?? `•••• •••• ${detail.doneeAadhaarLast4}`}
              </p>
              <button onClick={handleRevealAadhaar} disabled={revealing}
                className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border border-stone-200 dark:border-zinc-600 text-stone-500 hover:border-[#b04a15] hover:text-[#b04a15] disabled:opacity-50">
                {revealing ? <Loader2 className="w-3 h-3 animate-spin" /> : revealedAadhaar ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {revealedAadhaar ? "Hide" : "Reveal"}
              </button>
            </div>
          ) : (
            <p className="text-amber-600 font-semibold">No Aadhaar on file yet</p>
          )}
          {revealedAadhaar && (
            <p className="text-[10px] text-stone-400">This reveal has been logged for audit purposes.</p>
          )}
        </div>
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

      {/* Documents */}
      {detail.documents.length > 0 && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 text-xs border border-stone-100 dark:border-zinc-700">
          <p className="font-bold mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Documents ({detail.documents.length})</p>
          <div className="flex flex-wrap gap-2">
            {detail.documents.map((d) => (
              <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-zinc-700 text-stone-600 dark:text-stone-300 hover:bg-[#b04a15]/10 hover:text-[#b04a15] transition-colors">
                {d.docType.replace(/_/g, " ")}
              </a>
            ))}
          </div>
        </div>
      )}

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
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${item.status === "PASS" ? "bg-green-600 text-white" : "border border-stone-200 dark:border-zinc-600 text-stone-500 hover:border-green-500 hover:text-green-600"}`}>
                  PASS
                </button>
                <button onClick={() => onChecklistUpdate(item.id, "FAIL")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${item.status === "FAIL" ? "bg-red-600 text-white" : "border border-stone-200 dark:border-zinc-600 text-stone-500 hover:border-red-500 hover:text-red-600"}`}>
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
    ["Family size", v.familySize],
    ["Number of earners", v.numberOfEarners],
    ["Income source", v.incomeSource],
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
