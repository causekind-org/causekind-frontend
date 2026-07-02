"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import {
  getMyItemListings, getMyItemRequests, getMyMatches, getMyProfile,
  donorAcceptMatch, donorRejectMatch, doneeAcceptMatch, doneeRejectMatch, donorConfirmMatch,
  saveMatchLogistics, generateDeliveryOtp, verifyDeliveryMatch, confirmReceiptMatch, requestCallMasking,
  pauseItemListing, resumeItemListing, withdrawItemListing, deleteMyListing,
  getMyDonationOffers, reconfirmOfferAvailability, withdrawOffer, getOffersForMyRequests, doneeReviewOffer,
  type ItemListing, type ItemRequest, type ItemMatch, type UserProfile, type DonationOffer
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Award, HandCoins, Loader2, Package, Pencil, Plus, ShieldCheck, X, Check,
  User, MapPin, Calendar, CircleDot, EyeOff, Info, ExternalLink, RefreshCw,
  Phone, Mail, Handshake, CheckCircle2, Heart, AlertTriangle, ThumbsUp, ThumbsDown
} from "lucide-react";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { Reveal } from "@/components/Reveal";
import { ListingDetailPanel } from "@/components/ListingDetailPanel";

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
    DONOR_REVIEW: { label: "⚠ Awaiting Your Confirmation", variant: "outline" },
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
  const [verifyMatchId, setVerifyMatchId] = useState<number | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
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

  return (
    <div className="min-h-screen bg-[#eef3f9] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 pb-16">

      {/* ── Hero header — ink/blue theme ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0d1e36] via-[#1e3a60] to-[#0a2040] text-white py-12 px-4 shadow-lg">
        <div className="pointer-events-none absolute -top-20 right-0 w-96 h-96 rounded-full bg-[#f0b97a]/6 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f0b97a]/25 to-transparent" />

        <div className="mx-auto max-w-5xl relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 bg-[#f0b97a]/15 border border-[#f0b97a]/30 rounded-full px-3 py-1 text-xs text-[#f0b97a] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Donee
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Your Needs
              </h1>
              <p className="text-white/55 text-sm">
                {activeRequests.length > 0
                  ? `${activeRequests.length} active request${activeRequests.length !== 1 ? "s" : ""} · Scanning for matches near you`
                  : `Hello, ${myProfile.fullName?.split(" ")[0] || user.email.split("@")[0]} — start by posting a need`}
              </p>
            </div>
            <Link href="/requests/new">
              <Button className="bg-[#f0b97a] hover:bg-[#e0a86a] text-stone-950 font-extrabold rounded-2xl px-6 py-3 h-auto text-sm flex items-center gap-2 shadow-xl shadow-[#f0b97a]/20 shrink-0">
                <Plus className="w-4 h-4" /> Post a Need
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">

        {/* ── Profile strip ── */}
        <div className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-stone-100/80 dark:border-zinc-700/50 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#1e3a60]/10 dark:bg-zinc-800 flex items-center justify-center font-black text-lg text-[#1e3a60] dark:text-blue-400 shrink-0">
            {getInitials(myProfile.fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-stone-900 dark:text-white truncate">{myProfile.fullName}</p>
            <p className="text-xs text-stone-400 truncate">{user.email}</p>
          </div>
          {myProfile.city && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-[#1e3a60]" />
              {myProfile.city}
            </div>
          )}
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="text-xs text-stone-400 hover:text-[#1e3a60] dark:hover:text-blue-400 shrink-0">
              Edit Profile
            </Button>
          </Link>
        </div>

        {/* ── Stats row ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div
            className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-stone-100/80 dark:border-zinc-700/50 p-5 shadow-sm flex items-center gap-4"
            style={{ borderLeft: "3px solid #1e3a60" }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#1e3a60]/10 flex items-center justify-center text-[#1e3a60] shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400">Needs Posted</p>
              <p className="text-2xl font-black text-stone-900 dark:text-white">{itemRequests.length}</p>
            </div>
          </div>

          <div
            className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-stone-100/80 dark:border-zinc-700/50 p-5 shadow-sm flex items-center gap-4"
            style={{ borderLeft: "3px solid #f0b97a" }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#f0b97a]/15 flex items-center justify-center text-[#b04a15] shrink-0">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400">Active Matches</p>
              <p className="text-2xl font-black text-stone-900 dark:text-white">{activeMatches.length}</p>
            </div>
          </div>

          <div
            className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-stone-100/80 dark:border-zinc-700/50 p-5 shadow-sm flex items-center gap-4"
            style={{ borderLeft: "3px solid #10b981" }}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400">Needs Fulfilled</p>
              <p className="text-2xl font-black text-stone-900 dark:text-white">{fulfilledRequests.length}</p>
            </div>
          </div>
        </div>

        {/* ── Incoming Donation Offers (Donor Flow 2) ── */}
        {incomingOffers.filter(o => o.status !== "DONEE_DECLINED").length > 0 && (
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
              {incomingOffers
                .filter(o => o.status !== "DONEE_DECLINED")
                .map(offer => {
                  const isPendingReview = offer.status === "PENDING_DONEE_REVIEW";
                  const isApproved      = offer.status === "ADMIN_APPROVED";
                  const isHandover      = ["HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"].includes(offer.status);
                  const isComplete      = offer.status === "COMPLETED";
                  const isWithdrawn     = offer.status === "WITHDRAWN" || offer.status === "CANCELLED" || offer.status === "ADMIN_REJECTED";
                  const statusLabel =
                    isPendingReview ? "Awaiting your review" :
                    offer.status === "DONOR_RECONFIRMATION_REQUIRED" ? "Donor is reconfirming" :
                    offer.status === "DONOR_RECONFIRMED" ? "Under admin review" :
                    isApproved ? "Approved" :
                    isHandover ? "Handover in progress" :
                    isComplete ? "Completed" :
                    offer.status === "ADMIN_REJECTED" ? "Offer not approved" :
                    isWithdrawn ? "Offer withdrawn" :
                    offer.status.replace(/_/g, " ");
                  const statusColor =
                    isPendingReview ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                    isApproved || isComplete ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" :
                    isHandover ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
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

                      {/* Withdrawn / rejected — special message instead of tracker */}
                      {isWithdrawn && (
                        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 space-y-2">
                          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                            {offer.status === "ADMIN_REJECTED"
                              ? "This donation offer was not approved by admin."
                              : "The donor's item is no longer available."}
                          </p>
                          {offer.rejectionReason && (
                            <div className="rounded-lg bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900 px-3 py-2">
                              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-0.5">
                                {offer.status === "ADMIN_REJECTED" ? "Admin's reason" : "Reason given"}
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-400">{offer.rejectionReason}</p>
                            </div>
                          )}
                          <div className="pt-1 border-t border-red-100 dark:border-red-900 space-y-1">
                            <p className="text-xs text-red-600 dark:text-red-400 font-semibold">What happens next:</p>
                            <ul className="text-xs text-red-500 dark:text-red-500 space-y-0.5 list-disc list-inside">
                              <li>Your request remains open and visible to other donors</li>
                              {offer.status === "ADMIN_REJECTED"
                                ? <li>The donor may re-submit an improved offer or offer to a different request</li>
                                : <li>If another donor had expressed interest, they will be notified</li>}
                              <li>You will receive a notification when a new offer arrives</li>
                            </ul>
                          </div>
                          <Link href="/requests" className="block text-center rounded-xl border border-red-300 dark:border-red-800 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
                            Browse donors offering to help →
                          </Link>
                        </div>
                      )}

                      {/* Stage Progress Tracker — only shown when offer is active */}
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
                          <Link href="/donee/offers" className="rounded-xl border border-stone-200 dark:border-zinc-700 px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-50 dark:hover:bg-zinc-800">
                            Details
                          </Link>
                        </div>
                      )}
                      {(isApproved || isHandover) && (
                        <Link href={`/offers/${offer.id}/handover`} className="block w-full rounded-xl bg-blue-600 py-2 text-center text-xs font-semibold text-white hover:bg-blue-700">
                          Open Handover Hub →
                        </Link>
                      )}
                      {isComplete && (
                        <Link href={`/certificate?offerId=${offer.id}`} className="block w-full rounded-xl bg-green-600 py-2 text-center text-xs font-semibold text-white hover:bg-green-700">
                          View Certificate →
                        </Link>
                      )}
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        )}

        {/* ── Requests + Matches grid ── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* My Requests */}
          <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1e3a60]" />
            <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none leading-none">01</div>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4 relative z-10">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-[#1e3a60]" /> My Requests
              </CardTitle>
              <Link href="/requests/new">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-[#1e3a60] hover:text-[#1e3a60]">
                  <Plus className="w-3.5 h-3.5 mr-1" /> New
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="relative z-10 pt-4">
              {itemRequests.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-14 h-14 bg-[#1e3a60]/10 rounded-2xl flex items-center justify-center mx-auto">
                    <Heart className="w-6 h-6 text-[#1e3a60]" />
                  </div>
                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No needs posted yet</p>
                  <p className="text-xs text-stone-400 max-w-[220px] mx-auto">Tell us what you need — books, clothes, medical supplies — and we&apos;ll find donors nearby.</p>
                  <Link href="/requests/new">
                    <Button size="sm" className="bg-[#1e3a60] hover:bg-[#162d4a] text-white mt-2">Post your first need</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y dark:divide-zinc-800">
                  {itemRequests.map(r => {
                    const badge = getRequestStatusBadge(r.status);
                    return (
                      <div key={r.id} className="py-3 flex items-start justify-between gap-3 group hover:bg-stone-50 dark:hover:bg-zinc-800/40 px-1 rounded-xl transition-all">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[#1e3a60] dark:group-hover:text-blue-400 transition-colors truncate">
                            <TranslatedText text={r.title} />
                          </p>
                          <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5 flex-wrap">
                            <span><TranslatedText text={r.category} /></span>
                            <span>·</span>
                            <span>Qty: {r.quantity}</span>
                            <span>·</span>
                            <span className="capitalize">{r.urgency.toLowerCase()}</span>
                          </div>
                        </div>
                        <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap shrink-0">{badge.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Match Status */}
          <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#f0b97a]" />
            <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none leading-none">02</div>
            <CardHeader className="border-b pb-4 relative z-10">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Handshake className="w-4 h-4 text-[#b04a15]" /> Match Status
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 pt-4">
              {doneeMatches.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-14 h-14 bg-[#f0b97a]/15 rounded-2xl flex items-center justify-center mx-auto">
                    <Handshake className="w-6 h-6 text-[#b04a15]" />
                  </div>
                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No matches yet</p>
                  <p className="text-xs text-stone-400 max-w-[240px] mx-auto">Our system is scanning donor inventories for items that match your needs. Check back soon.</p>
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
                        {m.status === "TRANSPORT_DISCUSSION" && (
                          <div className="flex justify-end pt-1">
                            <Button size="sm" onClick={async () => { try { await requestCallMasking(m.id); toast.success("Call request sent!"); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } }} className="bg-[#1e3a60] hover:bg-[#162d4a] text-white text-xs font-bold rounded-lg"><Phone className="w-3 h-3 mr-1" />Contact Donor (Masked)</Button>
                          </div>
                        )}
                        {(m.status === "DELIVERED_PENDING_CONFIRMATION" || m.status === "IN_TRANSIT" || m.status === "PICKED_UP" || m.status === "LOGISTICS_CONFIRMED") && (
                          <div className="pt-1 space-y-2">
                            <p className="text-xs font-semibold text-emerald-700">Item is on the way — enter the OTP from the donor to confirm receipt</p>
                            {verifyMatchId === m.id ? (
                              <div className="space-y-2">
                                <input type="text" maxLength={6} placeholder="Enter 6-digit OTP" value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, ""))} className="w-full text-center text-lg font-bold tracking-widest border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900" />
                                <div className="flex gap-2">
                                  <button disabled={verifyLoading || otpInput.length !== 6} onClick={async () => { setVerifyLoading(true); try { await verifyDeliveryMatch(m.id, { verificationMethod: "OTP", otp: otpInput }); toast.success("Delivery confirmed! Match completed."); setVerifyMatchId(null); setOtpInput(""); await onRefresh(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "OTP verification failed"); } finally { setVerifyLoading(false); } }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg">
                                    {verifyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Confirm Receipt"}
                                  </button>
                                  <button onClick={() => { setVerifyMatchId(null); setOtpInput(""); }} className="px-3 text-xs text-stone-500 border border-stone-200 dark:border-zinc-700 rounded-lg">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setVerifyMatchId(m.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg">
                                Enter OTP to Confirm Receipt
                              </button>
                            )}
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
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user, isLoading } = useAuth();
  const router = useRouter();

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
  const [reviewLoading, setReviewLoading] = useState<number | null>(null);

  // Logistics form state
  const [logisticsMatchId, setLogisticsMatchId] = useState<number | null>(null);
  const [logisticsForm, setLogisticsForm] = useState({ handoverMethod: "IN_PERSON", pickupDateTime: "", handoverAddress: "", notes: "" });
  const [logisticsLoading, setLogisticsLoading] = useState(false);

  // OTP state
  const [generatedOtp, setGeneratedOtp] = useState<{ matchId: number; otp: string } | null>(null);
  const [otpLoading, setOtpLoading] = useState<number | null>(null);


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
      {/* Header and Welcome */}
      <div className="bg-[#1e2d10] bg-gradient-to-r from-[#0f1d30] via-[#1c0905] to-[#1e2d10] text-white py-10 px-4 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-2xl pointer-events-none" />
        <div className="mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-[#b04a15]/20 border border-[#b04a15]/30 rounded-full px-3 py-1 text-xs text-[#f0b97a] font-semibold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" /> India verified setup
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Your Dashboard</h1>
              <p className="text-white/60 text-sm mt-1">Logged in as {user.email}</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {(myProfile?.role === "DONOR" || myProfile?.role === "ADMIN") && (
                <Link href="/items/new">
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
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
          
          {/* LEFT: Sticky Sidebar */}
          <aside className="lg:sticky lg:top-24 bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-stone-100/80 dark:border-zinc-700/50 space-y-6 relative overflow-hidden">
            {/* Left accent stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#b04a15]" />
            
            {/* Avatar & Initials */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#b04a15]/10 text-[#b04a15] dark:bg-zinc-850 flex items-center justify-center shadow-inner font-black text-xl">
                {myProfile ? getInitials(myProfile.fullName) : "U"}
              </div>
              <div>
                <h2 className="text-lg font-black text-stone-900 dark:text-white leading-tight">
                  {myProfile?.fullName || user.email?.split("@")[0]}
                </h2>
                <div className="inline-block mt-1 bg-[#b04a15]/10 text-[#b04a15] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                  {myProfile?.role ?? "DONOR"}
                </div>
              </div>
            </div>

            <div className="border-t border-stone-100 dark:border-zinc-800 pt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                <Mail className="w-3.5 h-3.5 text-[#b04a15]" />
                <span className="truncate">{user.email}</span>
              </div>
              {myProfile?.phone && (
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                  <Phone className="w-3.5 h-3.5 text-[#b04a15]" />
                  <span>{myProfile.phone}</span>
                </div>
              )}
              {myProfile?.city && (
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                  <MapPin className="w-3.5 h-3.5 text-[#b04a15]" />
                  <span>{myProfile.city}</span>
                </div>
              )}
            </div>

            {/* Quick Actions inside sidebar */}
            <div className="border-t border-stone-100 dark:border-zinc-850 pt-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2">Quick Actions</p>
              {(myProfile?.role === "DONOR" || myProfile?.role === "ADMIN") && (
                <Link href="/items/new" className="block w-full">
                  <Button className="w-full bg-[#b04a15] hover:bg-[#943e11] text-white font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-1.5 shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> List Item
                  </Button>
                </Link>
              )}
              {(myProfile?.role === "DONEE" || myProfile?.role === "ADMIN") && (
                <Link href="/requests/new" className="block w-full">
                  <Button className="w-full bg-[#f0b97a] hover:bg-[#e0a96a] text-stone-950 font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-1.5 shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> Post a Need
                  </Button>
                </Link>
              )}
            </div>

            {/* Admin Switcher inside sidebar */}
            {myProfile?.role === "ADMIN" && (
              <div className="border-t border-stone-100 dark:border-zinc-800 pt-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2">View Mode</p>
                <div className="grid grid-cols-2 gap-1 bg-stone-50 dark:bg-zinc-950 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab("donor")}
                    className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                      activeTab === "donor" ? "bg-[#b04a15] text-white" : "text-stone-500"
                    }`}
                  >
                    Donor
                  </button>
                  <button
                    onClick={() => setActiveTab("donee")}
                    className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                      activeTab === "donee" ? "bg-[#b04a15] text-white" : "text-stone-500"
                    }`}
                  >
                    Donee
                  </button>
                </div>
              </div>
            )}
          </aside>

          {/* RIGHT: Main Dashboard Content */}
          <div className="space-y-6">
            
            {/* Tab Content */}
            {activeTab === "donor" ? (
              /* DONOR DASHBOARD VIEW */
              <div className="space-y-6">
                
                {/* Stats Row */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#b04a15]" />
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="h-11 w-11 rounded-xl bg-orange-100 text-[#b04a15] dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Private Inventory Items</p>
                        <p className="text-xl font-bold">{itemListings.length}</p>
                      </div>
                    </CardContent>
                  </Card>


                  <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" />
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="h-11 w-11 rounded-xl bg-green-100 text-green-600 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Active Match Handovers</p>
                        <p className="text-xl font-bold">{donorMatches.filter(m => m.status === "FULFILLED").length}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500" />
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="h-11 w-11 rounded-xl bg-blue-100 text-blue-600 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Reliability Score</p>
                        <p className="text-xl font-bold">100%</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Donor Flow 2 — Offer Tracker */}
                {donationOffers.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-stone-100 dark:border-zinc-800 shadow-sm p-6">
                    <DonorOfferSection
                      offers={donationOffers}
                      onReconfirm={handleOfferReconfirm}
                      onWithdraw={handleOfferWithdraw}
                    />
                  </div>
                )}

                {/* Donor Listings & Donor Matches Grid */}
                <div className="grid gap-6 lg:grid-cols-2">

                  {/* Private Inventory */}
                  <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-full h-[3px] bg-[#b04a15]" />
                    <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none">01</div>
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4 relative z-10">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <EyeOff className="w-4 h-4 text-stone-400" /> My Private Inventory
                      </CardTitle>
                      <Link href="/items/new">
                        <Button variant="ghost" size="sm" className="text-xs font-bold text-[#b04a15]">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add
                        </Button>
                      </Link>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
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
                                      <p className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate"><TranslatedText text={l.title} /></p>
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
                    </CardContent>
                  </Card>


                  {/* Donor Matches */}
                  <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-full h-[3px] bg-emerald-500" />
                    <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none">02</div>
                    <CardHeader className="border-b pb-4 mb-4 relative z-10">
                      <CardTitle className="text-base font-bold">Donation Match Opportunities</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                      {donorMatches.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="text-sm text-stone-400">No active match proposals for your items yet.</p>
                          <p className="text-xs text-stone-400/80 mt-1">When matching needs are submitted, matches will appear here.</p>
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
                                        <button disabled={reviewLoading === m.id} onClick={() => { setDeclineMatchId(m.id); setDeclineReason(""); }} className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                          <ThumbsDown className="w-3.5 h-3.5" /> Decline
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <input type="text" placeholder="Optional reason for declining..." value={declineReason} onChange={e => setDeclineReason(e.target.value)} className="w-full text-xs border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-400" />
                                        <div className="flex gap-2">
                                          <button disabled={reviewLoading === m.id} onClick={async () => { setReviewLoading(m.id); try { await donorRejectMatch(m.id, declineReason || undefined); toast.success("Match declined. We're finding the next best donor."); setDeclineMatchId(null); await refreshMatches(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to decline match"); } finally { setReviewLoading(null); }}} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
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
                                {m.status === "BOTH_PARTIES_ACCEPTED" && (
                                  <div className="pt-1 space-y-2">
                                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><Calendar className="w-3 h-3" /> Set pickup details to confirm logistics</p>
                                    {logisticsMatchId === m.id ? (
                                      <div className="space-y-2 bg-blue-50 dark:bg-zinc-800 p-3 rounded-xl">
                                        <select value={logisticsForm.handoverMethod} onChange={e => setLogisticsForm(f => ({ ...f, handoverMethod: e.target.value }))} className="w-full text-xs border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900">
                                          <option value="IN_PERSON">In Person</option>
                                          <option value="COURIER">Courier</option>
                                          <option value="THIRD_PARTY">Third Party</option>
                                        </select>
                                        <input type="datetime-local" value={logisticsForm.pickupDateTime} onChange={e => setLogisticsForm(f => ({ ...f, pickupDateTime: e.target.value }))} className="w-full text-xs border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900" />
                                        <input type="text" placeholder="Pickup address (optional)" value={logisticsForm.handoverAddress} onChange={e => setLogisticsForm(f => ({ ...f, handoverAddress: e.target.value }))} className="w-full text-xs border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900" />
                                        <input type="text" placeholder="Notes (optional)" value={logisticsForm.notes} onChange={e => setLogisticsForm(f => ({ ...f, notes: e.target.value }))} className="w-full text-xs border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900" />
                                        <div className="flex gap-2">
                                          <button disabled={logisticsLoading || !logisticsForm.pickupDateTime} onClick={async () => { setLogisticsLoading(true); try { await saveMatchLogistics(m.id, { handoverMethod: logisticsForm.handoverMethod, pickupDateTime: logisticsForm.pickupDateTime, handoverAddress: logisticsForm.handoverAddress || undefined, notes: logisticsForm.notes || undefined }); toast.success("Logistics saved!"); setLogisticsMatchId(null); await refreshMatches(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to save logistics"); } finally { setLogisticsLoading(false); } }} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg">
                                            {logisticsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Save Logistics"}
                                          </button>
                                          <button onClick={() => setLogisticsMatchId(null)} className="px-3 text-xs text-stone-500 border border-stone-200 dark:border-zinc-700 rounded-lg">Cancel</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button onClick={() => { setLogisticsMatchId(m.id); setLogisticsForm({ handoverMethod: "IN_PERSON", pickupDateTime: "", handoverAddress: "", notes: "" }); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg">
                                        Set Pickup Details
                                      </button>
                                    )}
                                  </div>
                                )}
                                {(m.status === "LOGISTICS_CONFIRMED" || m.status === "PICKUP_SCHEDULED" || m.status === "PICKED_UP" || m.status === "IN_TRANSIT" || m.status === "DELIVERED_PENDING_CONFIRMATION") && (
                                  <div className="pt-1 space-y-2">
                                    {m.pickupDateTime && <p className="text-xs text-stone-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Pickup: {new Date(m.pickupDateTime).toLocaleString()}</p>}
                                    {generatedOtp?.matchId === m.id ? (
                                      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-xl p-3 text-center">
                                        <p className="text-xs text-stone-500 mb-1">Share this OTP with the recipient for delivery confirmation</p>
                                        <p className="text-3xl font-black tracking-widest text-emerald-700">{generatedOtp.otp}</p>
                                        <button onClick={() => setGeneratedOtp(null)} className="mt-2 text-xs text-stone-400 underline">Hide OTP</button>
                                      </div>
                                    ) : (
                                      <button disabled={otpLoading === m.id} onClick={async () => { setOtpLoading(m.id); try { const res = await generateDeliveryOtp(m.id); setGeneratedOtp({ matchId: m.id, otp: res.otp }); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to generate OTP"); } finally { setOtpLoading(null); } }} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5">
                                        {otpLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Generate Delivery OTP"}
                                      </button>
                                    )}
                                  </div>
                                )}
                                {(m.status === "TRANSPORT_DISCUSSION" || m.status === "BOTH_PARTIES_ACCEPTED" || m.status === "LOGISTICS_CONFIRMED") && (
                                  <div className="flex justify-end gap-2 pt-1">
                                    <Button size="sm" onClick={async () => { try { await requestCallMasking(m.id); toast.success("Call request sent — recipient will be notified."); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } }} className="bg-[#b04a15] text-white text-xs font-bold rounded-lg flex items-center gap-1"><Phone className="w-3 h-3" /> Call Recipient (Masked)</Button>
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
                                </div>
                                <Badge variant={badge.variant} className="text-[10px] whitespace-nowrap">
                                  {badge.label}
                                </Badge>
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
