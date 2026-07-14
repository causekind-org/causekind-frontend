"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import {
  getMyItemListings, getMyItemRequests, getMyMatches, getMyProfile,
  donorAcceptMatch, donorRejectMatch, doneeAcceptMatch, doneeRejectMatch, donorConfirmMatch,
  pauseItemListing, resumeItemListing, withdrawItemListing, deleteMyListing,
  getMyDonationOffers, reconfirmOfferAvailability, withdrawOffer, getOffersForMyRequests, doneeReviewOffer, confirmNoIssue,
  reopenItemRequest,
  type ItemListing, type ItemRequest, type ItemMatch, type UserProfile, type DonationOffer
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Award, HandCoins, Loader2, Package, Pencil, Plus, ShieldCheck, X, Check,
  User, MapPin, Calendar, CircleDot, EyeOff, Info, ExternalLink, RefreshCw,
  Phone, Mail, Handshake, CheckCircle2, Heart, AlertTriangle, ThumbsUp, ThumbsDown, Truck,
  ChevronDown, History
} from "lucide-react";
import { motion } from "framer-motion";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { Reveal } from "@/components/Reveal";
import { ListingDetailPanel } from "@/components/ListingDetailPanel";

// Once both parties accept, scheduling/confirmation/chat all live on the
// Handover Hub page instead of inline dashboard forms.
const HANDOVER_HUB_STATUSES = new Set([
  "BOTH_PARTIES_ACCEPTED", "LOGISTICS_CONFIRMED", "TRANSPORT_DISCUSSION",
  "ARRANGEMENT_AGREED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT",
  "DELIVERY_ATTEMPTED", "DELIVERED_PENDING_CONFIRMATION",
]);

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return "U";
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? "U";
  return ((words[0][0] ?? "") + (words[words.length - 1][0] ?? "")).toUpperCase();
}


// Listing status journey — ordered steps a listing goes through
const LISTING_JOURNEY = [
  { status: "DRAFT",                 label: "Draft",             color: "bg-stone-300" },
  { status: "SUBMITTED",             label: "Submitted",         color: "bg-blue-400" },
  { status: "AI_SCREENING",          label: "AI Screening",      color: "bg-blue-500" },
  { status: "MANUAL_REVIEW",         label: "Under Review",      color: "bg-amber-400" },
  { status: "ELIGIBLE_FOR_MATCHING", label: "Live & Matching",   color: "bg-green-500" },
  { status: "MATCHED",               label: "Matched",           color: "bg-emerald-600" },
  { status: "DONATED",               label: "Donated",           color: "bg-emerald-700" },
];

const LISTING_STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:                  { label: "Draft",             color: "text-stone-500",  bg: "bg-stone-100 dark:bg-zinc-800",    border: "border-stone-300" },
  SUBMITTED:              { label: "Under Review",      color: "text-blue-700",   bg: "bg-blue-50 dark:bg-blue-950/30",   border: "border-blue-200" },
  AI_SCREENING:           { label: "AI Screening",      color: "text-blue-700",   bg: "bg-blue-50 dark:bg-blue-950/30",   border: "border-blue-200" },
  NEEDS_INFORMATION:      { label: "More Info Needed",  color: "text-amber-700",  bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-300" },
  MANUAL_REVIEW:          { label: "Manual Review",     color: "text-amber-700",  bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-300" },
  ELIGIBLE_FOR_MATCHING:  { label: "Live — Matching",   color: "text-green-700",  bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-300" },
  AVAILABLE:              { label: "Live — Matching",   color: "text-green-700",  bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-300" },
  SOFT_RESERVED:          { label: "Soft Reserved",     color: "text-teal-700",   bg: "bg-teal-50 dark:bg-teal-950/30",   border: "border-teal-300" },
  MATCHED:                { label: "Matched",           color: "text-emerald-700",bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-300" },
  PAUSED:                 { label: "Paused",            color: "text-stone-600",  bg: "bg-stone-100 dark:bg-zinc-800",    border: "border-stone-300" },
  PARTIALLY_DONATED:      { label: "Partially Donated", color: "text-emerald-700",bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-300" },
  DONATED:                { label: "Donated",           color: "text-emerald-700",bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-300" },
  FULFILLED:              { label: "Fulfilled",         color: "text-emerald-700",bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-300" },
  EXPIRED:                { label: "Expired",           color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/30",     border: "border-red-300" },
  WITHDRAWN:              { label: "Withdrawn",         color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/30",     border: "border-red-300" },
  REJECTED:               { label: "Rejected",          color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/30",     border: "border-red-300" },
};

function ListingJourneyTracker({ status }: { status: string }) {
  const terminal = ["DONATED", "FULFILLED", "EXPIRED", "WITHDRAWN", "REJECTED"];
  if (terminal.includes(status)) return null;

  const idx = LISTING_JOURNEY.findIndex(s => s.status === status
    || (status === "AVAILABLE" && s.status === "ELIGIBLE_FOR_MATCHING"));
  if (idx < 0) return null;

  return (
    <div className="flex items-center gap-0 pt-2">
      {LISTING_JOURNEY.map((step, i) => (
        <div key={step.status} className="flex items-center flex-1 last:flex-none">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${i <= idx ? step.color : "bg-stone-200 dark:bg-zinc-700"}`} title={step.label} />
          {i < LISTING_JOURNEY.length - 1 && (
            <div className={`flex-1 h-0.5 ${i < idx ? "bg-green-400" : "bg-stone-200 dark:bg-zinc-700"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function getFulfilmentStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    DONOR_REVIEW: { label: "⚠ Awaiting Donor's Confirmation", variant: "outline" },
    DONOR_REJECTED: { label: "Donor Declined", variant: "destructive" },
    PENDING_APPROVAL: { label: "Pending Admin Approval", variant: "outline" },
    TRANSPORT_DISCUSSION: { label: "Discussion Enabled", variant: "secondary" },
    ARRANGEMENT_AGREED: { label: "Delivery Agreed", variant: "secondary" },
    PICKUP_SCHEDULED: { label: "Pickup Scheduled", variant: "secondary" },
    PICKED_UP: { label: "Picked Up", variant: "secondary" },
    IN_TRANSIT: { label: "In Transit", variant: "secondary" },
    DELIVERED_PENDING_CONFIRMATION: { label: "Delivered (Pending)", variant: "secondary" },
    FULFILLED: { label: "Completed & Closed", variant: "default" },
    FAILED: { label: "Delivery Failed", variant: "destructive" },
    CANCELLED: { label: "Match Cancelled", variant: "destructive" },
    REJECTED: { label: "Match Rejected", variant: "destructive" },
  };
  return map[status] ?? { label: status, variant: "outline" as const };
}

function getRequestStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    DRAFT: { label: "Draft", variant: "outline" },
    PENDING_VERIFICATION: { label: "Under Verification", variant: "outline" },
    VERIFIED_PRIVATE_MATCHING: { label: "Matching Privately", variant: "secondary" },
    POTENTIAL_MATCH_FOUND: { label: "Match Found", variant: "secondary" },
    AWAITING_MATCH_APPROVAL: { label: "Match Pending Approval", variant: "secondary" },
    PUBLICATION_CONSENT_REQUIRED: { label: "Consent Needed", variant: "secondary" },
    PUBLIC_REQUEST: { label: "Public Appeal", variant: "default" },
    RESERVED: { label: "Reserved", variant: "outline" },
    FULFILMENT_IN_PROGRESS: { label: "Fulfilment In Progress", variant: "secondary" },
    FULFILLED: { label: "Completed", variant: "default" },
    EXPIRED: { label: "Expired", variant: "outline" },
    REJECTED: { label: "Rejected", variant: "destructive" },
  };
  return map[status] ?? { label: status, variant: "outline" as const };
}

/* Fix & Resubmit: reopens a REJECTED request as a draft (REJECTED -> DRAFT) and
   jumps into the request wizard with everything prefilled and documents intact. */
function FixResubmitButton({ requestId }: { requestId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      className="h-7 px-2.5 text-[11px] font-bold border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
      onClick={async () => {
        setBusy(true);
        try {
          await reopenItemRequest(requestId);
          toast.success("Request reopened — fix the issues and resubmit");
          router.push(`/requests/new?draftId=${requestId}`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not reopen request");
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <><RefreshCw className="w-3 h-3 mr-1" /> Fix & Resubmit</>}
    </Button>
  );
}

/* The donee pipeline, drawn: every request travels Posted -> Verified -> Matched ->
   Received. The rail pulses at the current station and breaks (red) where a
   rejection or expiry stopped it — the structure IS the status explanation. */
const JOURNEY_STATIONS = ["Posted", "Verified", "Matched", "Received"];

function journeyStage(status: string): { stage: number; state: "draft" | "active" | "done" | "broken" } {
  if (status === "DRAFT") return { stage: 0, state: "draft" };
  if (status === "REJECTED") return { stage: 1, state: "broken" };
  if (status === "EXPIRED") return { stage: 2, state: "broken" };
  if (["PENDING_VERIFICATION", "ON_HOLD"].includes(status)) return { stage: 1, state: "active" };
  if (["FULFILLED", "FULLY_FULFILLED"].includes(status)) return { stage: 3, state: "done" };
  if (["RESERVED", "MATCH_IN_PROGRESS", "FULFILMENT_IN_PROGRESS", "PARTIALLY_MATCHED", "PARTIALLY_FULFILLED"].includes(status)) return { stage: 3, state: "active" };
  return { stage: 2, state: "active" }; // all matching-phase statuses
}

function JourneyRail({ status }: { status: string }) {
  const { stage, state } = journeyStage(status);
  return (
    <div className="flex items-start mt-4 max-w-md">
      {JOURNEY_STATIONS.map((label, i) => {
        const reached = i < stage || (i === stage && state === "done");
        const current = i === stage && state !== "done";
        const brokenHere = current && state === "broken";
        return (
          <div key={label} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <span className={`relative flex items-center justify-center w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                brokenHere ? "border-red-500 bg-red-500" :
                reached ? (i === 3 ? "border-emerald-500 bg-emerald-500" : "border-[#1e3a60] bg-[#1e3a60] dark:border-blue-400 dark:bg-blue-400") :
                current ? "border-[#1e3a60] dark:border-blue-400 bg-white dark:bg-zinc-900" :
                "border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"}`}>
                {current && !brokenHere && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#1e3a60]/40 dark:bg-blue-400/40 animate-ping motion-reduce:hidden" />
                )}
                {brokenHere && <X className="w-2 h-2 text-white" strokeWidth={4} />}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                brokenHere ? "text-red-500" : reached || current ? "text-stone-600 dark:text-stone-300" : "text-stone-300 dark:text-zinc-600"}`}>
                {label}
              </span>
            </div>
            {i < 3 && (
              <div className={`flex-1 h-[2px] mx-1.5 mt-1.5 rounded-full ${
                i < stage ? "bg-[#1e3a60] dark:bg-blue-400" : "bg-stone-200 dark:bg-zinc-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DoneeRequestRow({ request: r, index }: { request: ItemRequest; index: number }) {
  const badge = getRequestStatusBadge(r.status);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 * index }}
      className="border-b border-stone-200/70 dark:border-zinc-800 py-5 group"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug group-hover:text-[#1e3a60] dark:group-hover:text-blue-400 transition-colors"
            style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
            <TranslatedText text={r.title} />
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            <TranslatedText text={r.category} /> &middot; Qty {r.quantity} &middot; <span className="capitalize">{r.urgency.toLowerCase()}</span> urgency
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap">{badge.label}</Badge>
          {r.status === "REJECTED" && <FixResubmitButton requestId={r.id} />}
          {r.status === "DRAFT" && (
            <Link href={`/requests/new?draftId=${r.id}`}
              className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#1e3a60]/30 dark:border-blue-400/40 text-[11px] font-bold text-[#1e3a60] dark:text-blue-400 hover:bg-[#1e3a60]/5 dark:hover:bg-blue-400/10 transition-colors">
              <Pencil className="w-3 h-3" /> Continue editing
            </Link>
          )}
        </div>
      </div>
      <JourneyRail status={r.status} />
      {r.status === "REJECTED" && r.rejectionReason && (
        <p className="text-[11px] text-red-600 dark:text-red-400 mt-2.5 line-clamp-2 leading-snug max-w-xl">{r.rejectionReason}</p>
      )}
      {r.status === "DRAFT" && (
        <p className="text-[11px] text-stone-400 mt-2.5">Saved as a draft &mdash; continue where you left off and submit when ready.</p>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Donor Flow 2 — Offer Stage Tracker
───────────────────────────────────────────────────────────────────────────── */

// Ordered stages for the visual progress bar
const OFFER_STAGES = [
  "DRAFT",
  "SUBMITTED",
  "AI_ELIGIBILITY_SCREENING",
  "PENDING_DONEE_REVIEW",
  "DONOR_RECONFIRMED",
  "ADMIN_APPROVED",
  "HANDOVER_IN_PROGRESS",
  "ISSUE_WINDOW_OPEN",
  "COMPLETED",
];

type OfferMeta = {
  label: string;
  explanation: string;
  action?: string;
  actionLabel?: string;
  severity: "info" | "warning" | "success" | "error" | "neutral";
};

const OFFER_STATUS_META: Record<string, OfferMeta> = {
  DRAFT:                         { label: "Draft",                    explanation: "Complete your item details and photos to submit the offer.", action: "edit", actionLabel: "Continue offer", severity: "warning" },
  SUBMITTED:                     { label: "Submitted",                explanation: "Your offer has been submitted and is queued for AI screening.", severity: "info" },
  AI_ELIGIBILITY_SCREENING:      { label: "AI Eligibility Check",     explanation: "We are checking if your item is safe and eligible to donate.", severity: "info" },
  AI_COMPATIBILITY_SCREENING:    { label: "AI Compatibility Check",   explanation: "We are comparing your item details against the request requirements.", severity: "info" },
  COMPATIBILITY_CHECKED:         { label: "Compatibility Checked",    explanation: "AI check is complete. Sending to the recipient for review.", severity: "info" },
  NEEDS_INFORMATION:             { label: "More Information Needed",  explanation: "Your offer needs additional details before it can proceed.", action: "edit", actionLabel: "Update details", severity: "warning" },
  SOFT_RESERVED_PRIMARY:         { label: "Sent to Recipient",        explanation: "Your offer is the primary offer and the recipient is reviewing it.", severity: "info" },
  SOFT_RESERVED_BACKUP:          { label: "Backup Offer",             explanation: "Your offer is on standby as a backup in case the primary offer falls through.", severity: "neutral" },
  PENDING_DONEE_REVIEW:          { label: "Recipient Reviewing",      explanation: "The recipient is reviewing your item photos and details.", severity: "info" },
  DONEE_ACCEPTED:                { label: "Recipient Accepted",       explanation: "Great! The recipient accepted your offer. Waiting for you to reconfirm.", action: "reconfirm", actionLabel: "Reconfirm availability", severity: "warning" },
  DONEE_DECLINED:                { label: "Recipient Declined",       explanation: "The recipient declined this offer.", severity: "error" },
  DONOR_RECONFIRMATION_REQUIRED: { label: "Reconfirmation Required",  explanation: "Please confirm your item is still available and in the same condition.", action: "reconfirm", actionLabel: "Confirm item is ready", severity: "warning" },
  DONOR_RECONFIRMED:             { label: "Reconfirmed",              explanation: "You confirmed availability. Waiting for CauseKind admin to do a final review.", severity: "info" },
  CONDITION_CHANGED_RESCREENING: { label: "Re-screening",             explanation: "Item condition changed — AI is re-checking your updated details.", severity: "info" },
  PENDING_ADMIN_APPROVAL:        { label: "Admin Reviewing",          explanation: "CauseKind admin is doing a final check before approving the handover.", severity: "info" },
  ADMIN_APPROVED:                { label: "Approved! Schedule Handover", explanation: "Your offer was approved. Please schedule the handover now.", action: "handover", actionLabel: "Go to Handover Hub", severity: "warning" },
  ADMIN_REJECTED:                { label: "Rejected by Admin",        explanation: "Admin could not approve this offer. See the reason and your next steps below.", action: "browse", actionLabel: "Browse other requests", severity: "error" },
  HANDOVER_IN_PROGRESS:          { label: "Handover in Progress",     explanation: "The handover is scheduled. Confirm the OTP when you physically hand over the item.", action: "handover", actionLabel: "Open Handover Hub", severity: "info" },
  HANDOVER_AT_RISK:              { label: "Handover At Risk",         explanation: "The handover has been rescheduled multiple times. Admin review may be required.", action: "handover", actionLabel: "View Handover Hub", severity: "warning" },
  ISSUE_WINDOW_OPEN:             { label: "Issue Window Open",        explanation: "Delivery confirmed! Both parties can report any problems within the issue window.", action: "issues", actionLabel: "Report an issue", severity: "success" },
  ISSUE_RAISED:                  { label: "Issue Under Review",       explanation: "An issue has been reported. Our team is looking into it.", severity: "warning" },
  COMPLETED:                     { label: "Donation Complete!",       explanation: "The donation was successfully completed.", action: "certificate", actionLabel: "View Certificate", severity: "success" },
  CANCELLED:                     { label: "Cancelled",                explanation: "This offer was cancelled.", severity: "neutral" },
  WITHDRAWN:                     { label: "Withdrawn",                explanation: "You withdrew this offer.", severity: "neutral" },
};

const SEVERITY_STYLES = {
  info:    { bar: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",    dot: "bg-blue-500" },
  warning: { bar: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800", dot: "bg-amber-500" },
  success: { bar: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800",  dot: "bg-green-500" },
  error:   { bar: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",              dot: "bg-red-500" },
  neutral: { bar: "bg-stone-300",  badge: "bg-stone-50 text-stone-600 border-stone-200 dark:bg-zinc-800 dark:text-stone-400 dark:border-zinc-700",       dot: "bg-stone-400" },
};

function OfferStageCard({
  offer,
  onReconfirm,
  onWithdraw,
}: {
  offer: DonationOffer;
  onReconfirm: (id: number) => void;
  onWithdraw: (id: number, reason: string) => void;
}) {
  const meta = OFFER_STATUS_META[offer.status] ?? {
    label: offer.status.replace(/_/g, " "),
    explanation: "",
    severity: "neutral" as const,
  };
  const style = SEVERITY_STYLES[meta.severity];

  const stageIdx = OFFER_STAGES.indexOf(
    OFFER_STAGES.find((s) => {
      if (s === offer.status) return true;
      if (s === "SUBMITTED" && (offer.status === "AI_ELIGIBILITY_SCREENING" || offer.status === "AI_COMPATIBILITY_SCREENING" || offer.status === "COMPATIBILITY_CHECKED")) return true;
      if (s === "PENDING_DONEE_REVIEW" && (offer.status === "SOFT_RESERVED_PRIMARY" || offer.status === "SOFT_RESERVED_BACKUP" || offer.status === "DONEE_ACCEPTED")) return true;
      if (s === "DONOR_RECONFIRMED" && (offer.status === "DONOR_RECONFIRMATION_REQUIRED" || offer.status === "CONDITION_CHANGED_RESCREENING" || offer.status === "PENDING_ADMIN_APPROVAL")) return true;
      if (s === "HANDOVER_IN_PROGRESS" && offer.status === "HANDOVER_AT_RISK") return true;
      if (s === "ISSUE_WINDOW_OPEN" && offer.status === "ISSUE_RAISED") return true;
      return false;
    }) ?? ""
  );

  const isTerminal = ["COMPLETED", "CANCELLED", "WITHDRAWN", "ADMIN_REJECTED", "DONEE_DECLINED"].includes(offer.status);

  const actionHref =
    meta.action === "edit"        ? `/requests/${offer.requestId}/offer` :
    meta.action === "handover"    ? `/offers/${offer.id}/handover` :
    meta.action === "issues"      ? `/offers/${offer.id}/issues` :
    meta.action === "certificate" ? `/certificate?offerId=${offer.id}` :
    meta.action === "browse"      ? `/requests` : null;

  return (
    <div className={`rounded-2xl border ${style.badge} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {meta.label}
            </span>
            {offer.flowType && (
              <span className="text-xs text-stone-400">
                {offer.flowType === "ALREADY_OWN" ? "Own item" : offer.flowType === "WILL_PURCHASE" ? "Will purchase" : "Similar item"}
              </span>
            )}
          </div>
          <p className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate">{offer.requestTitle}</p>
          <p className="text-xs text-stone-500 mt-0.5">{offer.requestCategory}{offer.requestCity ? ` · ${offer.requestCity}` : ""}</p>
        </div>
        {offer.media?.[0] && (
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-zinc-800">
            <img src={offer.media[0].mediaUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      {/* Explanation */}
      {meta.explanation && (
        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">{meta.explanation}</p>
      )}

      {/* Rejection reason */}
      {offer.rejectionReason && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-400">
          <span className="font-semibold">Reason: </span>{offer.rejectionReason}
        </div>
      )}

      {/* Post-rejection next steps — shown only for ADMIN_REJECTED */}
      {offer.status === "ADMIN_REJECTED" && (
        <div className="rounded-xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 p-3 space-y-2">
          <p className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wide">What you can do next</p>
          <div className="space-y-1.5">
            <Link href={`/requests`}
              className="flex items-start gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 hover:border-[#b04a15] transition-colors">
              <span className="text-sm">🔍</span>
              <div>
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">Offer to a different request</p>
                <p className="text-[10px] text-stone-400">Browse all verified requests and find a better match for your item.</p>
              </div>
            </Link>
            <Link href={`/items/new`}
              className="flex items-start gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 hover:border-[#b04a15] transition-colors">
              <span className="text-sm">📦</span>
              <div>
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">List the item as a general listing</p>
                <p className="text-[10px] text-stone-400">Let the system find any suitable recipient automatically.</p>
              </div>
            </Link>
            <Link href={`/requests/${offer.requestId}/offer`}
              className="flex items-start gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 hover:border-[#b04a15] transition-colors">
              <span className="text-sm">✏️</span>
              <div>
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">Re-offer with updated details</p>
                <p className="text-[10px] text-stone-400">Address the rejection reason and submit a fresh offer for the same request.</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Stage progress tracker — full labeled view matching donee style */}
      {!isTerminal && (() => {
        const donorStages: { label: string; sublabel: string; statuses: string[]; nowText: string }[] = [
          {
            label: "Submitted",
            sublabel: "Your offer was submitted for review",
            statuses: ["DRAFT", "SUBMITTED", "AI_ELIGIBILITY_SCREENING", "AI_COMPATIBILITY_SCREENING", "COMPATIBILITY_CHECKED", "NEEDS_INFORMATION"],
            nowText:
              offer.status === "DRAFT" ? "Complete your item details and photos to submit the offer." :
              offer.status === "NEEDS_INFORMATION" ? "AI screening found missing details. Please update your offer before it can proceed." :
              "Your offer has been submitted. AI is checking your item details and photos. No action needed.",
          },
          {
            label: "Sent to Recipient",
            sublabel: "Recipient is reviewing your item",
            statuses: ["PENDING_DONEE_REVIEW", "SOFT_RESERVED_PRIMARY", "SOFT_RESERVED_BACKUP"],
            nowText:
              offer.status === "SOFT_RESERVED_BACKUP" ? "Your offer is on standby as a backup in case the primary offer falls through." :
              "Your offer has passed AI screening and has been sent to the recipient. Waiting for them to accept or decline.",
          },
          {
            label: "Recipient Accepted",
            sublabel: "Recipient accepted — waiting for you",
            statuses: ["DONEE_ACCEPTED", "DONOR_RECONFIRMATION_REQUIRED"],
            nowText: "The recipient accepted your offer! Please confirm that your item is still available and in the same condition before we proceed.",
          },
          {
            label: "You Reconfirmed",
            sublabel: "You confirmed item availability",
            statuses: ["DONOR_RECONFIRMED", "CONDITION_CHANGED_RESCREENING", "PENDING_ADMIN_APPROVAL"],
            nowText:
              offer.status === "CONDITION_CHANGED_RESCREENING" ? "Your updated item details are being re-checked by AI." :
              "You confirmed availability. CauseKind admin is doing a final review before approving the match.",
          },
          {
            label: "Admin Approved",
            sublabel: "CauseKind approved the match",
            statuses: ["ADMIN_APPROVED"],
            nowText: "Your donation has been approved! Please go to the Handover Hub to schedule when and how you will hand over the item.",
          },
          {
            label: "Handover",
            sublabel: "Item handed over to recipient",
            statuses: ["HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"],
            nowText:
              offer.status === "HANDOVER_AT_RISK" ? "The handover has been rescheduled multiple times. Please contact us or the recipient to resolve the scheduling." :
              "A handover has been scheduled. Generate the OTP in the Handover Hub and hand it over to the recipient at the agreed time.",
          },
          {
            label: "Complete",
            sublabel: "Donation successfully delivered",
            statuses: ["ISSUE_WINDOW_OPEN", "ISSUE_RAISED", "COMPLETED"],
            nowText:
              offer.status === "ISSUE_RAISED" ? "An issue was reported for this donation. Our team is reviewing it." :
              offer.status === "ISSUE_WINDOW_OPEN" ? "The recipient confirmed they got the item. A short issue window is open. Once it closes, your certificate will be issued." :
              "Your donation is complete! Download your certificate as a record of your contribution.",
          },
        ];

        const isAtRisk = offer.status === "HANDOVER_AT_RISK";
        const currentDonorIdx = donorStages.findIndex(s => s.statuses.includes(offer.status));

        return (
          <div className="space-y-2 pt-1">
            {/* Segmented bar */}
            <div className="flex gap-0.5">
              {donorStages.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    i < currentDonorIdx  ? "bg-green-500" :
                    i === currentDonorIdx ? (isAtRisk ? "bg-amber-500 animate-pulse" : `${style.bar} animate-pulse`) :
                    "bg-stone-200 dark:bg-zinc-700"
                  }`}
                />
              ))}
            </div>

            {/* Stage labels */}
            <div className="flex">
              {donorStages.map((stage, i) => (
                <div key={i} className="flex-1 min-w-0">
                  <div className={`text-[9px] font-semibold leading-tight truncate text-center ${
                    i < currentDonorIdx  ? "text-green-600 dark:text-green-400" :
                    i === currentDonorIdx ? (isAtRisk ? "text-amber-600 dark:text-amber-400" : "text-[#b04a15]") :
                    "text-stone-300 dark:text-zinc-600"
                  }`}>
                    {i < currentDonorIdx ? "✓ " : i === currentDonorIdx ? "● " : "○ "}{stage.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Now + Next explanation */}
            {currentDonorIdx >= 0 && (
              <div className="rounded-xl p-3 space-y-2 bg-stone-50 dark:bg-zinc-800 border border-stone-100 dark:border-zinc-700">
                {/* Current stage */}
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black text-white ${isAtRisk ? "bg-amber-500" : "bg-[#b04a15]"}`}>
                    {currentDonorIdx + 1}
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wide">
                      Now · {donorStages[currentDonorIdx].label}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      {donorStages[currentDonorIdx].nowText}
                    </p>
                  </div>
                </div>

                {/* Next stage */}
                {currentDonorIdx < donorStages.length - 1 && offer.status !== "COMPLETED" && (
                  <div className="flex items-start gap-2 pt-1 border-t border-stone-100 dark:border-zinc-700">
                    <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black text-stone-400 border border-stone-300 dark:border-zinc-600">
                      {currentDonorIdx + 2}
                    </span>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                        Next · {donorStages[currentDonorIdx + 1].label}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500">
                        {donorStages[currentDonorIdx + 1].sublabel}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Action button */}
      {meta.action && (
        meta.action === "reconfirm" ? (
          <div className="space-y-2">
            <button
              onClick={() => onReconfirm(offer.id)}
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-2.5 text-xs font-semibold transition-colors"
            >
              ✓ Yes, item is still available
            </button>
            <button
              onClick={() => {
                const reasons = [
                  "Donated outside CauseKind",
                  "Item lost or damaged",
                  "Item sold",
                  "No longer available",
                  "Other",
                ];
                const reason = window.prompt(
                  "Why is the item no longer available?\n\n" + reasons.map((r, i) => `${i + 1}. ${r}`).join("\n") + "\n\nType one of the above or your own reason:"
                );
                if (reason !== null) onWithdraw(offer.id, reason || "No longer available");
              }}
              className="w-full rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 py-2 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
            >
              ✕ Item is no longer available
            </button>
          </div>
        ) : actionHref ? (
          <Link
            href={actionHref}
            className={`block w-full rounded-xl py-2 text-center text-xs font-semibold transition-colors ${
              meta.severity === "success"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : meta.severity === "warning"
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-[#b04a15] hover:bg-[#c45520] text-white"
            }`}
          >
            {meta.actionLabel}
          </Link>
        ) : null
      )}
    </div>
  );
}

function DonorOfferSection({ offers, onReconfirm, onWithdraw }: {
  offers: DonationOffer[];
  onReconfirm: (id: number) => void;
  onWithdraw: (id: number, reason: string) => void;
}) {
  const active = offers.filter(o => !["WITHDRAWN", "CANCELLED", "COMPLETED"].includes(o.status));
  const completed = offers.filter(o => o.status === "COMPLETED");
  const terminal = offers.filter(o => ["WITHDRAWN", "CANCELLED", "ADMIN_REJECTED", "DONEE_DECLINED"].includes(o.status));
  const needsAction = active.filter(o =>
    ["DRAFT", "NEEDS_INFORMATION", "DONOR_RECONFIRMATION_REQUIRED", "DONEE_ACCEPTED", "ADMIN_APPROVED"].includes(o.status)
  );

  if (offers.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-stone-800 dark:text-stone-100">Donation Offers</h2>
          <p className="text-xs text-stone-400">Offers you made to fulfil specific requests</p>
        </div>
        <Link href="/offers" className="text-xs font-semibold text-[#b04a15] hover:underline">View all</Link>
      </div>

      {/* Needs action — shown first and highlighted */}
      {needsAction.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Action Required
          </p>
          {needsAction.map(o => (
            <OfferStageCard key={o.id} offer={o} onReconfirm={onReconfirm} onWithdraw={onWithdraw} />
          ))}
        </div>
      )}

      {/* In-progress (no action needed from donor) */}
      {active.filter(o => !needsAction.includes(o)).length > 0 && (
        <div className="space-y-3">
          {needsAction.length > 0 && (
            <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">In Progress</p>
          )}
          {active.filter(o => !needsAction.includes(o)).map(o => (
            <OfferStageCard key={o.id} offer={o} onReconfirm={onReconfirm} onWithdraw={onWithdraw} />
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">Completed</p>
          {completed.map(o => (
            <OfferStageCard key={o.id} offer={o} onReconfirm={onReconfirm} onWithdraw={onWithdraw} />
          ))}
        </div>
      )}

      {/* Terminal / Closed */}
      {terminal.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            Closed ({terminal.length})
          </summary>
          <div className="mt-2 space-y-2">
            {terminal.map(o => (
              <OfferStageCard key={o.id} offer={o} onReconfirm={onReconfirm} onWithdraw={onWithdraw} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Dedicated Donee Dashboard — shown instead of the donor layout for DONEE role
───────────────────────────────────────────────────────────────────────────── */
// ── Past offers strip — terminal offers collapse into quiet history ──────────
// Dead offers must not compete with live ones for attention: full red panels
// repeated per withdrawal buried the section, so history renders as slim
// grouped rows behind a toggle, with the "request stays open" guidance shown
// once — and only for requests that have no replacement offer in play.

const TERMINAL_OFFER_STATUSES = ["WITHDRAWN", "CANCELLED", "ADMIN_REJECTED", "DONEE_DECLINED"];

function pastOfferLabel(status: string): { label: string; tone: string } {
  switch (status) {
    case "ADMIN_REJECTED": return { label: "Not approved", tone: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" };
    case "DONEE_DECLINED": return { label: "You declined", tone: "bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-stone-400" };
    default:               return { label: "Withdrawn",    tone: "bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-stone-400" };
  }
}

function PastOffersStrip({ offers, activeRequestIds }: {
  offers: DonationOffer[];
  activeRequestIds: Set<number>;
}) {
  const [open, setOpen] = useState(false);

  // Group by request, newest first within each group
  const groups = new Map<number, DonationOffer[]>();
  for (const o of [...offers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())) {
    const g = groups.get(o.requestId);
    if (g) g.push(o); else groups.set(o.requestId, [o]);
  }
  const someRequestStillOpen = [...groups.keys()].some(id => !activeRequestIds.has(id));

  return (
    <div className="border-t border-stone-100 dark:border-zinc-800 pt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-600 dark:hover:bg-zinc-800 dark:hover:text-stone-300"
      >
        <History className="h-3.5 w-3.5" />
        Past offers ({offers.length})
        <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-3">
          {[...groups.entries()].map(([requestId, group]) => (
            <div key={requestId} className="rounded-xl border border-stone-100 dark:border-zinc-800 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-700 dark:text-stone-300">{group[0].requestTitle}</p>
                {group.length > 1 && (
                  <span className="flex-shrink-0 text-[10px] font-semibold text-stone-400">{group.length} offers</span>
                )}
              </div>
              <div className="mt-1.5 space-y-1">
                {group.map(o => {
                  const { label, tone } = pastOfferLabel(o.status);
                  return (
                    <div key={o.id} className="flex items-baseline gap-2 text-xs">
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{label}</span>
                      <span className="flex-shrink-0 text-[10px] text-stone-400">
                        {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                      {o.rejectionReason && (
                        <span className="min-w-0 truncate text-stone-400 dark:text-stone-500" title={o.rejectionReason}>
                          {o.rejectionReason}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {someRequestStillOpen && (
            <p className="px-2 text-[11px] leading-relaxed text-stone-400">
              These requests remain open to other donors — you&apos;ll be notified the moment a new offer arrives.{" "}
              <Link href="/requests" className="font-semibold text-[#b04a15] hover:underline">Browse donors offering to help →</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DoneeDashboard({
  user,
  myProfile,
  itemRequests,
  doneeMatches,
  onRefresh,
}: {
  user: { email: string; role: string };
  myProfile: UserProfile;
  itemRequests: ItemRequest[];
  doneeMatches: ItemMatch[];
  onRefresh: () => Promise<void>;
}) {
  const [matchActionLoading, setMatchActionLoading] = useState<number | null>(null);
  const [incomingOffers, setIncomingOffers] = useState<DonationOffer[]>([]);
  const [offerActionLoading, setOfferActionLoading] = useState<number | null>(null);

  useEffect(() => {
    getOffersForMyRequests().then(setIncomingOffers).catch(() => {});
  }, []);

  async function handleOfferAction(offerId: number, action: "ACCEPT" | "DECLINE", declineReason?: string) {
    setOfferActionLoading(offerId);
    try {
      const updated = await doneeReviewOffer(offerId, action, declineReason);
      setIncomingOffers(prev => prev.map(o => o.id === offerId ? updated : o));
      if (action === "ACCEPT") toast.success("Offer accepted! The donor will reconfirm availability next.");
      else toast.success("Offer declined.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setOfferActionLoading(null);
    }
  }

  async function handleConfirmNoIssue(offerId: number) {
    if (!window.confirm("Mark this donation complete? You won't be able to report a problem after this.")) return;
    setOfferActionLoading(offerId);
    try {
      const updated = await confirmNoIssue(offerId);
      setIncomingOffers(prev => prev.map(o => o.id === offerId ? updated : o));
      toast.success("Marked as complete — thank you for confirming!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to complete");
    } finally {
      setOfferActionLoading(null);
    }
  }

  const handleDoneeAccept = async (id: number) => {
    setMatchActionLoading(id);
    try {
      await doneeAcceptMatch(id);
      toast.success("Match accepted! Logistics will be arranged next.");
      await onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to accept match");
    } finally {
      setMatchActionLoading(null);
    }
  };

  const handleDoneeReject = async (id: number) => {
    setMatchActionLoading(id);
    try {
      await doneeRejectMatch(id);
      toast.success("Match declined.");
      await onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to decline match");
    } finally {
      setMatchActionLoading(null);
    }
  };

  const activeRequests = itemRequests.filter(
    r => !["FULFILLED", "REJECTED", "EXPIRED"].includes(r.status)
  );
  const fulfilledRequests = itemRequests.filter(r => r.status === "FULFILLED");
  const activeMatches = doneeMatches.filter(
    m => !["FULFILLED", "CANCELLED", "REJECTED", "FAILED"].includes(m.status)
  );
  // True only when the backend matching engine is actually working on something:
  // a request past admin verification, in the matching phase.
  const hasRequestInMatching = itemRequests.some(r =>
    ["VERIFIED_PRIVATE_MATCHING", "POTENTIAL_MATCH_FOUND", "AWAITING_MATCH_APPROVAL",
     "PUBLICATION_CONSENT_REQUIRED", "PUBLIC_REQUEST", "PARTIALLY_MATCHED"].includes(r.status)
  );

  return (
    <div className="min-h-screen bg-[#eef3f9] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 pb-16">

      {/* ── Hero header — ink/blue theme ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0d1e36] via-[#1e3a60] to-[#0a2040] text-white py-12 px-4 shadow-lg">
        <div className="pointer-events-none absolute -top-20 right-0 w-96 h-96 rounded-full bg-[#f0b97a]/6 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b97a]/25 to-transparent" />

        <div className="mx-auto max-w-5xl relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="space-y-3 min-w-0">
              <div className="inline-flex items-center gap-1.5 bg-[#f0b97a]/15 border border-[#f0b97a]/30 rounded-full px-3 py-1 text-xs text-[#f0b97a] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Donee
              </div>
              <h1 className="text-4xl sm:text-5xl tracking-tight leading-[1.05] font-bold" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
                Namaste, {myProfile.fullName?.split(" ")[0] || user.email.split("@")[0]}.
              </h1>
              <p className="text-white/55 text-sm max-w-md">
                {activeRequests.length > 0
                  ? `${activeRequests.length} request${activeRequests.length !== 1 ? "s" : ""} on the road — we're scanning donor inventories near ${myProfile.city?.split(",")[0] || "you"}.`
                  : "Post your first need and we'll find a verified donor near you."}
              </p>
            </motion.div>
            <Link href="/requests/new" data-tour="primary-cta">
              <Button className="bg-[#f0b97a] hover:bg-[#e0a86a] text-stone-950 font-extrabold rounded-2xl px-6 py-3 h-auto text-sm flex items-center gap-2 shadow-xl shadow-[#f0b97a]/20 shrink-0">
                <Plus className="w-4 h-4" /> Post a Need
              </Button>
            </Link>
          </div>

          {/* Impact ledger — live numbers over hairline rules, no stat cards */}
          <div data-tour="ledger" className="mt-10 grid grid-cols-3 border-t border-white/10">
            {[
              { n: itemRequests.length,      label: "needs posted"   },
              { n: activeMatches.length,     label: "active matches" },
              { n: fulfilledRequests.length, label: "needs received" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
                className={`py-5 ${i > 0 ? "border-l border-white/10 pl-5 sm:pl-8" : ""}`}>
                <p className="text-4xl sm:text-5xl tabular-nums leading-none" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>{stat.n}</p>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/45 mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">

        {/* ── Identity line ── */}
        <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 border-b border-stone-200/80 dark:border-zinc-800 pb-4">
          <div className="w-9 h-9 rounded-full bg-[#1e3a60]/10 dark:bg-zinc-800 flex items-center justify-center font-black text-sm text-[#1e3a60] dark:text-blue-400 shrink-0">
            {getInitials(myProfile.fullName)}
          </div>
          <p className="font-bold text-stone-800 dark:text-stone-200 truncate">{myProfile.fullName}</p>
          <span className="text-stone-300 dark:text-zinc-700 hidden sm:inline">&middot;</span>
          <p className="truncate hidden sm:block">{user.email}</p>
          {myProfile.city && (
            <>
              <span className="text-stone-300 dark:text-zinc-700 hidden md:inline">&middot;</span>
              <p className="hidden md:flex items-center gap-1"><MapPin className="w-3 h-3 text-[#1e3a60] dark:text-blue-400" />{myProfile.city}</p>
            </>
          )}
          <Link href="/profile" className="ml-auto shrink-0 font-bold text-[#1e3a60] dark:text-blue-400 hover:underline">Edit profile</Link>
        </div>

        {/* ── Incoming Donation Offers (Donor Flow 2) ── */}
        {incomingOffers.length > 0 && (
          <Card className="bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#b04a15]" />
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4 relative z-10">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#b04a15]" /> Donation Offers Received
              </CardTitle>
              <Link href="/donee/offers">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-[#b04a15]">View all</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {incomingOffers.filter(o => !TERMINAL_OFFER_STATUSES.includes(o.status)).length === 0 && (
                <p className="py-2 text-center text-xs text-stone-400">
                  No active offers right now — your requests stay visible to donors.
                </p>
              )}
              {incomingOffers
                .filter(o => !TERMINAL_OFFER_STATUSES.includes(o.status))
                .map(offer => {
                  const isPendingReview = offer.status === "PENDING_DONEE_REVIEW";
                  const isApproved      = offer.status === "ADMIN_APPROVED";
                  const isHandover      = ["HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"].includes(offer.status);
                  const isIssueWindow   = offer.status === "ISSUE_WINDOW_OPEN";
                  const isIssueRaised   = offer.status === "ISSUE_RAISED";
                  const isComplete      = offer.status === "COMPLETED";
                  const isWithdrawn     = offer.status === "WITHDRAWN" || offer.status === "CANCELLED" || offer.status === "ADMIN_REJECTED";
                  const statusLabel =
                    isPendingReview ? "Awaiting your review" :
                    offer.status === "DONOR_RECONFIRMATION_REQUIRED" ? "Donor is reconfirming" :
                    offer.status === "DONOR_RECONFIRMED" ? "Under admin review" :
                    isApproved ? "Approved" :
                    isHandover ? "Handover in progress" :
                    isIssueWindow ? "Issue window open" :
                    isIssueRaised ? "Issue under review" :
                    isComplete ? "Completed" :
                    offer.status === "ADMIN_REJECTED" ? "Offer not approved" :
                    isWithdrawn ? "Offer withdrawn" :
                    offer.status.replace(/_/g, " ");
                  const statusColor =
                    isPendingReview ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                    isApproved || isComplete || isIssueWindow ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" :
                    isHandover ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                    isIssueRaised ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                    isWithdrawn ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" :
                    "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-stone-400";

                  return (
                    <div key={offer.id} className="rounded-2xl border border-stone-100 dark:border-zinc-800 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                              {statusLabel}
                            </span>
                            {offer.compatibilityIndicator && (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                offer.compatibilityIndicator === "STRONG_MATCH" ? "bg-green-50 text-green-600" :
                                offer.compatibilityIndicator === "POSSIBLE_MATCH" ? "bg-amber-50 text-amber-600" :
                                "bg-orange-50 text-orange-600"
                              }`}>
                                {offer.compatibilityIndicator.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-sm text-stone-900 dark:text-stone-100">{offer.requestTitle}</p>
                          {offer.itemDetails && (
                            <p className="text-xs text-stone-500 mt-0.5">
                              {offer.itemDetails.quantity}× · {offer.itemDetails.condition ?? "Condition not specified"}
                              {offer.itemDetails.pickupCity ? ` · ${offer.itemDetails.pickupCity}` : ""}
                            </p>
                          )}
                        </div>
                        {offer.media?.[0] && (
                          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-zinc-800">
                            <img src={offer.media[0].mediaUrl} alt="" className="h-full w-full object-cover" />
                          </div>
                        )}
                      </div>

                      {/* Item details for pending review */}
                      {isPendingReview && offer.itemDetails && (
                        <div className="rounded-xl bg-stone-50 dark:bg-zinc-800 p-3 text-xs text-stone-600 dark:text-stone-400 space-y-1">
                          {offer.itemDetails.knownDefects && offer.itemDetails.knownDefects !== "None" && (
                            <div className="text-orange-600 dark:text-orange-400">Disclosed defects: {offer.itemDetails.knownDefects}</div>
                          )}
                          {offer.itemDetails.accessoriesIncluded && <div>Accessories: {offer.itemDetails.accessoriesIncluded}</div>}
                          {offer.itemDetails.workingStatus && <div>Working status: {offer.itemDetails.workingStatus}</div>}
                        </div>
                      )}

                      {/* Stage Progress Tracker — terminal offers never reach here
                          (they render in the PastOffersStrip below instead) */}
                      {!isWithdrawn && (() => {
                        const stages: { label: string; sublabel: string; statuses: string[] }[] = [
                          { label: "Offer Received",    sublabel: "Donor submitted their offer",            statuses: ["PENDING_DONEE_REVIEW", "SOFT_RESERVED_PRIMARY", "SOFT_RESERVED_BACKUP"] },
                          { label: "You Reviewed",      sublabel: "You accepted or reviewed the offer",     statuses: ["DONEE_ACCEPTED", "DONOR_RECONFIRMATION_REQUIRED"] },
                          { label: "Donor Confirmed",   sublabel: "Donor reconfirmed item availability",   statuses: ["DONOR_RECONFIRMED", "CONDITION_CHANGED_RESCREENING", "PENDING_ADMIN_APPROVAL"] },
                          { label: "Admin Approved",    sublabel: "CauseKind verified the match",          statuses: ["ADMIN_APPROVED"] },
                          { label: "Handover",          sublabel: "Item collected or delivered",           statuses: ["HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"] },
                          { label: "Item Received",     sublabel: "You confirmed receipt",                 statuses: ["ISSUE_WINDOW_OPEN", "ISSUE_RAISED"] },
                          { label: "Complete",          sublabel: "Donation successfully fulfilled",       statuses: ["COMPLETED"] },
                        ];
                        const currentIdx = stages.findIndex(s => s.statuses.includes(offer.status));
                        const isAtRisk = offer.status === "HANDOVER_AT_RISK";
                        return (
                          <div className="space-y-2 pt-1">
                            {/* Compact progress bar */}
                            <div className="flex gap-0.5">
                              {stages.map((_, i) => (
                                <div
                                  key={i}
                                  className={`h-1.5 flex-1 rounded-full transition-all ${
                                    i < currentIdx  ? "bg-green-500" :
                                    i === currentIdx ? (isAtRisk ? "bg-amber-500 animate-pulse" : "bg-[#b04a15] animate-pulse") :
                                    "bg-stone-200 dark:bg-zinc-700"
                                  }`}
                                />
                              ))}
                            </div>
                            {/* Stage labels row */}
                            <div className="flex">
                              {stages.map((stage, i) => (
                                <div key={i} className="flex-1 min-w-0">
                                  <div className={`text-[9px] font-semibold leading-tight truncate text-center ${
                                    i < currentIdx  ? "text-green-600 dark:text-green-400" :
                                    i === currentIdx ? (isAtRisk ? "text-amber-600 dark:text-amber-400" : "text-[#b04a15]") :
                                    "text-stone-300 dark:text-zinc-600"
                                  }`}>
                                    {i < currentIdx ? "✓ " : i === currentIdx ? "● " : "○ "}{stage.label}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {/* Current + next stage explanation */}
                            <div className="rounded-xl p-3 space-y-2 bg-stone-50 dark:bg-zinc-800 border border-stone-100 dark:border-zinc-700">
                              {/* Current */}
                              {currentIdx >= 0 && (
                                <div className="flex items-start gap-2">
                                  <span className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black text-white ${isAtRisk ? "bg-amber-500" : "bg-[#b04a15]"}`}>
                                    {currentIdx + 1}
                                  </span>
                                  <div>
                                    <p className="text-[10px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wide">Now · {stages[currentIdx].label}</p>
                                    <p className="text-xs text-stone-500 dark:text-stone-400">
                                      {isPendingReview && "A donor has offered to fulfil your request. Review their item details above and accept or decline."}
                                      {offer.status === "DONEE_ACCEPTED" && "You accepted this offer. Waiting for the donor to confirm their item is still available."}
                                      {offer.status === "DONOR_RECONFIRMATION_REQUIRED" && "The donor is being asked to reconfirm their item. No action needed from you right now."}
                                      {offer.status === "DONOR_RECONFIRMED" && "The donor confirmed availability. CauseKind admin is doing a final review before approving."}
                                      {offer.status === "PENDING_ADMIN_APPROVAL" && "Admin is reviewing the offer. You will be notified once it's approved or if more information is needed."}
                                      {isApproved && "The donation has been approved! The donor will contact you to arrange pickup or delivery."}
                                      {offer.status === "HANDOVER_IN_PROGRESS" && "A handover has been scheduled. Be ready to receive the item and confirm it via the Handover Hub."}
                                      {isAtRisk && "The handover has been rescheduled multiple times. Admin may step in to help coordinate."}
                                      {offer.status === "ISSUE_WINDOW_OPEN" && "You received the item. If anything is wrong, report it now within the issue window."}
                                      {offer.status === "ISSUE_RAISED" && "An issue was reported. The CauseKind team is reviewing it."}
                                      {isComplete && "The donation is complete. Thank you for using CauseKind!"}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {/* What's next */}
                              {currentIdx >= 0 && currentIdx < stages.length - 1 && !isComplete && (
                                <div className="flex items-start gap-2 pt-1 border-t border-stone-100 dark:border-zinc-700">
                                  <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black text-stone-400 border border-stone-300 dark:border-zinc-600">
                                    {currentIdx + 2}
                                  </span>
                                  <div>
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Next · {stages[currentIdx + 1].label}</p>
                                    <p className="text-xs text-stone-400 dark:text-stone-500">{stages[currentIdx + 1].sublabel}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}


                      {/* Actions */}
                      {isPendingReview && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOfferAction(offer.id, "ACCEPT")}
                            disabled={offerActionLoading === offer.id}
                            className="flex-1 rounded-xl bg-[#b04a15] py-2 text-xs font-semibold text-white hover:bg-[#c45520] transition-colors disabled:opacity-50"
                          >
                            {offerActionLoading === offer.id ? "..." : "Accept Offer"}
                          </button>
                          <button
                            onClick={() => {
                              const reason = window.prompt("Reason for declining (optional):");
                              handleOfferAction(offer.id, "DECLINE", reason ?? undefined);
                            }}
                            disabled={offerActionLoading === offer.id}
                            className="flex-1 rounded-xl border border-stone-200 dark:border-zinc-700 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                          >
                            Decline
                          </button>
                          <Link href={`/donee/offers?offerId=${offer.id}`} className="rounded-xl border border-stone-200 dark:border-zinc-700 px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-50 dark:hover:bg-zinc-800">
                            Details
                          </Link>
                        </div>
                      )}
                      {(isApproved || isHandover) && (
                        <Link href={`/offers/${offer.id}/handover`} className="block w-full rounded-xl bg-blue-600 py-2 text-center text-xs font-semibold text-white hover:bg-blue-700">
                          Open Handover Hub →
                        </Link>
                      )}
                      {isIssueWindow && (
                        <div className="space-y-1.5">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirmNoIssue(offer.id)}
                              disabled={offerActionLoading === offer.id}
                              className="flex-1 rounded-xl bg-green-600 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {offerActionLoading === offer.id ? "..." : "Everything's fine — Complete"}
                            </button>
                            <Link href={`/offers/${offer.id}/issues`} className="flex-1 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 py-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
                              Report an issue
                            </Link>
                          </div>
                          <p className="text-[10px] text-stone-400 text-center">Marking complete ends the issue window — you won&apos;t be able to report a problem afterward.</p>
                        </div>
                      )}
                      {isIssueRaised && (
                        <p className="text-center text-xs text-stone-400 dark:text-stone-500">Our team is reviewing your report.</p>
                      )}
                      {isComplete && (
                        <div className="space-y-1.5">
                          <Link href={`/offers/${offer.id}/issues`} className="block w-full rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 py-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
                            Report an issue
                          </Link>
                          <p className="text-[10px] text-stone-400 text-center">Noticed a problem with the item? You can still report it for a few days after completion.</p>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Terminal offers — slim grouped history instead of full cards */}
              {incomingOffers.some(o => TERMINAL_OFFER_STATUSES.includes(o.status)) && (
                <PastOffersStrip
                  offers={incomingOffers.filter(o => TERMINAL_OFFER_STATUSES.includes(o.status))}
                  activeRequestIds={new Set(incomingOffers.filter(o => !TERMINAL_OFFER_STATUSES.includes(o.status)).map(o => o.requestId))}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Requests journey ledger + matches ── */}
        <div className="space-y-12">

          {/* Your requests — each one drawn as a journey down the pipeline */}
          <section data-tour="requests-list">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#1e3a60]/70 dark:border-blue-400/50 pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#1e3a60] dark:text-blue-400">Your Requests</p>
                <p className="text-xs text-stone-400 mt-1">Every need travels the same road: posted, verified, matched, received.</p>
              </div>
              <Link href="/requests/new" className="text-xs font-bold text-[#1e3a60] dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0">
                <Plus className="w-3.5 h-3.5" /> New need
              </Link>
            </div>

            {itemRequests.length === 0 ? (
              <div className="py-14 text-center space-y-3">
                <div className="w-14 h-14 bg-[#1e3a60]/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Heart className="w-6 h-6 text-[#1e3a60]" />
                </div>
                <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Nothing posted yet</p>
                <p className="text-xs text-stone-400 max-w-[240px] mx-auto">Tell us what you need &mdash; books, clothes, medical supplies &mdash; and we&apos;ll find donors nearby.</p>
                <Link href="/requests/new">
                  <Button size="sm" className="bg-[#1e3a60] hover:bg-[#162d4a] text-white mt-2">Post your first need</Button>
                </Link>
              </div>
            ) : (
              <div>
                {itemRequests.map((r, i) => (
                  <DoneeRequestRow key={r.id} request={r} index={i} />
                ))}
              </div>
            )}
          </section>

          {/* Matches */}
          <section data-tour="matches">
            <div className="border-b-2 border-[#b04a15]/60 pb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b04a15]">Matches</p>
              <p className="text-xs text-stone-400 mt-1">Donors whose items matched your requests.</p>
            </div>
            <div className="pt-5">
              {doneeMatches.length === 0 ? (
                /* Truthful empty state: the sweep only spins when the matching engine
                   is actually working (a request is verified and in the matching
                   phase). Drafts/pending requests get honest guidance instead. */
                <div className="py-12 text-center space-y-4">
                  <div className="relative w-24 h-24 mx-auto rounded-full border border-[#b04a15]/20">
                    <div className="absolute inset-3 rounded-full border border-[#b04a15]/15" />
                    <div className="absolute inset-6 rounded-full border border-[#b04a15]/10" />
                    {hasRequestInMatching && (
                      <>
                        <div className="absolute inset-0 rounded-full overflow-hidden motion-reduce:hidden">
                          <div className="absolute inset-0 animate-[spin_3.5s_linear_infinite]"
                            style={{ background: "conic-gradient(from 0deg, rgba(176,74,21,0.30), transparent 70deg)" }} />
                        </div>
                        <div className="absolute top-4 right-6 w-1.5 h-1.5 rounded-full bg-[#f0b97a] animate-pulse motion-reduce:animate-none" />
                      </>
                    )}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#b04a15]" />
                  </div>
                  {hasRequestInMatching ? (
                    <div>
                      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Scanning donor inventories</p>
                      <p className="text-xs text-stone-400 max-w-[250px] mx-auto mt-1">Your verified request is being matched against donor items &mdash; new listings are checked as they arrive. Matches appear here and we&apos;ll notify you.</p>
                    </div>
                  ) : itemRequests.length > 0 ? (
                    <div>
                      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Matching starts after verification</p>
                      <p className="text-xs text-stone-400 max-w-[260px] mx-auto mt-1">Submit your request and once our team verifies it, the matching engine starts scanning donor inventories for you.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No requests to match yet</p>
                      <p className="text-xs text-stone-400 max-w-[240px] mx-auto mt-1">Post a need above &mdash; matching begins as soon as it&apos;s verified.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y dark:divide-zinc-800 space-y-3">
                  {doneeMatches.map(m => {
                    const badge = getFulfilmentStatusBadge(m.status);
                    return (
                      <div key={m.id} className="pt-3 first:pt-0 space-y-2 group px-1 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-all pb-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[#b04a15] transition-colors truncate">
                              <TranslatedText text={m.listingTitle || "Matched item"} />
                            </p>
                            <p className="text-xs text-stone-400 mt-0.5 truncate">For: <TranslatedText text={m.requestTitle || ""} /></p>
                          </div>
                          <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap shrink-0">{badge.label}</Badge>
                        </div>
                        <div className="flex justify-between items-center text-xs bg-stone-50 dark:bg-zinc-950 p-2.5 rounded-xl">
                          <div><p className="text-stone-400">Donor</p><p className="font-semibold text-stone-700 dark:text-stone-300">{m.donorName}</p></div>
                          {m.matchScore && (<div className="text-right"><p className="text-stone-400">AI Match</p><p className="font-bold text-[#1e3a60] dark:text-blue-400">{m.matchScore}%</p></div>)}
                        </div>
                        {m.handoverMethod && (
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl p-2.5 space-y-1.5 text-xs">
                            <p className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1"><Calendar className="w-3 h-3" /> Pickup Details</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-stone-600 dark:text-stone-400">
                              <div><span className="text-stone-400">Method: </span><span className="font-medium">{m.handoverMethod.replace(/_/g, " ")}</span></div>
                              {m.pickupDateTime && <div><span className="text-stone-400">When: </span><span className="font-medium">{new Date(m.pickupDateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></div>}
                              {m.handoverAddress && <div className="col-span-2"><span className="text-stone-400">Address: </span><span className="font-medium">{m.handoverAddress}</span></div>}
                              {m.transportArrangedBy && <div><span className="text-stone-400">Transport by: </span><span className="font-medium">{m.transportArrangedBy.replace(/_/g, " ")}</span></div>}
                              {m.fulfilmentNotes && <div className="col-span-2"><span className="text-stone-400">Notes: </span><span className="font-medium">{m.fulfilmentNotes}</span></div>}
                            </div>
                          </div>
                        )}
                        {m.status === "AWAITING_DONEE_CONFIRMATION" && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                              disabled={matchActionLoading === m.id}
                              onClick={() => handleDoneeAccept(m.id)}
                            >
                              {matchActionLoading === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Accept</>}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg"
                              disabled={matchActionLoading === m.id}
                              onClick={() => handleDoneeReject(m.id)}
                            >
                              {matchActionLoading === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3 mr-1" />Decline</>}
                            </Button>
                          </div>
                        )}
                        {HANDOVER_HUB_STATUSES.has(m.status) && (
                          <div className="pt-1">
                            <Link href={`/matches/${m.id}/handover`} className="flex items-center justify-center gap-1.5 w-full bg-[#1e3a60] hover:bg-[#162d4a] text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                              <Truck className="w-3.5 h-3.5" /> Go to Handover Hub
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEntityUpdates(["OFFER", "REQUEST", "LISTING", "MATCH", "HANDOVER"], () => {
    refreshListings();
    refreshMatches();
    getMyItemRequests().then(setItemRequests).catch(() => {});
    getMyDonationOffers().then(setDonationOffers).catch(() => {});
  });

  const [itemListings, setItemListings] = useState<ItemListing[]>([]);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [donationOffers, setDonationOffers] = useState<DonationOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"donor" | "donee">("donor");

  // Listing action state
  const [listingActionLoading, setListingActionLoading] = useState<number | null>(null);
  const [selectedListing, setSelectedListing] = useState<ItemListing | null>(null);

  // Donor review state
  const [declineMatchId, setDeclineMatchId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declineConditionChanged, setDeclineConditionChanged] = useState(false);
  const [reviewLoading, setReviewLoading] = useState<number | null>(null);

  const refreshListings = async () => {
    try { const fresh = await getMyItemListings(); setItemListings(fresh); } catch { /* silent */ }
  };

  const refreshMatches = async () => {
    try { const fresh = await getMyMatches(); setMatches(fresh); } catch { /* silent */ }
  };

  async function handleOfferReconfirm(offerId: number) {
    try {
      const updated = await reconfirmOfferAvailability(offerId);
      setDonationOffers(prev => prev.map(o => o.id === offerId ? updated : o));
      toast.success("Availability confirmed! Waiting for admin approval.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reconfirm");
    }
  }

  async function handleOfferWithdraw(offerId: number, reason: string) {
    try {
      const updated = await withdrawOffer(offerId, reason);
      setDonationOffers(prev => prev.map(o => o.id === offerId ? updated : o));
      toast.success("Offer withdrawn. The recipient has been notified.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to withdraw offer");
    }
  }

  async function handleListingAction(id: number, action: "pause" | "resume" | "withdraw") {
    setListingActionLoading(id);
    try {
      if (action === "pause")    await pauseItemListing(id);
      if (action === "resume")   await resumeItemListing(id);
      if (action === "withdraw") await withdrawItemListing(id);
      await refreshListings();
      toast.success(action === "pause" ? "Listing paused" : action === "resume" ? "Listing resumed" : "Listing withdrawn");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setListingActionLoading(null);
    }
  }

  async function handleDeleteRejected(id: number) {
    if (!confirm("Permanently delete this rejected listing?")) return;
    setListingActionLoading(id);
    try {
      await deleteMyListing(id);
      setItemListings(prev => prev.filter(l => l.id !== id));
      toast.success("Listing deleted");
    } catch {
      toast.error("Failed to delete listing");
    } finally {
      setListingActionLoading(null);
    }
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }

    Promise.all([
      getMyProfile().then((p) => {
        setMyProfile(p);
        if (p.role === "DONEE") setActiveTab("donee");
      }).catch(() => {}),
      getMyItemListings().then(setItemListings).catch(() => setItemListings([])),
      getMyItemRequests().then(setItemRequests).catch(() => setItemRequests([])),
      getMyMatches().then(setMatches).catch(() => setMatches([])),
      getMyDonationOffers().then(setDonationOffers).catch(() => setDonationOffers([])),
    ])
      .finally(() => setLoading(false));
  }, [user, isLoading, router]);

  useEffect(() => {
    if (itemListings.length === 0) return;
    const rejected = itemListings.filter(l => l.status === "REJECTED");
    if (rejected.length === 0) return;
    const key = "ck_rejected_cleanup_ts";
    const last = localStorage.getItem(key);
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    if (last && Date.now() - parseInt(last) < THIRTY_DAYS) return;
    localStorage.setItem(key, Date.now().toString());
    if (window.confirm(`You have ${rejected.length} rejected listing${rejected.length > 1 ? "s" : ""}. Delete ${rejected.length > 1 ? "them" : "it"} to keep your inventory clean?`)) {
      rejected.forEach(l => handleDeleteRejected(l.id));
    }
  }, [itemListings]); // eslint-disable-line react-hooks/exhaustive-deps

  const donorMatches = useMemo(() => {
    if (!myProfile) return [];
    return matches.filter(m => m.donorName === myProfile.fullName);
  }, [matches, myProfile]);

  const doneeMatches = useMemo(() => {
    if (!myProfile) return [];
    return matches.filter(m => m.doneeName === myProfile.fullName);
  }, [matches, myProfile]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Dedicated donee UI
  if (myProfile?.role === "DONEE") {
    return (
      <DoneeDashboard
        user={user}
        myProfile={myProfile}
        itemRequests={itemRequests}
        doneeMatches={doneeMatches}
        onRefresh={refreshMatches}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4f0] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 pb-12">
      {/* ── Hero: greeting + live giving ledger ── */}
      <div className="relative overflow-hidden text-white px-4 pt-12 shadow-md"
        style={{ background: "linear-gradient(140deg, #1c0905 0%, #3a1d0e 55%, #241206 100%)" }}>
        <div className="pointer-events-none absolute -top-20 right-0 w-96 h-96 rounded-full bg-[#e07b3a]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b97a]/25 to-transparent" />

        <div className="mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="min-w-0 space-y-3">
              <div className="inline-flex items-center gap-1.5 bg-[#b04a15]/20 border border-[#b04a15]/30 rounded-full px-3 py-1 text-xs text-[#f0b97a] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Donor
              </div>
              <h1 className="text-4xl sm:text-5xl tracking-tight leading-[1.05] font-bold" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
                Namaste, {myProfile?.fullName?.split(" ")[0] || user.email.split("@")[0]}.
              </h1>
              <p className="text-white/55 text-sm max-w-md">
                {itemListings.length > 0
                  ? `Your inventory is ${itemListings.some(l => ["ELIGIBLE_FOR_MATCHING", "AVAILABLE"].includes(l.status)) ? "live — we match it against verified needs as they arrive" : "with us — list something new or resume a paused item"}.`
                  : "List an item privately and we'll match it with a verified need near you."}
              </p>
            </motion.div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {myProfile?.role === "ADMIN" && (
                <div className="grid grid-cols-2 gap-1 bg-white/10 border border-white/15 p-1 rounded-xl">
                  <button onClick={() => setActiveTab("donor")}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === "donor" ? "bg-[#b04a15] text-white" : "text-white/60"}`}>
                    Donor
                  </button>
                  <button onClick={() => setActiveTab("donee")}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === "donee" ? "bg-[#b04a15] text-white" : "text-white/60"}`}>
                    Donee
                  </button>
                </div>
              )}
              {(myProfile?.role === "DONOR" || myProfile?.role === "ADMIN") && (
                <Link href="/items/new" data-tour="primary-cta">
                  <Button className="bg-[#b04a15] hover:bg-[#943e11] text-white font-bold rounded-xl px-5 py-2.5 h-auto btn-shine flex items-center gap-1.5 text-sm">
                    <Plus className="w-4 h-4" /> List Item Privately
                  </Button>
                </Link>
              )}
              {(myProfile?.role === "DONEE" || myProfile?.role === "ADMIN") && (
                <Link href="/requests/new">
                  <Button className="bg-[#f0b97a] hover:bg-[#e0a96a] text-stone-950 font-bold rounded-xl px-5 py-2.5 h-auto flex items-center gap-1.5 text-sm">
                    <Plus className="w-4 h-4" /> Post a Need
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Giving ledger — live numbers over hairline rules, no stat cards */}
          <div data-tour="ledger" className="mt-10 grid grid-cols-3 border-t border-white/10">
            {[
              { n: itemListings.length, label: "items listed" },
              { n: donorMatches.filter(m => !["FULFILLED", "COMPLETED", "CANCELLED", "REJECTED", "FAILED", "DONOR_REJECTED"].includes(m.status)).length, label: "active matches" },
              { n: donorMatches.filter(m => ["FULFILLED", "COMPLETED"].includes(m.status)).length, label: "donations completed" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
                className={`py-5 ${i > 0 ? "border-l border-white/10 pl-5 sm:pl-8" : ""}`}>
                <p className="text-4xl sm:text-5xl tabular-nums leading-none" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>{stat.n}</p>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/45 mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-8">

          {/* ── Identity line ── */}
          <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 border-b border-stone-200/80 dark:border-zinc-800 pb-4">
            <div className="w-9 h-9 rounded-full bg-[#b04a15]/10 dark:bg-zinc-800 flex items-center justify-center font-black text-sm text-[#b04a15] shrink-0">
              {myProfile ? getInitials(myProfile.fullName) : "U"}
            </div>
            <p className="font-bold text-stone-800 dark:text-stone-200 truncate">{myProfile?.fullName || user.email?.split("@")[0]}</p>
            <span className="text-stone-300 dark:text-zinc-700 hidden sm:inline">&middot;</span>
            <p className="truncate hidden sm:block">{user.email}</p>
            {myProfile?.city && (
              <>
                <span className="text-stone-300 dark:text-zinc-700 hidden md:inline">&middot;</span>
                <p className="hidden md:flex items-center gap-1"><MapPin className="w-3 h-3 text-[#b04a15]" />{myProfile.city}</p>
              </>
            )}
            <Link href="/profile" className="ml-auto shrink-0 font-bold text-[#b04a15] hover:underline">Edit profile</Link>
          </div>

          {/* RIGHT: Main Dashboard Content */}
          <div className="space-y-6">
            
            {/* Tab Content */}
            {activeTab === "donor" ? (
              /* DONOR DASHBOARD VIEW */
              <div className="space-y-6">
                
                {/* Donor Flow 2 — Offer Tracker */}
                {donationOffers.length > 0 && (
                  <section data-tour="offers">
                    <div className="border-b-2 border-[#f0b97a]/70 pb-3 mb-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b04a15] dark:text-[#f0b97a]">Your Offers</p>
                      <p className="text-xs text-stone-400 mt-1">Items you offered directly against someone&apos;s request.</p>
                    </div>
                    <DonorOfferSection
                      offers={donationOffers}
                      onReconfirm={handleOfferReconfirm}
                      onWithdraw={handleOfferWithdraw}
                    />
                  </section>
                )}

                {/* Inventory ledger + match opportunities */}
                <div className="space-y-12">

                  {/* Your inventory — private, matched quietly */}
                  <section>
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#b04a15]/70 pb-3">
                      <div>
                        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#b04a15]">
                          <EyeOff className="w-3.5 h-3.5" /> Your Private Inventory
                        </p>
                        <p className="text-xs text-stone-400 mt-1">Only our matching engine sees these — never other users.</p>
                      </div>
                      <Link href="/items/new" className="text-xs font-bold text-[#b04a15] hover:underline flex items-center gap-1 shrink-0 mb-0.5">
                        <Plus className="w-3.5 h-3.5" /> Add an item
                      </Link>
                    </div>
                    <div className="pt-4 space-y-4">
                      {itemListings.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="text-sm text-stone-400">You haven&apos;t listed any items to donate yet.</p>
                          <Link href="/items/new" className="inline-block mt-3">
                            <Button size="sm" className="bg-[#b04a15] text-white">List your first item</Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="divide-y dark:divide-zinc-800 space-y-2">
                          {itemListings.map((l) => {
                            const meta = LISTING_STATUS_META[l.status] ?? { label: l.status, color: "text-stone-500", bg: "bg-stone-100", border: "border-stone-200" };
                            const isDraft = l.status === "DRAFT";
                            const needsInfo = l.status === "NEEDS_INFORMATION";
                            return (
                              <div key={l.id} className={`pt-3 first:pt-0 p-2 rounded-xl transition-all border ${needsInfo ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/10" : "border-transparent hover:bg-stone-50 dark:hover:bg-zinc-800/40"}`}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedListing(l)}
                                  className="w-full text-left"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-lg font-bold text-stone-900 dark:text-stone-100 truncate leading-snug" style={{ fontFamily: "var(--font-source-serif-4), serif" }}><TranslatedText text={l.title} /></p>
                                      <div className="flex flex-wrap gap-1.5 items-center text-xs text-stone-400 mt-0.5">
                                        {l.category && <span><TranslatedText text={l.category} /></span>}
                                        {l.city && <><span>·</span><span><TranslatedText text={l.city} /></span></>}
                                        <span>·</span>
                                        <span>Qty: {l.quantity}</span>
                                      </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${meta.color} ${meta.bg} ${meta.border}`}>
                                      {meta.label}
                                    </span>
                                  </div>
                                </button>

                                <ListingJourneyTracker status={l.status} />

                                {needsInfo && (
                                  <div className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-100 dark:bg-amber-950/20 rounded-lg p-2">
                                    {l.rejectionReason
                                      ? <>Admin note: {l.rejectionReason}</>
                                      : "Admin has requested more information. Please update your listing."}
                                  </div>
                                )}

                                {/* Listing action buttons per spec §7.4 */}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {isDraft && (
                                    <Link href="/items/new">
                                      <span className="text-xs text-[#b04a15] font-bold hover:underline">Continue →</span>
                                    </Link>
                                  )}
                                  {needsInfo && (
                                    <Link href={`/items/${l.id}/edit`}>
                                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors">
                                        Edit &amp; Resubmit →
                                      </span>
                                    </Link>
                                  )}
                                  {l.status === "ELIGIBLE_FOR_MATCHING" || l.status === "AVAILABLE" ? (
                                    <button
                                      onClick={() => handleListingAction(l.id, "pause")}
                                      disabled={listingActionLoading === l.id}
                                      className="text-xs text-stone-500 border border-stone-300 rounded-full px-2.5 py-0.5 hover:border-stone-500 hover:text-stone-700 disabled:opacity-50"
                                    >
                                      {listingActionLoading === l.id ? "…" : "Pause"}
                                    </button>
                                  ) : null}
                                  {l.status === "PAUSED" && (
                                    <button
                                      onClick={() => handleListingAction(l.id, "resume")}
                                      disabled={listingActionLoading === l.id}
                                      className="text-xs text-green-700 border border-green-400 rounded-full px-2.5 py-0.5 hover:bg-green-50 disabled:opacity-50"
                                    >
                                      {listingActionLoading === l.id ? "…" : "Resume"}
                                    </button>
                                  )}
                                  {!["DONATED", "FULFILLED", "REJECTED", "WITHDRAWN"].includes(l.status) && (
                                    <button
                                      onClick={() => { if (confirm("Withdraw this listing? This cannot be undone.")) handleListingAction(l.id, "withdraw"); }}
                                      disabled={listingActionLoading === l.id}
                                      className="text-xs text-red-500 border border-red-300 rounded-full px-2.5 py-0.5 hover:bg-red-50 disabled:opacity-50"
                                    >
                                      Withdraw
                                    </button>
                                  )}
                                  {l.status === "REJECTED" && (
                                    <button
                                      onClick={() => handleDeleteRejected(l.id)}
                                      disabled={listingActionLoading === l.id}
                                      className="text-xs text-red-600 border border-red-300 rounded-full px-2.5 py-0.5 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 font-semibold"
                                    >
                                      {listingActionLoading === l.id ? "…" : "Delete"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Donor Matches */}
                  <section data-tour="matches">
                    <div className="border-b-2 border-emerald-500/60 pb-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-400">Match Opportunities</p>
                      <p className="text-xs text-stone-400 mt-1">Verified needs your items can fulfil.</p>
                    </div>
                    <div className="pt-5 space-y-4">
                      {donorMatches.length === 0 ? (
                        /* Truthful empty state: the sweep only spins while a listing is
                           live and the engine is actually checking incoming needs. */
                        <div className="py-12 text-center space-y-4">
                          <div className="relative w-24 h-24 mx-auto rounded-full border border-emerald-500/25">
                            <div className="absolute inset-3 rounded-full border border-emerald-500/20" />
                            <div className="absolute inset-6 rounded-full border border-emerald-500/15" />
                            {itemListings.some(l => ["ELIGIBLE_FOR_MATCHING", "AVAILABLE"].includes(l.status)) && (
                              <>
                                <div className="absolute inset-0 rounded-full overflow-hidden motion-reduce:hidden">
                                  <div className="absolute inset-0 animate-[spin_3.5s_linear_infinite]"
                                    style={{ background: "conic-gradient(from 0deg, rgba(16,185,129,0.30), transparent 70deg)" }} />
                                </div>
                                <div className="absolute top-4 right-6 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
                              </>
                            )}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500" />
                          </div>
                          {itemListings.some(l => ["ELIGIBLE_FOR_MATCHING", "AVAILABLE"].includes(l.status)) ? (
                            <div>
                              <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Scanning incoming needs</p>
                              <p className="text-xs text-stone-400 max-w-[260px] mx-auto mt-1">Your live items are checked against every verified need as it arrives. Matches appear here &mdash; and we&apos;ll notify you.</p>
                            </div>
                          ) : itemListings.length > 0 ? (
                            <div>
                              <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Matching starts once an item goes live</p>
                              <p className="text-xs text-stone-400 max-w-[260px] mx-auto mt-1">Your items are awaiting screening or paused &mdash; once one is live, the engine starts scanning for it.</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Nothing to match yet</p>
                              <p className="text-xs text-stone-400 max-w-[240px] mx-auto mt-1">List an item above &mdash; matching begins as soon as it passes screening.</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="divide-y space-y-4">
                          {donorMatches.map((m) => {
                            const badge = getFulfilmentStatusBadge(m.status);
                            const isDonorReview = m.status === "DONOR_REVIEW";
                            const isDeclining = declineMatchId === m.id;
                            return (
                              <div key={m.id} className={`pt-4 first:pt-0 space-y-2 group p-2 rounded-xl transition-all ${isDonorReview ? "border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "hover:bg-stone-50 dark:hover:bg-zinc-800/40"}`}>
                                {isDonorReview && (
                                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold pb-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Action Required — Please confirm this donation
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className={`font-bold text-sm text-stone-900 dark:text-stone-100 transition-colors ${isDonorReview ? "" : "group-hover:text-emerald-500"}`}>
                                      Matched need for: <TranslatedText text={m.requestTitle || "Requested Need"} />
                                    </p>
                                    <p className="text-xs text-stone-400 mt-0.5">Matched with item: <TranslatedText text={m.listingTitle || ""} /></p>
                                  </div>
                                  <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap">{badge.label}</Badge>
                                </div>
                                <div className="flex flex-wrap justify-between items-center text-xs bg-stone-100/60 dark:bg-zinc-950 p-2.5 rounded-xl gap-2">
                                  <div><p className="text-stone-500">Recipient Donee</p><p className="font-semibold text-stone-700 dark:text-stone-300">{m.doneeName}</p></div>
                                  {m.matchScore && (<div className="text-right"><p className="text-stone-500">AI Score</p><p className="font-bold text-[#b04a15]">{m.matchScore}%</p></div>)}
                                </div>
                                {isDonorReview && (
                                  <div className="space-y-2 pt-1">
                                    {!isDeclining ? (
                                      <div className="flex gap-2">
                                        <button disabled={reviewLoading === m.id} onClick={async () => { setReviewLoading(m.id); try { await donorAcceptMatch(m.id); toast.success("Match accepted! Admin will review shortly."); await refreshMatches(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to accept match"); } finally { setReviewLoading(null); }}} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                          {reviewLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />} Accept
                                        </button>
                                        <button disabled={reviewLoading === m.id} onClick={() => { setDeclineMatchId(m.id); setDeclineReason(""); setDeclineConditionChanged(false); }} className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                          <ThumbsDown className="w-3.5 h-3.5" /> Decline
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <input type="text" placeholder="Optional reason for declining..." value={declineReason} onChange={e => setDeclineReason(e.target.value)} className="w-full text-xs border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-400" />
                                        <label className="flex items-center gap-1.5 text-[11px] text-stone-500 cursor-pointer select-none">
                                          <input type="checkbox" checked={declineConditionChanged} onChange={e => setDeclineConditionChanged(e.target.checked)} className="rounded border-stone-300" />
                                          The item&apos;s condition has changed since I listed it (pauses the listing)
                                        </label>
                                        <div className="flex gap-2">
                                          <button disabled={reviewLoading === m.id} onClick={async () => { setReviewLoading(m.id); try { await donorRejectMatch(m.id, declineReason || undefined, declineConditionChanged); toast.success("Match declined. We're finding the next best donor."); setDeclineMatchId(null); await refreshMatches(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to decline match"); } finally { setReviewLoading(null); }}} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                            {reviewLoading === m.id ? "Declining..." : "Confirm Decline"}
                                          </button>
                                          <button onClick={() => setDeclineMatchId(null)} className="px-3 py-2 text-xs text-stone-500 hover:text-stone-800 rounded-lg border border-stone-200 dark:border-zinc-700">Cancel</button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {m.status === "DONEE_ACCEPTED" && (
                                  <div className="space-y-1 pt-1">
                                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Donee confirmed — please give your final confirmation
                                    </p>
                                    <button
                                      disabled={reviewLoading === m.id}
                                      onClick={async () => {
                                        setReviewLoading(m.id);
                                        try {
                                          await donorConfirmMatch(m.id);
                                          toast.success("Donation confirmed! Logistics will be arranged next.");
                                          await refreshMatches();
                                        } catch (e: unknown) {
                                          toast.error(e instanceof Error ? e.message : "Failed to confirm");
                                        } finally { setReviewLoading(null); }
                                      }}
                                      className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all"
                                    >
                                      {reviewLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Confirm Donation</>}
                                    </button>
                                  </div>
                                )}
                                {HANDOVER_HUB_STATUSES.has(m.status) && (
                                  <div className="pt-1">
                                    <Link href={`/matches/${m.id}/handover`} className="flex items-center justify-center gap-1.5 w-full bg-[#b04a15] hover:bg-[#c45520] text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                      <Truck className="w-3.5 h-3.5" /> Go to Handover Hub
                                    </Link>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>

                </div>

              </div>
            ) : (
              /* DONEE DASHBOARD VIEW */
              <div className="space-y-6">
                
                {/* Stats Row */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#b04a15]" />
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="h-11 w-11 rounded-xl bg-orange-100 text-[#b04a15] dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Total Needs Posted</p>
                        <p className="text-xl font-bold">{itemRequests.length}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" />
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="h-11 w-11 rounded-xl bg-green-100 text-green-600 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Fulfilled Needs</p>
                        <p className="text-xl font-bold">{itemRequests.filter(r => r.status === "FULFILLED").length}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Donee Requests & Donee Matches Grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                  
                  {/* Requests list */}
                  <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-full h-[3px] bg-[#b04a15]" />
                    <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none">01</div>
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4 relative z-10">
                      <CardTitle className="text-base font-bold">My Needs & Requests</CardTitle>
                      <Link href="/requests/new">
                        <Button variant="ghost" size="sm" className="text-xs font-bold text-[#b04a15]">
                          <Plus className="w-3.5 h-3.5 mr-1" /> New Need
                        </Button>
                      </Link>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                      {itemRequests.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="text-sm text-stone-400">You haven&apos;t posted any needs yet.</p>
                          <Link href="/requests/new" className="inline-block mt-3">
                            <Button size="sm" className="bg-[#b04a15] text-white">Post your first need</Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="divide-y space-y-3">
                          {itemRequests.map((r) => {
                            const badge = getRequestStatusBadge(r.status);
                            return (
                              <div key={r.id} className="pt-3 first:pt-0 flex items-start justify-between gap-3 group p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-all">
                                <div>
                                  <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[#b04a15] transition-colors"><TranslatedText text={r.title} /></p>
                                  <div className="flex flex-wrap gap-2 items-center text-xs text-stone-400 mt-1">
                                    <span><TranslatedText text={r.category} /></span>
                                    <span>•</span>
                                    <span>Qty: {r.quantity}</span>
                                    <span>•</span>
                                    <span className="capitalize">{r.urgency.toLowerCase()} urgency</span>
                                  </div>
                                  {r.status === "REJECTED" && r.rejectionReason && (
                                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 line-clamp-2 leading-snug">{r.rejectionReason}</p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                  <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap">
                                    {badge.label}
                                  </Badge>
                                  {r.status === "REJECTED" && <FixResubmitButton requestId={r.id} />}
                                  {r.status === "DRAFT" && (
                                    <Link href={`/requests/new?draftId=${r.id}`}
                                      className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#b04a15]/30 text-[11px] font-bold text-[#b04a15] hover:bg-[#b04a15]/5 transition-colors">
                                      <Pencil className="w-3 h-3" /> Continue editing
                                    </Link>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Donee Matches */}
                  <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-full h-[3px] bg-emerald-500" />
                    <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none">02</div>
                    <CardHeader className="border-b pb-4 mb-4 relative z-10">
                      <CardTitle className="text-base font-bold">Matches &amp; Handover Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                      {doneeMatches.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="text-sm text-stone-400">No active matches found for your requests yet.</p>
                          <p className="text-xs text-stone-400/80 mt-1">We are actively checking private inventory to find matching items.</p>
                        </div>
                      ) : (
                        <div className="divide-y space-y-4">
                          {doneeMatches.map((m) => {
                            const badge = getFulfilmentStatusBadge(m.status);
                            return (
                              <div key={m.id} className="pt-4 first:pt-0 space-y-2 group p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-all">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-emerald-550 transition-colors">
                                      Matched item: <TranslatedText text={m.listingTitle || "Donated Item"} />
                                    </p>
                                    <p className="text-xs text-stone-400 mt-0.5">For your need: <TranslatedText text={m.requestTitle || ""} /></p>
                                  </div>
                                  <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap">{badge.label}</Badge>
                                </div>
                                <div className="flex flex-wrap justify-between items-center text-xs bg-stone-100/60 dark:bg-zinc-950 p-2.5 rounded-xl gap-2">
                                  <div><p className="text-stone-500">Donor</p><p className="font-semibold text-stone-700 dark:text-stone-300">{m.donorName}</p></div>
                                  {m.matchScore && (<div className="text-right"><p className="text-stone-500">AI Score</p><p className="font-bold text-[#b04a15]">{m.matchScore}%</p></div>)}
                                </div>
                                {m.status === "TRANSPORT_DISCUSSION" && (
                                  <div className="flex justify-end gap-2 pt-1">
                                    <Button size="sm" className="bg-[#b04a15] text-white text-xs font-bold rounded-lg flex items-center gap-1">Call Donor (Masked)</Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>

              </div>
            )}

          </div>

        </div>
      </div>

      <ListingDetailPanel
        listing={selectedListing}
        match={selectedListing ? matches.find(m => m.listingId === selectedListing.id) ?? null : null}
        onClose={() => setSelectedListing(null)}
        onAction={async (id, action) => {
          await handleListingAction(id, action);
          setSelectedListing(null);
        }}
        actionLoading={listingActionLoading}
      />
    </div>
  );
}
