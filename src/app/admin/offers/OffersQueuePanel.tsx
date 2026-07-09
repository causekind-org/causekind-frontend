"use client";

import { useEffect, useState } from "react";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import {
  adminGetAllOffers, adminActionOffer, adminGetOfferById, adminGetOfferHistory,
  adminRetryOfferScreening, getChatMessages, sendChatMessage,
  type DonationOffer, type StatusHistoryEntry, type ChatMessage,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import {
  Check, X, Info, ChevronDown, ChevronUp, Clock, User, Package,
  MapPin, ShieldCheck, AlertTriangle, Loader2, RefreshCw, Phone, Bot,
} from "lucide-react";

// Offers where AI screening hasn't reached a reviewable outcome yet — either never
// started (SUBMITTED) or is mid-flight. Admin previously had no visibility into these
// at all; they'd just silently sit here forever if the async screening job never fired.
const SCREENING_STATUSES = ["SUBMITTED", "AI_ELIGIBILITY_SCREENING", "AI_COMPATIBILITY_SCREENING"];

// Status → display config
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  DONOR_RECONFIRMED:            { label: "Awaiting Admin Approval", color: "text-amber-700", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200" },
  PENDING_ADMIN_APPROVAL:       { label: "Pending Admin Approval",  color: "text-amber-700", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200" },
  PENDING_DONEE_REVIEW:         { label: "With Recipient",          color: "text-blue-700",  bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200"   },
  SOFT_RESERVED_PRIMARY:        { label: "Primary Offer",           color: "text-blue-700",  bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200"   },
  ADMIN_APPROVED:               { label: "Approved",                color: "text-green-700", bg: "bg-green-50 dark:bg-green-950/40 border-green-200" },
  ADMIN_REJECTED:               { label: "Rejected",                color: "text-red-700",   bg: "bg-red-50 dark:bg-red-950/40 border-red-200"       },
  NEEDS_INFORMATION:            { label: "More Info Needed",        color: "text-orange-700",bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200"},
  HANDOVER_IN_PROGRESS:         { label: "Handover In Progress",    color: "text-teal-700",  bg: "bg-teal-50 dark:bg-teal-950/40 border-teal-200"    },
  HANDOVER_AT_RISK:             { label: "Handover At Risk",        color: "text-red-700",   bg: "bg-red-50 dark:bg-red-950/40 border-red-200"       },
  COMPLETED:                    { label: "Completed",               color: "text-green-700", bg: "bg-green-50 dark:bg-green-950/40 border-green-200" },
  WITHDRAWN:                    { label: "Withdrawn",               color: "text-gray-600",  bg: "bg-gray-50 dark:bg-zinc-800 border-gray-200"        },
  ISSUE_RAISED:                 { label: "Issue Raised",            color: "text-red-700",   bg: "bg-red-50 dark:bg-red-950/40 border-red-200"       },
  SUBMITTED:                    { label: "Awaiting AI Screening",   color: "text-sky-700",   bg: "bg-sky-50 dark:bg-sky-950/40 border-sky-200"        },
  AI_ELIGIBILITY_SCREENING:     { label: "AI Screening…",           color: "text-sky-700",   bg: "bg-sky-50 dark:bg-sky-950/40 border-sky-200"        },
  AI_COMPATIBILITY_SCREENING:   { label: "AI Screening…",           color: "text-sky-700",   bg: "bg-sky-50 dark:bg-sky-950/40 border-sky-200"        },
};

const FLOW_STAGES = [
  "Submitted", "AI Checked", "Sent to Recipient", "Recipient Accepted",
  "Donor Reconfirmed", "Admin Review", "Approved", "Handover", "Complete",
];
const STATUS_TO_STAGE: Record<string, number> = {
  DRAFT: 0, SUBMITTED: 0, AI_ELIGIBILITY_SCREENING: 1, AI_COMPATIBILITY_SCREENING: 1,
  COMPATIBILITY_CHECKED: 1, NEEDS_INFORMATION: 1,
  PENDING_DONEE_REVIEW: 2, SOFT_RESERVED_PRIMARY: 2, SOFT_RESERVED_BACKUP: 2,
  DONEE_ACCEPTED: 3, DONOR_RECONFIRMATION_REQUIRED: 3,
  DONOR_RECONFIRMED: 4, CONDITION_CHANGED_RESCREENING: 4, PENDING_ADMIN_APPROVAL: 4,
  ADMIN_APPROVED: 6, HANDOVER_IN_PROGRESS: 7, HANDOVER_AT_RISK: 7,
  ISSUE_WINDOW_OPEN: 8, ISSUE_RAISED: 8, COMPLETED: 8,
};

type ExpandedOffer = { offer: DonationOffer; history: StatusHistoryEntry[]; messages: ChatMessage[] };

const FILTER_OPTIONS = [
  { key: "PENDING",   label: "Needs Action",    statuses: ["DONOR_RECONFIRMED", "PENDING_ADMIN_APPROVAL"] },
  { key: "SCREENING", label: "AI Screening",    statuses: SCREENING_STATUSES },
  { key: "ALL",       label: "All Offers",      statuses: [] as string[] },
  { key: "APPROVED",  label: "Approved",        statuses: ["ADMIN_APPROVED"] },
  { key: "IN_FLIGHT", label: "In Progress",     statuses: ["HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK", "ISSUE_WINDOW_OPEN", "ISSUE_RAISED"] },
  { key: "CLOSED",    label: "Closed",          statuses: ["COMPLETED", "ADMIN_REJECTED", "WITHDRAWN"] },
];

// ── Reusable donation-offers queue — embedded in the admin dashboard's "Offers" tab
// and also on the standalone /admin/offers page. Keep both call sites in sync. ──
export function OffersQueuePanel() {
  const [offers, setOffers] = useState<DonationOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEntityUpdates(["OFFER"], () => {
    load();
  });
  const [filter, setFilter] = useState<string>("PENDING");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [expandedData, setExpandedData] = useState<ExpandedOffer | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);
  const [acting, setActing] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [requestInfoId, setRequestInfoId] = useState<number | null>(null);
  const [requestInfoNote, setRequestInfoNote] = useState("");
  const [adminReply, setAdminReply] = useState<Record<number, string>>({});
  const [replyTarget, setReplyTarget] = useState<Record<number, "DONOR" | "DONEE" | "BOTH">>({});
  const [replySending, setReplySending] = useState<number | null>(null);
  const [disputeActing, setDisputeActing] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [retrying, setRetrying] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const current = FILTER_OPTIONS.find(f => f.key === filter);
      if (current?.statuses.length === 1) {
        setOffers(await adminGetAllOffers(current.statuses[0]));
      } else if (current?.statuses.length && current.statuses.length > 1) {
        const results = await Promise.all(current.statuses.map(s => adminGetAllOffers(s)));
        setOffers(results.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else {
        setOffers(await adminGetAllOffers());
      }
    } catch {
      toast.error("Failed to load offers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  // Real-time push — mirrors ChatWindow.tsx's SSE-rebroadcast pattern: the backend
  // broadcasts every chat message to admins via "chat-message", which arrives here
  // as a window CustomEvent. Append instantly to the currently-expanded thread.
  useEffect(() => {
    function onPush(e: Event) {
      const detail = (e as CustomEvent).detail as {
        offerId: number; id: number; threadId: number; senderId: number; senderName: string;
        senderEmail: string; content: string; messageType: ChatMessage["messageType"];
        recipientTarget: ChatMessage["recipientTarget"]; sentAt: string;
      } | undefined;
      if (!detail || detail.offerId !== expanded) return;
      const message: ChatMessage = {
        id: detail.id, threadId: detail.threadId, senderId: detail.senderId, senderName: detail.senderName,
        senderEmail: detail.senderEmail, content: detail.content, messageType: detail.messageType,
        recipientTarget: detail.recipientTarget, readAt: null, sentAt: detail.sentAt,
      };
      setExpandedData(prev => {
        if (!prev || prev.messages.some(m => m.id === message.id)) return prev;
        return { ...prev, messages: [...prev.messages, message] };
      });
    }
    window.addEventListener("ck-chat-message", onPush);
    return () => window.removeEventListener("ck-chat-message", onPush);
  }, [expanded]);

  async function toggleExpand(offerId: number) {
    if (expanded === offerId) { setExpanded(null); setExpandedData(null); return; }
    setExpanded(offerId);
    setExpandedData(null);
    setExpandLoading(true);
    try {
      const [offer, history, messages] = await Promise.all([
        adminGetOfferById(offerId),
        adminGetOfferHistory(offerId),
        getChatMessages(offerId).catch(() => [] as ChatMessage[]),
      ]);
      setExpandedData({ offer, history, messages });
    } catch { toast.error("Failed to load offer details"); }
    finally { setExpandLoading(false); }
  }

  async function handleApprove(offerId: number) {
    setActing(offerId);
    try {
      const updated = await adminActionOffer(offerId, "APPROVE");
      setOffers(prev => prev.map(o => o.id === offerId ? updated : o));
      toast.success("Offer approved — both parties have been notified.");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setActing(null); }
  }

  async function handleReject() {
    if (!rejectId || !rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    setActing(rejectId);
    try {
      const updated = await adminActionOffer(rejectId, "REJECT", rejectReason.trim());
      setOffers(prev => prev.map(o => o.id === rejectId ? updated : o));
      setRejectId(null); setRejectReason("");
      toast.success("Offer rejected.");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setActing(null); }
  }

  async function sendAdminReply(offerId: number) {
    const text = adminReply[offerId]?.trim();
    if (!text) return;
    setReplySending(offerId);
    const target = replyTarget[offerId] ?? "BOTH";
    try {
      const msg = await sendChatMessage(offerId, `[ADMIN] ${text}`, "ADMIN_NOTE", target);
      setExpandedData(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev);
      setAdminReply(prev => ({ ...prev, [offerId]: "" }));
      const label = target === "DONOR" ? "donor" : target === "DONEE" ? "donee" : "both parties";
      toast.success(`Message sent to ${label}.`);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to send"); }
    finally { setReplySending(null); }
  }

  async function handleResolveIssue(offerId: number) {
    setDisputeActing(offerId);
    try {
      const updated = await adminActionOffer(offerId, "RESOLVE_ISSUE");
      setOffers(prev => prev.map(o => o.id === offerId ? updated : o));
      toast.success("Donation marked as complete. Both parties notified.");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setDisputeActing(null); }
  }

  async function handleCancelDonation() {
    if (!cancelId || !cancelReason.trim()) { toast.error("Enter a reason for cancellation"); return; }
    setDisputeActing(cancelId);
    try {
      const updated = await adminActionOffer(cancelId, "CANCEL_DONATION", cancelReason.trim());
      setOffers(prev => prev.map(o => o.id === cancelId ? updated : o));
      setCancelId(null); setCancelReason("");
      toast.success("Donation cancelled. Both parties notified.");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setDisputeActing(null); }
  }

  async function handleRetryScreening(offerId: number) {
    setRetrying(offerId);
    try {
      const updated = await adminRetryOfferScreening(offerId);
      setOffers(prev => prev.map(o => o.id === offerId ? updated : o));
      if (expandedData?.offer.id === offerId) setExpandedData({ ...expandedData, offer: updated });
      toast.success("AI screening re-triggered — refresh in a few seconds to see the result.");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to retry screening"); }
    finally { setRetrying(null); }
  }

  async function handleRequestInfo() {
    if (!requestInfoId || !requestInfoNote.trim()) { toast.error("Specify what information is needed"); return; }
    setActing(requestInfoId);
    try {
      const updated = await adminActionOffer(requestInfoId, "REQUEST_INFO", requestInfoNote.trim());
      setOffers(prev => prev.map(o => o.id === requestInfoId ? updated : o));
      setRequestInfoId(null); setRequestInfoNote("");
      toast.success("Donor notified to provide more information.");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setActing(null); }
  }

  const pendingCount = offers.filter(o =>
    ["DONOR_RECONFIRMED", "PENDING_ADMIN_APPROVAL"].includes(o.status)
  ).length;

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          {pendingCount > 0
            ? `${pendingCount} offer${pendingCount > 1 ? "s" : ""} waiting for your approval`
            : "No offers pending approval"}
        </p>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border border-stone-200 rounded-xl bg-white text-stone-600 hover:text-stone-900 transition-all disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              filter === f.key ? "bg-[#b04a15] text-white" : "bg-white dark:bg-zinc-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-zinc-700 hover:border-[#b04a15]"
            }`}>
            {f.label}
            {f.key === "PENDING" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8 text-[#b04a15]" /></div>
      )}

      {!loading && offers.length === 0 && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-100 dark:border-zinc-800 p-12 text-center shadow-sm">
          <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <h3 className="font-bold text-stone-700 dark:text-stone-300">All clear</h3>
          <p className="text-sm text-stone-400 mt-1">No offers in this category.</p>
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">Reject Offer</h3>
            <p className="text-sm text-stone-500">The donor and donee will both receive a notification with this reason.</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Enter the reason for rejection..."
              className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-red-400" />
            <div className="flex gap-2">
              <button onClick={handleReject} disabled={acting !== null}
                className="flex-1 rounded-xl bg-red-600 text-white py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {acting ? "Rejecting..." : "Confirm Rejection"}
              </button>
              <button onClick={() => { setRejectId(null); setRejectReason(""); }}
                className="rounded-xl border border-stone-200 dark:border-zinc-700 px-4 py-2.5 text-sm text-stone-600 dark:text-stone-400">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Donation modal (dispute — sides with donee) */}
      {cancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">Cancel Donation</h3>
            <p className="text-sm text-stone-500">This sides with the donee — the item was not received. Both parties will be notified and the reservation will be released.</p>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3}
              placeholder="Reason for cancellation (shared with both parties)..."
              className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-red-400" />
            <div className="flex gap-2">
              <button onClick={handleCancelDonation} disabled={disputeActing !== null}
                className="flex-1 rounded-xl bg-red-700 text-white py-2.5 text-sm font-semibold hover:bg-red-800 disabled:opacity-50">
                {disputeActing ? "Cancelling..." : "Confirm Cancellation"}
              </button>
              <button onClick={() => { setCancelId(null); setCancelReason(""); }}
                className="rounded-xl border border-stone-200 dark:border-zinc-700 px-4 py-2.5 text-sm text-stone-600 dark:text-stone-400">
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Info modal */}
      {requestInfoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">Request More Information</h3>
            <p className="text-sm text-stone-500">The donor will receive a notification and be asked to update their offer.</p>
            <textarea value={requestInfoNote} onChange={e => setRequestInfoNote(e.target.value)} rows={3}
              placeholder="What information is needed from the donor?"
              className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-amber-400" />
            <div className="flex gap-2">
              <button onClick={handleRequestInfo} disabled={acting !== null}
                className="flex-1 rounded-xl bg-amber-500 text-white py-2.5 text-sm font-semibold hover:bg-amber-600 disabled:opacity-50">
                Send to Donor
              </button>
              <button onClick={() => { setRequestInfoId(null); setRequestInfoNote(""); }}
                className="rounded-xl border border-stone-200 dark:border-zinc-700 px-4 py-2.5 text-sm text-stone-600 dark:text-stone-400">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offer cards */}
      {!loading && offers.map(offer => {
        const cfg = STATUS_CFG[offer.status] ?? { label: offer.status.replace(/_/g, " "), color: "text-stone-600", bg: "bg-stone-50 border-stone-200" };
        const stageIdx = STATUS_TO_STAGE[offer.status] ?? 0;
        const isExpanded = expanded === offer.id;
        const needsAction = ["DONOR_RECONFIRMED", "PENDING_ADMIN_APPROVAL"].includes(offer.status);
        const isScreening = SCREENING_STATUSES.includes(offer.status);

        return (
          <div key={offer.id}
            className={`rounded-2xl bg-white dark:bg-zinc-900 border shadow-sm overflow-hidden transition-shadow ${needsAction ? "border-amber-300 dark:border-amber-700 shadow-amber-100 dark:shadow-none" : "border-stone-100 dark:border-zinc-800"}`}>

            {/* Summary row */}
            <button onClick={() => toggleExpand(offer.id)}
              className="w-full text-left p-5 flex items-start gap-4 hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors">

              {/* Thumbnail */}
              {offer.media?.[0] ? (
                <div className="h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-800">
                  <img src={offer.media[0].mediaUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Package className="w-6 h-6 text-stone-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {needsAction && (
                    <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide animate-pulse">
                      Action Required
                    </span>
                  )}
                  {isScreening && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">
                      <Bot className="w-2.5 h-2.5" /> AI Screening
                    </span>
                  )}
                  {offer.matchScore != null && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      offer.matchScore >= 80 ? "bg-green-50 text-green-700" :
                      offer.matchScore >= 50 ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-700"
                    }`}>
                      Match {offer.matchScore.toFixed(0)}%
                    </span>
                  )}
                  {offer.compatibilityIndicator && (
                    <span className="rounded-full bg-stone-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-stone-500">
                      {offer.compatibilityIndicator.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-stone-900 dark:text-stone-100">{offer.requestTitle}</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {offer.requestCategory} · {offer.requestCity}
                  {offer.flowType && ` · ${offer.flowType === "ALREADY_OWN" ? "Donor already owns" : offer.flowType === "WILL_PURCHASE" ? "Donor will purchase" : "Similar item"}`}
                </p>

                {/* Mini stage bar */}
                <div className="mt-2 flex gap-0.5">
                  {FLOW_STAGES.map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${
                      i < stageIdx ? "bg-green-400" :
                      i === stageIdx ? "bg-[#b04a15]" :
                      "bg-stone-200 dark:bg-zinc-700"
                    }`} />
                  ))}
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Stage {stageIdx + 1} of {FLOW_STAGES.length} · {FLOW_STAGES[stageIdx]}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-stone-400">#{offer.id}</span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
              </div>
            </button>

            {/* ── EXPANDED DETAIL ── */}
            {isExpanded && (
              <div className="border-t border-stone-100 dark:border-zinc-800">
                {expandLoading && (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-[#b04a15]" /></div>
                )}

                {expandedData && expandedData.offer.id === offer.id && (
                  <div className="p-5 space-y-6">
                    {/* Full stage progress */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-widest text-stone-400">Flow Progress</h4>
                      <div className="flex gap-0.5">
                        {FLOW_STAGES.map((_, i) => (
                          <div key={i} className={`h-2 flex-1 rounded-full ${
                            i < stageIdx ? "bg-green-400" :
                            i === stageIdx ? "bg-[#b04a15] animate-pulse" :
                            "bg-stone-200 dark:bg-zinc-700"
                          }`} />
                        ))}
                      </div>
                      <div className="flex">
                        {FLOW_STAGES.map((label, i) => (
                          <div key={i} className="flex-1 min-w-0 text-center">
                            <span className={`text-[8px] font-semibold ${
                              i < stageIdx ? "text-green-600" :
                              i === stageIdx ? "text-[#b04a15]" :
                              "text-stone-300 dark:text-zinc-600"
                            }`}>
                              {i < stageIdx ? "✓ " : i === stageIdx ? "● " : "○ "}{label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Two-column: left = item details, right = donor/donee info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                      {/* Item details */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                          <Package className="w-3 h-3" /> Item Details
                        </h4>
                        {expandedData.offer.itemDetails && (() => {
                          const item = expandedData.offer.itemDetails!;
                          return (
                            <div className="rounded-xl bg-stone-50 dark:bg-zinc-800 p-4 space-y-2 text-sm">
                              {[
                                ["Quantity", item.quantity],
                                ["Condition", item.condition],
                                ["Working Status", item.workingStatus],
                                ["Brand / Model", [item.brand, item.model].filter(Boolean).join(" / ") || null],
                                ["Approx. Age", item.approximateAge],
                                ["Dimensions", item.dimensions],
                                ["Weight", item.approximateWeight],
                                ["Accessories", item.accessoriesIncluded],
                                ["Pickup City", item.pickupCity],
                                ["Pincode", item.pickupPincode],
                                ["Delivery by", item.deliveryCostBornBy],
                              ].filter(([, v]) => v != null && v !== "").map(([label, value]) => (
                                <div key={label as string} className="flex gap-2">
                                  <span className="font-medium text-stone-500 dark:text-stone-400 w-28 flex-shrink-0">{label}:</span>
                                  <span className="text-stone-700 dark:text-stone-300">{String(value)}</span>
                                </div>
                              ))}
                              {item.knownDefects && (
                                <div className={`mt-1 rounded-lg px-2 py-1 text-xs ${
                                  item.knownDefects === "None" || item.knownDefects === "none"
                                    ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                                }`}>
                                  Defects: {item.knownDefects}
                                </div>
                              )}
                              {item.specNotes && (
                                <div className="mt-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 px-2 py-1 text-xs text-blue-700 dark:text-blue-400">
                                  Notes: {item.specNotes}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* AI Assessment */}
                        <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5 pt-2">
                          <ShieldCheck className="w-3 h-3" /> AI Assessment
                        </h4>
                        <div className="rounded-xl bg-stone-50 dark:bg-zinc-800 p-4 space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[10px] text-stone-400 uppercase font-bold">Compatibility</p>
                              <p className={`font-semibold ${
                                offer.compatibilityResult === "COMPATIBLE" ? "text-green-600" :
                                offer.compatibilityResult === "PARTIALLY_COMPATIBLE" ? "text-amber-600" :
                                "text-red-600"
                              }`}>{offer.compatibilityResult?.replace(/_/g, " ") ?? "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-stone-400 uppercase font-bold">Match Score</p>
                              <p className="font-semibold text-stone-700 dark:text-stone-300">
                                {offer.matchScore != null ? `${offer.matchScore.toFixed(0)}%` : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-stone-400 uppercase font-bold">Indicator</p>
                              <p className="font-semibold text-stone-700 dark:text-stone-300">
                                {offer.compatibilityIndicator?.replace(/_/g, " ") ?? "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-stone-400 uppercase font-bold">Flow Type</p>
                              <p className="font-semibold text-stone-700 dark:text-stone-300">
                                {offer.flowType === "ALREADY_OWN" ? "Already Owns" :
                                 offer.flowType === "WILL_PURCHASE" ? "Will Purchase" :
                                 offer.flowType === "SIMILAR_ITEM" ? "Similar Item" : "—"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Screening in progress / never started — admin visibility + manual retry.
                            Previously these offers were invisible: no assessment record exists yet,
                            so there was nothing here to show and no way to know it was stuck. */}
                        {isScreening && (
                          <div className="rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 p-4 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-400">
                              <Bot className="w-3.5 h-3.5" />
                              AI screening {offer.status === "SUBMITTED" ? "has not started yet" : "is in progress"}
                            </div>
                            <p className="text-xs text-sky-600 dark:text-sky-400">
                              Submitted {offer.submittedAt ? new Date(offer.submittedAt).toLocaleString() : "—"}.
                              {offer.status === "SUBMITTED" && " If this doesn't move within a few minutes, the background screening job may not have run — use Retry below."}
                            </p>
                            <button onClick={() => handleRetryScreening(offer.id)} disabled={retrying === offer.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-sky-700 disabled:opacity-50">
                              <RefreshCw className={`w-3 h-3 ${retrying === offer.id ? "animate-spin" : ""}`} />
                              {retrying === offer.id ? "Retrying…" : "Retry AI Screening"}
                            </button>
                          </div>
                        )}

                        {/* Full AI evidence — only present once screening has actually run at least once */}
                        {expandedData.offer.assessment && (
                          <div className="rounded-xl bg-stone-50 dark:bg-zinc-800 p-4 space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-[10px] text-stone-400 uppercase font-bold">Eligibility</p>
                                <p className="font-semibold text-stone-700 dark:text-stone-300">{expandedData.offer.assessment.eligibilityResult ?? "—"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-stone-400 uppercase font-bold">Fraud Risk</p>
                                <p className={`font-semibold ${
                                  expandedData.offer.assessment.fraudRisk === "HIGH" ? "text-red-600" :
                                  expandedData.offer.assessment.fraudRisk === "MEDIUM" ? "text-amber-600" :
                                  "text-green-600"
                                }`}>{expandedData.offer.assessment.fraudRisk ?? "—"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-stone-400 uppercase font-bold">Recommendation</p>
                                <p className="font-semibold text-stone-700 dark:text-stone-300">{expandedData.offer.assessment.recommendation ?? "—"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-stone-400 uppercase font-bold">Model</p>
                                <p className="font-semibold text-stone-700 dark:text-stone-300">{expandedData.offer.assessment.modelVersion ?? "—"}</p>
                              </div>
                            </div>
                            {expandedData.offer.assessment.missingInfoFlags && (
                              <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 px-2 py-1 text-xs text-orange-700 dark:text-orange-400">
                                Missing info: {expandedData.offer.assessment.missingInfoFlags}
                              </div>
                            )}
                            {expandedData.offer.assessment.safetyWarnings && (
                              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 px-2 py-1 text-xs text-red-700 dark:text-red-400">
                                Safety: {expandedData.offer.assessment.safetyWarnings}
                              </div>
                            )}
                            {expandedData.offer.assessment.evidenceNotes && (
                              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 px-2 py-1 text-xs text-blue-700 dark:text-blue-400">
                                {expandedData.offer.assessment.evidenceNotes}
                              </div>
                            )}
                            {(expandedData.offer.assessment.detectedLabels || expandedData.offer.assessment.moderationLabels) && (
                              <div className="pt-1 space-y-1">
                                {expandedData.offer.assessment.detectedLabels && (
                                  <p className="text-[11px] text-stone-500"><span className="font-semibold">Detected:</span> {expandedData.offer.assessment.detectedLabels}</p>
                                )}
                                {expandedData.offer.assessment.moderationLabels && (
                                  <p className="text-[11px] text-stone-500"><span className="font-semibold">Moderation:</span> {expandedData.offer.assessment.moderationLabels}</p>
                                )}
                              </div>
                            )}
                            <p className="text-[10px] text-stone-400 pt-1">
                              Screened {new Date(expandedData.offer.assessment.createdAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Donor / Donee + Photos */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                          <User className="w-3 h-3" /> Parties
                        </h4>
                        <div className="rounded-xl bg-stone-50 dark:bg-zinc-800 p-4 space-y-3 text-sm">
                          {/* Donor */}
                          <div>
                            <p className="text-[10px] text-stone-400 uppercase font-bold mb-1">Donor</p>
                            <p className="text-stone-700 dark:text-stone-300 font-semibold">{expandedData.offer.donorName}</p>
                            {expandedData.offer.donorPhone ? (
                              <a href={`tel:${expandedData.offer.donorPhone}`}
                                className="inline-flex items-center gap-1 text-xs text-[#b04a15] hover:underline mt-0.5">
                                <Phone className="w-3 h-3" /> {expandedData.offer.donorPhone}
                              </a>
                            ) : (
                              <p className="text-xs text-stone-400 mt-0.5">Phone: visible at handover stage</p>
                            )}
                            <p className="text-xs text-stone-400 mt-0.5">Offer #{offer.id} · submitted {new Date(offer.createdAt).toLocaleDateString()}</p>
                          </div>
                          {/* Donee */}
                          <div className="border-t border-stone-100 dark:border-zinc-700 pt-2">
                            <p className="text-[10px] text-stone-400 uppercase font-bold mb-1">Recipient (Donee)</p>
                            <p className="text-stone-700 dark:text-stone-300 font-semibold">{expandedData.offer.doneeName}</p>
                            {expandedData.offer.doneePhone ? (
                              <a href={`tel:${expandedData.offer.doneePhone}`}
                                className="inline-flex items-center gap-1 text-xs text-[#b04a15] hover:underline mt-0.5">
                                <Phone className="w-3 h-3" /> {expandedData.offer.doneePhone}
                              </a>
                            ) : (
                              <p className="text-xs text-stone-400 mt-0.5">Phone: visible at handover stage</p>
                            )}
                            <p className="text-xs text-stone-400 mt-0.5">{offer.requestTitle} · {offer.requestCity}</p>
                          </div>
                          {/* Request */}
                          <div className="border-t border-stone-100 dark:border-zinc-700 pt-2">
                            <p className="text-[10px] text-stone-400 uppercase font-bold mb-1">Request</p>
                            <p className="text-stone-700 dark:text-stone-300 font-medium">{offer.requestTitle}</p>
                            <p className="text-xs text-stone-400">{offer.requestCategory} · {offer.requestCity} · Qty: {offer.requestQuantity}</p>
                          </div>
                          {offer.rejectionReason && (
                            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2">
                              <p className="text-xs font-bold text-red-700 dark:text-red-400">Rejection / Cancellation Reason</p>
                              <p className="text-xs text-red-600 dark:text-red-400">{offer.rejectionReason}</p>
                            </div>
                          )}
                        </div>

                        {/* Photos */}
                        {expandedData.offer.media.length > 0 && (
                          <>
                            <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5 pt-1">
                              <MapPin className="w-3 h-3" /> Item Photos
                            </h4>
                            <div className="grid grid-cols-4 gap-2">
                              {Array.from(new Map(expandedData.offer.media.map(m => [m.mediaUrl, m])).values()).map(m => (
                                <a key={m.id} href={m.mediaUrl} target="_blank" rel="noreferrer"
                                  className="aspect-square overflow-hidden rounded-xl bg-stone-100 dark:bg-zinc-800 block hover:opacity-80 transition-opacity">
                                  <img src={m.mediaUrl} alt="" className="h-full w-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status History Timeline */}
                    {expandedData.history.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> Complete Status History
                        </h4>
                        <div className="rounded-xl border border-stone-100 dark:border-zinc-800 overflow-hidden">
                          {expandedData.history.map((entry, i) => (
                            <div key={entry.id}
                              className={`flex items-start gap-3 px-4 py-3 text-sm ${i % 2 === 0 ? "bg-stone-50 dark:bg-zinc-800/50" : "bg-white dark:bg-zinc-900"}`}>
                              <div className="flex-shrink-0 mt-0.5">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-black ${
                                  entry.toStatus.includes("APPROVED") || entry.toStatus === "COMPLETED" ? "bg-green-500" :
                                  entry.toStatus.includes("REJECTED") || entry.toStatus.includes("DECLINED") || entry.toStatus === "WITHDRAWN" ? "bg-red-500" :
                                  entry.toStatus.includes("SCREENING") || entry.toStatus === "SUBMITTED" ? "bg-blue-500" :
                                  "bg-stone-400"
                                }`}>
                                  {i + 1}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {entry.fromStatus && (
                                    <>
                                      <span className="text-stone-400 text-xs">{entry.fromStatus.replace(/_/g, " ")}</span>
                                      <span className="text-stone-300">→</span>
                                    </>
                                  )}
                                  <span className="font-semibold text-stone-800 dark:text-stone-200 text-xs">
                                    {entry.toStatus.replace(/_/g, " ")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-[10px] text-stone-400">{new Date(entry.changedAt).toLocaleString()}</span>
                                  {entry.changedByEmail && (
                                    <span className="text-[10px] text-stone-400">by {entry.changedByEmail}</span>
                                  )}
                                </div>
                                {entry.note && (
                                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 italic">"{entry.note}"</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Chat Thread — problem reports and admin communication */}
                    {expandedData.messages.length > 0 || ["HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK", "ISSUE_RAISED", "ISSUE_WINDOW_OPEN"].includes(offer.status) ? (
                      <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-zinc-800">
                        <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3" /> Messages & Problem Reports
                        </h4>

                        {/* Highlight HANDOVER PROBLEM messages with dispute action buttons */}
                        {expandedData.messages.filter(m => m.content.includes("[HANDOVER PROBLEM]")).map(m => (
                          <div key={m.id} className="rounded-xl bg-red-50 dark:bg-red-950/30 border-2 border-red-400 dark:border-red-700 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                              <span className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-wide">
                                Handover Problem Reported
                              </span>
                              <span className="ml-auto text-[10px] text-red-400">{new Date(m.sentAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                              {m.content.replace("[HANDOVER PROBLEM] ", "")}
                            </p>
                            <p className="text-[10px] text-red-400">Reported by: {m.senderName}</p>

                            {/* Admin dispute resolution actions */}
                            <div className="border-t border-red-200 dark:border-red-800 pt-3">
                              <p className="text-[10px] font-black uppercase tracking-wide text-red-600 dark:text-red-400 mb-2">
                                Admin Action on this Report
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => handleResolveIssue(offer.id)}
                                  disabled={disputeActing === offer.id}
                                  className="rounded-lg bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Mark Complete
                                  <span className="block font-normal opacity-80 text-[9px] hidden sm:block">Donor's account accepted</span>
                                </button>
                                <button
                                  onClick={() => { setCancelId(offer.id); setCancelReason(""); }}
                                  disabled={disputeActing === offer.id}
                                  className="rounded-lg bg-red-700 hover:bg-red-800 text-white px-3 py-2 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
                                  <X className="w-3 h-3" />
                                  Cancel Donation
                                  <span className="block font-normal opacity-80 text-[9px] hidden sm:block">Donee's account accepted</span>
                                </button>
                              </div>
                              <p className="text-[10px] text-red-400 mt-1.5">
                                "Mark Complete" sides with the donor. "Cancel Donation" sides with the donee and releases the reservation.
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* All other messages */}
                        {expandedData.messages.filter(m => !m.content.includes("[HANDOVER PROBLEM]")).length > 0 && (
                          <div className="rounded-xl border border-stone-100 dark:border-zinc-800 overflow-hidden">
                            {expandedData.messages
                              .filter(m => !m.content.includes("[HANDOVER PROBLEM]"))
                              .map((m, i) => (
                                <div key={m.id}
                                  className={`px-4 py-2.5 text-sm ${i % 2 === 0 ? "bg-stone-50 dark:bg-zinc-800/50" : "bg-white dark:bg-zinc-900"}`}>
                                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      m.messageType === "ADMIN_NOTE" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                                      m.messageType === "SYSTEM" ? "bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-stone-400" :
                                      "bg-green-50 text-green-600"
                                    }`}>
                                      {m.messageType === "ADMIN_NOTE" ? "ADMIN" : m.messageType === "SYSTEM" ? "SYSTEM" : "MSG"}
                                    </span>
                                    {m.recipientTarget && m.recipientTarget !== "BOTH" && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                        m.recipientTarget === "DONOR"
                                          ? "border-purple-300 text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400"
                                          : "border-teal-300 text-teal-600 bg-teal-50 dark:bg-teal-950/30 dark:text-teal-400"
                                      }`}>
                                        → {m.recipientTarget} ONLY
                                      </span>
                                    )}
                                    <span className="text-xs font-medium text-stone-600 dark:text-stone-300">{m.senderName}</span>
                                    <span className="ml-auto text-[10px] text-stone-400">{new Date(m.sentAt).toLocaleString()}</span>
                                  </div>
                                  <p className="text-stone-700 dark:text-stone-300">{m.content.replace("[ADMIN] ", "")}</p>
                                </div>
                            ))}
                          </div>
                        )}

                        {/* Admin reply box with target selector */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-wide text-stone-400">
                              Send message to:
                            </label>
                            <div className="flex rounded-lg overflow-hidden border border-stone-200 dark:border-zinc-700 text-[10px] font-bold">
                              {(["BOTH", "DONOR", "DONEE"] as const).map(t => (
                                <button key={t}
                                  onClick={() => setReplyTarget(prev => ({ ...prev, [offer.id]: t }))}
                                  className={`px-3 py-1 transition-colors ${
                                    (replyTarget[offer.id] ?? "BOTH") === t
                                      ? "bg-[#b04a15] text-white"
                                      : "bg-stone-50 dark:bg-zinc-800 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-700"
                                  }`}>
                                  {t === "BOTH" ? "Both" : t === "DONOR" ? "Donor only" : "Donee only"}
                                </button>
                              ))}
                            </div>
                          </div>
                          {(replyTarget[offer.id] === "DONOR" || replyTarget[offer.id] === "DONEE") && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400">
                              ⚠ This message will only be visible to the {replyTarget[offer.id] === "DONOR" ? "donor" : "donee"}.
                            </p>
                          )}
                          <div className="flex gap-2">
                            <textarea
                              value={adminReply[offer.id] ?? ""}
                              onChange={e => setAdminReply(prev => ({ ...prev, [offer.id]: e.target.value }))}
                              placeholder={
                                (replyTarget[offer.id] ?? "BOTH") === "DONOR"
                                  ? "Message to donor only..."
                                  : (replyTarget[offer.id]) === "DONEE"
                                  ? "Message to donee only..."
                                  : "e.g. We are looking into this. Please wait while we contact the other party."
                              }
                              rows={2}
                              className="flex-1 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3 py-2 text-sm text-stone-800 dark:text-stone-200 outline-none focus:border-[#b04a15] resize-none"
                            />
                            <button
                              onClick={() => sendAdminReply(offer.id)}
                              disabled={!adminReply[offer.id]?.trim() || replySending === offer.id}
                              className="rounded-xl bg-[#b04a15] px-4 text-sm font-semibold text-white hover:bg-[#c45520] disabled:opacity-40"
                            >
                              {replySending === offer.id ? "..." : "Send"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Admin Actions */}
                    {["DONOR_RECONFIRMED", "PENDING_ADMIN_APPROVAL", "PENDING_DONEE_REVIEW"].includes(offer.status) && (
                      <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-zinc-800">
                        <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                          <ShieldCheck className="w-3 h-3" /> Admin Actions
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          <button onClick={() => handleApprove(offer.id)} disabled={acting === offer.id}
                            className="rounded-xl bg-green-600 hover:bg-green-700 text-white py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                            <Check className="w-4 h-4" /> Approve
                          </button>
                          <button onClick={() => { setRequestInfoId(offer.id); setRequestInfoNote(""); }}
                            className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-3 text-sm font-semibold flex items-center justify-center gap-2">
                            <Info className="w-4 h-4" /> Request Info
                          </button>
                          <button onClick={() => { setRejectId(offer.id); setRejectReason(""); }}
                            className="rounded-xl bg-red-600 hover:bg-red-700 text-white py-3 text-sm font-semibold flex items-center justify-center gap-2">
                            <X className="w-4 h-4" /> Reject
                          </button>
                        </div>
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                          <p className="font-bold">Before approving, verify:</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            <li>Item photos match description and appear genuine</li>
                            <li>Disclosed defects are acceptable for the request</li>
                            <li>Donor location is within reasonable distance of request</li>
                            <li>AI compatibility score is reasonable</li>
                            <li>No red flags in status history (repeated reconfirmations, suspicious activity)</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {offer.status === "ISSUE_RAISED" && (
                      <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                        <p className="font-bold flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4" /> Issue Reported</p>
                        <p>A post-delivery issue has been raised. Review the issue details and resolve it before the donation can be marked complete.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
