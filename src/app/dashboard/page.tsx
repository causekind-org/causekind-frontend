"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NewRequestLink } from "@/components/NewRequestLink";
import Image from "next/image";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import {
  getMyItemListings, getMyItemRequests, getMyMatches, getMyProfile,
  donorAcceptMatch, donorRejectMatch, doneeAcceptMatch, doneeRejectMatch, donorConfirmMatch,
  pauseItemListing, resumeItemListing, withdrawItemListing, deleteMyListing,
  getMyDonationOffers, reconfirmOfferAvailability, withdrawOffer, getOffersForMyRequests, doneeReviewOffer, confirmNoIssue,
  reopenItemRequest, cancelItemRequest, deleteItemRequestDraft, hideWithdrawnRequest,
  getOfferCancellationOptions, type CancellationOption,
  type ItemListing, type ItemRequest, type ItemMatch, type UserProfile, type DonationOffer
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { MyTasksCard } from "@/components/MyTasksCard";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Award, HandCoins, Loader2, Package, Pencil, Plus, ShieldCheck, X, Check,
  User, MapPin, Calendar, CircleDot, EyeOff, Info, ExternalLink, RefreshCw,
  Phone, Mail, Handshake, CheckCircle2, Heart, AlertTriangle, ThumbsUp, ThumbsDown, Truck,
  ChevronDown, History, MessageCircle, Trash2
} from "lucide-react";
import { DashboardSkeleton, PageSkeleton } from "@/components/skeletons";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { canDeleteDraft, canWithdrawRequest, canHideWithdrawnRequest, isRequestActive } from "@/lib/requestActions";
import { getRequestFulfilment, groupRequestsByFulfilment, offerDeliveredQuantity, type RequestFulfilment } from "@/lib/requestFulfilment";
import { canDeleteListing, canWithdrawListing, canPauseListing, canResumeListing } from "@/lib/listingActions";
import { CancelOfferDialog } from "@/components/CancelOfferDialog";
import { ClosedOfferCard } from "@/components/ClosedOfferCard";
import { displayReason, missingInfoLines } from "@/lib/rejectionReason";
import { motion, AnimatePresence } from "framer-motion";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { Reveal } from "@/components/Reveal";
import { ListingDetailPanel } from "@/components/ListingDetailPanel";
import MatchChatPopup from "@/components/MatchChatPopup";
import { OfferJourney, donorJourneyIndex } from "@/components/OfferJourney";

// Once both parties accept, scheduling/confirmation/chat all live on the
// Handover Hub page instead of inline dashboard forms.
const HANDOVER_HUB_STATUSES = new Set([
  "BOTH_PARTIES_ACCEPTED", "LOGISTICS_CONFIRMED", "TRANSPORT_DISCUSSION",
  "ARRANGEMENT_AGREED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT",
  "DELIVERY_ATTEMPTED", "DELIVERED_PENDING_CONFIRMATION",
]);

/**
 * Initials for the avatar. Tolerates a missing name: UserProfile types
 * `fullName` as a string, but the column is nullable and a Google sign-in that
 * never completed the profile step has none — and `name.trim()` on that took
 * the entire dashboard down with it, not just the avatar.
 */
function getInitials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
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
    MATCH_IN_PROGRESS: { label: "Match In Progress", variant: "secondary" },
    FULFILMENT_IN_PROGRESS: { label: "Fulfilment In Progress", variant: "secondary" },
    PARTIALLY_MATCHED: { label: "Partially Matched", variant: "secondary" },
    PARTIALLY_FULFILLED: { label: "Partially Fulfilled", variant: "secondary" },
    ON_HOLD: { label: "On Hold", variant: "outline" },
    FULLY_FULFILLED: { label: "Completed", variant: "default" },
    FULFILLED: { label: "Completed", variant: "default" },
    EXPIRED: { label: "Expired", variant: "outline" },
    REJECTED: { label: "Rejected", variant: "destructive" },
    CANCELLED: { label: "Withdrawn", variant: "outline" },
  };
  return map[status] ?? { label: status, variant: "outline" as const };
}

// Which destructive actions apply to which status now lives in one pure module
// (src/lib/requestActions.ts) so the rule can be read and tested on its own —
// see its doc comment for why. It mirrors ItemRequestService's own sets.

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
      className="h-7 px-2.5 text-2xs font-bold border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
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

/* A destructive request action behind a real confirmation dialog.
 *
 * `busy` lives per instance, so the spinner and the disabled state belong to the
 * one card being acted on — several request cards on screen stay independent.
 * The guard on `busy` inside the handler (not just the disabled attribute) is
 * what actually prevents a double submit, since the dialog's action button can
 * be triggered by keyboard before React re-renders the disabled state.
 *
 * Replaces window.confirm(), which blocked the page, ignored the design system,
 * and couldn't be styled to signal that the action is destructive. */
function ConfirmRequestActionButton({
  label, busyLabel, icon, title, description, confirmLabel, cancelLabel, onConfirm, successMessage, errorMessage,
}: {
  label: string;
  busyLabel: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => Promise<unknown>;
  successMessage: string;
  errorMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
      toast.success(successMessage);
    } catch (e) {
      // Leave the card exactly as it was — the caller only refreshes on success.
      setOpen(false);
      toast.error(e instanceof Error ? e.message : errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => setOpen(true)}
        className="h-7 px-2.5 text-2xs font-bold border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
      >
        {busy
          ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {busyLabel}</>
          : <>{icon} {label}</>}
      </Button>

      <AlertDialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => { e.preventDefault(); run(); }}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              {busy ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {busyLabel}</> : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* Withdraw my own request — works at any stage short of completion, including
 * mid-handover. Cancels any live match/offer against it and notifies the donor,
 * same as the backend's cancelRequest(). */
function CancelRequestButton({ requestId, onCancelled }: { requestId: number; onCancelled: () => void }) {
  return (
    <ConfirmRequestActionButton
      label="Withdraw"
      busyLabel="Withdrawing"
      icon={<X className="w-3 h-3 mr-1" />}
      title="Withdraw this request?"
      description="Verification and donor matching will stop. If a donor is already matched or mid-handover, they'll be notified and released."
      confirmLabel="Withdraw request"
      cancelLabel="Keep request"
      successMessage="Request withdrawn"
      errorMessage="Could not withdraw request"
      onConfirm={async () => { await cancelItemRequest(requestId); onCancelled(); }}
    />
  );
}

/* Clear a withdrawn request off the donee's own dashboard.
 *
 * Worded as "removed from your dashboard" rather than "deleted", because that is
 * what actually happens — the row, its history, and any offers or matches against
 * it survive for admins. Saying "deleted" would be a promise the backend
 * deliberately doesn't keep. */
function HideWithdrawnRequestButton({ requestId, onHidden }: { requestId: number; onHidden: () => void }) {
  return (
    <ConfirmRequestActionButton
      label="Delete"
      busyLabel="Removing"
      icon={<Trash2 className="w-3 h-3 mr-1" />}
      title="Delete this withdrawn request?"
      description="This request will be removed from your dashboard. CauseKind may retain its history for safety, support, and auditing."
      confirmLabel="Delete request"
      cancelLabel="Keep request"
      successMessage="Withdrawn request removed."
      errorMessage="Could not remove this request — please try again"
      onConfirm={async () => { await hideWithdrawnRequest(requestId); onHidden(); }}
    />
  );
}

/* Permanently delete an unsubmitted draft. Separate from withdrawal by design:
 * a draft was never seen by anyone, so there's no audit trail to preserve and
 * nothing to notify — see ItemRequestService.deleteDraftRequest(). */
function DeleteDraftButton({ requestId, onDeleted }: { requestId: number; onDeleted: () => void }) {
  return (
    <ConfirmRequestActionButton
      label="Delete draft"
      busyLabel="Deleting"
      icon={<Trash2 className="w-3 h-3 mr-1" />}
      title="Delete this draft?"
      description="This draft has not been submitted. Deleting it will permanently remove the saved request."
      confirmLabel="Delete draft"
      cancelLabel="Keep draft"
      successMessage="Draft deleted"
      errorMessage="Could not delete draft"
      onConfirm={async () => { await deleteItemRequestDraft(requestId); onDeleted(); }}
    />
  );
}

/* The donee pipeline, drawn: every request travels Posted -> Verified -> Matched ->
   Received. The rail pulses at the current station and breaks (red) where a
   rejection or expiry stopped it — the structure IS the status explanation. */
const JOURNEY_STATIONS = ["Posted", "Verified", "Matched", "Received"];

function journeyStage(status: string, fulfilment: RequestFulfilment): { stage: number; state: "draft" | "active" | "done" | "broken" } {
  const { isPartiallyFulfilled } = fulfilment;
  if (status === "DRAFT") return { stage: 0, state: "draft" };
  if (status === "REJECTED") return { stage: 1, state: "broken" };
  // With part of it already received, the road broke at the final station, not
  // back at matching — the Partial station it passed stays lit.
  if (status === "EXPIRED" || status === "CANCELLED") return { stage: isPartiallyFulfilled ? 4 : 2, state: "broken" };
  if (["PENDING_VERIFICATION", "ON_HOLD"].includes(status)) return { stage: 1, state: "active" };
  // Status or counters — the counters can say "all received" before the status flips.
  if (fulfilment.isFullyFulfilled) return { stage: 3, state: "done" };
  if (isPartiallyFulfilled) {
    if (["RESERVED", "MATCH_IN_PROGRESS", "FULFILMENT_IN_PROGRESS"].includes(status)) return { stage: 4, state: "active" };
    return { stage: 3, state: "done" }; // Sitting at "Partial" done, waiting for more
  }
  if (["RESERVED", "MATCH_IN_PROGRESS", "FULFILMENT_IN_PROGRESS", "PARTIALLY_MATCHED", "PARTIALLY_FULFILLED"].includes(status)) return { stage: 3, state: "active" };
  return { stage: 2, state: "active" }; // all matching-phase statuses
}

function JourneyRail({ status, fulfilment }: { status: string; fulfilment: RequestFulfilment }) {
  const { stage, state } = journeyStage(status, fulfilment);
  const stations = fulfilment.isPartiallyFulfilled
    ? ["Posted", "Verified", "Matched", "Partial", "Received"]
    : JOURNEY_STATIONS;

  return (
    <div className="flex items-start mt-4 max-w-md">
      {stations.map((label, i) => {
        const reached = i < stage || (i === stage && state === "done");
        const current = i === stage && state !== "done";
        const brokenHere = current && state === "broken";
        const isLast = i === stations.length - 1;
        
        return (
          <div key={label} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <span className={`relative flex items-center justify-center w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                brokenHere ? "border-red-500 bg-red-500" :
                reached ? (isLast ? "border-emerald-500 bg-emerald-500" : "border-[#1e3a60] bg-[#1e3a60] dark:border-blue-400 dark:bg-blue-400") :
                current ? "border-[#1e3a60] dark:border-blue-400 bg-white dark:bg-zinc-900" :
                "border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"}`}>
                {current && !brokenHere && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#1e3a60]/40 dark:bg-blue-400/40 animate-ping motion-reduce:hidden" />
                )}
                {brokenHere && <X className="w-2 h-2 text-white" strokeWidth={4} />}
              </span>
              <span className={`text-4xs font-bold uppercase tracking-wider ${
                brokenHere ? "text-red-500" : reached || current ? "text-stone-600 dark:text-stone-300" : "text-stone-300 dark:text-zinc-600"}`}>
                {label}
              </span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-[2px] mx-1.5 mt-1.5 rounded-full ${
                i < stage ? "bg-[#1e3a60] dark:bg-blue-400" : "bg-stone-200 dark:bg-zinc-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DoneeRequestRow({ request: r, index, onCancelled }: { request: ItemRequest; index: number; onCancelled: () => void }) {
  const fulfilment = getRequestFulfilment(r);
  // "Partially fulfilled" and "Remaining" both promise more is on the way, which
  // is only true while the request is open. A withdrawn or expired one keeps its
  // own badge, with the count beside it recording how far it got.
  const awaitingMore = isRequestActive(r.status) && fulfilment.isPartiallyFulfilled;
  // Fully received reads as fulfilled even when the status lags behind the counters —
  // and there's nothing left to withdraw.
  const badge = fulfilment.isFullyFulfilled
    ? { label: "Fulfilled", variant: "default" as const }
    : awaitingMore
      ? { label: "Partially Fulfilled", variant: "secondary" as const }
      : getRequestStatusBadge(r.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.45, delay: 0.08 * index }}
      className="border-b border-stone-200/70 dark:border-zinc-800 py-3.5 sm:py-5 group overflow-hidden"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug group-hover:text-[#1e3a60] dark:group-hover:text-blue-400 transition-colors"
            style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
            <TranslatedText text={r.title} />
          </p>
          <div className="text-xs text-stone-400 mt-1 flex flex-wrap gap-2 items-center">
            <span><TranslatedText text={r.category} /></span>
            <span>&middot;</span>
            <span className={`font-semibold ${fulfilment.fulfilled > 0 ? "text-[var(--ck-role-accent)]" : "text-stone-600 dark:text-stone-300"}`}>
              {fulfilment.fulfilled} / {fulfilment.requested}
            </span>
            {awaitingMore && (
              <>
                <span>&middot;</span>
                <span className="font-semibold text-stone-600 dark:text-stone-300">Remaining: {fulfilment.remaining}</span>
              </>
            )}
            <span>&middot;</span>
            <span className="capitalize">{r.urgency.toLowerCase()} urgency</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={badge.variant} className="text-3xs whitespace-nowrap">{badge.label}</Badge>
          {r.status === "REJECTED" && <FixResubmitButton requestId={r.id} />}
          {canDeleteDraft(r.status) && (
            <>
              <NewRequestLink href={`/requests/new?draftId=${r.id}`}
                className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#1e3a60]/30 dark:border-blue-400/40 text-2xs font-bold text-[#1e3a60] dark:text-blue-400 hover:bg-[#1e3a60]/5 dark:hover:bg-blue-400/10 transition-colors">
                <Pencil className="w-3 h-3" /> Continue editing
              </NewRequestLink>
              <DeleteDraftButton requestId={r.id} onDeleted={onCancelled} />
            </>
          )}
          {canWithdrawRequest(r.status) && !fulfilment.isFullyFulfilled && <CancelRequestButton requestId={r.id} onCancelled={onCancelled} />}
          {canHideWithdrawnRequest(r.status) && <HideWithdrawnRequestButton requestId={r.id} onHidden={onCancelled} />}
        </div>
      </div>
      <JourneyRail status={r.status} fulfilment={fulfilment} />
      {r.status === "REJECTED" && r.rejectionReason && (
        <p className="text-2xs text-red-600 dark:text-red-400 mt-2.5 line-clamp-2 leading-snug max-w-xl">{displayReason(r.rejectionReason)}</p>
      )}
      {r.status === "DRAFT" && (
        <p className="text-2xs text-stone-400 mt-2.5">Saved as a draft &mdash; continue where you left off and submit when ready.</p>
      )}
    </motion.div>
  );
}

/* One compact line per request on the admin's Donee tab: status badge, how much
   has arrived, and the actions a pending or closed request can still take. */
function CompactRequestRow({ request: r }: { request: ItemRequest }) {
  const badge = getRequestStatusBadge(r.status);
  const { fulfilled, requested } = getRequestFulfilment(r);
  return (
    <div className="pt-3 first:pt-0 flex items-start justify-between gap-3 group p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-all">
      <div>
        <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[var(--ck-role-accent)] transition-colors"><TranslatedText text={r.title} /></p>
        <div className="flex flex-wrap gap-2 items-center text-xs text-stone-400 mt-1">
          <span><TranslatedText text={r.category} /></span>
          <span>•</span>
          <span>{fulfilled > 0 ? `${fulfilled} / ${requested} received` : `Qty: ${requested}`}</span>
          <span>•</span>
          <span className="capitalize">{r.urgency.toLowerCase()} urgency</span>
        </div>
        {r.status === "REJECTED" && r.rejectionReason && (
          <p className="text-2xs text-red-600 dark:text-red-400 mt-1 line-clamp-2 leading-snug">{displayReason(r.rejectionReason)}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <Badge variant={badge.variant} className="text-3xs whitespace-nowrap">
          {badge.label}
        </Badge>
        {r.status === "REJECTED" && <FixResubmitButton requestId={r.id} />}
        {r.status === "DRAFT" && (
          <NewRequestLink href={`/requests/new?draftId=${r.id}`}
            className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[var(--ck-role-accent)]/30 text-2xs font-bold text-[var(--ck-role-accent)] hover:bg-[var(--ck-role-accent)]/5 transition-colors">
            <Pencil className="w-3 h-3" /> Continue editing
          </NewRequestLink>
        )}
      </div>
    </div>
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
  onCancelled = () => {},
}: {
  offer: DonationOffer;
  onReconfirm: (id: number) => void;
  onWithdraw: (id: number, reason: string) => void;
  /** Refetch after a cancellation so the card and counters update. */
  onCancelled?: () => void;
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
    <div className={`rounded-xl sm:rounded-2xl border ${style.badge} p-3 sm:p-4 space-y-3`}>
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
          <div className="relative h-10 sm:h-12 w-10 sm:w-12 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-zinc-800">
            <Image src={offer.media[0].mediaUrl} alt="" fill className="object-cover" />
          </div>
        )}
      </div>

      {/* Explanation — suppressed when the journey below will render its own
          stage-specific nowText for this status, which said the same thing in
          more detail directly underneath. Terminal offers, unmapped statuses and
          rejections have no journey, so they still need this. */}
      {meta.explanation && (isTerminal || donorJourneyIndex(offer.status) < 0) && (
        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">{meta.explanation}</p>
      )}

      {/* Rejection reason */}
      {offer.rejectionReason && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-400">
          {/* Never the raw value: an admin typed "." and this rendered "Reason: ." */}
          <span className="font-semibold">Reason: </span>
          {offer.displayRejectionReason ?? displayReason(offer.rejectionReason)}
        </div>
      )}

      {/* Post-rejection next steps — shown only for ADMIN_REJECTED */}
      {offer.status === "ADMIN_REJECTED" && (
        <div className="rounded-xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 p-3 space-y-2">
          <p className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wide">What you can do next</p>
          <div className="space-y-1.5">
            <Link href={`/requests`}
              className="flex items-start gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 hover:border-[var(--ck-role-accent)] transition-colors">
              <span className="text-sm">🔍</span>
              <div>
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">Offer to a different request</p>
                <p className="text-3xs text-stone-400">Browse all verified requests and find a better match for your item.</p>
              </div>
            </Link>
            <Link href={`/items/new`}
              className="flex items-start gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 hover:border-[var(--ck-role-accent)] transition-colors">
              <span className="text-sm">📦</span>
              <div>
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">List the item as a general listing</p>
                <p className="text-3xs text-stone-400">Let the system find any suitable recipient automatically.</p>
              </div>
            </Link>
            <Link href={`/requests/${offer.requestId}/offer`}
              className="flex items-start gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 hover:border-[var(--ck-role-accent)] transition-colors">
              <span className="text-sm">✏️</span>
              <div>
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">Re-offer with updated details</p>
                <p className="text-3xs text-stone-400">Address the rejection reason and submit a fresh offer for the same request.</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Two-level progress: a compact rail here, the labelled seven-step
          journey behind a bottom sheet. Replaces seven 9px truncated labels
          that were unreadable at card width on a phone. */}
      {!isTerminal && <OfferJourney status={offer.status} />}

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
            {/* Was a window.prompt containing a numbered list the donor had to
                retype — unstructured, unstyled and unvalidatable. The reason now
                comes from the same dialog every other cancellation uses. */}
            <ReconfirmDeclineButton offerId={offer.id} onCancelled={onCancelled} />
          </div>
        ) : null
      )}

      {/* Primary action and the exit share one row.
          `empty:hidden` because either side can be absent — a status with no
          action, or a listing the server says cannot be cancelled — and an empty
          flex row would still eat a space-y gap.

          The exit path is rendered from the server's own policy rather than a
          hardcoded status list. Deliberately a visible secondary action, not
          buried in a menu: at ADMIN_APPROVED the donor previously had NO way out
          at all — "Go to Handover Hub" was the only control on the card. */}
      <div className="flex items-stretch gap-2 empty:hidden">
        {meta.action !== "reconfirm" && actionHref && (
          <Link
            href={actionHref}
            className={`flex-1 min-w-0 truncate rounded-xl py-2 text-center text-xs font-semibold transition-colors ${
              meta.severity === "success"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : meta.severity === "warning"
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-[var(--ck-role-accent)] hover:bg-[var(--ck-role-hover)] text-white"
            }`}
          >
            {meta.actionLabel}
          </Link>
        )}
        <OfferCancelAction offerId={offer.id} onCancelled={onCancelled} />
      </div>
    </div>
  );
}

/** "Item is no longer available" on a reconfirmation prompt — same dialog, red styling. */
function ReconfirmDeclineButton({ offerId, onCancelled }: { offerId: number; onCancelled: () => void }) {
  const [option, setOption] = useState<CancellationOption | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    getOfferCancellationOptions(offerId)
      .then((o) => { if (alive) setOption(o); })
      .catch(() => {});
    return () => { alive = false; };
  }, [offerId]);

  if (!option?.allowed) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="w-full rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 py-2 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
      >
        ✕ Item is no longer available
      </button>
      <CancelOfferDialog offerId={offerId} option={option} open={dialogOpen}
        onOpenChange={setDialogOpen} onCancelled={onCancelled} />
    </>
  );
}

/**
 * Asks the backend what this participant may do, then renders it. Silent when
 * there is no exit (already terminal) or when the honest route is a dispute —
 * a completed donation is not something to offer a "cancel" button for.
 */
function OfferCancelAction({ offerId, onCancelled }: { offerId: number; onCancelled: () => void }) {
  const [option, setOption] = useState<CancellationOption | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    getOfferCancellationOptions(offerId)
      .then((o) => { if (alive) setOption(o); })
      .catch(() => { /* no control rather than a broken one */ });
    return () => { alive = false; };
  }, [offerId]);

  if (!option?.allowed || option.outcome === "HIDE") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        // Sized by the flex row it now sits in, not w-full — it shares a line
        // with the primary action. flex-1 still fills the row when it is alone.
        className="flex-1 min-w-0 truncate rounded-xl border border-red-200 bg-white py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
      >
        {option.actionLabel}
      </button>
      <CancelOfferDialog
        offerId={offerId}
        option={option}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCancelled={onCancelled}
      />
    </>
  );
}

function DonorOfferSection({ offers, onReconfirm, onWithdraw, onCancelled = () => {} }: {
  offers: DonationOffer[];
  onReconfirm: (id: number) => void;
  onWithdraw: (id: number, reason: string) => void;
  onCancelled?: () => void;
}) {
  // Every bucket is derived from ONE list. It used to be two: `active` excluded
  // WITHDRAWN/CANCELLED/COMPLETED while `terminal` also listed ADMIN_REJECTED and
  // DONEE_DECLINED — so a rejected offer fell through into both, rendering once
  // expanded under In Progress and again inside Closed. Deriving both from the
  // same constant makes that class of bug unrepresentable.
  const terminal = offers.filter(o => TERMINAL_OFFER_STATUSES.includes(o.status));
  const completed = offers.filter(o => o.status === "COMPLETED");
  const active = offers.filter(isLiveDonorOffer);
  // Derived from `active`, so closed offers can never reach Action Required —
  // and neither can COMPLETED, which belongs in donation history, not a to-do.
  const needsAction = active.filter(o => OFFER_NEEDS_DONOR.includes(o.status));

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-black text-stone-800 dark:text-stone-100">Donation Offers</h2>
          <p className="text-xs text-stone-400">Offers you made to fulfil specific requests</p>
        </div>
        {offers.length > 0 && (
          <Link href="/offers" className="text-xs font-semibold text-[var(--ck-role-accent)] hover:underline">View all</Link>
        )}
      </div>

      {/* Its own tab now, so an empty list needs somewhere to go — returning
          null left the donor on a blank panel with no way back to the board. */}
      {offers.length === 0 && (
        <div className="py-8 sm:py-12 text-center space-y-2">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ck-role-accent)]/10">
            <Heart className="h-5 w-5 text-[var(--ck-role-accent)]" />
          </div>
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">You haven&apos;t offered anything yet</p>
          <p className="mx-auto max-w-[280px] text-xs text-stone-400">
            Browse verified needs and offer an item against one — every offer you make is tracked here.
          </p>
          <Link href="/requests" className="inline-block pt-1">
            <Button size="sm" className="bg-[var(--ck-role-accent)] text-white">Browse needs</Button>
          </Link>
        </div>
      )}

      {/* Needs action — shown first and highlighted */}
      {needsAction.length > 0 && (
        <div className="space-y-3">
          <p className="text-3xs font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Action Required
          </p>
          {needsAction.map(o => (
            <OfferStageCard key={o.id} offer={o} onReconfirm={onReconfirm} onWithdraw={onWithdraw} onCancelled={onCancelled} />
          ))}
        </div>
      )}

      {/* In-progress (no action needed from donor) */}
      {active.filter(o => !needsAction.includes(o)).length > 0 && (
        <div className="space-y-3">
          {needsAction.length > 0 && (
            <p className="text-3xs font-black uppercase tracking-wider text-stone-400">In Progress</p>
          )}
          {active.filter(o => !needsAction.includes(o)).map(o => (
            <OfferStageCard key={o.id} offer={o} onReconfirm={onReconfirm} onWithdraw={onWithdraw} onCancelled={onCancelled} />
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <p className="text-3xs font-black uppercase tracking-wider text-stone-400">Completed</p>
          {completed.map(o => (
            <OfferStageCard key={o.id} offer={o} onReconfirm={onReconfirm} onWithdraw={onWithdraw} onCancelled={onCancelled} />
          ))}
        </div>
      )}

      {/* Terminal / Closed */}
      {terminal.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-3xs font-black uppercase tracking-wider text-stone-400 flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            Closed ({terminal.length})
          </summary>
          <div className="mt-2 space-y-2">
            {/* Compact summaries, not full stage cards: these are finished, and a
                finished offer must not compete for attention with a live one. */}
            {terminal.map(o => (
              <ClosedOfferCard key={o.id} offer={o} onChanged={onCancelled} />
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

/** Still in flight for the donor. The Offers tab counts exactly what its
 *  Action Required / In Progress lists render, so the two can't disagree. */
const isLiveDonorOffer = (o: DonationOffer) =>
  !TERMINAL_OFFER_STATUSES.includes(o.status) && o.status !== "COMPLETED";

// A completed donation stays among the live offers while the donee can still
// report a problem with it — the backend allows that until a grace period after
// the issue window, so at least 7 days past completion — then joins the history.
const COMPLETED_OFFER_LIVE_MS = 7 * 24 * 60 * 60 * 1000;

const offerEndedAt = (o: DonationOffer) => new Date(o.closedAt ?? o.createdAt).getTime();

function isPastOffer(o: DonationOffer, now: number): boolean {
  if (TERMINAL_OFFER_STATUSES.includes(o.status)) return true;
  return o.status === "COMPLETED" && now - offerEndedAt(o) > COMPLETED_OFFER_LIVE_MS;
}

function pastOfferLabel(status: string): { label: string; tone: string } {
  switch (status) {
    case "COMPLETED":      return { label: "Completed",    tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" };
    case "ADMIN_REJECTED": return { label: "Not approved", tone: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" };
    case "DONEE_DECLINED": return { label: "You declined", tone: "bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-stone-400" };
    default:               return { label: "Withdrawn",    tone: "bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-stone-400" };
  }
}

const shortDate = (ms: number) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/* Fewer arrived than the donor offered — say so, and point at the report, while
   there's still time to use it. The count confirmed is what the request is
   credited with, so a shortfall is the donee's to raise, not ours to guess. */
function ShortDeliveryNote({ offer }: { offer: DonationOffer }) {
  const offered = offer.itemDetails?.quantity;
  const received = offer.receivedQuantity;
  if (offered == null || received == null || received >= offered) return null;
  return (
    <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        You received {received} of the {offered} offered. If items are missing,{" "}
        <Link href={`/offers/${offer.id}/issues`} className="font-semibold underline underline-offset-2">report an issue</Link>
        {" "}so our team can follow up with the donor.
      </span>
    </p>
  );
}

/* The collapsible "history" row both the Offers and Matches tabs end with. */
function HistoryToggle({ label, count, open, onToggle }: {
  label: string; count: number; open: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-600 dark:hover:bg-zinc-800 dark:hover:text-stone-300"
    >
      <History className="h-3.5 w-3.5" />
      {label} ({count})
      <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

function PastOffersStrip({ offers, activeRequestIds, defaultOpen = false }: {
  offers: DonationOffer[];
  activeRequestIds: Set<number>;
  /** Open straight away when there is nothing live above it to look at. */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Group by request, most recently finished first within each group
  const groups = new Map<number, DonationOffer[]>();
  for (const o of [...offers].sort((a, b) => offerEndedAt(b) - offerEndedAt(a))) {
    const g = groups.get(o.requestId);
    if (g) g.push(o); else groups.set(o.requestId, [o]);
  }
  // The "stays open to other donors" note is for offers that fell through, not
  // for donations that were delivered.
  const someRequestStillOpen = offers.some(o => o.status !== "COMPLETED" && !activeRequestIds.has(o.requestId));

  return (
    <div className="border-t border-stone-100 dark:border-zinc-800 pt-3">
      <HistoryToggle label="Offer history" count={offers.length} open={open} onToggle={() => setOpen(v => !v)} />

      {open && (
        <div className="mt-2 space-y-3">
          {[...groups.entries()].map(([requestId, group]) => (
            <div key={requestId} className="rounded-xl border border-stone-100 dark:border-zinc-800 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-700 dark:text-stone-300">{group[0].requestTitle}</p>
                {group.length > 1 && (
                  <span className="flex-shrink-0 text-3xs font-semibold text-stone-400">{group.length} offers</span>
                )}
              </div>
              <div className="mt-1.5 space-y-1">
                {group.map(o => {
                  const { label, tone } = pastOfferLabel(o.status);
                  return (
                    <div key={o.id} className="flex items-baseline gap-2 text-xs">
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-3xs font-semibold ${tone}`}>{label}</span>
                      <span className="flex-shrink-0 text-3xs text-stone-400">{shortDate(offerEndedAt(o))}</span>
                      {o.status === "COMPLETED" && o.itemDetails && (
                        <span className="min-w-0 truncate text-stone-500 dark:text-stone-400">
                          {offerDeliveredQuantity(o)}× from {o.donorName || "a donor"}
                        </span>
                      )}
                      {o.rejectionReason && (
                        <span className="min-w-0 truncate text-stone-400 dark:text-stone-500"
                          title={o.displayRejectionReason ?? displayReason(o.rejectionReason)}>
                          {o.displayRejectionReason ?? displayReason(o.rejectionReason)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {someRequestStillOpen && (
            <p className="px-2 text-2xs leading-relaxed text-stone-400">
              These requests remain open to other donors — you&apos;ll be notified the moment a new offer arrives.{" "}
              <Link href="/requests" className="font-semibold text-[var(--ck-role-accent)] hover:underline">Browse donors offering to help →</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Match history — the Matches tab's counterpart to the offer history ──────
/** Matches with nothing left to do: delivered, or ended without a delivery. */
const MATCH_HISTORY_STATUSES = new Set(["FULFILLED", "COMPLETED", "CANCELLED", "REJECTED", "FAILED", "DONOR_REJECTED"]);
const MATCH_RECEIVED_STATUSES = new Set(["FULFILLED", "COMPLETED"]);

/** Whose dashboard the history is on — the same match reads differently per side. */
type MatchViewer = "DONOR" | "DONEE";

function pastMatchLabel(status: string, viewer: MatchViewer): { label: string; tone: string } {
  const quiet = "bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-stone-400";
  switch (status) {
    case "FULFILLED":
    case "COMPLETED":      return { label: viewer === "DONOR" ? "Delivered" : "Received",
                                    tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" };
    case "DONOR_REJECTED": return { label: viewer === "DONOR" ? "You declined" : "Donor declined", tone: quiet };
    case "REJECTED":       return { label: "Not approved",    tone: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" };
    case "FAILED":         return { label: "Delivery failed", tone: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" };
    // Includes the donee's own decline — doneeReject() records it as CANCELLED.
    default:               return { label: "Cancelled",       tone: quiet };
  }
}

/** When the match ended — receipt for a delivered one, else when it closed. */
const matchEndedAt = (m: ItemMatch) =>
  new Date((MATCH_RECEIVED_STATUSES.has(m.status) ? m.doneeConfirmedAt : null) ?? m.closedAt ?? m.createdAt).getTime();

function PastMatchesStrip({ matches, viewer = "DONEE", defaultOpen = false }: {
  matches: ItemMatch[];
  viewer?: MatchViewer;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sorted = [...matches].sort((a, b) => matchEndedAt(b) - matchEndedAt(a));

  // Nothing finished yet — a "Match history (0)" toggle is just noise.
  if (matches.length === 0) return null;

  return (
    <div className="border-t border-stone-100 dark:border-zinc-800 pt-3 mt-4">
      <HistoryToggle label="Match history" count={matches.length} open={open} onToggle={() => setOpen(v => !v)} />
      {open && (
        <div className="mt-2 space-y-2">
          {sorted.map(m => {
            const { label, tone } = pastMatchLabel(m.status, viewer);
            const received = MATCH_RECEIVED_STATUSES.has(m.status) ? (m.doneeConfirmedQty ?? m.allocatedQuantity) : null;
            return (
              <div key={m.id} className="rounded-xl border border-stone-100 dark:border-zinc-800 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-700 dark:text-stone-300">
                    <TranslatedText text={matchItemLabel(m)} />
                  </p>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-3xs font-semibold ${tone}`}>{label}</span>
                </div>
                <p className="mt-1 truncate text-2xs text-stone-400">
                  For: <TranslatedText text={m.requestTitle || (viewer === "DONOR" ? "a request" : "your request")} />
                  {(viewer === "DONOR" ? m.doneeName : m.donorName) && <> &middot; {viewer === "DONOR" ? m.doneeName : m.donorName}</>}
                  {" "}&middot; {shortDate(matchEndedAt(m))}
                  {received != null && received > 0 && <> &middot; {received} {viewer === "DONOR" ? "delivered" : "received"}</>}
                </p>
                {m.rejectionReason && !MATCH_RECEIVED_STATUSES.has(m.status) && (
                  <p className="mt-1 line-clamp-2 text-2xs text-stone-400 dark:text-stone-500">{displayReason(m.rejectionReason)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Donee dashboard sections ─────────────────────────────────────────────────
// Offers, requests and matches each get a tab instead of sharing one long page,
// so what's waiting on the donee isn't buried under what isn't. The choice rides
// in the URL hash (#offers / #requests / #matches) so a reload, the back link
// from History, or a deep link lands on the same section.

type DoneeSection = "offers" | "requests" | "matches";
const DONEE_SECTIONS: readonly string[] = ["offers", "requests", "matches"];
const isDoneeSection = (s: string): s is DoneeSection => DONEE_SECTIONS.includes(s);

/** Offers waiting on the donee: review one, or close its issue window. */
const OFFER_NEEDS_DONEE = new Set(["PENDING_DONEE_REVIEW", "ISSUE_WINDOW_OPEN"]);
/** Matches waiting on the donee: accept one, or confirm it arrived. */
const MATCH_NEEDS_DONEE = new Set(["AWAITING_DONEE_CONFIRMATION", "DELIVERED_PENDING_CONFIRMATION"]);

/**
 * What to call the item a match is for.
 *
 * <p>A DONATE_TO_REQUEST match has no listing — the donor offered straight from
 * the request page, so `listingTitle` is null on every one of them. The donor's
 * row read "Matched with item:" and then nothing at all; the other rows fell
 * back to the generic "Matched item" when the donor had in fact written a
 * description, which is the only thing that flow records about the item.
 */
function matchItemLabel(m: ItemMatch, fallback = "Matched item"): string {
  return m.listingTitle || m.donorItemDescription || fallback;
}

/**
 * Which side of a match the signed-in user is on.
 *
 * <p>By id, never by display name. `getMyMatches` returns both sides' matches
 * and the dashboard splits them itself; it used to compare `m.donorName` with
 * the profile's `fullName`, which put another Ravi Kumar's match on this Ravi
 * Kumar's donor tab — with a "Confirm Donation" button on it — and, when both
 * the profile name and the match's name were null, put the same match on both
 * tabs at once. `donorId` and `doneeId` are always populated on MatchResponse,
 * unlike the emails, which the list endpoint withholds.
 */
function matchSide(m: ItemMatch, me: UserProfile | null): "DONOR" | "DONEE" | null {
  if (!me) return null;
  if (m.donorId != null && m.donorId === me.id) return "DONOR";
  if (m.doneeId != null && m.doneeId === me.id) return "DONEE";
  return null;
}

// ── Donor dashboard sections ─────────────────────────────────────────────────
// The same one-at-a-time treatment for the donor side: offers made, private
// inventory, match opportunities. Hash keys are #offers / #items / #matches.

type DonorSection = "offers" | "items" | "matches";
const DONOR_SECTIONS: readonly string[] = ["offers", "items", "matches"];
const isDonorSection = (s: string): s is DonorSection => DONOR_SECTIONS.includes(s);

/** Offers waiting on the donor: finish a draft, answer a question, reconfirm. */
const OFFER_NEEDS_DONOR = ["DRAFT", "NEEDS_INFORMATION", "DONOR_RECONFIRMATION_REQUIRED", "DONEE_ACCEPTED", "ADMIN_APPROVED"];
/** Matches waiting on the donor: confirm the donation before it can move. */
const MATCH_NEEDS_DONOR = new Set(["DONOR_REVIEW"]);

function SectionTab({ value, icon: Icon, label, shortLabel, count, attention, tour }: {
  value: DoneeSection | DonorSection;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** For phones — three full labels don't fit at 375px. */
  shortLabel: string;
  count: number;
  /** Something in this section is waiting on this user. */
  attention: boolean;
  /** Product-tour anchor — the sections themselves unmount when not selected. */
  tour: string;
}) {
  return (
    <TabsTrigger
      value={value}
      data-tour={tour}
      className="group relative flex h-auto min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold text-stone-500 transition-colors hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a60]/40 dark:text-stone-400 dark:hover:text-stone-200 dark:focus-visible:ring-blue-400/50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm data-[state=active]:bg-[#1e3a60] data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:bg-blue-500/25 dark:data-[state=active]:text-blue-50"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
      <span className="truncate sm:hidden">{shortLabel}</span>
      <span className="hidden truncate sm:inline">{label}</span>
      <span className="shrink-0 rounded-full bg-stone-100 px-1.5 py-px text-3xs font-bold tabular-nums text-stone-500 dark:bg-zinc-800 dark:text-stone-400 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
        {count}
      </span>
      {attention && (
        <>
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          <span className="sr-only">(needs your attention)</span>
        </>
      )}
    </TabsTrigger>
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
  // Floating match chat — same thread as the Handover Hub, popped over the dashboard
  const [chatMatch, setChatMatch] = useState<ItemMatch | null>(null);
  // Offers load after the rest of the dashboard; the default tab waits for them,
  // since an offer awaiting review is what decides it.
  const [offersLoaded, setOffersLoaded] = useState(false);
  // Read once, so rows don't hop between "live" and "history" mid-visit.
  const [now] = useState(() => Date.now());
  // Null until the donee picks a tab (or arrives with one in the URL hash).
  const [chosenSection, setChosenSection] = useState<DoneeSection | null>(null);

  useEffect(() => {
    getOffersForMyRequests().then(setIncomingOffers).catch(() => {}).finally(() => setOffersLoaded(true));
    const fromHash = window.location.hash.slice(1);
    if (isDoneeSection(fromHash)) setChosenSection(fromHash);
  }, []);

  // The parent refetches requests and matches on these events; offers are this
  // component's own, and were fetched once — a new offer only showed on reload.
  useEntityUpdates(["OFFER", "HANDOVER"], () => {
    getOffersForMyRequests().then(setIncomingOffers).catch(() => {});
  });

  function selectSection(next: DoneeSection) {
    setChosenSection(next);
    // Replace, not push: switching tabs shouldn't fill the back button's history.
    window.history.replaceState(null, "", `#${next}`);
  }

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

  // Each request lands in exactly one group. Fully received ones leave the
  // dashboard for the History page; the rest are listed below by how much arrived.
  const requestGroups = groupRequestsByFulfilment(itemRequests);
  // "On the road" means we are actively working the request. CANCELLED and
  // FULLY_FULFILLED were missing here, so a withdrawn or completed request still
  // told the donee we were "scanning donor inventories" for it.
  const activeRequests = [...requestGroups.pending, ...requestGroups.partial];
  const fulfilledRequests = requestGroups.fulfilled;
  // COMPLETED and DONOR_REJECTED were missing here, so a delivered or declined
  // match still counted as "active" and never left the list.
  const activeMatches = doneeMatches.filter(m => !MATCH_HISTORY_STATUSES.has(m.status));
  const pastMatches = doneeMatches.filter(m => MATCH_HISTORY_STATUSES.has(m.status));
  const activeOffers = incomingOffers.filter(o => !isPastOffer(o, now));
  const pastOffers = incomingOffers.filter(o => isPastOffer(o, now));
  const offersNeedYou = activeOffers.some(o => OFFER_NEEDS_DONEE.has(o.status));
  const matchesNeedYou = activeMatches.some(m => MATCH_NEEDS_DONEE.has(m.status));
  // Open on whatever is waiting on the donee; otherwise on their requests. Empty
  // until offers have loaded, so the tab doesn't jump once they arrive.
  const section: DoneeSection | "" = chosenSection
    ?? (!offersLoaded ? "" : offersNeedYou ? "offers" : matchesNeedYou ? "matches" : "requests");
  // True only when the backend matching engine is actually working on something:
  // a request past admin verification, in the matching phase.
  const hasRequestInMatching = itemRequests.some(r =>
    ["VERIFIED_PRIVATE_MATCHING", "POTENTIAL_MATCH_FOUND", "AWAITING_MATCH_APPROVAL",
     "PUBLICATION_CONSENT_REQUIRED", "PUBLIC_REQUEST", "PARTIALLY_MATCHED"].includes(r.status)
  );

  return (
    /* Bottom padding is derived from --ck-bottom-chrome (float + safe-area inset
       + dock height) rather than a fixed pb-16, which was shorter than the dock
       on a notched phone and left the last card clipped. It computes to 0 at lg:,
       where there is no dock. */
    <div className="min-h-screen bg-[#eef3f9] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 pb-[calc(var(--ck-bottom-chrome)+1.5rem)]">

      {/* ── Hero header — ink/blue theme ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0d1e36] via-[#1e3a60] to-[#0a2040] text-white py-7 sm:py-12 px-4 shadow-lg">
        <div className="pointer-events-none absolute -top-20 right-0 w-96 h-96 rounded-full bg-[var(--ck-role-highlight)]/6 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--ck-role-highlight)]/25 to-transparent" />

        <div className="mx-auto max-w-5xl relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="space-y-3 min-w-0">
              <div className="inline-flex items-center gap-1.5 bg-[var(--ck-role-highlight)]/15 border border-[var(--ck-role-highlight)]/30 rounded-full px-2.5 py-0.5 text-2xs sm:px-3 sm:py-1 sm:text-xs text-[var(--ck-role-highlight)] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Donee
              </div>
              <h1 className="text-xl sm:text-5xl tracking-tight leading-[1.05] font-bold" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
                Namaste, {myProfile.fullName?.split(" ")[0] || user.email.split("@")[0]}.
              </h1>
              <p className="text-white/55 text-sm max-w-md">
                {activeRequests.length > 0
                  ? `${activeRequests.length} request${activeRequests.length !== 1 ? "s" : ""} on the road — we're scanning donor inventories near ${myProfile.city?.split(",")[0] || "you"}.`
                  : "Post your first need and we'll find a verified donor near you."}
              </p>
            </motion.div>
            <NewRequestLink href="/requests/new" data-tour="primary-cta">
              <Button className="bg-[var(--ck-role-highlight)] hover:bg-[#e0a86a] text-stone-950 font-extrabold rounded-xl sm:rounded-2xl px-3.5 sm:px-6 py-2 sm:py-3 h-auto text-sm sm:text-sm flex items-center gap-2 shadow-xl shadow-[var(--ck-role-highlight)]/20 shrink-0">
                <Plus className="w-4 h-4" /> Post a Need
              </Button>
            </NewRequestLink>
          </div>

          {/* Impact ledger — live numbers over hairline rules, no stat cards */}
          <div data-tour="ledger" className="mt-6 sm:mt-10 grid grid-cols-3 border-t border-white/10">
            {[
              { n: itemRequests.length,      label: "needs posted"   },
              { n: activeMatches.length,     label: "active matches" },
              { n: fulfilledRequests.length, label: "needs received" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
                className={`py-3.5 sm:py-5 ${i > 0 ? "border-l border-white/10 pl-3.5 sm:pl-8" : ""}`}>
                <p className="text-xl sm:text-5xl tabular-nums leading-none" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>{stat.n}</p>
                <p className="text-3xs uppercase tracking-[0.22em] text-white/45 mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-5 sm:py-8 space-y-4 sm:space-y-6">

        {/* Anything support has asked this user for. Donees take the early return
            above and never reach the donor branch's copy of this card, so it has
            to be mounted here too — and this is the branch that needs it most,
            since information requests are mostly verification documents and
            proof of need, which are asked of donees. Renders nothing when there
            is nothing outstanding, so it costs the common case no space. */}
        <MyTasksCard />

        {/* ── Identity line ── */}
        <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 border-b border-stone-200/80 dark:border-zinc-800 pb-3 sm:pb-4">
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

        {/* ── Sections: offers, requests, matches — one open at a time ── */}
        <Tabs value={section} onValueChange={(v) => { if (isDoneeSection(v)) selectSection(v); }} className="space-y-4 sm:space-y-6">
          <TabsList
            aria-label="Dashboard sections"
            className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border border-stone-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/70"
          >
            <SectionTab value="offers" icon={Heart} label="Offers Received" shortLabel="Offers"
              count={activeOffers.length} attention={offersNeedYou} tour="offers" />
            <SectionTab value="requests" icon={Package} label="Your Requests" shortLabel="Requests"
              count={activeRequests.length} attention={false} tour="requests-list" />
            <SectionTab value="matches" icon={Handshake} label="Matches" shortLabel="Matches"
              count={activeMatches.length} attention={matchesNeedYou} tour="matches" />
          </TabsList>

          {section === "" && (
            <div className="space-y-3" aria-busy="true" aria-label="Loading your dashboard">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          )}

        {/* ── Incoming Donation Offers (Donor Flow 2) ── */}
        <TabsContent value="offers" className="mt-0">
          <Card className="relative bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--ck-role-accent)]" />
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3 sm:pb-4 relative z-10">
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                <Heart className="w-4 h-4 text-[var(--ck-role-accent)]" /> Donation Offers Received
              </CardTitle>
              {incomingOffers.length > 0 && (
                <Link href="/donee/offers">
                  <Button variant="ghost" size="sm" className="text-xs font-bold text-[var(--ck-role-accent)]">View all</Button>
                </Link>
              )}
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
              {incomingOffers.length === 0 ? (
                <div className="py-8 sm:py-12 text-center space-y-2">
                  <div className="w-11 h-11 bg-[var(--ck-role-accent)]/10 rounded-xl flex items-center justify-center mx-auto">
                    <Heart className="w-5 h-5 text-[var(--ck-role-accent)]" />
                  </div>
                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No donation offers yet</p>
                  <p className="text-xs text-stone-400 max-w-[280px] mx-auto">
                    Once a request is public, donors can offer to fulfil it — you&apos;ll review each offer here.
                  </p>
                </div>
              ) : activeOffers.length === 0 && (
                <p className="py-2 text-center text-xs text-stone-400">
                  No active offers right now — your requests stay visible to donors.
                </p>
              )}
              {activeOffers
                .map(offer => {
                  const isPendingReview = offer.status === "PENDING_DONEE_REVIEW";
                  const isApproved      = offer.status === "ADMIN_APPROVED";
                  const isHandover      = ["HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"].includes(offer.status);
                  const isIssueWindow   = offer.status === "ISSUE_WINDOW_OPEN";
                  const isIssueRaised   = offer.status === "ISSUE_RAISED";
                  const isComplete      = offer.status === "COMPLETED";
                  const isNeedsInfo     = offer.status === "NEEDS_INFORMATION";
                  const isScreening     = ["SUBMITTED", "AI_ELIGIBILITY_SCREENING", "AI_COMPATIBILITY_SCREENING", "COMPATIBILITY_CHECKED"].includes(offer.status);
                  const isWithdrawn     = offer.status === "WITHDRAWN" || offer.status === "CANCELLED" || offer.status === "ADMIN_REJECTED";
                  const statusLabel =
                    isPendingReview ? "Awaiting your review" :
                    isNeedsInfo ? "Waiting on donor to add details" :
                    isScreening ? "AI screening in progress" :
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
                    isPendingReview || isNeedsInfo ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                    isApproved || isComplete || isIssueWindow ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" :
                    isHandover ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                    isIssueRaised ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                    isWithdrawn ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" :
                    "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-stone-400";

                  return (
                    <div key={offer.id} className="rounded-xl sm:rounded-2xl border border-stone-100 dark:border-zinc-800 p-3 sm:p-4 space-y-3">
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
                              <span className="font-semibold text-stone-700 dark:text-stone-300">
                                {offer.receivedQuantity != null
                                  ? `Received ${offer.receivedQuantity} of ${offer.itemDetails.quantity} offered`
                                  : `Offering ${offer.itemDetails.quantity} of the ${offer.requestQuantity} you asked for`}
                              </span>
                              {" · "}{offer.itemDetails.condition ?? "Condition not specified"}
                              {offer.itemDetails.pickupCity ? ` · ${offer.itemDetails.pickupCity}` : ""}
                            </p>
                          )}
                        </div>
                        {offer.media?.[0] && (
                          <div className="relative h-11 sm:h-14 w-11 sm:w-14 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-zinc-800">
                            <Image src={offer.media[0].mediaUrl} alt="" fill className="object-cover" />
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
                          { label: "Offer Received",    sublabel: "Donor submitted their offer",            statuses: ["SUBMITTED", "AI_ELIGIBILITY_SCREENING", "AI_COMPATIBILITY_SCREENING", "COMPATIBILITY_CHECKED", "NEEDS_INFORMATION", "PENDING_DONEE_REVIEW", "SOFT_RESERVED_PRIMARY", "SOFT_RESERVED_BACKUP"] },
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
                                    i === currentIdx ? (isAtRisk ? "bg-amber-500 animate-pulse" : "bg-[var(--ck-role-accent)] animate-pulse") :
                                    "bg-stone-200 dark:bg-zinc-700"
                                  }`}
                                />
                              ))}
                            </div>
                            {/* Stage labels row */}
                            <div className="flex">
                              {stages.map((stage, i) => (
                                <div key={i} className="flex-1 min-w-0">
                                  <div className={`text-4xs font-semibold leading-tight truncate text-center ${
                                    i < currentIdx  ? "text-green-600 dark:text-green-400" :
                                    i === currentIdx ? (isAtRisk ? "text-amber-600 dark:text-amber-400" : "text-[var(--ck-role-accent)]") :
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
                                  <span className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-4xs font-black text-white ${isAtRisk ? "bg-amber-500" : "bg-[var(--ck-role-accent)]"}`}>
                                    {currentIdx + 1}
                                  </span>
                                  <div>
                                    <p className="text-3xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wide">Now · {stages[currentIdx].label}</p>
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
                                  <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-4xs font-black text-stone-400 border border-stone-300 dark:border-zinc-600">
                                    {currentIdx + 2}
                                  </span>
                                  <div>
                                    <p className="text-3xs font-bold text-stone-400 uppercase tracking-wide">Next · {stages[currentIdx + 1].label}</p>
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
                            className="flex-1 rounded-xl bg-[var(--ck-role-accent)] py-2 text-xs font-semibold text-white hover:bg-[var(--ck-role-hover)] transition-colors disabled:opacity-50"
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
                          <ShortDeliveryNote offer={offer} />
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
                          <p className="text-3xs text-stone-400 text-center">Marking complete ends the issue window — you won&apos;t be able to report a problem afterward.</p>
                        </div>
                      )}
                      {isIssueRaised && (
                        <p className="text-center text-xs text-stone-400 dark:text-stone-500">Our team is reviewing your report.</p>
                      )}
                      {isComplete && (
                        <div className="space-y-1.5">
                          <ShortDeliveryNote offer={offer} />
                          <Link href={`/offers/${offer.id}/issues`} className="block w-full rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 py-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
                            Report an issue
                          </Link>
                          <p className="text-3xs text-stone-400 text-center">Noticed a problem with the item? You can still report it for a few days after completion.</p>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Finished offers — slim grouped history instead of full cards:
                  ones that fell through, and donations completed over a week ago */}
              {pastOffers.length > 0 && (
                <PastOffersStrip
                  offers={pastOffers}
                  activeRequestIds={new Set(activeOffers.map(o => o.requestId))}
                  defaultOpen={activeOffers.length === 0}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

          {/* Your requests — each one drawn as a journey down the pipeline */}
          <TabsContent value="requests" className="mt-0">
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#1e3a60]/70 dark:border-blue-400/50 pb-3">
              <div>
                <p className="text-3xs font-black uppercase tracking-[0.24em] text-[#1e3a60] dark:text-blue-400">Your Requests</p>
                <p className="text-xs text-stone-400 mt-1">Every need travels the same road: posted, verified, matched, received.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link href="/dashboard/history" className="text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700">
                  <History className="w-3.5 h-3.5" /> History
                </Link>
                <NewRequestLink href="/requests/new" className="text-xs font-bold text-[#1e3a60] dark:text-blue-400 hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> New need
                </NewRequestLink>
              </div>
            </div>

            {itemRequests.length === 0 ? (
              <div className="py-8 sm:py-14 text-center space-y-3">
                <div className="w-11 sm:w-14 h-11 sm:h-14 bg-[#1e3a60]/10 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto">
                  <Heart className="w-6 h-6 text-[#1e3a60]" />
                </div>
                <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Nothing posted yet</p>
                <p className="text-xs text-stone-400 max-w-[240px] mx-auto">Tell us what you need &mdash; books, clothes, medical supplies &mdash; and we&apos;ll find donors nearby.</p>
                <NewRequestLink href="/requests/new">
                  <Button size="sm" className="bg-[#1e3a60] hover:bg-[#162d4a] text-white mt-2">Post your first need</Button>
                </NewRequestLink>
              </div>
            ) : (
              <div className="space-y-6 mt-4">
                {/* Every request the donee posted is listed here, fulfilled ones
                    included — they used to leave this tab for the History page,
                    which read as the requests having disappeared. */}
                {([
                  ["Pending", requestGroups.pending],
                  ["Partially Fulfilled", requestGroups.partial],
                  ["Fulfilled", requestGroups.fulfilled],
                  ["Closed", requestGroups.closed],
                ] as const).filter(([, group]) => group.length > 0).map(([label, group]) => (
                  <div key={label}>
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">{label}</h4>
                    <AnimatePresence initial={false}>
                      {group.map((r, i) => (
                        <DoneeRequestRow key={r.id} request={r} index={i} onCancelled={onRefresh} />
                      ))}
                    </AnimatePresence>
                  </div>
                ))}

                {/* The per-delivery breakdown (who gave what, when) lives in History. */}
                {fulfilledRequests.length > 0 && (
                  <Link href="/dashboard/history" className="flex items-center gap-2 rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>See who delivered what for your fulfilled request{fulfilledRequests.length !== 1 ? "s" : ""} in History</span>
                    <span className="ml-auto" aria-hidden>&rarr;</span>
                  </Link>
                )}
              </div>
            )}
          </section>
          </TabsContent>

          {/* Matches — live ones first, finished ones in the history below */}
          <TabsContent value="matches" className="mt-0">
          <section>
            <div className="border-b-2 border-[var(--ck-role-accent)]/60 pb-3">
              <p className="text-3xs font-black uppercase tracking-[0.24em] text-[var(--ck-role-accent)]">Matches</p>
              <p className="text-xs text-stone-400 mt-1">Donors whose items matched your requests.</p>
            </div>
            <div className="pt-3.5 sm:pt-5">
              {activeMatches.length === 0 ? (
                /* Truthful empty state: the sweep only spins when the matching engine
                   is actually working (a request is verified and in the matching
                   phase). Drafts/pending requests get honest guidance instead. */
                <div className="py-7 sm:py-12 text-center space-y-3 sm:space-y-4">
                  <div className="relative w-16 sm:w-24 h-16 sm:h-24 mx-auto rounded-full border border-[var(--ck-role-accent)]/20">
                    <div className="absolute inset-3 rounded-full border border-[var(--ck-role-accent)]/15" />
                    <div className="absolute inset-6 rounded-full border border-[var(--ck-role-accent)]/10" />
                    {hasRequestInMatching && (
                      <>
                        <div className="absolute inset-0 rounded-full overflow-hidden motion-reduce:hidden">
                          <div className="absolute inset-0 animate-[spin_3.5s_linear_infinite]"
                            style={{ background: "conic-gradient(from 0deg, rgba(176,74,21,0.30), transparent 70deg)" }} />
                        </div>
                        <div className="absolute top-4 right-6 w-1.5 h-1.5 rounded-full bg-[var(--ck-role-highlight)] animate-pulse motion-reduce:animate-none" />
                      </>
                    )}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--ck-role-accent)]" />
                  </div>
                  {hasRequestInMatching ? (
                    <div>
                      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Scanning donor inventories</p>
                      <p className="text-xs text-stone-400 max-w-[250px] mx-auto mt-1">Your verified request is being matched against donor items &mdash; new listings are checked as they arrive. Matches appear here and we&apos;ll notify you.</p>
                    </div>
                  ) : activeRequests.length > 0 ? (
                    /* activeRequests, not itemRequests — a dashboard whose only
                       request is withdrawn has nothing awaiting verification, so
                       promising that matching is about to start would be untrue. */
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
                  {activeMatches.map(m => {
                    const badge = getFulfilmentStatusBadge(m.status);
                    return (
                      <div key={m.id} className="pt-3 first:pt-0 space-y-2 group px-1 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-all pb-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[var(--ck-role-accent)] transition-colors truncate">
                              <TranslatedText text={matchItemLabel(m)} />
                            </p>
                            <p className="text-xs text-stone-400 mt-0.5 truncate">For: <TranslatedText text={m.requestTitle || ""} /></p>
                          </div>
                          <Badge variant={badge.variant} className="text-3xs whitespace-nowrap shrink-0">{badge.label}</Badge>
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
                          <div className="flex gap-2 pt-1">
                            <Link href={`/matches/${m.id}/handover`} className="flex flex-1 items-center justify-center gap-1.5 bg-[#1e3a60] hover:bg-[#162d4a] text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                              <Truck className="w-3.5 h-3.5" /> Go to Handover Hub
                            </Link>
                            <button
                              onClick={() => setChatMatch(m)}
                              className="flex items-center justify-center gap-1.5 border border-[#1e3a60]/40 text-[#1e3a60] hover:bg-[#1e3a60]/5 dark:text-blue-400 dark:border-blue-400/40 text-xs font-bold py-2 px-3 rounded-lg transition-all"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> Chat
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {pastMatches.length > 0 && (
                <PastMatchesStrip matches={pastMatches} defaultOpen={activeMatches.length === 0} />
              )}
            </div>
          </section>
          </TabsContent>

        </Tabs>

      </div>

      {chatMatch && (
        <MatchChatPopup
          matchId={chatMatch.id}
          partnerName={chatMatch.donorName || "Donor"}
          itemTitle={chatMatch.listingTitle || chatMatch.requestTitle}
          currentUserEmail={user.email}
          accent="navy"
          onClose={() => setChatMatch(null)}
        />
      )}
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
  // Null until the donor picks a section (or arrives with one in the URL hash).
  const [chosenDonorSection, setChosenDonorSection] = useState<DonorSection | null>(null);

  // Listing action state
  const [listingActionLoading, setListingActionLoading] = useState<number | null>(null);
  const [selectedListing, setSelectedListing] = useState<ItemListing | null>(null);

  // Donor review state
  const [declineMatchId, setDeclineMatchId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declineConditionChanged, setDeclineConditionChanged] = useState(false);
  const [reviewLoading, setReviewLoading] = useState<number | null>(null);

  // Floating match chat — same thread as the Handover Hub, popped over the dashboard
  const [chatMatch, setChatMatch] = useState<ItemMatch | null>(null);

  const refreshListings = async () => {
    try { const fresh = await getMyItemListings(); setItemListings(fresh); } catch { /* silent */ }
  };

  const refreshMatches = async () => {
    try { const fresh = await getMyMatches(); setMatches(fresh); } catch { /* silent */ }
  };

  const refreshRequests = async () => {
    try { const fresh = await getMyItemRequests(); setItemRequests(fresh); } catch { /* silent */ }
  };

  /** Refetch after a cancellation — the status changed server-side, and the
   *  cancel endpoint returns the policy result rather than the updated offer. */
  function handleOfferCancelled() {
    getMyDonationOffers().then(setDonationOffers).catch(() => {});
  }

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

  async function handleDeleteListing(id: number) {
    if (!confirm("Delete this listing? It will no longer appear here.")) return;
    setListingActionLoading(id);
    try {
      await deleteMyListing(id);
      setItemListings(prev => prev.filter(l => l.id !== id));
      setSelectedListing(prev => (prev?.id === id ? null : prev));
      toast.success("Listing deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete listing");
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
      rejected.forEach(l => handleDeleteListing(l.id));
    }
  }, [itemListings]); // eslint-disable-line react-hooks/exhaustive-deps

  // A deep link, a reload, or the back button from a handover hub should land on
  // the section it left from — same contract as the donee dashboard's tabs.
  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (isDonorSection(fromHash)) setChosenDonorSection(fromHash);
  }, []);

  function selectDonorSection(next: DonorSection) {
    setChosenDonorSection(next);
    // Replace, not push: switching tabs shouldn't fill the back button's history.
    window.history.replaceState(null, "", `#${next}`);
  }

  const donorMatches = useMemo(
    () => matches.filter(m => matchSide(m, myProfile) === "DONOR"),
    [matches, myProfile],
  );

  const doneeMatches = useMemo(
    () => matches.filter(m => matchSide(m, myProfile) === "DONEE"),
    [matches, myProfile],
  );

  // Same grouping the dedicated donee dashboard uses, for the admin's Donee tab.
  const doneeRequestGroups = useMemo(() => groupRequestsByFulfilment(itemRequests), [itemRequests]);

  // ── What each donor tab holds, and which of them is waiting on the donor ──
  // A finished match stopped being an opportunity, so it leaves the live list
  // for the section's own history strip, exactly as on the donee side.
  const activeDonorMatches = donorMatches.filter(m => !MATCH_HISTORY_STATUSES.has(m.status));
  const pastDonorMatches   = donorMatches.filter(m => MATCH_HISTORY_STATUSES.has(m.status));
  const liveDonorOffers    = donationOffers.filter(isLiveDonorOffer);
  const donorOffersNeedYou = liveDonorOffers.some(o => OFFER_NEEDS_DONOR.includes(o.status));
  const donorMatchesNeedYou = activeDonorMatches.some(m => MATCH_NEEDS_DONOR.has(m.status));
  const donorItemsNeedYou  = itemListings.some(l => l.status === "NEEDS_INFORMATION");
  // Open on whatever is waiting; then on offers for a donor with no inventory
  // yet, since landing them on an empty ledger hides the work they have in play.
  const donorSection: DonorSection = chosenDonorSection
    ?? (donorOffersNeedYou ? "offers"
      : donorMatchesNeedYou ? "matches"
      : donorItemsNeedYou ? "items"
      : itemListings.length === 0 && donationOffers.length > 0 ? "offers"
      : "items");

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) return null;

  if (loading) {
    // Stat tiles and panels in the shape the dashboard actually renders, rather
    // than a spinner in a 400px void that then jumps to a full page.
    return (
      <PageSkeleton>
        <DashboardSkeleton tiles={3} label="Loading your dashboard" />
      </PageSkeleton>
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
        onRefresh={async () => { await refreshMatches(); await refreshRequests(); }}
      />
    );
  }

  return (
    /* Same dock-aware bottom padding as the donee branch above — pb-12 was
       shorter than the dock and clipped the empty-state CTA. */
    <div className="min-h-screen bg-[#f7f4f0] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 pb-[calc(var(--ck-bottom-chrome)+1.5rem)]">
      {/* ── Hero: greeting + live giving ledger ── */}
      <div className="relative overflow-hidden text-white px-4 pt-6 sm:pt-12 shadow-md"
        style={{ background: "linear-gradient(140deg, #1c0905 0%, #3a1d0e 55%, #241206 100%)" }}>
        <div className="pointer-events-none absolute -top-20 right-0 w-96 h-96 rounded-full bg-[var(--ck-role-secondary)]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--ck-role-highlight)]/25 to-transparent" />

        <div className="mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="min-w-0 space-y-3">
              <div className="inline-flex items-center gap-1.5 bg-[var(--ck-role-accent)]/20 border border-[var(--ck-role-accent)]/30 rounded-full px-2.5 py-0.5 text-2xs sm:px-3 sm:py-1 sm:text-xs text-[var(--ck-role-highlight)] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Donor
              </div>
              <h1 className="text-xl sm:text-5xl tracking-tight leading-[1.05] font-bold" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
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
                    className={`px-3 py-1.5 text-3xs font-bold rounded-lg transition-all ${activeTab === "donor" ? "bg-[var(--ck-role-accent)] text-white" : "text-white/60"}`}>
                    Donor
                  </button>
                  <button onClick={() => setActiveTab("donee")}
                    className={`px-3 py-1.5 text-3xs font-bold rounded-lg transition-all ${activeTab === "donee" ? "bg-[var(--ck-role-accent)] text-white" : "text-white/60"}`}>
                    Donee
                  </button>
                </div>
              )}
              {(myProfile?.role === "DONOR" || myProfile?.role === "ADMIN") && (
                <Link href="/items/new" data-tour="primary-cta">
                  <Button className="bg-[var(--ck-role-accent)] hover:bg-[#943e11] text-white font-bold rounded-xl px-3 sm:px-5 py-2 sm:py-2.5 h-auto btn-shine flex items-center gap-1.5 text-sm sm:text-sm">
                    <Plus className="w-4 h-4" /> List Item Privately
                  </Button>
                </Link>
              )}
              {(myProfile?.role === "DONEE" || myProfile?.role === "ADMIN") && (
                <NewRequestLink href="/requests/new">
                  <Button className="bg-[var(--ck-role-highlight)] hover:bg-[#e0a96a] text-stone-950 font-bold rounded-xl px-3 sm:px-5 py-2 sm:py-2.5 h-auto flex items-center gap-1.5 text-sm sm:text-sm">
                    <Plus className="w-4 h-4" /> Post a Need
                  </Button>
                </NewRequestLink>
              )}
            </div>
          </div>

          {/* Giving ledger — live numbers over hairline rules, no stat cards */}
          <div data-tour="ledger" className="mt-6 sm:mt-10 grid grid-cols-3 border-t border-white/10">
            {[
              { n: itemListings.length, label: "items listed" },
              // Same list the Matches tab calls live, so the headline number and
              // the tab's count can't disagree about what "active" means.
              { n: activeDonorMatches.length, label: "active matches" },
              { n: donorMatches.filter(m => ["FULFILLED", "COMPLETED"].includes(m.status)).length, label: "donations completed" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
                className={`py-3.5 sm:py-5 ${i > 0 ? "border-l border-white/10 pl-3.5 sm:pl-8" : ""}`}>
                <p className="text-xl sm:text-5xl tabular-nums leading-none" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>{stat.n}</p>
                <p className="text-3xs uppercase tracking-[0.22em] text-white/45 mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
        <div className="space-y-5 sm:space-y-8">

          {/* Anything support has asked this user for. Renders nothing at all
              when there is nothing outstanding, so it costs the common case
              no space. Placed above the fold because an unanswered request can
              be holding up their own verification. */}
          <MyTasksCard />

          {/* ── Identity line ── */}
          <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 border-b border-stone-200/80 dark:border-zinc-800 pb-3 sm:pb-4">
            <div className="w-9 h-9 rounded-full bg-[var(--ck-role-accent)]/10 dark:bg-zinc-800 flex items-center justify-center font-black text-sm text-[var(--ck-role-accent)] shrink-0">
              {myProfile ? getInitials(myProfile.fullName) : "U"}
            </div>
            <p className="font-bold text-stone-800 dark:text-stone-200 truncate">{myProfile?.fullName || user.email?.split("@")[0]}</p>
            <span className="text-stone-300 dark:text-zinc-700 hidden sm:inline">&middot;</span>
            <p className="truncate hidden sm:block">{user.email}</p>
            {myProfile?.city && (
              <>
                <span className="text-stone-300 dark:text-zinc-700 hidden md:inline">&middot;</span>
                <p className="hidden md:flex items-center gap-1"><MapPin className="w-3 h-3 text-[var(--ck-role-accent)]" />{myProfile.city}</p>
              </>
            )}
            <Link href="/profile" className="ml-auto shrink-0 font-bold text-[var(--ck-role-accent)] hover:underline">Edit profile</Link>
          </div>

          {/* RIGHT: Main Dashboard Content */}
          <div className="space-y-4 sm:space-y-6">
            
            {/* Tab Content */}
            {activeTab === "donor" ? (
              /* DONOR DASHBOARD VIEW — offers, inventory and matches each get a
                 tab, so an offer waiting on the donor isn't scrolled past below
                 a long inventory ledger. Mirrors the donee dashboard's sections. */
              <Tabs
                value={donorSection}
                onValueChange={(v) => { if (isDonorSection(v)) selectDonorSection(v); }}
                className="space-y-4 sm:space-y-6"
              >
                <TabsList
                  aria-label="Dashboard sections"
                  className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border border-stone-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/70"
                >
                  <SectionTab value="offers" icon={Heart} label="Your Offers" shortLabel="Offers"
                    count={liveDonorOffers.length} attention={donorOffersNeedYou} tour="offers" />
                  <SectionTab value="items" icon={Package} label="Your Inventory" shortLabel="Inventory"
                    count={itemListings.length} attention={donorItemsNeedYou} tour="inventory" />
                  <SectionTab value="matches" icon={Handshake} label="Matches" shortLabel="Matches"
                    count={activeDonorMatches.length} attention={donorMatchesNeedYou} tour="matches" />
                </TabsList>

                {/* Donor Flow 2 — Offer Tracker */}
                <TabsContent value="offers" className="mt-0">
                  <section>
                    <div className="border-b-2 border-[var(--ck-role-highlight)]/70 pb-3 mb-4 sm:mb-5">
                      <p className="text-3xs font-black uppercase tracking-[0.24em] text-[var(--ck-role-accent)] dark:text-[var(--ck-role-highlight)]">Your Offers</p>
                      <p className="text-xs text-stone-400 mt-1">Items you offered directly against someone&apos;s request.</p>
                    </div>
                    <DonorOfferSection
                      offers={donationOffers}
                      onReconfirm={handleOfferReconfirm}
                      onWithdraw={handleOfferWithdraw}
                      onCancelled={handleOfferCancelled}
                    />
                  </section>
                </TabsContent>

                {/* Your inventory — private, matched quietly */}
                <TabsContent value="items" className="mt-0">
                  <section>
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[var(--ck-role-accent)]/70 pb-3">
                      <div>
                        <p className="flex items-center gap-2 text-3xs font-black uppercase tracking-[0.24em] text-[var(--ck-role-accent)]">
                          <EyeOff className="w-3.5 h-3.5" /> Your Private Inventory
                        </p>
                        <p className="text-xs text-stone-400 mt-1">Only our matching engine sees these — never other users.</p>
                      </div>
                      <Link href="/items/new" className="text-xs font-bold text-[var(--ck-role-accent)] hover:underline flex items-center gap-1 shrink-0 mb-0.5">
                        <Plus className="w-3.5 h-3.5" /> Add an item
                      </Link>
                    </div>
                    <div className="pt-3 sm:pt-4 space-y-3 sm:space-y-4">
                      {itemListings.length === 0 ? (
                        <div className="py-7 sm:py-12 text-center">
                          <p className="text-sm text-stone-400">You haven&apos;t listed any items to donate yet.</p>
                          <Link href="/items/new" className="inline-block mt-3">
                            <Button size="sm" className="bg-[var(--ck-role-accent)] text-white">List your first item</Button>
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
                                      <p className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 truncate leading-snug" style={{ fontFamily: "var(--font-source-serif-4), serif" }}><TranslatedText text={l.title} /></p>
                                      <div className="flex flex-wrap gap-1.5 items-center text-xs text-stone-400 mt-0.5">
                                        {l.category && <span><TranslatedText text={l.category} /></span>}
                                        {l.city && <><span>·</span><span><TranslatedText text={l.city} /></span></>}
                                        <span>·</span>
                                        <span>Qty: {l.quantity}</span>
                                      </div>
                                    </div>
                                    <span className={`text-3xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${meta.color} ${meta.bg} ${meta.border}`}>
                                      {meta.label}
                                    </span>
                                  </div>
                                </button>

                                <ListingJourneyTracker status={l.status} />

                                {needsInfo && (
                                  <div className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-100 dark:bg-amber-950/20 rounded-lg p-2">
                                    {/* Lines, not the raw `|`-joined missingFlags —
                                        which put an internal identifier and a pipe
                                        in front of a sentence written for the donor. */}
                                    {l.rejectionReason
                                      ? (() => {
                                          const lines = missingInfoLines(l.rejectionReason);
                                          if (lines.length <= 1) {
                                            return <>Still needed: {lines[0] ?? displayReason(l.rejectionReason)}</>;
                                          }
                                          return (
                                            <>
                                              <p>Still needed:</p>
                                              <ul className="mt-1 list-disc space-y-0.5 ps-4 font-normal">
                                                {lines.map(line => <li key={line}>{line}</li>)}
                                              </ul>
                                            </>
                                          );
                                        })()
                                      : "Admin has requested more information. Please update your listing."}
                                  </div>
                                )}

                                {/* A rejected listing showed only a red badge, so the
                                    donor had to open the detail panel to find out why —
                                    or never found out at all. The reason lives on the
                                    same field the needs-info branch already reads. */}
                                {l.status === "REJECTED" && (
                                  <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700 dark:bg-red-950/20 dark:text-red-400">
                                    {l.rejectionReason
                                      ? <>Reason: {displayReason(l.rejectionReason)}</>
                                      : "This listing wasn't approved. Open it for details."}
                                  </div>
                                )}

                                {/* Listing action buttons per spec §7.4 */}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {isDraft && (
                                    // Must carry the draft id: a bare /items/new
                                    // started a brand new wizard and orphaned
                                    // the draft this button belongs to.
                                    <Link href={`/items/new?draft=${l.id}`}>
                                      <span className="text-xs text-[var(--ck-role-accent)] font-bold hover:underline">Continue →</span>
                                    </Link>
                                  )}
                                  {needsInfo && (
                                    <Link href={`/items/${l.id}/edit`}>
                                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors">
                                        Edit &amp; Resubmit →
                                      </span>
                                    </Link>
                                  )}
                                  {canPauseListing(l.status) && (
                                    <button
                                      onClick={() => handleListingAction(l.id, "pause")}
                                      disabled={listingActionLoading === l.id}
                                      className="text-xs text-stone-500 border border-stone-300 rounded-full px-2.5 py-0.5 hover:border-stone-500 hover:text-stone-700 disabled:opacity-50"
                                    >
                                      {listingActionLoading === l.id ? "…" : "Pause"}
                                    </button>
                                  )}
                                  {canResumeListing(l.status) && (
                                    <button
                                      onClick={() => handleListingAction(l.id, "resume")}
                                      disabled={listingActionLoading === l.id}
                                      className="text-xs text-green-700 border border-green-400 rounded-full px-2.5 py-0.5 hover:bg-green-50 disabled:opacity-50"
                                    >
                                      {listingActionLoading === l.id ? "…" : "Resume"}
                                    </button>
                                  )}
                                  {canWithdrawListing(l.status) && (
                                    <button
                                      onClick={() => { if (confirm("Withdraw this listing? This cannot be undone.")) handleListingAction(l.id, "withdraw"); }}
                                      disabled={listingActionLoading === l.id}
                                      className="text-xs text-red-500 border border-red-300 rounded-full px-2.5 py-0.5 hover:bg-red-50 disabled:opacity-50"
                                    >
                                      Withdraw
                                    </button>
                                  )}
                                  {canDeleteListing(l.status) && (
                                    <button
                                      onClick={() => handleDeleteListing(l.id)}
                                      disabled={listingActionLoading === l.id}
                                      className="text-xs text-red-600 border border-red-300 rounded-full px-2.5 py-0.5 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 font-semibold"
                                    >
                                      {listingActionLoading === l.id ? "…" : isDraft ? "Discard draft" : "Delete"}
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
                </TabsContent>

                {/* Donor Matches */}
                <TabsContent value="matches" className="mt-0">
                  <section>
                    <div className="border-b-2 border-emerald-500/60 pb-3">
                      <p className="text-3xs font-black uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-400">Match Opportunities</p>
                      <p className="text-xs text-stone-400 mt-1">Verified needs your items can fulfil.</p>
                    </div>
                    <div className="pt-3.5 sm:pt-5 space-y-3 sm:space-y-4">
                      {activeDonorMatches.length === 0 && pastDonorMatches.length === 0 ? (
                        /* Truthful empty state: the sweep only spins while a listing is
                           live and the engine is actually checking incoming needs. */
                        <div className="py-7 sm:py-12 text-center space-y-3 sm:space-y-4">
                          <div className="relative w-16 sm:w-24 h-16 sm:h-24 mx-auto rounded-full border border-emerald-500/25">
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
                      ) : activeDonorMatches.length === 0 ? (
                        <p className="py-2 text-center text-xs text-stone-400">
                          No live matches right now — your listed items stay in the matching engine.
                        </p>
                      ) : (
                        <div className="divide-y space-y-3 sm:space-y-4">
                          {activeDonorMatches.map((m) => {
                            const badge = getFulfilmentStatusBadge(m.status);
                            const isDonorReview = m.status === "DONOR_REVIEW";
                            const isDeclining = declineMatchId === m.id;
                            return (
                              <div key={m.id} className={`pt-3 sm:pt-4 first:pt-0 space-y-2 group p-2 rounded-xl transition-all ${isDonorReview ? "border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "hover:bg-stone-50 dark:hover:bg-zinc-800/40"}`}>
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
                                    <p className="text-xs text-stone-400 mt-0.5">Matched with item: <TranslatedText text={matchItemLabel(m)} /></p>
                                  </div>
                                  <Badge variant={badge.variant} className="text-3xs whitespace-nowrap">{badge.label}</Badge>
                                </div>
                                <div className="flex flex-wrap justify-between items-center text-xs bg-stone-100/60 dark:bg-zinc-950 p-2.5 rounded-xl gap-2">
                                  <div><p className="text-stone-500">Recipient Donee</p><p className="font-semibold text-stone-700 dark:text-stone-300">{m.doneeName}</p></div>
                                  {m.matchScore && (<div className="text-right"><p className="text-stone-500">AI Score</p><p className="font-bold text-[var(--ck-role-accent)]">{m.matchScore}%</p></div>)}
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
                                        <label className="flex items-center gap-1.5 text-2xs text-stone-500 cursor-pointer select-none">
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
                                  <div className="flex gap-2 pt-1">
                                    <Link href={`/matches/${m.id}/handover`} className="flex flex-1 items-center justify-center gap-1.5 bg-[var(--ck-role-accent)] hover:bg-[var(--ck-role-hover)] text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                      <Truck className="w-3.5 h-3.5" /> Go to Handover Hub
                                    </Link>
                                    <button
                                      onClick={() => setChatMatch(m)}
                                      className="flex items-center justify-center gap-1.5 border border-[var(--ck-role-accent)]/40 text-[var(--ck-role-accent)] hover:bg-[var(--ck-role-accent)]/5 dark:text-[var(--ck-role-secondary)] dark:border-[var(--ck-role-secondary)]/40 text-xs font-bold py-2 px-3 rounded-lg transition-all"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" /> Chat
                                    </button>
                                  </div>
                                )}
                                {m.status === "COMPLETED" && (
                                  <Link href={`/certificate?matchId=${m.id}`} className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                    <Award className="w-3.5 h-3.5" /> View Certificate
                                  </Link>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Delivered, declined and cancelled matches keep their
                          record without competing with the live ones. */}
                      <PastMatchesStrip
                        matches={pastDonorMatches}
                        viewer="DONOR"
                        defaultOpen={activeDonorMatches.length === 0}
                      />
                    </div>
                  </section>
                </TabsContent>
              </Tabs>
            ) : (
              /* DONEE DASHBOARD VIEW */
              <div className="space-y-4 sm:space-y-6">
                
                {/* Stats Row */}
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                  <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--ck-role-accent)]" />
                    <CardContent className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-5">
                      <div className="h-9 sm:h-11 w-9 sm:w-11 rounded-xl bg-[var(--ck-role-soft)] text-[var(--ck-role-accent)] dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Total Needs Posted</p>
                        <p className="text-base sm:text-xl font-bold">{itemRequests.length}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" />
                    <CardContent className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-5">
                      <div className="h-9 sm:h-11 w-9 sm:w-11 rounded-xl bg-green-100 text-green-600 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Fulfilled Needs</p>
                        <p className="text-base sm:text-xl font-bold">{doneeRequestGroups.fulfilled.length}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Donee Requests & Donee Matches Grid */}
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                  
                  {/* Requests list */}
                  <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-full h-[3px] bg-[var(--ck-role-accent)]" />
                    <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none">01</div>
                    <CardHeader className="border-b pb-3 sm:pb-4 mb-4 relative z-10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <CardTitle className="text-sm sm:text-base font-bold">My Needs & Requests</CardTitle>
                        <div className="flex items-center gap-2">
                          <Link href="/dashboard/history" className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors text-xs font-bold text-stone-600 dark:text-stone-300">
                            <History className="w-3.5 h-3.5" /> History
                          </Link>
                          <NewRequestLink href="/requests/new">
                            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-[var(--ck-role-accent)]">
                              <Plus className="w-3.5 h-3.5 mr-1" /> New Need
                            </Button>
                          </NewRequestLink>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 relative z-10">
                      {doneeRequestGroups.pending.length + doneeRequestGroups.partial.length + doneeRequestGroups.closed.length === 0 ? (
                        <div className="py-7 sm:py-12 text-center">
                          <p className="text-sm text-stone-400">
                            {doneeRequestGroups.fulfilled.length > 0
                              ? "Every need you posted has been fulfilled — see History."
                              : <>You haven&apos;t posted any active needs yet.</>}
                          </p>
                          <NewRequestLink href="/requests/new" className="inline-block mt-3">
                            <Button size="sm" className="bg-[var(--ck-role-accent)] text-white">
                              {doneeRequestGroups.fulfilled.length > 0 ? "Post a new need" : "Post your first need"}
                            </Button>
                          </NewRequestLink>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Pending Requests */}
                          {doneeRequestGroups.pending.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 px-2">Pending</h4>
                              <div className="divide-y space-y-3">
                                {doneeRequestGroups.pending.map((r) => <CompactRequestRow key={r.id} request={r} />)}
                              </div>
                            </div>
                          )}

                          {/* Partially Fulfilled Requests */}
                          {doneeRequestGroups.partial.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 px-2">Partially Fulfilled</h4>
                              <div className="divide-y space-y-3">
                                {doneeRequestGroups.partial.map((r) => {
                                  const badge = getRequestStatusBadge(r.status);
                                  const f = getRequestFulfilment(r);
                                  return (
                                    <div key={r.id} className="pt-3 first:pt-0 flex flex-col gap-2 group p-3 rounded-xl border border-[var(--ck-role-accent)]/20 bg-[var(--ck-role-accent)]/5 dark:bg-[var(--ck-role-accent)]/10 hover:bg-[var(--ck-role-accent)]/10 transition-all">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[var(--ck-role-accent)] transition-colors"><TranslatedText text={r.title} /></p>
                                          <p className="text-xs text-stone-500 mt-0.5"><TranslatedText text={r.category} /></p>
                                        </div>
                                        <Badge variant={badge.variant} className="text-3xs whitespace-nowrap">
                                          {badge.label}
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 mt-1">
                                        <div className="bg-white dark:bg-zinc-800 rounded p-1.5 text-center shadow-sm border border-stone-100 dark:border-zinc-700">
                                          <p className="text-[10px] text-stone-500 uppercase tracking-wider">Requested</p>
                                          <p className="font-bold text-sm text-stone-700 dark:text-stone-300">{f.requested}</p>
                                        </div>
                                        <div className="bg-white dark:bg-zinc-800 rounded p-1.5 text-center shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                                          <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Fulfilled</p>
                                          <p className="font-bold text-sm text-emerald-600">{f.fulfilled}</p>
                                        </div>
                                        <div className="bg-[var(--ck-role-accent)] text-white rounded p-1.5 text-center shadow-sm">
                                          <p className="text-[10px] uppercase tracking-wider opacity-90">Remaining</p>
                                          <p className="font-bold text-sm">{f.remaining}</p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Closed Requests — rejected, expired or withdrawn */}
                          {doneeRequestGroups.closed.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 px-2">Closed</h4>
                              <div className="divide-y space-y-3">
                                {doneeRequestGroups.closed.map((r) => <CompactRequestRow key={r.id} request={r} />)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Donee Matches */}
                  <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-full h-[3px] bg-emerald-500" />
                    <div className="absolute right-3 top-3 text-7xl font-black text-stone-100 dark:text-zinc-800/20 select-none pointer-events-none">02</div>
                    <CardHeader className="border-b pb-3 sm:pb-4 mb-4 relative z-10">
                      <CardTitle className="text-sm sm:text-base font-bold">Matches &amp; Handover Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 relative z-10">
                      {doneeMatches.filter(m => m.status !== "FULFILLED" && m.status !== "COMPLETED").length === 0 ? (
                        <div className="py-7 sm:py-12 text-center">
                          <p className="text-sm text-stone-400">No active matches found for your requests yet.</p>
                          <p className="text-xs text-stone-400/80 mt-1">We are actively checking private inventory to find matching items.</p>
                        </div>
                      ) : (
                        <div className="divide-y space-y-3 sm:space-y-4">
                          {doneeMatches.filter(m => m.status !== "FULFILLED" && m.status !== "COMPLETED").map((m) => {
                            const badge = getFulfilmentStatusBadge(m.status);
                            return (
                              <div key={m.id} className="pt-3 sm:pt-4 first:pt-0 space-y-2 group p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-all">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-emerald-550 transition-colors">
                                      Matched item: <TranslatedText text={matchItemLabel(m, "Donated Item")} />
                                    </p>
                                    <p className="text-xs text-stone-400 mt-0.5">For your need: <TranslatedText text={m.requestTitle || ""} /></p>
                                  </div>
                                  <Badge variant={badge.variant} className="text-3xs whitespace-nowrap">{badge.label}</Badge>
                                </div>
                                <div className="flex flex-wrap justify-between items-center text-xs bg-stone-100/60 dark:bg-zinc-950 p-2.5 rounded-xl gap-2">
                                  <div><p className="text-stone-500">Donor</p><p className="font-semibold text-stone-700 dark:text-stone-300">{m.donorName}</p></div>
                                  {m.matchScore && (<div className="text-right"><p className="text-stone-500">AI Score</p><p className="font-bold text-[var(--ck-role-accent)]">{m.matchScore}%</p></div>)}
                                </div>
                                {HANDOVER_HUB_STATUSES.has(m.status) && (
                                  <div className="flex gap-2 pt-1">
                                    <Link href={`/matches/${m.id}/handover`} className="flex flex-1 items-center justify-center gap-1.5 bg-[#1e3a60] hover:bg-[#162d4a] text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                      <Truck className="w-3.5 h-3.5" /> Go to Handover Hub
                                    </Link>
                                    <button
                                      onClick={() => setChatMatch(m)}
                                      className="flex items-center justify-center gap-1.5 border border-[#1e3a60]/40 text-[#1e3a60] hover:bg-[#1e3a60]/5 dark:text-blue-400 dark:border-blue-400/40 text-xs font-bold py-2 px-3 rounded-lg transition-all"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" /> Chat
                                    </button>
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

      {chatMatch && user?.email && (() => {
        // Same id-based split as the lists: naming the wrong person in a chat
        // header is worse than most display bugs, because the user acts on it.
        const iAmDonee = matchSide(chatMatch, myProfile) === "DONEE";
        return (
          <MatchChatPopup
            matchId={chatMatch.id}
            partnerName={(iAmDonee ? chatMatch.donorName : chatMatch.doneeName) || "Match partner"}
            itemTitle={chatMatch.listingTitle || chatMatch.requestTitle}
            currentUserEmail={user.email}
            accent={iAmDonee ? "navy" : "copper"}
            onClose={() => setChatMatch(null)}
          />
        );
      })()}

      <ListingDetailPanel
        listing={selectedListing}
        match={selectedListing ? matches.find(m => m.listingId === selectedListing.id) ?? null : null}
        onClose={() => setSelectedListing(null)}
        onAction={async (id, action) => {
          await handleListingAction(id, action);
          setSelectedListing(null);
        }}
        onDelete={handleDeleteListing}
        actionLoading={listingActionLoading}
      />
    </div>
  );
}
