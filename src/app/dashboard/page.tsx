"use client";

import { driveOfferDonated } from "@/features/ngo-drives/driveCertificate";
import { imageUrlsOf, resolveMediaUrl } from "@/lib/mediaUrl";
import { serverDate } from "@/lib/serverTime";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { WithdrawFlowButton } from "@/components/matches/WithdrawFlowButton";
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
  type ItemListing, type ItemRequest, type ItemMatch, type UserProfile, type DonationOffer,
  getMyNgoDriveOffers, cancelNgoDriveOffer, type NgoDriveOfferResponse
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { MyTasksCard } from "@/components/MyTasksCard";
import { ListingDetailsPanel } from "@/components/listings/ListingDetailsPanel";
import { RequestDetailsPanel } from "@/components/requests/RequestDetailsPanel";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { DriveProofCard, DriveProofCardLoader } from "@/features/ngo-drives/components/DriveProofCard";
import { DonorMatchReviewCard } from "@/components/matches/DonorMatchReviewCard";
import {
  MatchSegmentControl, NgoAcceptedOffersList, acceptedDriveOffers, distributedLine, type AcceptedDriveOffer, type MatchSegment,
} from "@/components/matches/NgoAcceptedOffers";
import { DonorMatchReviewInline } from "@/components/matches/DonorMatchReviewInline";
import { DoneeMatchReviewCard } from "@/components/matches/DoneeMatchReviewCard";
import { DoneeMatchReviewInline } from "@/components/matches/DoneeMatchReviewInline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isNgoRole } from "@/lib/isNgoRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Award, HandCoins, Loader2, Package, PackageCheck, Pencil, Plus, ShieldCheck, X, Check,
  User, MapPin, Calendar, CircleDot, EyeOff, Info, ExternalLink, RefreshCw,
  Phone, Mail, Handshake, CheckCircle2, Heart, AlertTriangle, ThumbsUp, ThumbsDown, Truck,
  ChevronDown, History, MessageCircle, Trash2, Search
} from "lucide-react";
import { DashboardSkeleton, PageSkeleton } from "@/components/skeletons";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { canDeleteDraft, canWithdrawRequest, canHideWithdrawnRequest, isRequestActive } from "@/lib/requestActions";
import { getRequestFulfilment, groupRequestsByFulfilment, offerDeliveredQuantity, type RequestFulfilment } from "@/lib/requestFulfilment";
import { canDeleteListing, canWithdrawListing, canPauseListing, canResumeListing } from "@/lib/listingActions";
import { useCancellationCopy } from "@/lib/cancellationCopy";
import { CancelOfferDialog } from "@/components/CancelOfferDialog";
import { ClosedOfferCard } from "@/components/ClosedOfferCard";
import { displayReason, missingInfoLines } from "@/lib/rejectionReason";
import { motion, AnimatePresence } from "framer-motion";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { Reveal } from "@/components/Reveal";
import { ListingDetailPanel } from "@/components/ListingDetailPanel";
import MatchChatPopup from "@/components/MatchChatPopup";
import { OfferJourney, donorJourneyIndex, buildDonorJourney, useJourneyText } from "@/components/OfferJourney";
import { WithdrawReportedIssue } from "@/components/WithdrawReportedIssue";
import { DoneeOfferCard } from "@/components/donee/DoneeOfferCard";
import { DonorOfferCard } from "@/components/donor/DonorOfferCard";
import { findMatchForListing, isCompletedMatch, getListingCompletionDate } from "@/lib/matchedDonations";
import { formatMatchProximity } from "@/lib/matchDistance";
import {
  filterInventory, inventoryFilterOptions, filterRequests, requestFilterOptions,
  type InventoryFilter, type RequestFilter,
} from "@/lib/dashboardFilters";
import { DashboardFilterChips } from "@/components/DashboardFilterChips";
type NgoDriveOfferCert = Pick<NgoDriveOfferResponse, "proofPublished" | "proofQuantityDistributed" | "proofDistributedOn" | "proofLocation" | "proofNote" | "proofPhotoUrls" | "driveBeneficiariesReached" | "driveBeneficiaryGroup">;

import { UiText, useUiText } from "@/components/UiText";
import { useDashCopy } from "@/lib/dashboardCopy";
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

function listingJourneyStage(status: string): { stage: number; state: "active" | "done" | "broken" } {
  if (status === "DRAFT") return { stage: 0, state: "active" };
  if (status === "SUBMITTED") return { stage: 0, state: "done" };
  if (["AI_SCREENING", "NEEDS_INFORMATION", "MANUAL_REVIEW"].includes(status)) return { stage: 1, state: "active" };
  if (["ELIGIBLE_FOR_MATCHING", "AVAILABLE", "PAUSED"].includes(status)) return { stage: 2, state: "active" };
  if (["SOFT_RESERVED", "RESERVED", "MATCHED", "PARTIALLY_DONATED"].includes(status)) return { stage: 3, state: "active" };
  if (["DONATED", "FULFILLED"].includes(status)) return { stage: 4, state: "done" };
  if (status === "REJECTED") return { stage: 1, state: "broken" };
  if (["EXPIRED", "WITHDRAWN"].includes(status)) return { stage: 2, state: "broken" };
  return { stage: 0, state: "active" };
}

function getListingStatusBadge(status: string) {
  if (status === "DONATED" || status === "FULFILLED") {
    return { label: "Fulfilled", variant: "default" as const, className: "bg-[var(--ck-role-accent)] text-white hover:bg-[var(--ck-role-accent)]" };
  }
  if (status === "ELIGIBLE_FOR_MATCHING" || status === "AVAILABLE") {
    return { label: "Live — Matching", variant: "secondary" as const, className: "" };
  }
  if (status === "PAUSED") {
    return { label: "Paused", variant: "outline" as const, className: "" };
  }
  if (status === "DRAFT") {
    return { label: "Draft", variant: "outline" as const, className: "" };
  }
  if (status === "SUBMITTED" || status === "AI_SCREENING") {
    return { label: "Under Review", variant: "outline" as const, className: "" };
  }
  if (status === "NEEDS_INFORMATION") {
    return { label: "More Info Needed", variant: "outline" as const, className: "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30" };
  }
  if (status === "MANUAL_REVIEW") {
    return { label: "Manual Review", variant: "outline" as const, className: "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30" };
  }
  if (status === "SOFT_RESERVED") {
    return { label: "Soft Reserved", variant: "secondary" as const, className: "" };
  }
  if (status === "MATCHED" || status === "PARTIALLY_DONATED") {
    return { label: status === "MATCHED" ? "Matched" : "Partially Donated", variant: "secondary" as const, className: "" };
  }
  if (status === "REJECTED") {
    return { label: "Rejected", variant: "destructive" as const, className: "" };
  }
  if (status === "WITHDRAWN") {
    return { label: "Withdrawn", variant: "outline" as const, className: "" };
  }
  if (status === "EXPIRED") {
    return { label: "Expired", variant: "outline" as const, className: "" };
  }
  return { label: status, variant: "outline" as const, className: "" };
}

function groupItemListings(listings: ItemListing[]) {
  const drafts: ItemListing[] = [];
  const review: ItemListing[] = [];
  const live: ItemListing[] = [];
  const fulfilled: ItemListing[] = [];
  const closed: ItemListing[] = [];

  for (const l of listings) {
    if (l.status === "DRAFT") {
      drafts.push(l);
    } else if (["SUBMITTED", "AI_SCREENING", "NEEDS_INFORMATION", "MANUAL_REVIEW"].includes(l.status)) {
      review.push(l);
    } else if (["ELIGIBLE_FOR_MATCHING", "AVAILABLE", "SOFT_RESERVED", "MATCHED", "PARTIALLY_DONATED", "PAUSED"].includes(l.status)) {
      live.push(l);
    } else if (["DONATED", "FULFILLED"].includes(l.status)) {
      fulfilled.push(l);
    } else {
      closed.push(l);
    }
  }

  return { drafts, review, live, fulfilled, closed };
}

function WithdrawListingDialog({
  listingId,
  open,
  onOpenChange,
  onConfirmed,
}: {
  listingId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: (id: number) => Promise<void>;
}) {
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const [busy, setBusy] = useState(false);

  async function handleWithdraw() {
    if (!listingId || busy) return;
    setBusy(true);
    try {
      await onConfirmed(listingId);
      onOpenChange(false);
    } catch {
      // toast error handled in onConfirmed
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <AlertDialogContent className="role-scope-donor rounded-2xl sm:rounded-3xl max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base sm:text-lg font-bold">
            <UiText>Withdraw this listing?</UiText>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-stone-500 dark:text-stone-400">
            <UiText>This cannot be undone.</UiText>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
          <AlertDialogCancel disabled={busy} className="rounded-xl">
            <UiText>Cancel</UiText>
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              handleWithdraw();
            }}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white border-0 disabled:opacity-50 font-semibold"
          >
            {busy ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> <UiText>Withdrawing…</UiText>
              </span>
            ) : (
              ui("Withdraw")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Where one of a listing's matches stands, in the donor's words. Shown on the
 * inventory row so the donor can see which need each item is spoken for by
 * without cross-referencing the Matches tab.
 */
function donorMatchStage(status: string): { label: string; tone: "action" | "progress" | "waiting" } {
  if (status === "DONOR_REVIEW") return { label: "Confirm it's available", tone: "action" };
  if (status === "DONEE_ACCEPTED") return { label: "Give final confirmation", tone: "action" };
  if (status === "PENDING_APPROVAL") return { label: "Admin reviewing", tone: "waiting" };
  if (status === "AWAITING_DONEE_CONFIRMATION") return { label: "Waiting on recipient", tone: "waiting" };
  if (status === "DELIVERED_PENDING_CONFIRMATION") return { label: "Delivered — awaiting confirmation", tone: "progress" };
  if (HANDOVER_HUB_STATUSES.has(status)) return { label: "Handover in progress", tone: "progress" };
  return { label: status.replace(/_/g, " ").toLowerCase(), tone: "waiting" };
}

const MATCH_STAGE_TONE: Record<"action" | "progress" | "waiting", string> = {
  action: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-300",
  progress: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-300",
  waiting: "border-stone-200 bg-white text-stone-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-300",
};

function DonorListingRow({
  listing: l,
  index,
  listingActionLoading,
  onAction,
  onWithdrawPrompt,
  onDelete,
  onSelect,
  listingMatches = [],
  onOpenMatches,
  review,
}: {
  listing: ItemListing;
  index: number;
  listingActionLoading: number | null;
  onAction: (id: number, action: "pause" | "resume" | "withdraw") => void;
  onWithdrawPrompt: (id: number) => void;
  onDelete: (id: number) => void;
  onSelect: (l: ItemListing) => void;
  /** This listing's live (non-history) matches, each one a nearby verified need. */
  listingMatches?: ItemMatch[];
  /** Jump to the Matches tab, where accept/decline actually happens. */
  onOpenMatches?: () => void;
  /** A match waiting on the donor, answered inside the card's Matched step. */
  review?: React.ReactNode;
}) {
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const badge = getListingStatusBadge(l.status);
  const isDraft = l.status === "DRAFT";
  const needsInfo = l.status === "NEEDS_INFORMATION";
  const isLive = l.status === "ELIGIBLE_FOR_MATCHING" || l.status === "AVAILABLE";
  // A match being answered in the card's Matched step is not listed again in the strip.
  const stripMatches = review ? listingMatches.filter(m => m.status !== "DONOR_REVIEW") : listingMatches;

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
        <button
          type="button"
          onClick={() => onSelect(l)}
          className="min-w-0 text-left flex-1"
        >
          <p
            className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug group-hover:text-[var(--ck-role-accent)] transition-colors truncate"
            style={{ fontFamily: "var(--font-source-serif-4), serif" }}
          >
            <TranslatedText text={l.title} />
          </p>
          <div className="text-xs text-stone-400 mt-1 flex flex-wrap gap-2 items-center">
            {l.category && <span><TranslatedText text={l.category} /></span>}
            {l.city && <><span><UiText>&middot;</UiText></span><span><TranslatedText text={l.city} /></span></>}
            <span><UiText>&middot;</UiText></span>
            <span>{dt("qtyIs", { qty: l.quantity })}</span>
            {l.condition && <><span><UiText>&middot;</UiText></span><span>{l.condition}</span></>}
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Badge variant={badge.variant} className={`text-3xs whitespace-nowrap ${badge.className}`}>
            {pl(badge.label)}
          </Badge>

          {/* Listing action buttons per spec §7.4 */}
          {isDraft && (
            <Link href={`/items/new?draft=${l.id}`}>
              <span className="text-xs text-[var(--ck-role-accent)] font-bold hover:underline"><UiText>Continue →</UiText></span>
            </Link>
          )}
          {needsInfo && (
            <Link href={`/items/${l.id}/edit`}>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors">
                <UiText>Edit &amp; Resubmit →</UiText>
              </span>
            </Link>
          )}
          {canPauseListing(l.status) && (
            <button
              onClick={() => onAction(l.id, "pause")}
              disabled={listingActionLoading === l.id}
              className="text-xs text-stone-500 border border-stone-300 rounded-full px-2.5 py-0.5 hover:border-stone-500 hover:text-stone-700 disabled:opacity-50"
            >
              {listingActionLoading === l.id ? "…" : ui("Pause")}
            </button>
          )}
          {canResumeListing(l.status) && (
            <button
              onClick={() => onAction(l.id, "resume")}
              disabled={listingActionLoading === l.id}
              className="text-xs text-green-700 border border-green-400 rounded-full px-2.5 py-0.5 hover:bg-green-50 disabled:opacity-50"
            >
              {listingActionLoading === l.id ? "…" : ui("Resume")}
            </button>
          )}
          {canWithdrawListing(l.status) && (
            <button
              onClick={() => onWithdrawPrompt(l.id)}
              disabled={listingActionLoading === l.id}
              className="text-xs text-red-500 border border-red-300 rounded-full px-2.5 py-0.5 hover:bg-red-50 disabled:opacity-50"
            >
              <UiText>Withdraw</UiText>
            </button>
          )}
          {canDeleteListing(l.status) && (
            <button
              onClick={() => onDelete(l.id)}
              disabled={listingActionLoading === l.id}
              className="text-xs text-red-600 border border-red-300 rounded-full px-2.5 py-0.5 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 font-semibold"
            >
              {listingActionLoading === l.id ? "…" : isDraft ? ui("Discard draft") : ui("Delete")}
            </button>
          )}
        </div>
      </div>

      {stripMatches.length > 0 ? (
        <div className="mt-3.5 rounded-xl border border-[var(--ck-role-accent)]/20 bg-gradient-to-br from-[var(--ck-role-accent)]/[0.06] to-transparent p-2.5 sm:p-3 dark:border-[var(--ck-role-accent)]/30 dark:from-[var(--ck-role-accent)]/10">
          <p className="flex items-center gap-1.5 text-3xs font-black uppercase tracking-[0.18em] text-[var(--ck-role-accent)]">
            <Handshake className="w-3.5 h-3.5" />
            {dt("matchedNeeds", { count: stripMatches.length })}
          </p>
          <ul className="mt-2 divide-y divide-stone-200/70 dark:divide-zinc-800">
            {stripMatches.map((m) => {
              const stage = donorMatchStage(m.status);
              const proximity = formatMatchProximity(m);
              const urgent = m.requestUrgency === "CRITICAL" || m.requestUrgency === "HIGH";
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0.5 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-stone-800 dark:text-stone-200">
                      <TranslatedText text={m.requestTitle || ui("A verified need")} />
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-stone-500 dark:text-stone-400">
                      {proximity && (
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-[var(--ck-role-accent)]" />{proximity}
                        </span>
                      )}
                      {m.requestQuantity != null && <span>{dt("needsQty", { count: m.requestQuantity })}</span>}
                      {urgent && (
                        <span className="font-bold text-red-600 dark:text-red-400">
                          {m.requestUrgency === "CRITICAL" ? ui("Critical") : ui("Urgent")}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-3xs font-bold whitespace-nowrap ${MATCH_STAGE_TONE[stage.tone]}`}>
                      {pl(stage.label)}
                    </span>
                    {HANDOVER_HUB_STATUSES.has(m.status) ? (
                      <Link href={`/matches/${m.id}/handover`} className="text-2xs font-bold text-[var(--ck-role-accent)] hover:underline whitespace-nowrap">
                        <UiText>Handover hub →</UiText>
                      </Link>
                    ) : stage.tone === "action" && onOpenMatches ? (
                      <button
                        type="button"
                        id={`listing-${l.id}-review-match-${m.id}`}
                        onClick={onOpenMatches}
                        className="text-2xs font-bold text-[var(--ck-role-accent)] hover:underline whitespace-nowrap"
                      >
                        <UiText>Review →</UiText>
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : isLive && !review ? (
        <p className="mt-3 flex items-center gap-2 text-2xs text-stone-400 dark:text-stone-500">
          <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ck-role-accent)]/60 motion-reduce:hidden" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--ck-role-accent)]" />
          </span>
          <UiText>No matching need nearby yet — we check every new verified request and will notify you.</UiText>
        </p>
      ) : null}

      {needsInfo && (
        <div className="mt-2.5 text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-100 dark:bg-amber-950/20 rounded-lg p-2">
          {l.rejectionReason
            ? (() => {
              const lines = missingInfoLines(l.rejectionReason);
              if (lines.length <= 1) {
                return <><UiText>Still needed:</UiText> {lines[0] ?? displayReason(l.rejectionReason)}</>;
              }
              return (
                <>
                  <p><UiText>Still needed:</UiText></p>
                  <ul className="mt-1 list-disc space-y-0.5 ps-4 font-normal">
                    {lines.map(line => <li key={line}>{line}</li>)}
                  </ul>
                </>
              );
            })()
            : ui("Admin has requested more information. Please update your listing.")}
        </div>
      )}

      {l.status === "REJECTED" && (
        <div className="mt-2.5 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700 dark:bg-red-950/20 dark:text-red-400">
          {l.rejectionReason
            ? <><UiText>Reason:</UiText> {displayReason(l.rejectionReason)}</>
            : ui("This listing wasn't approved. Open it for details.")}
        </div>
      )}

      {/* Always open (owner, 2026-10-09): no Show details toggle. */}
      {!isDraft && <ListingDetailsPanel listing={l} {...listingJourneyStage(l.status)} review={review} />}
    </motion.div>
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
    VERIFIED_PRIVATE_MATCHING: { label: "Finding a donor", variant: "secondary" },
    POTENTIAL_MATCH_FOUND: { label: "Finding a donor", variant: "secondary" },
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
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
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
          toast.success(ui("Request reopened — fix the issues and resubmit"));
          router.push(`/requests/new?draftId=${requestId}`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : ui("Could not reopen request"));
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <><RefreshCw className="w-3 h-3 mr-1" /> <UiText>Fix &amp; Resubmit</UiText></>}
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
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  return (
    <ConfirmRequestActionButton
      label={ui("Withdraw")}
      busyLabel={ui("Withdrawing")}
      icon={<X className="w-3 h-3 mr-1" />}
      title={ui("Withdraw this request?")}
      description={ui("Verification and donor matching will stop. If a donor is already matched or mid-handover, they'll be notified and released.")}
      confirmLabel={ui("Withdraw request")}
      cancelLabel={ui("Keep request")}
      successMessage={ui("Request withdrawn")}
      errorMessage={ui("Could not withdraw request")}
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
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  return (
    <ConfirmRequestActionButton
      label={ui("Delete")}
      busyLabel={ui("Removing")}
      icon={<Trash2 className="w-3 h-3 mr-1" />}
      title={ui("Delete this request?")}
      description={ui("This request will be removed from your dashboard. CauseKind may retain its history for safety, support, and auditing.")}
      confirmLabel={ui("Delete request")}
      cancelLabel={ui("Keep request")}
      successMessage={ui("Request removed from your dashboard.")}
      errorMessage={ui("Could not remove this request — please try again")}
      onConfirm={async () => { await hideWithdrawnRequest(requestId); onHidden(); }}
    />
  );
}

/* Permanently delete an unsubmitted draft. Separate from withdrawal by design:
 * a draft was never seen by anyone, so there's no audit trail to preserve and
 * nothing to notify — see ItemRequestService.deleteDraftRequest(). */
function DeleteDraftButton({ requestId, onDeleted }: { requestId: number; onDeleted: () => void }) {
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  return (
    <ConfirmRequestActionButton
      label={ui("Delete draft")}
      busyLabel={ui("Deleting")}
      icon={<Trash2 className="w-3 h-3 mr-1" />}
      title={ui("Delete this draft?")}
      description={ui("This draft has not been submitted. Deleting it will permanently remove the saved request.")}
      confirmLabel={ui("Delete draft")}
      cancelLabel={ui("Keep draft")}
      successMessage={ui("Draft deleted")}
      errorMessage={ui("Could not delete draft")}
      onConfirm={async () => { await deleteItemRequestDraft(requestId); onDeleted(); }}
    />
  );
}

/* The donee pipeline, drawn: every request travels Posted -> Verified -> Matched ->
   Received. The rail pulses at the current station and breaks (red) where a
   rejection or expiry stopped it — the structure IS the status explanation. */

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

function DoneeRequestRow({ request: r, index, onCancelled, review }: { request: ItemRequest; index: number; onCancelled: () => void; review?: React.ReactNode }) {
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const fulfilment = getRequestFulfilment(r);
  // "Partially fulfilled" and "Remaining" both promise more is on the way, which
  // is only true while the request is open. A withdrawn or expired one keeps its
  // own badge, with the count beside it recording how far it got.
  const awaitingMore = isRequestActive(r.status) && fulfilment.isPartiallyFulfilled;
  // Fully received reads as fulfilled even when the status lags behind the counters —
  // and there's nothing left to withdraw.
  const badge = fulfilment.isFullyFulfilled
    ? { label: ui("Fulfilled"), variant: "default" as const }
    : awaitingMore
      ? { label: ui("Partially Fulfilled"), variant: "secondary" as const }
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
            <span><UiText>&middot;</UiText></span>
            <span className={`font-semibold ${fulfilment.fulfilled > 0 ? "text-[var(--ck-role-accent)]" : "text-stone-600 dark:text-stone-300"}`}>
              {fulfilment.fulfilled} / {fulfilment.requested}
            </span>
            {awaitingMore && (
              <>
                <span><UiText>&middot;</UiText></span>
                <span className="font-semibold text-stone-600 dark:text-stone-300">{dt("remaining", { count: fulfilment.remaining })}</span>
              </>
            )}
            <span><UiText>&middot;</UiText></span>
            <span className="capitalize">{dt("urgencyLevel", { level: dc(r.urgency.charAt(0) + r.urgency.slice(1).toLowerCase()) })}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={badge.variant} className="text-3xs whitespace-nowrap">{pl(badge.label)}</Badge>
          {r.status === "REJECTED" && <FixResubmitButton requestId={r.id} />}
          {canDeleteDraft(r.status) && (
            <>
              <NewRequestLink href={`/requests/new?draftId=${r.id}`}
                className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#1e3a60]/30 dark:border-blue-400/40 text-2xs font-bold text-[#1e3a60] dark:text-blue-400 hover:bg-[#1e3a60]/5 dark:hover:bg-blue-400/10 transition-colors">
                <Pencil className="w-3 h-3" /> <UiText>Continue editing</UiText>
              </NewRequestLink>
              <DeleteDraftButton requestId={r.id} onDeleted={onCancelled} />
            </>
          )}
          {canWithdrawRequest(r.status) && !fulfilment.isFullyFulfilled && <CancelRequestButton requestId={r.id} onCancelled={onCancelled} />}
          {canHideWithdrawnRequest(r.status) && <HideWithdrawnRequestButton requestId={r.id} onHidden={onCancelled} />}
        </div>
      </div>
      {r.status === "REJECTED" && r.rejectionReason && (
        <p className="text-2xs text-red-600 dark:text-red-400 mt-2.5 line-clamp-2 leading-snug max-w-xl">{displayReason(r.rejectionReason)}</p>
      )}
      {r.status === "DRAFT" && (
        <p className="text-2xs text-stone-400 mt-2.5"><UiText>Saved as a draft &mdash; continue where you left off and submit when ready.</UiText></p>
      )}
      {/* Always open, like the donor's listing card (owner, 2026-10-09). */}
      {r.status !== "DRAFT" && (
        <RequestDetailsPanel request={r} {...journeyStage(r.status, fulfilment)}
          partial={fulfilment.isPartiallyFulfilled} fulfilled={fulfilment.fulfilled} requested={fulfilment.requested} review={review} />
      )}
    </motion.div>
  );
}

/* One compact line per request on the admin's Donee tab: status badge, how much
   has arrived, and the actions a pending or closed request can still take. */
function CompactRequestRow({ request: r }: { request: ItemRequest }) {
  const dc = useDashCopy();
  const pl = usePageLabels();
  const dt = useTranslations("dashFlow");
  const badge = getRequestStatusBadge(r.status);
  const { fulfilled, requested } = getRequestFulfilment(r);
  return (
    <div className="pt-3 first:pt-0 flex items-start justify-between gap-3 group p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-all">
      <div>
        <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[var(--ck-role-accent)] transition-colors"><TranslatedText text={r.title} /></p>
        <div className="flex flex-wrap gap-2 items-center text-xs text-stone-400 mt-1">
          <span><TranslatedText text={r.category} /></span>
          <span>•</span>
          <span>{fulfilled > 0 ? dt("slashReceived", { x: fulfilled, y: requested }) : dt("qtyIs", { qty: requested })}</span>
          <span>•</span>
          <span className="capitalize">{dt("urgencyLevel", { level: dc(r.urgency.charAt(0) + r.urgency.slice(1).toLowerCase()) })}</span>
        </div>
        {r.status === "REJECTED" && r.rejectionReason && (
          <p className="text-2xs text-red-600 dark:text-red-400 mt-1 line-clamp-2 leading-snug">{displayReason(r.rejectionReason)}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <Badge variant={badge.variant} className="text-3xs whitespace-nowrap">
          {pl(badge.label)}
        </Badge>
        {r.status === "REJECTED" && <FixResubmitButton requestId={r.id} />}
        {r.status === "DRAFT" && (
          <NewRequestLink href={`/requests/new?draftId=${r.id}`}
            className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[var(--ck-role-accent)]/30 text-2xs font-bold text-[var(--ck-role-accent)] hover:bg-[var(--ck-role-accent)]/5 transition-colors">
            <Pencil className="w-3 h-3" /> <UiText>Continue editing</UiText>
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
  // NGO drive offers: the NGO reviews; the handover starts as soon as it accepts.
  PENDING_NGO_REVIEW:            { label: "NGO Reviewing",            explanation: "The NGO is reviewing your photos and details.", severity: "info" },
  NGO_ACCEPTED:                  { label: "Accepted! Plan Handover",  explanation: "The NGO accepted your offer. Plan the handover now.", action: "handover", actionLabel: "Go to Handover Hub", severity: "warning" },
  NGO_DECLINED:                  { label: "Declined by NGO",          explanation: "The NGO could not use this offer. See the reason below.", action: "browse", actionLabel: "Browse other needs", severity: "error" },
  ENDED:                         { label: "Drive Ended",              explanation: "This drive closed before your offer was handed over.", severity: "neutral" },
  HANDOVER_IN_PROGRESS:          { label: "Handover in Progress",     explanation: "The handover is scheduled. Confirm the OTP when you physically hand over the item.", action: "handover", actionLabel: "Open Handover Hub", severity: "info" },
  HANDOVER_AT_RISK:              { label: "Handover At Risk",         explanation: "The handover has been rescheduled multiple times. Admin review may be required.", action: "handover", actionLabel: "View Handover Hub", severity: "warning" },
  ISSUE_WINDOW_OPEN:             { label: "Issue Window Open",        explanation: "Delivery confirmed! Both parties can report any problems within the issue window.", action: "issues", actionLabel: "Report an issue", severity: "success" },
  ISSUE_RAISED:                  { label: "Issue Under Review",       explanation: "An issue has been reported. Our team is looking into it.", severity: "warning" },
  COMPLETED:                     { label: "Donation Complete!",       explanation: "The donation was successfully completed.", action: "certificate", actionLabel: "View Certificate", severity: "success" },
  CANCELLED:                     { label: "Cancelled",                explanation: "This offer was cancelled.", severity: "neutral" },
  WITHDRAWN:                     { label: "Withdrawn",                explanation: "You withdrew this offer.", severity: "neutral" },
};

const SEVERITY_STYLES = {
  info: { bar: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800", dot: "bg-blue-500" },
  warning: { bar: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800", dot: "bg-amber-500" },
  success: { bar: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800", dot: "bg-green-500" },
  error: { bar: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800", dot: "bg-red-500" },
  neutral: { bar: "bg-stone-300", badge: "bg-stone-50 text-stone-600 border-stone-200 dark:bg-zinc-800 dark:text-stone-400 dark:border-zinc-700", dot: "bg-stone-400" },
};

function OfferStageCard({
  offer,
  onReconfirm,
  onWithdraw,
  onCancelled = () => { },
}: {
  offer: any;
  onReconfirm: (id: number) => void;
  onWithdraw: (id: number, reason: string) => void;
  /** Refetch after a cancellation so the card and counters update. */
  onCancelled?: () => void;
}) {
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
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

  const isTerminal = ["COMPLETED", "CANCELLED", "WITHDRAWN", "ADMIN_REJECTED", "DONEE_DECLINED", "NGO_DECLINED", "ENDED"].includes(offer.status);

  const actionHref = offer._type === "DRIVE_OFFER" ? 
    (meta.action === "edit"        ? `/drives/${offer.driveId}/give` :
     meta.action === "handover"    ? `/ngo-drive-offers/${offer.id}/handover` :
     meta.action === "issues"      ? `/ngo-drive-offers/${offer.id}/handover` :
     meta.action === "certificate" ? `/certificate?offerId=${offer.id}&type=ngo_drive` :
     meta.action === "browse"      ? `/requests` : null)
    : 
    (meta.action === "edit"        ? `/requests/${offer.requestId}/offer` :
     meta.action === "handover"    ? `/offers/${offer.id}/handover` :
     meta.action === "issues"      ? `/offers/${offer.id}/issues` :
     meta.action === "certificate" ? `/certificate?offerId=${offer.id}` :
     meta.action === "browse"      ? `/requests` : null);

  // Request offers that are still moving use the redesigned card (owner-approved
  // canvas "Donor Offer Card", 2026-10-15). Drive offers, finished and rejected
  // offers keep the layout below, which carries their certificate / next-step blocks.
  if (offer._type !== "DRIVE_OFFER" && !isTerminal) {
    return (
      <DonorOfferCard
        offer={offer}
        statusLabel={pl(meta.label)}
        needsYou={OFFER_NEEDS_DONOR.includes(offer.status)}
        explanation={pl(meta.explanation)}
        actionHref={meta.action === "reconfirm" ? null : actionHref}
        actionLabel={pl(meta.actionLabel)}
        onReconfirm={() => onReconfirm(offer.id)}
        noButton={
          <ReconfirmDeclineButton offerId={offer.id} onCancelled={onCancelled}
            label={offer.flowType === "WILL_PURCHASE" ? ui("I can't buy it anymore") : ui("It's no longer available")}
            className="min-h-12 w-full rounded-xl border border-[#D9C8BA] bg-white text-[15px] font-bold text-[#1F1A17] transition-colors hover:bg-stone-50 dark:border-zinc-600 dark:bg-transparent dark:text-stone-200 dark:hover:bg-zinc-700" />
        }
        exit={<OfferCancelAction offerId={offer.id} onCancelled={onCancelled} />}
        extra={offer.status === "ISSUE_RAISED" ? <WithdrawReportedIssue offerId={offer.id} onChanged={onCancelled} /> : undefined}
      />
    );
  }

  const isCompleted = offer.status === "COMPLETED";
  const cardBorderClass = isCompleted
    ? "border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"
    : style.badge;

  return (
    <div className={`rounded-xl sm:rounded-2xl border ${cardBorderClass} p-3 sm:p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {pl(meta.label)}
            </span>
            {offer._type === "DRIVE_OFFER" && (
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {offer.ngoName}
              </span>
            )}
            {offer.flowType && (
              <span className="text-xs text-stone-400">
                {offer.flowType === "ALREADY_OWN" ? ui("Own item") : offer.flowType === "WILL_PURCHASE" ? ui("Will purchase") : ui("Similar item")}
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

      {offer.status === "COMPLETED" ? (
        <div className="space-y-2 pt-1">
          {/* Compact progress bar */}
          <div className="flex gap-0.5">
            {buildDonorJourney("COMPLETED").map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full bg-green-500 transition-all"
              />
            ))}
          </div>
          {/* Stage labels row */}
          <div className="flex">
            {buildDonorJourney("COMPLETED").map((stage, i) => (
              <div key={i} className="flex-1 min-w-0">
                <div className="text-4xs font-semibold leading-tight truncate text-center text-green-600 dark:text-green-400">
                  ✓ {jt(stage.label)}
                </div>
              </div>
            ))}
          </div>
          {/* Current stage explanation info box */}
          <div className="rounded-xl p-3 space-y-2 bg-stone-50 dark:bg-zinc-800 border border-stone-100 dark:border-zinc-700">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-4xs font-black text-white bg-[var(--ck-role-accent)]">
                7
              </span>
              <div>
                <p className="text-3xs font-bold text-[var(--ck-role-accent)] uppercase tracking-wide">
                  <UiText>Now · Complete</UiText>
                </p>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  <UiText>The donation was successfully completed.</UiText>
                </p>
              </div>
            </div>
          </div>
          {/* View Certificate button */}
          <Link
            href={`/certificate?offerId=${offer.id}`}
            className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-green-600 hover:bg-green-700 text-white py-2.5 text-center text-xs font-semibold transition-colors"
          >
            <Award className="w-3.5 h-3.5" /> <UiText>View Certificate</UiText>
          </Link>
        </div>
      ) : (
        <>
          {/* Explanation — suppressed when the journey below will render its own
              stage-specific nowText for this status, which said the same thing in
              more detail directly underneath. Terminal offers, unmapped statuses and
              rejections have no journey, so they still need this. */}
          {meta.explanation && (isTerminal || donorJourneyIndex(offer.status) < 0) && (
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">{pl(meta.explanation)}</p>
          )}

          {/* Rejection reason */}
          {offer.rejectionReason && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              {/* Never the raw value: an admin typed "." and this rendered "Reason: ." */}
              <span className="font-semibold"><UiText>Reason:</UiText> </span>
              {offer.displayRejectionReason ?? displayReason(offer.rejectionReason)}
            </div>
          )}

          {/* Post-rejection next steps — shown only for ADMIN_REJECTED */}
          {offer.status === "ADMIN_REJECTED" && (
            <div className="rounded-xl bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 p-3 space-y-2">
              <p className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wide"><UiText>What you can do next</UiText></p>
              <div className="space-y-1.5">
                <Link href={`/requests`}
                  className="flex items-start gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 hover:border-[var(--ck-role-accent)] transition-colors">
                  <span className="text-sm">🔍</span>
                  <div>
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300"><UiText>Offer to a different request</UiText></p>
                    <p className="text-3xs text-stone-400"><UiText>Browse all verified requests and find a better match for your item.</UiText></p>
                  </div>
                </Link>
                <Link href={`/items/new`}
                  className="flex items-start gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 hover:border-[var(--ck-role-accent)] transition-colors">
                  <span className="text-sm">📦</span>
                  <div>
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300"><UiText>List the item as a general listing</UiText></p>
                    <p className="text-3xs text-stone-400"><UiText>Let the system find any suitable recipient automatically.</UiText></p>
                  </div>
                </Link>
                <Link href={`/requests/${offer.requestId}/offer`}
                  className="flex items-start gap-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 hover:border-[var(--ck-role-accent)] transition-colors">
                  <span className="text-sm">✏️</span>
                  <div>
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300"><UiText>Re-offer with updated details</UiText></p>
                    <p className="text-3xs text-stone-400"><UiText>Address the rejection reason and submit a fresh offer for the same request.</UiText></p>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Two-level progress: a compact rail here, the labelled seven-step
              journey behind a bottom sheet. Replaces seven 9px truncated labels
              that were unreadable at card width on a phone. */}
          {!isTerminal && <OfferJourney status={offer.status} />}
          {offer.status === "ISSUE_RAISED" && <WithdrawReportedIssue offerId={offer.id} onChanged={onCancelled} />}

          {/* Action button */}
          {meta.action && (
            meta.action === "reconfirm" ? (
              <div className="space-y-2">
                <button
                  onClick={() => onReconfirm(offer.id)}
                  className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-2.5 text-xs font-semibold transition-colors"
                >
                  <UiText>✓ Yes, item is still available</UiText>
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
                className={`flex-1 min-w-0 truncate rounded-xl py-2 text-center text-xs font-semibold transition-colors ${meta.severity === "success"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : meta.severity === "warning"
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "bg-[var(--ck-role-accent)] hover:bg-[var(--ck-role-hover)] text-white"
                  }`}
              >
                {pl(meta.actionLabel)}
              </Link>
            )}
                        {offer._type === "DRIVE_OFFER"
              ? <DriveOfferCancelAction offerId={offer.id} status={offer.status} onCancelled={onCancelled} />
              : <OfferCancelAction offerId={offer.id} onCancelled={onCancelled} />}
          </div>
        </>
      )}
    </div>
  );
}

/** Withdraw (before the handover) or cancel (during it) an offer to an NGO drive. */
const DRIVE_OFFER_CANCELLABLE = new Set([
  "DRAFT", "NEEDS_INFORMATION", "SUBMITTED", "AI_ELIGIBILITY_SCREENING", "AI_COMPATIBILITY_SCREENING",
  "PENDING_NGO_REVIEW", "NGO_ACCEPTED", "PENDING_ADMIN_APPROVAL", "ADMIN_APPROVED", "HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK",
]);
function DriveOfferCancelAction({ offerId, status, onCancelled }: { offerId: number; status: string; onCancelled: () => void }) {
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!DRIVE_OFFER_CANCELLABLE.has(status)) return null;
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)}
        className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 dark:border-zinc-700 dark:text-stone-300 dark:hover:bg-zinc-800">
        <UiText>Cancel offer</UiText>
      </button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle><UiText>Cancel your offer to this drive?</UiText></AlertDialogTitle>
          <AlertDialogDescription><UiText>The NGO will be told, and the quantity goes back to the drive for other donors.</UiText></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}><UiText>Keep my offer</UiText></AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={async (e) => {
            e.preventDefault();
            setBusy(true);
            try { await cancelNgoDriveOffer(offerId, "Cancelled by donor"); toast.success(ui("Offer cancelled.")); setOpen(false); onCancelled(); }
            catch (err) { toast.error(err instanceof Error && err.message ? err.message : ui("We couldn't cancel this offer.")); }
            finally { setBusy(false); }
          }}><UiText>Cancel offer</UiText></AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** "Item is no longer available" on a reconfirmation prompt — same dialog, red styling. */
function ReconfirmDeclineButton({ offerId, onCancelled, label, className }: {
  offerId: number; onCancelled: () => void; label?: string; className?: string;
}) {
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const [option, setOption] = useState<CancellationOption | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    getOfferCancellationOptions(offerId)
      .then((o) => { if (alive) setOption(o); })
      .catch(() => { });
    return () => { alive = false; };
  }, [offerId]);

  if (!option?.allowed) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className={className ?? "w-full rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 py-2 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"}
      >
        {label ?? ui("✕ Item is no longer available")}
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
  const copy = useCancellationCopy();
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
        {copy.label(option)}
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

function DonorOfferSection({ offers, onReconfirm, onWithdraw, onCancelled = () => { } }: {
  offers: DonationOffer[];
  onReconfirm: (id: number) => void;
  onWithdraw: (id: number, reason: string) => void;
  onCancelled?: () => void;
}) {
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
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
    <Card className="relative bg-white dark:bg-zinc-900 border-[#EADFD6] dark:border-zinc-800 rounded-[20px] shadow-sm overflow-hidden"
      style={{ fontFamily: "var(--font-nunito), system-ui, sans-serif" }}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-[#F1E8E0] pb-3 sm:pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-[18px] sm:text-[20px] font-extrabold"><UiText>Your donation offers</UiText></CardTitle>
          {needsAction.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3E0] px-2.5 py-1 text-[13px] font-bold text-[#8A4B00]">
              <span aria-hidden className="size-[7px] rounded-full bg-amber-600" />
              {dt("needYou", { count: needsAction.length })}
            </span>
          )}
        </div>
        {offers.length > 0 && (
          <Link href="/offers" className="inline-flex min-h-11 items-center text-[15px] font-bold text-[var(--ck-role-accent)] hover:underline">
            <UiText>View all offers</UiText> <span aria-hidden className="ms-1">›</span>
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
        {/* Its own tab now, so an empty list needs somewhere to go — returning
            null left the donor on a blank panel with no way back to the board. */}
        {offers.length === 0 && (
          <div className="py-8 sm:py-12 text-center space-y-2">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ck-role-accent)]/10">
              <Heart className="h-5 w-5 text-[var(--ck-role-accent)]" />
            </div>
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-400"><UiText>You haven&apos;t offered anything yet</UiText></p>
            <p className="mx-auto max-w-[280px] text-xs text-stone-400">
              <UiText>Browse verified needs and offer an item against one — every offer you make is tracked here.</UiText>
            </p>
            <Link href="/requests" className="inline-block pt-1">
              <Button size="sm" className="bg-[var(--ck-role-accent)] text-white"><UiText>Browse needs</UiText></Button>
            </Link>
          </div>
        )}

        {/* Needs action — shown first and highlighted */}
        {needsAction.length > 0 && (
          <div className="space-y-3">
            {/* Ordered first; the "needs you" count in the header and each card's
                "Your turn" pill replace the old "Action Required" label. */}
            {needsAction.map(o => (
              <OfferStageCard key={o.id} offer={o} onReconfirm={onReconfirm} onWithdraw={onWithdraw} onCancelled={onCancelled} />
            ))}
          </div>
        )}

        {/* In-progress (no action needed from donor) */}
        {active.filter(o => !needsAction.includes(o)).length > 0 && (
          <div className="space-y-3">
            {needsAction.length > 0 && (
              <p className="text-3xs font-black uppercase tracking-wider text-stone-400"><UiText>In Progress</UiText></p>
            )}
            {active.filter(o => !needsAction.includes(o)).map(o => (
              <OfferStageCard key={o.id} offer={o} onReconfirm={onReconfirm} onWithdraw={onWithdraw} onCancelled={onCancelled} />
            ))}
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="space-y-3">
            <p className="text-3xs font-black uppercase tracking-wider text-stone-400"><UiText>Completed</UiText></p>
            {completed.map(o => (
              <DoneRow
                key={o.id}
                title={o.requestTitle ?? ui("Donation")}
                sub={[ui("Completed"), doneDate(o.closedAt ?? o.createdAt), o.requestCity].filter(Boolean).join(" · ")}
                thumb={o.media?.[0]?.mediaUrl}
                href={`/certificate?offerId=${o.id}`}
              />
            ))}
          </div>
        )}

        {/* Terminal / Closed */}
        {terminal.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-3xs font-black uppercase tracking-wider text-stone-400 flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
              {dt("closedCount", { count: terminal.length })}
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
      </CardContent>
    </Card>
  );
}


/**
 * One finished donation as a single slim row (owner, 2026-10-08: History looked
 * too big). Thumbnail, title, when, and a small Certificate link — the full
 * all-green progress card said nothing a finished donation needs to say.
 */
function DoneRow({ title, sub, thumb, href, tag, photos }: {
  title: string;
  sub: string;
  thumb?: string | null;
  href?: string | null;
  /** How the donation happened, e.g. "Your offer" or "Matched for you". */
  tag?: string;
  /** Every photo of the item; the thumbnail opens them (2026-10-08). */
  photos?: string[];
}) {
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const all = (photos?.length ? photos : thumb ? [thumb] : []).filter(Boolean) as string[];
  const [viewing, setViewing] = useState<number | null>(null);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-100 px-3 py-2 dark:border-zinc-800">
      <button
        type="button"
        disabled={!all.length}
        onClick={() => setViewing(0)}
        aria-label={all.length ? dt("viewPhotosOf", { count: all.length, title }) : undefined}
        className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-stone-100 enabled:cursor-zoom-in dark:bg-zinc-800"
      >
        {all[0] ? (
          <Image src={all[0]} alt="" fill sizes="36px" className="object-cover" unoptimized />
        ) : (
          <PackageCheck className="absolute inset-0 m-auto h-4 w-4 text-stone-400" aria-hidden />
        )}
        {all.length > 1 && (
          <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/60 px-1 text-[9px] font-bold leading-tight text-white">{all.length}</span>
        )}
      </button>
      {viewing !== null && all[viewing] && (
        <div
          role="dialog" aria-modal="true" aria-label={dt("photosOf", { title })}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setViewing(null)}
          onKeyDown={e => {
            if (e.key === "Escape") setViewing(null);
            if (e.key === "ArrowRight") setViewing(v => v === null ? v : (v + 1) % all.length);
            if (e.key === "ArrowLeft") setViewing(v => v === null ? v : (v - 1 + all.length) % all.length);
          }}
          tabIndex={-1}
          ref={el => el?.focus()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo URL */}
          <img src={all[viewing]} alt="" className="max-h-[85vh] max-w-[92vw] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button type="button" onClick={() => setViewing(null)} aria-label={ui("Close")}
            className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/25">✕</button>
          {all.length > 1 && (
            <>
              <button type="button" aria-label={ui("Previous photo")}
                onClick={e => { e.stopPropagation(); setViewing(v => v === null ? v : (v - 1 + all.length) % all.length); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-lg font-bold text-white hover:bg-white/25">‹</button>
              <button type="button" aria-label={ui("Next photo")}
                onClick={e => { e.stopPropagation(); setViewing(v => v === null ? v : (v + 1) % all.length); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-lg font-bold text-white hover:bg-white/25">›</button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-semibold text-white/80">{viewing + 1} / {all.length}</span>
            </>
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
          <span className="truncate">{title}</span>
          {tag && (
            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-3xs font-bold text-stone-500 dark:bg-zinc-800 dark:text-stone-400">{tag}</span>
          )}
        </p>
        <p className="truncate text-2xs text-stone-400">{sub}</p>
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400">
          <Award className="h-3 w-3" aria-hidden /> <UiText>Certificate</UiText>
        </Link>
      )}
    </div>
  );
}

const doneDate = (iso?: string | null) => {
  const ms = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(ms) ? "" : new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/**
 * The donor's History card (owner, 2026-10-09): ONE newest-first list of
 * everything that has ended — donated offers and matches, and every offer or
 * match that didn't go ahead (cancelled, withdrawn, declined, not approved,
 * failed), each with its status and reason. Replaces the separate "Didn't go
 * ahead" fold and the Match history strip.
 */
/**
 * An NGO drive offer in History, from the moment the handover completed (code confirmed + first
 * photo, ISSUE_WINDOW_OPEN): "Donated · certificate issued" + Certificate, and "Proof pending" until
 * the NGO's distribution proof is approved; then the same entry shows the proof. One entry per offer.
 */
type DriveDoneLabels = { ngoDrive: string; certificateIssued: string; distributed: (d: AcceptedDriveOffer) => string | null };
function driveDoneEntry(o: DonationOffer, labels: DriveDoneLabels) {
  const d = o as unknown as AcceptedDriveOffer & NgoDriveOfferCert & { closedAt?: string | null; createdAt?: string | null; submittedAt?: string | null; receivedAt?: string | null };
  // The offer carries its own proof once published (freshly signed photos); older servers only flag FULFILLED.
  const published = d.proofPublished === true || d.driveStatus === "FULFILLED";
  const distributed = published ? labels.distributed({ ...d, driveStatus: "FULFILLED" }) : null;
  const proofPhotos = (d.proofPhotoUrls ?? []).map(u => resolveMediaUrl(u)).filter((u): u is string => !!u);
  const when = d.receivedAt ?? d.closedAt ?? d.createdAt ?? d.submittedAt ?? null;
  const photos = imageUrlsOf(o.media as never);
  // TODO later: admin issue ruling + revoke
  const tag = labels.certificateIssued;
  return {
    key: `d${o.id}`,
    at: Date.parse(when ?? "") || 0,
    text: [o.requestTitle, o.requestCity, "donated ngo drive certificate", distributed, "issued"].join(" "),
    node: (
      <div className="space-y-2" data-testid={`history-drive-offer-${o.id}`}>
        <DoneRow title={o.requestTitle ?? labels.ngoDrive} tag={tag}
          sub={distributed ?? [doneDate(when), o.requestCity].filter(Boolean).join(" · ")}
          thumb={photos[0] ?? null} photos={photos}
          href={`/certificate?offerId=${o.id}&type=ngo_drive`} />
        {published && d.proofPublished ? (
          <DriveProofCard proof={{
            ngoName: null, beneficiariesReached: d.driveBeneficiariesReached ?? null, beneficiaryGroup: d.driveBeneficiaryGroup ?? null,
            quantityDistributed: d.proofQuantityDistributed ?? null, itemName: d.driveItemName ?? null, distributedOn: d.proofDistributedOn ?? null,
            location: d.proofLocation ?? null, ngoStatement: d.proofNote ?? null,
            media: proofPhotos.map(u => ({ mediaUrl: u, mediaType: "IMAGE" })),
          } as never} />
        ) : published && d.driveId ? (
          <DriveProofCardLoader driveId={d.driveId} />
        ) : (
          <p data-testid="history-proof-pending" className="text-2xs text-stone-500 dark:text-stone-400">
            Proof pending: the NGO will share photos and details after it distributes the items.{" "}
            <Link href={`/ngo-drive-offers/${o.id}/handover`} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Open handover</Link>
          </p>
        )}
      </div>
    ),
  };
}

function DonorHistorySection({ offers, fulfilledItems, matches, pastMatches, onChanged }: {
  offers: DonationOffer[];
  fulfilledItems: ItemListing[];
  matches: ItemMatch[];
  /** Matches that have ended, delivered or not. */
  pastMatches: ItemMatch[];
  onChanged: () => void;
}) {
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const entries = (() => {
    const driveLabels: DriveDoneLabels = {
      ngoDrive: ui("NGO drive"), certificateIssued: ui("Donated · certificate issued"),
      distributed: (d) => distributedLine(d, (k, v) => dt(k, v), ui("people in need")),
    };
    // Drive offers count as donated once the handover completed (certificate issued then).
    const fromOffers = offers.filter(o => isDriveOffer(o) ? driveOfferDonated(o as never) : o.status === "COMPLETED").map(o => isDriveOffer(o) ? driveDoneEntry(o, driveLabels) : ({
      key: `o${o.id}`,
      at: Date.parse(o.closedAt ?? o.createdAt ?? "") || 0,
      text: [o.requestTitle, o.requestCity, "donated completed your offer"].join(" "),
      node: <DoneRow title={o.requestTitle ?? ui("Donation")} tag={ui("Donated · your offer")}
        sub={[doneDate(o.closedAt ?? o.createdAt), o.requestCity].filter(Boolean).join(" · ")}
        thumb={o.media?.[0]?.mediaUrl ?? null} photos={(o.media ?? []).map(m => m.mediaUrl)}
        href={`/certificate?offerId=${o.id}`} />,
    }));
    const listedIds = new Set(fulfilledItems.map(i => i.id));
    const fromItems = fulfilledItems.map(item => {
      const match = findMatchForListing(item, matches);
      const when = getListingCompletionDate(item, match);
      return {
        key: `l${item.id}`,
        at: Date.parse(when ?? "") || 0,
        text: [item.title, item.category, match?.requestTitle, match?.doneeName, "donated matched"].join(" "),
        node: <DoneRow title={item.title} tag={ui("Donated · matched")}
          sub={[doneDate(when), match?.requestTitle ? dt("forQuotedLower", { title: match.requestTitle }) : ""].filter(Boolean).join(" · ")}
          thumb={item.photoUrls?.[0] || item.imageUrl || (item.imageUrls ? item.imageUrls.split("|")[0] : null)}
          photos={item.photoUrls?.length ? item.photoUrls : (item.imageUrls ? item.imageUrls.split("|") : [])}
          href={isCompletedMatch(match) && match ? `/certificate?matchId=${match.id}` : null} />,
      };
    });
    const fromClosedOffers = offers.filter(o => (isDriveOffer(o) ? DRIVE_TERMINAL_STATUSES : TERMINAL_OFFER_STATUSES).includes(o.status) && o.status !== "COMPLETED"
      && !(isDriveOffer(o) && driveOfferDonated(o as never))).map(o => ({
      key: `c${o.id}`,
      at: Date.parse(o.closedAt ?? o.createdAt ?? "") || 0,
      text: [o.requestTitle, o.requestCity, o.status.replace(/_/g, " "), o.rejectionReason].join(" "),
      node: <ClosedOfferCard offer={o} onChanged={onChanged} />,
    }));
    // A delivered match whose listing already has its own row above is not repeated.
    const fromMatches = pastMatches.filter(m => !(m.listingId != null && listedIds.has(m.listingId))).map(m => ({
      key: `m${m.id}`,
      at: matchEndedAt(m),
      text: [matchItemLabel(m), m.requestTitle, m.doneeName, pastMatchLabel(m.status, "DONOR").label, m.rejectionReason].join(" "),
      node: <PastMatchRow m={m} viewer="DONOR" />,
    }));
    return [...fromOffers, ...fromItems, ...fromClosedOffers, ...fromMatches].sort((a, b) => b.at - a.at);
  })();

  // Search (owner, 2026-10-10): every word must appear in the row's item, request,
  // person, place, status or reason; case-insensitive.
  const [query, setQuery] = useState("");
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = words.length === 0 ? entries
    : entries.filter(e => { const t = e.text.toLowerCase(); return words.every(w => t.includes(w)); });

  return (
    <Card className="relative bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--ck-role-accent)]" />
      <CardHeader className="border-b pb-3 sm:pb-4 relative z-10">
        {/* Title left, search in the right corner; stacks on a phone (owner, 2026-10-10). */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
        <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-[var(--ck-role-accent)]" /> <UiText>Donation history</UiText>
        </CardTitle>
        <p className="text-xs text-stone-400 mt-0.5"><UiText>Everything that has ended — donated, cancelled, withdrawn or declined — newest first</UiText></p>
        </div>
        {entries.length > 0 && (
          <div className="relative w-full shrink-0 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
            <label htmlFor="donor-history-search" className="sr-only"><UiText>Search donation history</UiText></label>
            <input id="donor-history-search" type="search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder={ui("Search by item, request, person or status")}
              className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--ck-role-accent)]/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200" />
          </div>
        )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-3 sm:pt-4">
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500"><UiText>Nothing here yet.</UiText></p>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">
            {dt("nothingMatches", { query: query.trim() })}{" "}
            <button type="button" onClick={() => setQuery("")} className="font-semibold text-[var(--ck-role-accent)] hover:underline"><UiText>Clear search</UiText></button>
          </p>
        ) : (
          shown.map(e => <div key={e.key}>{e.node}</div>)
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The donee's History card (owner, 2026-10-08): everything received, from
 * donors' offers and from matches, in ONE newest-first list, each tagged with
 * how it came. A request filled twice shows twice, with what each delivered.
 * The old split hid any request that also had a completed offer from the
 * matched card, so a match-received item disappeared from history.
 */
function DoneeHistorySection({ offers, matches, onlyOffersClosed, onlyMatchesClosed }: {
  offers: DonationOffer[];
  matches: ItemMatch[];
  /** Offers to the donee that didn't go ahead (not completed). */
  onlyOffersClosed: DonationOffer[];
  /** Matches that ended without delivery. */
  onlyMatchesClosed: ItemMatch[];
}) {
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const rows = (() => {
    const fromOffers = offers.filter(o => o.status === "COMPLETED" || o.status === "ISSUE_WINDOW_OPEN").map(o => {
      const qty = o.receivedQuantity ?? o.itemDetails?.quantity ?? null;
      return {
        key: `o${o.id}`,
        at: Date.parse(o.closedAt ?? o.createdAt ?? "") || 0,
        title: o.requestTitle || ui("Donation"),
        tag: ui("Donor's offer"),
        sub: [ui("Received"), doneDate(o.closedAt ?? o.createdAt), qty != null ? dt("nReceived", { count: qty }) : "", dt("forQuotedLower", { title: o.requestTitle ?? "" })].filter(Boolean).join(" · "),
        thumb: o.media?.[0]?.mediaUrl ?? null,
        photos: (o.media ?? []).map(m => m.mediaUrl),
      };
    });
    const fromMatches = matches.filter(m => MATCH_RECEIVED_STATUSES.has(m.status)).map(m => {
      const qty = m.doneeConfirmedQty ?? m.allocatedQuantity ?? null;
      return {
        key: `m${m.id}`,
        at: Date.parse(m.doneeConfirmedAt ?? m.closedAt ?? m.createdAt ?? "") || 0,
        title: m.listingTitle || m.requestTitle || ui("Donation"),
        tag: ui("Matched for you"),
        sub: [ui("Received"), doneDate(m.doneeConfirmedAt ?? m.closedAt), qty != null ? dt("nReceived", { count: qty }) : "", m.requestTitle ? dt("forQuotedLower", { title: m.requestTitle }) : ""].filter(Boolean).join(" · "),
        thumb: m.listingPhotoUrls?.[0] ?? m.donorImages?.[0] ?? null,
        photos: m.listingPhotoUrls?.length ? m.listingPhotoUrls : (m.donorImages ?? []),
      };
    });
    const received = [...fromOffers, ...fromMatches].map(({ key, at, ...r }) => ({
      key, at, text: [r.title, r.tag, r.sub, "received"].join(" "), node: <DoneRow {...r} />,
    }));
    const closedOffers = onlyOffersClosed.map(o => ({ key: `c${o.id}`, at: offerEndedAt(o),
      text: [o.requestTitle, o.donorName, pastOfferLabel(o.status).label, o.rejectionReason].join(" "),
      node: <PastOfferRow o={o} /> }));
    const closedMatches = onlyMatchesClosed.map(m => ({ key: `x${m.id}`, at: matchEndedAt(m),
      text: [matchItemLabel(m), m.requestTitle, m.donorName, pastMatchLabel(m.status, "DONEE").label, m.rejectionReason].join(" "),
      node: <PastMatchRow m={m} viewer="DONEE" /> }));
    return [...received, ...closedOffers, ...closedMatches].sort((a, b) => b.at - a.at);
  })();

  // Search, same as the donor's History (owner, 2026-10-10): every word must match.
  const [query, setQuery] = useState("");
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = words.length === 0 ? rows
    : rows.filter(e => { const t = e.text.toLowerCase(); return words.every(w => t.includes(w)); });

  return (
    <Card className="relative bg-white dark:bg-zinc-900 border-stone-100 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--ck-role-accent)]" />
      <CardHeader className="border-b pb-3 sm:pb-4 relative z-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-[var(--ck-role-accent)]" /> <UiText>Donations received</UiText>
            </CardTitle>
            <p className="text-xs text-stone-400 mt-0.5"><UiText>Everything received, and every offer or match that didn&apos;t go ahead, newest first</UiText></p>
          </div>
          {rows.length > 0 && (
            <div className="relative w-full shrink-0 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
              <label htmlFor="donee-history-search" className="sr-only"><UiText>Search donations received</UiText></label>
              <input id="donee-history-search" type="search" value={query} onChange={e => setQuery(e.target.value)}
                placeholder={ui("Search by item, request, donor or status")}
                className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[var(--ck-role-accent)]/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-3 sm:pt-4">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500"><UiText>Nothing here yet.</UiText></p>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">
            {dt("nothingMatches", { query: query.trim() })}{" "}
            <button type="button" onClick={() => setQuery("")} className="font-semibold text-[var(--ck-role-accent)] hover:underline"><UiText>Clear search</UiText></button>
          </p>
        ) : (
          shown.map(e => <div key={e.key}>{e.node}</div>)
        )}
      </CardContent>
    </Card>
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

/** Offers to NGO drives travel in the same list, tagged _type "DRIVE_OFFER" (loadAllDonationOffers). */
const isDriveOffer = (o: object) => (o as { _type?: string })._type === "DRIVE_OFFER";
/** A drive offer the NGO has not accepted yet: shown in Your Inventory; once accepted it moves to Matches > NGO. */
const DRIVE_OFFER_PENDING_STATUSES = ["SUBMITTED", "AI_ELIGIBILITY_SCREENING", "AI_COMPATIBILITY_SCREENING", "NEEDS_INFORMATION", "PENDING_NGO_REVIEW"];
/** A drive offer that ended without a handover (History). */
const DRIVE_TERMINAL_STATUSES = ["NGO_DECLINED", "ENDED", "WITHDRAWN", "CANCELLED", "ADMIN_REJECTED"];

// A completed donation stays among the live offers while the donee can still
// report a problem with it — the backend allows that until a grace period after
// the issue window, so at least 7 days past completion — then joins the history.
const COMPLETED_OFFER_LIVE_MS = 7 * 24 * 60 * 60 * 1000;

const offerEndedAt = (o: DonationOffer) => serverDate(o.closedAt ?? o.createdAt).getTime();

function isPastOffer(o: DonationOffer, now: number): boolean {
  if (TERMINAL_OFFER_STATUSES.includes(o.status)) return true;
  return o.status === "COMPLETED" && now - offerEndedAt(o) > COMPLETED_OFFER_LIVE_MS;
}

function pastOfferLabel(status: string): { label: string; tone: string } {
  switch (status) {
    case "COMPLETED": return { label: "Completed", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" };
    case "ADMIN_REJECTED": return { label: "Not approved", tone: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" };
    case "DONEE_DECLINED": return { label: "You declined", tone: "bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-stone-400" };
    default: return { label: "Withdrawn", tone: "bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-stone-400" };
  }
}

const shortDate = (ms: number) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/* Fewer arrived than the donor offered — say so, and point at the report, while
   there's still time to use it. The count confirmed is what the request is
   credited with, so a shortfall is the donee's to raise, not ours to guess. */
function ShortDeliveryNote({ offer }: { offer: DonationOffer }) {
  const dt = useTranslations("dashFlow");
  const offered = offer.itemDetails?.quantity;
  const received = offer.receivedQuantity;
  if (offered == null || received == null || received >= offered) return null;
  return (
    <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        {dt.rich("shortDelivery", { received, offered, report: (chunks) => <Link href={`/offers/${offer.id}/issues`} className="font-semibold underline underline-offset-2">{chunks}</Link> })}
      </span>
    </p>
  );
}

/** One offer to the donee that didn't go ahead, as a history row. */
function PastOfferRow({ o }: { o: DonationOffer }) {
  const ui = useUiText();
  const dt = useTranslations("dashFlow");
  const pl = usePageLabels();
  const dc = useDashCopy();
  const { label, tone } = pastOfferLabel(o.status);
  const reason = o.rejectionReason ? (o.displayRejectionReason ?? displayReason(o.rejectionReason)) : null;
  return (
    <div className="rounded-xl border border-stone-100 dark:border-zinc-800 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-700 dark:text-stone-300">{o.requestTitle}</p>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-3xs font-semibold ${tone}`}>{pl(label)}</span>
      </div>
      <p className="mt-1 truncate text-2xs text-stone-400">
        {o.donorName ? dt("offerFrom", { name: o.donorName }) : ui("Offer")} · {shortDate(offerEndedAt(o))}
      </p>
      {reason && <p className="mt-1 line-clamp-2 text-2xs text-stone-400 dark:text-stone-500" title={reason}>{reason}</p>}
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
    case "COMPLETED": return {
      label: viewer === "DONOR" ? "Delivered" : "Received",
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
    };
    case "DONOR_REJECTED": return { label: viewer === "DONOR" ? "You declined" : "Donor declined", tone: quiet };
    case "REJECTED": return { label: "Not approved", tone: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" };
    case "FAILED": return { label: "Delivery failed", tone: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" };
    // Includes the donee's own decline — doneeReject() records it as CANCELLED.
    default: return { label: "Cancelled", tone: quiet };
  }
}

/** When the match ended — receipt for a delivered one, else when it closed. */
const matchEndedAt = (m: ItemMatch) =>
  new Date((MATCH_RECEIVED_STATUSES.has(m.status) ? m.doneeConfirmedAt : null) ?? m.closedAt ?? m.createdAt).getTime();

/** One finished match as a history row: what, for whom, when, how it ended, why. */
function PastMatchRow({ m, viewer }: { m: ItemMatch; viewer: MatchViewer }) {
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const { label, tone } = pastMatchLabel(m.status, viewer);
  const received = MATCH_RECEIVED_STATUSES.has(m.status) ? (m.doneeConfirmedQty ?? m.allocatedQuantity) : null;
  return (
    <div className="rounded-xl border border-stone-100 dark:border-zinc-800 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-700 dark:text-stone-300">
          <MatchItemText m={m} />
        </p>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-3xs font-semibold ${tone}`}>{pl(label)}</span>
        <WithdrawFlowButton kind="match" id={m.id} role={viewer === "DONOR" ? "DONOR" : "DONEE"} className="!min-h-[28px] !px-2" />
      </div>
      <p className="mt-1 truncate text-2xs text-stone-400">
        <UiText>For:</UiText> <TranslatedText text={m.requestTitle || (viewer === "DONOR" ? ui("a request") : ui("your request"))} />
        {(viewer === "DONOR" ? m.doneeName : m.donorName) && <> &middot; {viewer === "DONOR" ? m.doneeName : m.donorName}</>}
        {" "}&middot; {shortDate(matchEndedAt(m))}
        {received != null && received > 0 && <> &middot; {received} {viewer === "DONOR" ? ui("delivered") : ui("received")}</>}
      </p>
      {m.rejectionReason && !MATCH_RECEIVED_STATUSES.has(m.status) && (
        <p className="mt-1 line-clamp-2 text-2xs text-stone-400 dark:text-stone-500">{displayReason(m.rejectionReason)}</p>
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
 * The match's item name for display. Only the public listing title is sent for
 * translation; the donor's free-text description (used when a match has no
 * listing) is private and shown as written (Translation Coverage Inventory §6).
 */
function MatchItemText({ m, fallback }: { m: ItemMatch; fallback?: string }) {
  const ui = useUiText();
  if (m.listingTitle) return <TranslatedText text={m.listingTitle} />;
  return <>{m.donorItemDescription || fallback || ui("Matched item")}</>;
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

function SectionTab({ value, icon: Icon, label, shortLabel, count, attention, tour, role }: {
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
  role?: "donor" | "donee";
}) {
  const isDonor = role === "donor";
  const activeClasses = isDonor
    ? "focus-visible:ring-[var(--ck-role-accent)]/40 dark:focus-visible:ring-[var(--ck-role-accent)]/50 data-[state=active]:bg-[var(--ck-role-accent)] data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:bg-[var(--ck-role-accent)]/25 dark:data-[state=active]:text-amber-100"
    : "focus-visible:ring-[#1e3a60]/40 dark:focus-visible:ring-blue-400/50 data-[state=active]:bg-[#1e3a60] data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:bg-blue-500/25 dark:data-[state=active]:text-blue-50";

  return (
    <TabsTrigger
      value={value}
      data-tour={tour}
      className={`group relative flex h-auto min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold text-stone-500 transition-colors hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 dark:text-stone-400 dark:hover:text-stone-200 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm ${activeClasses}`}
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
          <span className="sr-only"><UiText>(needs your attention)</UiText></span>
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
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
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
  // Sub-filter inside Your Requests. Client-side only — no refetch, no reload.
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("all");

  useEffect(() => {
    getOffersForMyRequests().then(setIncomingOffers).catch(() => { }).finally(() => setOffersLoaded(true));
    const fromHash = window.location.hash.slice(1);
    if (isDoneeSection(fromHash)) setChosenSection(fromHash);
  }, []);

  // The parent refetches requests and matches on these events; offers are this
  // component's own, and were fetched once — a new offer only showed on reload.
  useEntityUpdates(["OFFER", "HANDOVER"], () => {
    getOffersForMyRequests().then(setIncomingOffers).catch(() => { });
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
      if (action === "ACCEPT") toast.success(ui("Offer accepted! The donor will reconfirm availability next."));
      else toast.success(ui("Offer declined."));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : ui("Action failed"));
    } finally {
      setOfferActionLoading(null);
    }
  }

  async function handleConfirmNoIssue(offerId: number) {
    if (!window.confirm(ui("Mark this donation complete? You won't be able to report a problem after this."))) return;
    setOfferActionLoading(offerId);
    try {
      const updated = await confirmNoIssue(offerId);
      setIncomingOffers(prev => prev.map(o => o.id === offerId ? updated : o));
      toast.success(ui("Marked as complete — thank you for confirming!"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : ui("Failed to complete"));
    } finally {
      setOfferActionLoading(null);
    }
  }

  const handleDoneeAccept = async (id: number) => {
    setMatchActionLoading(id);
    try {
      await doneeAcceptMatch(id);
      toast.success(ui("Match accepted! Logistics will be arranged next."));
      await onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : ui("Failed to accept match"));
    } finally {
      setMatchActionLoading(null);
    }
  };

  const handleDoneeReject = async (id: number) => {
    setMatchActionLoading(id);
    try {
      await doneeRejectMatch(id);
      toast.success(ui("Match declined."));
      await onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : ui("Failed to decline match"));
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
  const visibleRequests = [...requestGroups.pending, ...requestGroups.partial, ...requestGroups.closed];
  // COMPLETED and DONOR_REJECTED were missing here, so a delivered or declined
  // match still counted as "active" and never left the list.
  const activeMatches = doneeMatches.filter(m => !MATCH_HISTORY_STATUSES.has(m.status));
  const pastMatches = doneeMatches.filter(m => MATCH_HISTORY_STATUSES.has(m.status));
  // A need with a live match counts as "Matched" even before its status moves.
  const liveMatchRequestIds = new Set(
    activeMatches.map(m => m.requestId).filter((id): id is number => id != null),
  );
  const requestOptions = requestFilterOptions(itemRequests, liveMatchRequestIds);
  const filteredRequests = filterRequests(itemRequests, requestFilter, liveMatchRequestIds);
  const activeOffers = incomingOffers.filter(o => !isPastOffer(o, now));
  const pastOffers = incomingOffers.filter(o => isPastOffer(o, now));
  const offersNeedYou = activeOffers.some(o => OFFER_NEEDS_DONEE.has(o.status));
  // Owner, 2026-10-07: Your Requests holds requests not yet in a live flow (plus
  // matches waiting on the donee's yes/no); Matches holds accepted matches and
  // live offers; History holds the finished ones.
  const awaitingDoneeMatches = activeMatches.filter(m => m.status === "AWAITING_DONEE_CONFIRMATION");
  // Owner, 2026-10-09: an item waiting on the donee is answered inside its request's
  // card, in the Matched step; only one whose request is not listed keeps the full card.
  const reviewByRequest = new Map(awaitingDoneeMatches.filter(m => m.requestId != null).map(m => [m.requestId as number, m]));
  const orphanDoneeReviews = awaitingDoneeMatches.filter(m => m.requestId == null || !itemRequests.some(r => r.id === m.requestId));
  const doneeReviewFor = (requestId: number) => {
    const m = reviewByRequest.get(requestId);
    return m ? <DoneeMatchReviewInline key={m.id} match={m} busy={matchActionLoading === m.id}
      onAccept={() => handleDoneeAccept(m.id)} onDecline={() => handleDoneeReject(m.id)} /> : undefined;
  };
  const flowMatches = activeMatches.filter(m => m.status !== "AWAITING_DONEE_CONFIRMATION");
  const matchesNeedYou = activeMatches.some(m => MATCH_NEEDS_DONEE.has(m.status));
  // Open on whatever is waiting on the donee; otherwise on their requests. Empty
  // until offers have loaded, so the tab doesn't jump once they arrive.
  const section: DoneeSection | "" = chosenSection
    // Since the 2026-10-07 tabs: live offers sit in Matches, and a match waiting
    // on the donee's yes/no sits in Your Requests ("offers" is now History).
    ?? (!offersLoaded ? ""
      : awaitingDoneeMatches.length > 0 ? "requests"
        : offersNeedYou || matchesNeedYou ? "matches"
          : "requests");
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

        <div className="mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="space-y-3 min-w-0">
              <div className="inline-flex items-center gap-1.5 bg-[var(--ck-role-highlight)]/15 border border-[var(--ck-role-highlight)]/30 rounded-full px-2.5 py-0.5 text-2xs sm:px-3 sm:py-1 sm:text-xs text-[var(--ck-role-highlight)] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> <UiText>Verified Donee</UiText>
              </div>
              <h1 className="text-xl sm:text-5xl tracking-tight leading-[1.05] font-bold" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
                {dt("greeting", { name: myProfile.fullName?.split(" ")[0] || user.email.split("@")[0] })}
              </h1>
              <p className="text-white/55 text-sm max-w-md">
                {activeRequests.length > 0
                  ? (myProfile.city ? dt("requestsOnRoadNear", { count: activeRequests.length, city: myProfile.city.split(",")[0] }) : dt("requestsOnRoadNearYou", { count: activeRequests.length }))
                  : ui("Post your first need and we'll find a verified donor near you.")}
              </p>
            </motion.div>
            <NewRequestLink href="/requests/new" data-tour="primary-cta">
              <Button className="bg-[var(--ck-role-highlight)] hover:bg-[#e0a86a] text-stone-950 font-extrabold rounded-xl sm:rounded-2xl px-3.5 sm:px-6 py-2 sm:py-3 h-auto text-sm sm:text-sm flex items-center gap-2 shadow-xl shadow-[var(--ck-role-highlight)]/20 shrink-0">
                <Plus className="w-4 h-4" /> <UiText>Post a Need</UiText>
              </Button>
            </NewRequestLink>
          </div>

          {/* Impact ledger — live numbers over hairline rules, no stat cards */}
          <div data-tour="ledger" className="mt-6 sm:mt-10 grid grid-cols-3 border-t border-white/10">
            {[
              { n: itemRequests.length, label: ui("needs posted") },
              { n: activeMatches.length, label: ui("active matches") },
              { n: fulfilledRequests.length, label: ui("needs received") },
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

      <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8 space-y-4 sm:space-y-6">

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
          <span className="text-stone-300 dark:text-zinc-700 hidden sm:inline"><UiText>&middot;</UiText></span>
          <p className="truncate hidden sm:block">{user.email}</p>
          {myProfile.city && (
            <>
              <span className="text-stone-300 dark:text-zinc-700 hidden md:inline"><UiText>&middot;</UiText></span>
              <p className="hidden md:flex items-center gap-1"><MapPin className="w-3 h-3 text-[#1e3a60] dark:text-blue-400" />{myProfile.city}</p>
            </>
          )}
          <Link href="/profile" className="ml-auto shrink-0 font-bold text-[#1e3a60] dark:text-blue-400 hover:underline"><UiText>Edit profile</UiText></Link>
        </div>

        {/* ── Sections: offers, requests, matches — one open at a time ── */}
        <Tabs value={section} onValueChange={(v) => { if (isDoneeSection(v)) selectSection(v); }} className="space-y-4 sm:space-y-6">
          <TabsList
            aria-label={ui("Dashboard sections")}
            className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border border-stone-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/70"
          >
            <SectionTab value="requests" icon={Package} label={ui("Your Requests")} shortLabel={ui("Requests")}
              count={visibleRequests.length} attention={awaitingDoneeMatches.length > 0} tour="requests-list" role="donee" />
            <SectionTab value="matches" icon={Handshake} label={ui("Matches")} shortLabel={ui("Matches")}
              count={flowMatches.length + activeOffers.length} attention={flowMatches.some(m => MATCH_NEEDS_DONEE.has(m.status)) || offersNeedYou} tour="matches" role="donee" />
            <SectionTab value="offers" icon={Heart} label={ui("History")} shortLabel={ui("History")}
              count={pastOffers.length + pastMatches.length} attention={false} tour="offers" role="donee" />
          </TabsList>

          {section === "" && (
            <div className="space-y-3" aria-busy="true" aria-label={ui("Loading your dashboard")}>
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          )}

          {/* ── Incoming Donation Offers (Donor Flow 2) ── */}
          <TabsContent value="offers" className="mt-0 space-y-4 sm:space-y-6">
                {/* Finished offers — slim grouped history instead of full cards:
                  ones that fell through, and donations completed over a week ago */}
            {/* One list (owner, 2026-10-09): received, plus every offer or match that didn't go ahead. */}
            <DoneeHistorySection offers={incomingOffers} matches={doneeMatches}
              onlyOffersClosed={pastOffers.filter(o => o.status !== "COMPLETED")}
              onlyMatchesClosed={pastMatches.filter(m => !MATCH_RECEIVED_STATUSES.has(m.status))} />
          </TabsContent>

          {/* Your requests — each one drawn as a journey down the pipeline */}
          <TabsContent value="requests" className="mt-0">
          {orphanDoneeReviews.length > 0 && (
          <div className="mb-5 space-y-4">
          {/* Owner, 2026-10-07: items waiting for the donee's yes/no sit inside Your
              Requests; once accepted the flow moves to Matches. */}
          {orphanDoneeReviews.map(m => (
            <DoneeMatchReviewCard
              key={m.id}
              match={m}
              busy={matchActionLoading === m.id}
              onAccept={() => handleDoneeAccept(m.id)}
              onDecline={() => handleDoneeReject(m.id)}
            />
          ))}
          </div>
          )}
            <section>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#1e3a60]/70 dark:border-blue-400/50 pb-3">
                <div>
                  <p className="text-3xs font-black uppercase tracking-[0.24em] text-[#1e3a60] dark:text-blue-400"><UiText>Your Requests</UiText></p>
                  <p className="text-xs text-stone-400 mt-1"><UiText>Every need travels the same road: posted, verified, matched, received.</UiText></p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link href="/dashboard/history" className="text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-zinc-700">
                    <History className="w-3.5 h-3.5" /> <UiText>History</UiText>
                  </Link>
                  <NewRequestLink href="/requests/new" className="text-xs font-bold text-[#1e3a60] dark:text-blue-400 hover:underline flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> <UiText>New need</UiText>
                  </NewRequestLink>
                </div>
              </div>

              {itemRequests.length === 0 ? (
                <div className="py-8 sm:py-14 text-center space-y-3">
                  <div className="w-11 sm:w-14 h-11 sm:h-14 bg-[#1e3a60]/10 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto">
                    <Heart className="w-6 h-6 text-[#1e3a60]" />
                  </div>
                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-400"><UiText>Nothing posted yet</UiText></p>
                  <p className="text-xs text-stone-400 max-w-[240px] mx-auto"><UiText>Tell us what you need &mdash; books, clothes, medical supplies &mdash; and we&apos;ll find donors nearby.</UiText></p>
                  <NewRequestLink href="/requests/new">
                    <Button size="sm" className="bg-[#1e3a60] hover:bg-[#162d4a] text-white mt-2"><UiText>Post your first need</UiText></Button>
                  </NewRequestLink>
                </div>
              ) : (
                <DashboardFilterChips
                  label={ui("Filter your requests")}
                  options={requestOptions}
                  value={requestFilter}
                  onChange={setRequestFilter}
                  tone="donee"
                  idPrefix="request-filter"
                />
              )}

              {itemRequests.length === 0 ? null : requestFilter !== "all" ? (
                filteredRequests.length === 0 ? (
                  <div className="py-7 text-center space-y-2">
                    <p className="text-sm text-stone-400">
                      {dt("nothingUnder", { label: requestOptions.find(o => o.key === requestFilter)?.label ?? "" })}
                    </p>
                    <button type="button" onClick={() => setRequestFilter("all")}
                      className="text-xs font-bold text-[#1e3a60] dark:text-blue-400 hover:underline">
                      <UiText>Show all requests</UiText>
                    </button>
                  </div>
                ) : (
                  <div className="mt-4">
                    <AnimatePresence initial={false}>
                      {filteredRequests.map((r, i) => (
                        <DoneeRequestRow key={r.id} request={r} index={i} onCancelled={onRefresh} review={doneeReviewFor(r.id)} />
                      ))}
                    </AnimatePresence>
                  </div>
                )
              ) : (
                <div className="space-y-6 mt-4">
                  {([
                    ["Pending", requestGroups.pending],
                    ["Partially Fulfilled", requestGroups.partial],
                    ["Closed", requestGroups.closed],
                  ] as const).filter(([, group]) => group.length > 0).map(([label, group]) => (
                    <div key={label}>
                      <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">{dc(label)}</h4>
                      <AnimatePresence initial={false}>
                        {group.map((r, i) => (
                          <DoneeRequestRow key={r.id} request={r} index={i} onCancelled={onRefresh} review={doneeReviewFor(r.id)} />
                        ))}
                      </AnimatePresence>
                    </div>
                  ))}

                  {/* The per-delivery breakdown (who gave what, when) lives in History. */}
                  {fulfilledRequests.length > 0 && (
                    <Link href="/dashboard/history" className="flex items-center gap-2 rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{dt("seeHistory", { count: fulfilledRequests.length })}</span>
                      <span className="ml-auto" aria-hidden><UiText>&rarr;</UiText></span>
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
                <p className="text-3xs font-black uppercase tracking-[0.24em] text-[var(--ck-role-accent)]"><UiText>Matches</UiText></p>
                <p className="text-xs text-stone-400 mt-1"><UiText>Donors whose items matched your requests.</UiText></p>
              </div>
              <div className="pt-3.5 sm:pt-5">
                {/* Live donation offers are flows in progress too (owner, 2026-10-07). */}
                {activeOffers.length > 0 && (
                <div className="mb-4">
            <Card className="relative bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b pb-3 sm:pb-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <CardTitle className="text-base sm:text-lg font-extrabold"><UiText>Donation offers</UiText></CardTitle>
                  {(() => {
                    const toReview = activeOffers.filter(o => o.status === "PENDING_DONEE_REVIEW").length;
                    return toReview > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
                        {dt("needReview", { count: toReview })}
                      </span>
                    ) : null;
                  })()}
                </div>
                {incomingOffers.length > 0 && (
                  <Link href="/donee/offers" className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--ck-role-accent)] hover:underline">
                    <UiText>View all offers</UiText> <span aria-hidden className="ms-1">›</span>
                  </Link>
                )}
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
                {incomingOffers.length === 0 ? (
                  <div className="py-8 sm:py-12 text-center space-y-2">
                    <div className="w-11 h-11 bg-[var(--ck-role-accent)]/10 rounded-xl flex items-center justify-center mx-auto">
                      <Heart className="w-5 h-5 text-[var(--ck-role-accent)]" />
                    </div>
                    <p className="text-sm font-semibold text-stone-600 dark:text-stone-400"><UiText>No donation offers yet</UiText></p>
                    <p className="text-xs text-stone-400 max-w-[280px] mx-auto">
                      <UiText>Once a request is public, donors can offer to fulfil it — you&apos;ll review each offer here.</UiText>
                    </p>
                  </div>
                ) : activeOffers.length === 0 && (
                  <p className="py-2 text-center text-xs text-stone-400">
                    <UiText>No active offers right now — your requests stay visible to donors.</UiText>
                  </p>
                )}
                {activeOffers
                  .map(offer => {
                    const isPendingReview = offer.status === "PENDING_DONEE_REVIEW";
                    const isApproved = offer.status === "ADMIN_APPROVED";
                    const isHandover = ["HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"].includes(offer.status);
                    const isIssueWindow = offer.status === "ISSUE_WINDOW_OPEN";
                    const isIssueRaised = offer.status === "ISSUE_RAISED";
                    const isComplete = offer.status === "COMPLETED";
                    const isNeedsInfo = offer.status === "NEEDS_INFORMATION";
                    const isScreening = ["SUBMITTED", "AI_ELIGIBILITY_SCREENING", "AI_COMPATIBILITY_SCREENING", "COMPATIBILITY_CHECKED"].includes(offer.status);
                    const isWithdrawn = offer.status === "WITHDRAWN" || offer.status === "CANCELLED" || offer.status === "ADMIN_REJECTED";
                    const statusLabel =
                      isPendingReview ? ui("Awaiting your review") :
                        isNeedsInfo ? ui("Waiting on donor to add details") :
                          isScreening ? ui("AI screening in progress") :
                            offer.status === "DONOR_RECONFIRMATION_REQUIRED" ? ui("Donor is reconfirming") :
                              offer.status === "DONOR_RECONFIRMED" ? ui("Under admin review") :
                                isApproved ? ui("Approved") :
                                  isHandover ? ui("Handover in progress") :
                                    isIssueWindow ? ui("Issue window open") :
                                      isIssueRaised ? ui("Issue under review") :
                                        isComplete ? ui("Completed") :
                                          offer.status === "ADMIN_REJECTED" ? ui("Offer not approved") :
                                            isWithdrawn ? ui("Offer withdrawn") :
                                              offer.status.replace(/_/g, " ");
                    const statusColor =
                      isPendingReview || isNeedsInfo ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                        isApproved || isComplete || isIssueWindow ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" :
                          isHandover ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                            isIssueRaised ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                              isWithdrawn ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" :
                                "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-stone-400";

                    // A finished offer is one slim row, as on the donor side; it only
                    // stays on this tab while the 48-hour report window is open.
                    if (isComplete) {
                      const raw = offer.windowExpiresAt?.trim();
                      const expiresAt = raw
                        ? new Date(raw.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`).getTime()
                        : offer.closedAt ? serverDate(offer.closedAt).getTime() + 48 * 60 * 60 * 1000 : NaN;
                      const canReport = isNaN(expiresAt) || Date.now() < expiresAt;
                      return (
                        <div key={offer.id} className="space-y-1">
                          <DoneRow
                            title={offer.requestTitle ?? ui("Donation")}
                            sub={[
                              offer.receivedQuantity != null ? dt("receivedN", { count: offer.receivedQuantity }) : ui("Completed"),
                              doneDate(offer.closedAt ?? offer.createdAt),
                              offer.itemDetails?.pickupCity,
                            ].filter(Boolean).join(" · ")}
                            thumb={offer.media?.[0]?.mediaUrl}
                            photos={offer.media?.map(m => m.mediaUrl)}
                          />
                          {canReport && (
                            <p className="px-1 text-3xs text-stone-400">
                              {dt.rich("reportWithin", { report: (chunks) => <Link href={`/offers/${offer.id}/issues`} className="font-semibold text-amber-700 hover:underline dark:text-amber-400">{chunks}</Link> })}
                            </p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <DoneeOfferCard
                        key={offer.id}
                        offer={offer}
                        statusLabel={statusLabel}
                        statusClassName={statusColor}
                        busy={offerActionLoading === offer.id}
                        onAccept={() => handleOfferAction(offer.id, "ACCEPT")}
                        onDecline={() => {
                          const reason = window.prompt(ui("Reason for declining (optional):"));
                          // Cancel on the prompt means "don't decline".
                          if (reason === null) return;
                          handleOfferAction(offer.id, "DECLINE", reason || undefined);
                        }}
                        actions={
                          <>
                            {isIssueWindow && (
                              <div className="space-y-2">
                                <ShortDeliveryNote offer={offer} />
                                <button
                                  type="button"
                                  onClick={() => handleConfirmNoIssue(offer.id)}
                                  disabled={offerActionLoading === offer.id}
                                  className="min-h-12 w-full rounded-xl bg-[var(--ck-role-accent)] text-sm font-extrabold text-white hover:bg-[var(--ck-role-hover)] disabled:opacity-60"
                                >
                                  {offerActionLoading === offer.id ? ui("Saving…") : ui("Everything's fine — complete")}
                                </button>
                                <Link href={`/offers/${offer.id}/issues`} className="flex min-h-11 w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-sm font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                                  <UiText>Report a problem</UiText>
                                </Link>
                                <p className="text-center text-3xs text-stone-500 dark:text-stone-400"><UiText>Completing ends the issue window — you can&apos;t report a problem afterwards.</UiText></p>
                              </div>
                            )}
                            {isIssueRaised && <WithdrawReportedIssue offerId={offer.id} onChanged={onRefresh} />}
                            {/* Cancelling after accepting. Hidden while the offer awaits
                                review: Decline above is the one way to say no then. */}
                            {!isPendingReview && <WithdrawFlowButton kind="offer" id={offer.id} role="DONEE" className="w-full" />}
                          </>
                        }
                      />
                    );
                  })}

              </CardContent>
            </Card>

                </div>
                )}
                {flowMatches.length === 0 && activeOffers.length === 0 ? (
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
                        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400"><UiText>Scanning donor inventories</UiText></p>
                        <p className="text-xs text-stone-400 max-w-[250px] mx-auto mt-1"><UiText>Your verified request is being matched against donor items &mdash; new listings are checked as they arrive. Matches appear here and we&apos;ll notify you.</UiText></p>
                      </div>
                    ) : activeRequests.length > 0 ? (
                      /* activeRequests, not itemRequests — a dashboard whose only
                         request is withdrawn has nothing awaiting verification, so
                         promising that matching is about to start would be untrue. */
                      <div>
                        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400"><UiText>Matching starts after verification</UiText></p>
                        <p className="text-xs text-stone-400 max-w-[260px] mx-auto mt-1"><UiText>Submit your request and once our team verifies it, the matching engine starts scanning donor inventories for you.</UiText></p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400"><UiText>No requests to match yet</UiText></p>
                        <p className="text-xs text-stone-400 max-w-[240px] mx-auto mt-1"><UiText>Post a need above &mdash; matching begins as soon as it&apos;s verified.</UiText></p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="divide-y dark:divide-zinc-800 space-y-3">
                    {flowMatches.map(m => {
                      const badge = getFulfilmentStatusBadge(m.status);
                      return (
                        <div key={m.id} className="pt-3 first:pt-0 space-y-2 group px-1 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800/40 transition-all pb-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[var(--ck-role-accent)] transition-colors truncate">
                                <MatchItemText m={m} />
                              </p>
                              <p className="text-xs text-stone-400 mt-0.5 truncate"><UiText>For:</UiText> <TranslatedText text={m.requestTitle || ""} /></p>
                            </div>
                            <Badge variant={badge.variant} className="text-3xs whitespace-nowrap shrink-0">{pl(badge.label)}</Badge>
                          </div>
                          <div className="flex justify-between items-center text-xs bg-stone-50 dark:bg-zinc-950 p-2.5 rounded-xl">
                            <div><p className="text-stone-400"><UiText>Donor</UiText></p><p className="font-semibold text-stone-700 dark:text-stone-300">{m.donorName}</p></div>
                            {m.matchScore && (<div className="text-right"><p className="text-stone-400"><UiText>AI Match</UiText></p><p className="font-bold text-[#1e3a60] dark:text-blue-400">{m.matchScore}%</p></div>)}
                          </div>
                          {m.handoverMethod && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl p-2.5 space-y-1.5 text-xs">
                              <p className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1"><Calendar className="w-3 h-3" /> <UiText>Pickup Details</UiText></p>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-stone-600 dark:text-stone-400">
                                <div><span className="text-stone-400"><UiText>Method:</UiText> </span><span className="font-medium">{m.handoverMethod.replace(/_/g, " ")}</span></div>
                                {m.pickupDateTime && <div><span className="text-stone-400"><UiText>When:</UiText> </span><span className="font-medium">{serverDate(m.pickupDateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></div>}
                                {m.handoverAddress && <div className="col-span-2"><span className="text-stone-400"><UiText>Address:</UiText> </span><span className="font-medium">{m.handoverAddress}</span></div>}
                                {m.transportArrangedBy && <div><span className="text-stone-400"><UiText>Transport by:</UiText> </span><span className="font-medium">{m.transportArrangedBy.replace(/_/g, " ")}</span></div>}
                                {m.fulfilmentNotes && <div className="col-span-2"><span className="text-stone-400"><UiText>Notes:</UiText> </span><span className="font-medium">{m.fulfilmentNotes}</span></div>}
                              </div>
                            </div>
                          )}
                          {HANDOVER_HUB_STATUSES.has(m.status) && (
                            <div className="flex gap-2 pt-1">
                              <Link href={`/matches/${m.id}/handover`} className="flex flex-1 items-center justify-center gap-1.5 bg-[#1e3a60] hover:bg-[#162d4a] text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                <Truck className="w-3.5 h-3.5" /> <UiText>Go to Handover Hub</UiText>
                              </Link>
                              <button
                                onClick={() => setChatMatch(m)}
                                className="flex items-center justify-center gap-1.5 border border-[#1e3a60]/40 text-[#1e3a60] hover:bg-[#1e3a60]/5 dark:text-blue-400 dark:border-blue-400/40 text-xs font-bold py-2 px-3 rounded-lg transition-all"
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> <UiText>Chat</UiText>
                              </button>
                            </div>
                          )}
                          <WithdrawFlowButton kind="match" id={m.id} role="DONEE" className="w-full" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </TabsContent>

        </Tabs>

      </div>

      {chatMatch && (
        <MatchChatPopup
          matchId={chatMatch.id}
          partnerName={chatMatch.donorName || ui("Donor")}
          itemTitle={chatMatch.listingTitle || chatMatch.requestTitle}
          currentUserEmail={user.email}
          accent="navy"
          onClose={() => setChatMatch(null)}
        />
      )}
    </div>
  );
}

/**
 * The donor's request offers and NGO drive offers, as one list for the offer
 * cards. Drive offers are reshaped onto the request-offer fields the cards read
 * and tagged `_type: "DRIVE_OFFER"` so the card can route them correctly.
 */
async function loadAllDonationOffers(): Promise<any[]> {
  const [offers, drives] = await Promise.all([
    getMyDonationOffers().catch(() => [] as DonationOffer[]),
    getMyNgoDriveOffers().catch(() => []),
  ]);
  const mapped = drives.map(d => ({
    ...d,
    _type: "DRIVE_OFFER",
    requestId: d.driveId,
    requestTitle: d.driveTitle,
    requestCategory: "NGO Drive",
    requestCity: d.ngoName,
    flowType: null,
  }));
  const time = (o: any) => serverDate(o.createdAt || o.submittedAt || 0).getTime();
  return [...offers, ...mapped].sort((a, b) => time(b) - time(a));
}

export default function DashboardPage() {
  const ui = useUiText();
  const pl = usePageLabels();
  const jt = useJourneyText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const [matchSegment, setMatchSegment] = useState<MatchSegment>("donee");
  // Drive notices link to /dashboard?segment=ngo#matches: open the NGO segment.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("segment") === "ngo") setMatchSegment("ngo");
  }, []);
  const t = useTranslations("dashboard");
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // NGO_DRIVE_OFFER / NGO_DRIVE: a drive handover completing updates Matches > NGO, History and the stats live.
  useEntityUpdates(["OFFER", "REQUEST", "LISTING", "MATCH", "HANDOVER", "NGO_DRIVE_OFFER", "NGO_DRIVE"], () => {
    refreshListings();
    refreshMatches();
    getMyItemRequests().then(setItemRequests).catch(() => {});
    Promise.all([
      getMyDonationOffers().catch(() => []),
      getMyNgoDriveOffers().catch(() => [])
    ]).then(([offers, drives]) => {
      const mapped = drives.map(d => ({
        ...d,
        _type: "DRIVE_OFFER",
        requestId: d.driveId,
        requestTitle: d.driveTitle,
        requestCategory: "NGO Drive",
        requestCity: d.ngoName,
        // The NGO's decline reason is shown where the card shows any reason.
        rejectionReason: d.ngoDeclineReason || d.rejectionReason,
        flowType: null
      }));
      setDonationOffers([...offers, ...mapped].sort((a: any, b: any) => serverDate(b.createdAt || b.submittedAt || 0).getTime() - serverDate(a.createdAt || a.submittedAt || 0).getTime()));
    });
  });

  const [itemListings, setItemListings] = useState<ItemListing[]>([]);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [donationOffers, setDonationOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"donor" | "donee">("donor");
  // Null until the donor picks a section (or arrives with one in the URL hash).
  const [chosenDonorSection, setChosenDonorSection] = useState<DonorSection | null>(null);
  // Sub-filter inside Your Inventory. Client-side only — no refetch, no reload.
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>("all");

  // Listing action state
  const [listingActionLoading, setListingActionLoading] = useState<number | null>(null);
  const [selectedListing, setSelectedListing] = useState<ItemListing | null>(null);
  const [withdrawListingId, setWithdrawListingId] = useState<number | null>(null);

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
    Promise.all([
      getMyDonationOffers().catch(() => []),
      getMyNgoDriveOffers().catch(() => [])
    ]).then(([offers, drives]) => {
      const mapped = drives.map(d => ({
        ...d,
        _type: "DRIVE_OFFER",
        requestId: d.driveId,
        requestTitle: d.driveTitle,
        requestCategory: "NGO Drive",
        requestCity: d.ngoName,
        // The NGO's decline reason is shown where the card shows any reason.
        rejectionReason: d.ngoDeclineReason || d.rejectionReason,
        flowType: null
      }));
      setDonationOffers([...offers, ...mapped].sort((a: any, b: any) => serverDate(b.createdAt || b.submittedAt || 0).getTime() - serverDate(a.createdAt || a.submittedAt || 0).getTime()));
    });
  }

  async function handleOfferReconfirm(offerId: number) {
    try {
      const updated = await reconfirmOfferAvailability(offerId);
      setDonationOffers(prev => prev.map(o => o.id === offerId ? updated : o));
      toast.success(ui("Availability confirmed! Waiting for admin approval."));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : ui("Failed to reconfirm"));
    }
  }

  async function handleOfferWithdraw(offerId: number, reason: string) {
    try {
      const updated = await withdrawOffer(offerId, reason);
      setDonationOffers(prev => prev.map(o => o.id === offerId ? updated : o));
      toast.success(ui("Offer withdrawn. The recipient has been notified."));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : ui("Failed to withdraw offer"));
    }
  }

  async function handleListingAction(id: number, action: "pause" | "resume" | "withdraw") {
    setListingActionLoading(id);
    try {
      if (action === "pause") await pauseItemListing(id);
      if (action === "resume") await resumeItemListing(id);
      if (action === "withdraw") await withdrawItemListing(id);
      await refreshListings();
      toast.success(action === "pause" ? ui("Listing paused") : action === "resume" ? ui("Listing resumed") : ui("Listing withdrawn"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ui("Action failed"));
    } finally {
      setListingActionLoading(null);
    }
  }

  async function handleDeleteListing(id: number) {
    if (!confirm(ui("Delete this listing? It will no longer appear here."))) return;
    setListingActionLoading(id);
    try {
      await deleteMyListing(id);
      setItemListings(prev => prev.filter(l => l.id !== id));
      setSelectedListing(prev => (prev?.id === id ? null : prev));
      toast.success(ui("Listing deleted"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : ui("Failed to delete listing"));
    } finally {
      setListingActionLoading(null);
    }
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (isNgoRole(user.role)) { router.push("/dashboard/ngo"); return; }

    Promise.all([
      getMyProfile().then((p) => {
        setMyProfile(p);
        if (p.role === "DONEE") setActiveTab("donee");
      }).catch(() => { }),
      getMyItemListings().then(setItemListings).catch(() => setItemListings([])),
      getMyItemRequests().then(setItemRequests).catch(() => setItemRequests([])),
      // Restored 2026-10-07: dropped by the merge resolution in e635861, so the
      // Matches tab stayed at 0 until a live update happened to arrive.
      getMyMatches().then(setMatches).catch(() => setMatches([])),
      Promise.all([
        getMyDonationOffers().catch(() => []),
        getMyNgoDriveOffers().catch(() => [])
      ]).then(([offers, drives]) => {
        const mapped = drives.map(d => ({
          ...d,
          _type: "DRIVE_OFFER",
          requestId: d.driveId,
          requestTitle: d.driveTitle,
          requestCategory: "NGO Drive",
          requestCity: d.ngoName,
          // The NGO's decline reason is shown where the card shows any reason.
          rejectionReason: d.ngoDeclineReason || d.rejectionReason,
          flowType: null
        }));
        setDonationOffers([...offers, ...mapped].sort((a: any, b: any) => serverDate(b.createdAt || b.submittedAt || 0).getTime() - serverDate(a.createdAt || a.submittedAt || 0).getTime()));
      }),
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
    if (window.confirm(dt("deleteRejectedListings", { count: rejected.length }))) {
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
  const donorListingGroups = useMemo(() => groupItemListings(itemListings), [itemListings]);
  const visibleDonorListings = useMemo(
    () => itemListings.filter(l => !["DONATED", "FULFILLED"].includes(l.status)),
    [itemListings],
  );

  // ── What each donor tab holds, and which of them is waiting on the donor ──
  // A finished match stopped being an opportunity, so it leaves the live list
  // for the section's own history strip, exactly as on the donee side.
  const activeDonorMatches = donorMatches.filter(m => !MATCH_HISTORY_STATUSES.has(m.status));
  const pastDonorMatches = donorMatches.filter(m => MATCH_HISTORY_STATUSES.has(m.status));
  // Owner, 2026-10-07: Inventory holds items not yet in a live flow (plus the
  // matches waiting on the donor's yes/no); Matches holds accepted matches and
  // live offers; History holds the finished ones. A withdrawn match releases the
  // listing server-side, so the item drops back into Inventory by itself.
  const reviewDonorMatches = activeDonorMatches.filter(m => m.status === "DONOR_REVIEW");
  const flowDonorMatches = activeDonorMatches.filter(m => m.status !== "DONOR_REVIEW");
  const inFlowListingIds = new Set(flowDonorMatches.map(m => m.listingId).filter((id): id is number => id != null));
  // Each listing's live matches — drives the "Matched" filter and the
  // matched-needs strip on its inventory row.
  const liveMatchesByListing = new Map<number, ItemMatch[]>();
  for (const m of activeDonorMatches) {
    if (m.listingId == null) continue;
    liveMatchesByListing.set(m.listingId, [...(liveMatchesByListing.get(m.listingId) ?? []), m]);
  }
  const liveMatchListingIds = new Set(liveMatchesByListing.keys());
  const inventoryOptions = inventoryFilterOptions(itemListings, liveMatchListingIds);
  const filteredInventory = filterInventory(itemListings, inventoryFilter, liveMatchListingIds);
  // A match waiting on the donor (DONOR_REVIEW). Inline = inside the listing's
  // card, in its Matched step (owner, 2026-10-09, design B); otherwise the full
  // card. The decline reason form opens in place of either.
  const renderDonorReview = (m: ItemMatch, inline: boolean) => {
    const Review = inline ? DonorMatchReviewInline : DonorMatchReviewCard;
    return (
                  declineMatchId === m.id ? (
                    <div key={m.id} className="space-y-2 rounded-3xl border border-stone-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
                      <p className="text-sm font-black text-stone-900 dark:text-stone-100">
                        {dt.rich("notAvailableFor", { title: () => <TranslatedText text={m.requestTitle || ui("this need")} /> })}
                      </p>
                      <input type="text" placeholder={ui("Optional reason for declining...")} value={declineReason} onChange={e => setDeclineReason(e.target.value)} className="w-full text-sm border border-stone-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-400" />
                      <label className="flex items-center gap-1.5 text-xs text-stone-500 cursor-pointer select-none">
                        <input type="checkbox" checked={declineConditionChanged} onChange={e => setDeclineConditionChanged(e.target.checked)} className="rounded border-stone-300" />
                        <UiText>The item&apos;s condition has changed since I listed it (pauses the listing)</UiText>
                      </label>
                      <div className="flex gap-2">
                        <button disabled={reviewLoading === m.id} onClick={async () => { setReviewLoading(m.id); try { await donorRejectMatch(m.id, declineReason || undefined, declineConditionChanged); toast.success(ui("Match declined. We're finding the next best donor.")); setDeclineMatchId(null); await refreshMatches(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : ui("Failed to decline match")); } finally { setReviewLoading(null); } }} className="flex-1 h-11 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                          {reviewLoading === m.id ? ui("Declining...") : ui("Confirm decline")}
                        </button>
                        <button onClick={() => setDeclineMatchId(null)} className="h-11 px-5 rounded-full text-sm font-bold text-stone-600 border border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800"><UiText>Cancel</UiText></button>
                      </div>
                    </div>
                  ) : (
                    <Review
                      key={m.id}
                      match={m}
                      busy={reviewLoading === m.id}
                      onAccept={async () => { setReviewLoading(m.id); try { await donorAcceptMatch(m.id); toast.success(ui("Match accepted! Admin will review shortly.")); await refreshMatches(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : ui("Failed to accept match")); } finally { setReviewLoading(null); } }}
                      onDecline={() => { setDeclineMatchId(m.id); setDeclineReason(""); setDeclineConditionChanged(false); }}
                    />
                  )
    );
  };
  const reviewByListing = new Map(reviewDonorMatches.filter(m => m.listingId != null).map(m => [m.listingId as number, m]));
  // Matches whose listing is not on the inventory list keep the full card above it.
  const orphanReviews = reviewDonorMatches.filter(m => m.listingId == null || !itemListings.some(l => l.id === m.listingId));
  const renderListingRow = (l: ItemListing, i: number) => (
    <DonorListingRow
      key={l.id}
      listing={l}
      index={i}
      listingActionLoading={listingActionLoading}
      onAction={handleListingAction}
      onWithdrawPrompt={(id) => setWithdrawListingId(id)}
      onDelete={handleDeleteListing}
      onSelect={setSelectedListing}
      listingMatches={liveMatchesByListing.get(l.id)}
      onOpenMatches={() => selectDonorSection("matches")}
      review={reviewByListing.has(l.id) ? renderDonorReview(reviewByListing.get(l.id) as ItemMatch, true) : undefined}
    />
  );
  // Donee segment: offers to donee requests only. NGO segment: offers to NGO drives only.
  const liveDonorOffers = donationOffers.filter(o => !isDriveOffer(o) && isLiveDonorOffer(o));
  // Submitted to a drive, not accepted yet: Your Inventory (accepted ones are in Matches > NGO).
  const pendingDriveOffers = donationOffers.filter(o => isDriveOffer(o) && DRIVE_OFFER_PENDING_STATUSES.includes(o.status));
  // Matches tab, NGO segment: drive offers from "Offer sent" until the NGO received them.
  const acceptedNgoOffers = acceptedDriveOffers(donationOffers as { _type?: string; status: string }[]) as unknown as AcceptedDriveOffer[];
  const liveNgoOfferIds = new Set(acceptedNgoOffers.map(o => o.id));
  // History: ended request offers, and drive offers that are completed or ended (each once).
  const donorHistoryOffers = donationOffers.filter(o => isDriveOffer(o)
    // Donated (handover completed, certificate issued) shows here at once; ended ones once they leave Matches.
    ? driveOfferDonated(o as never) || (!liveNgoOfferIds.has(o.id) && o.status !== "DRAFT" && DRIVE_TERMINAL_STATUSES.includes(o.status))
    : !isLiveDonorOffer(o));
  const ngoOffersNeedYou = acceptedNgoOffers.some(o => ["NGO_ACCEPTED", "PENDING_ADMIN_APPROVAL", "ADMIN_APPROVED"].includes(o.status));
  const donorOffersNeedYou = liveDonorOffers.some(o => OFFER_NEEDS_DONOR.includes(o.status));
  const donorMatchesNeedYou = activeDonorMatches.some(m => MATCH_NEEDS_DONOR.has(m.status));
  const donorItemsNeedYou = itemListings.some(l => l.status === "NEEDS_INFORMATION");
  // Open on whatever is waiting; then on offers for a donor with no inventory
  // yet, since landing them on an empty ledger hides the work they have in play.
  const donorSection: DonorSection = chosenDonorSection
    // Since the 2026-10-07 tabs: a match waiting on the donor is answered in
    // Inventory, live offers sit in Matches, and "offers" is now History.
    ?? (reviewDonorMatches.length > 0 ? "items"
      : donorOffersNeedYou || donorMatchesNeedYou ? "matches"
        : donorItemsNeedYou ? "items"
          : itemListings.length === 0 && liveDonorOffers.length > 0 ? "matches"
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
        <DashboardSkeleton tiles={3} label={ui("Loading your dashboard")} />
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
                <ShieldCheck className="w-3.5 h-3.5" /> <UiText>Verified Donor</UiText>
              </div>
              <h1 className="text-xl sm:text-5xl tracking-tight leading-[1.05] font-bold" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
                {dt("greeting", { name: myProfile?.fullName?.split(" ")[0] || user.email.split("@")[0] })}
              </h1>
              <p className="text-white/55 text-sm max-w-md">
                {itemListings.length > 0
                  ? (itemListings.some(l => ["ELIGIBLE_FOR_MATCHING", "AVAILABLE"].includes(l.status)) ? ui("Your inventory is live — we match it against verified needs as they arrive.") : ui("Your inventory is with us — list something new or resume a paused item."))
                  : ui("List an item privately and we'll match it with a verified need near you.")}
              </p>
            </motion.div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {myProfile?.role === "ADMIN" && (
                <div className="grid grid-cols-2 gap-1 bg-white/10 border border-white/15 p-1 rounded-xl">
                  <button onClick={() => setActiveTab("donor")}
                    className={`px-3 py-1.5 text-3xs font-bold rounded-lg transition-all ${activeTab === "donor" ? "bg-[var(--ck-role-accent)] text-white" : "text-white/60"}`}>
                    <UiText>Donor</UiText>
                  </button>
                  <button onClick={() => setActiveTab("donee")}
                    className={`px-3 py-1.5 text-3xs font-bold rounded-lg transition-all ${activeTab === "donee" ? "bg-[var(--ck-role-accent)] text-white" : "text-white/60"}`}>
                    <UiText>Donee</UiText>
                  </button>
                </div>
              )}
              {(myProfile?.role === "DONOR" || myProfile?.role === "ADMIN") && (
                <Link href="/items/new" data-tour="primary-cta">
                  <Button className="bg-[var(--ck-role-accent)] hover:bg-[#943e11] text-white font-bold rounded-xl px-3 sm:px-5 py-2 sm:py-2.5 h-auto btn-shine flex items-center gap-1.5 text-sm sm:text-sm">
                    <Plus className="w-4 h-4" /> <UiText>List Item Privately</UiText>
                  </Button>
                </Link>
              )}
              {(myProfile?.role === "DONEE" || myProfile?.role === "ADMIN") && (
                <NewRequestLink href="/requests/new">
                  <Button className="bg-[var(--ck-role-highlight)] hover:bg-[#e0a96a] text-stone-950 font-bold rounded-xl px-3 sm:px-5 py-2 sm:py-2.5 h-auto flex items-center gap-1.5 text-sm sm:text-sm">
                    <Plus className="w-4 h-4" /> <UiText>Post a Need</UiText>
                  </Button>
                </NewRequestLink>
              )}
            </div>
          </div>

          {/* Giving ledger — live numbers over hairline rules, no stat cards */}
          <div data-tour="ledger" className="mt-6 sm:mt-10 grid grid-cols-3 border-t border-white/10">
            {[
              { n: itemListings.length, label: ui("items listed") },
              // Same list the Matches tab calls live, so the headline number and
              // the tab's count can't disagree about what "active" means.
              // Drive offers count once: live ones as active matches, completed ones as donations.
              { n: activeDonorMatches.length + acceptedNgoOffers.length, label: ui("active matches") },
              { n: donorMatches.filter(m => ["FULFILLED", "COMPLETED"].includes(m.status)).length + donationOffers.filter(o => isDriveOffer(o) && o.status === "COMPLETED").length, label: ui("donations completed") },
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
            <span className="text-stone-300 dark:text-zinc-700 hidden sm:inline"><UiText>&middot;</UiText></span>
            <p className="truncate hidden sm:block">{user.email}</p>
            {myProfile?.city && (
              <>
                <span className="text-stone-300 dark:text-zinc-700 hidden md:inline"><UiText>&middot;</UiText></span>
                <p className="hidden md:flex items-center gap-1"><MapPin className="w-3 h-3 text-[var(--ck-role-accent)]" />{myProfile.city}</p>
              </>
            )}
            <Link href="/profile" className="ml-auto shrink-0 font-bold text-[var(--ck-role-accent)] hover:underline"><UiText>Edit profile</UiText></Link>
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
                  aria-label={ui("Dashboard sections")}
                  className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border border-stone-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/70"
                >
                  <SectionTab value="items" icon={Package} label={ui("Your Inventory")} shortLabel={ui("Inventory")}
                    count={visibleDonorListings.filter(l => !inFlowListingIds.has(l.id)).length} attention={donorItemsNeedYou || reviewDonorMatches.length > 0} tour="inventory" role="donor" />
                  {/* Matches = Donee segment + NGO segment, each item counted once. */}
                  <SectionTab value="matches" icon={Handshake} label={ui("Matches")} shortLabel={ui("Matches")}
                    count={flowDonorMatches.length + liveDonorOffers.length + acceptedNgoOffers.length} attention={donorOffersNeedYou || ngoOffersNeedYou} tour="matches" role="donor" />
                  <SectionTab value="offers" icon={Heart} label={ui("History")} shortLabel={ui("History")}
                    count={pastDonorMatches.length + donorHistoryOffers.length} attention={false} tour="offers" role="donor" />
                </TabsList>

                {/* Donor Flow 2 — Offer Tracker */}
                <TabsContent value="offers" className="mt-0 space-y-4 sm:space-y-6">
                  <DonorHistorySection
                    offers={donorHistoryOffers}
                    fulfilledItems={donorListingGroups.fulfilled}
                    matches={donorMatches}
                    pastMatches={pastDonorMatches}
                    onChanged={handleOfferCancelled}
                  />
                </TabsContent>

                {/* Your inventory — private, matched quietly */}
                <TabsContent value="items" className="mt-0">
                  {orphanReviews.length > 0 && (
                  <div className="mb-5 space-y-4">
                {/* Owner, 2026-10-07: a match waiting on the donor is answered here, inside
                    Your Inventory; once accepted the item moves to Matches. The
                    decline reason form opens in place of the card. */}
                {orphanReviews.map((m) => renderDonorReview(m, false))}
                  </div>
                  )}
                  {pendingDriveOffers.length > 0 && (
                    <section className="mb-6 space-y-3" data-testid="inventory-pending-drive-offers" aria-label={ui("Offers to NGO drives, waiting for the NGO")}>
                      <p className="text-3xs font-black uppercase tracking-[0.24em] text-[var(--ck-role-accent)]"><UiText>Offered to NGO drives · waiting for the NGO</UiText></p>
                      {pendingDriveOffers.map((o) => (
                        <OfferStageCard key={`drive-${o.id}`} offer={o} onReconfirm={handleOfferReconfirm} onWithdraw={handleOfferWithdraw} onCancelled={handleOfferCancelled} />
                      ))}
                    </section>
                  )}
                  <section>
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[var(--ck-role-accent)]/70 pb-3">
                      <div>
                        <p className="flex items-center gap-2 text-3xs font-black uppercase tracking-[0.24em] text-[var(--ck-role-accent)]">
                          <EyeOff className="w-3.5 h-3.5" /> <UiText>Your Private Inventory</UiText>
                        </p>
                        <p className="text-xs text-stone-400 mt-1"><UiText>Only our matching engine sees these — never other users.</UiText></p>
                      </div>
                      <Link href="/items/new" className="text-xs font-bold text-[var(--ck-role-accent)] hover:underline flex items-center gap-1 shrink-0 mb-0.5">
                        <Plus className="w-3.5 h-3.5" /> <UiText>Add an item</UiText>
                      </Link>
                    </div>
                    {itemListings.length > 0 && (
                      <DashboardFilterChips
                        label={ui("Filter your inventory")}
                        options={inventoryOptions}
                        value={inventoryFilter}
                        onChange={setInventoryFilter}
                        tone="donor"
                        idPrefix="inventory-filter"
                      />
                    )}
                    {inventoryFilter !== "all" ? (
                      filteredInventory.length === 0 ? (
                        <div className="py-7 text-center space-y-2">
                          <p className="text-sm text-stone-400">
                            {dt("nothingUnder", { label: inventoryOptions.find(o => o.key === inventoryFilter)?.label ?? "" })}
                          </p>
                          <button type="button" onClick={() => setInventoryFilter("all")}
                            className="text-xs font-bold text-[var(--ck-role-accent)] hover:underline">
                            <UiText>Show all items</UiText>
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4">
                          {inventoryFilter === "completed" && (
                            <p className="mb-3 text-2xs text-stone-400">
                              <UiText>Certificates for these are under History &rarr; Matched Donations.</UiText>
                            </p>
                          )}
                          <AnimatePresence initial={false}>
                            {filteredInventory.map((l, i) => renderListingRow(l, i))}
                          </AnimatePresence>
                        </div>
                      )
                    ) : visibleDonorListings.length === 0 ? (
                      <div className="py-7 sm:py-12 text-center space-y-2">
                        <p className="text-sm text-stone-400"><UiText>You haven&apos;t listed any items to donate yet.</UiText></p>
                        <Link href="/items/new" className="inline-block mt-3">
                          <Button size="sm" className="bg-[var(--ck-role-accent)] text-white"><UiText>List your first item</UiText></Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-6 mt-4">
                        {([
                          ["Drafts", donorListingGroups.drafts],
                          ["Under Review", donorListingGroups.review],
                          ["Live & Matching", donorListingGroups.live.filter(l => !inFlowListingIds.has(l.id))],
                          ["Closed", donorListingGroups.closed],
                        ] as const).filter(([, group]) => group.length > 0).map(([label, group]) => (
                          <div key={label}>
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">{dc(label)}</h4>
                            <AnimatePresence initial={false}>
                              {group.map((l, i) => renderListingRow(l, i))}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </TabsContent>

                {/* Donor Matches */}
                <TabsContent value="matches" className="mt-0">
                  <section>
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[var(--ck-role-accent)]/60 pb-3">
                      <div>
                        <p className="text-3xs font-black uppercase tracking-[0.24em] text-[var(--ck-role-accent)]"><UiText>Match Opportunities</UiText></p>
                        <p className="text-xs text-stone-400 mt-1"><UiText>Verified needs your items can fulfil.</UiText></p>
                      </div>
                      <MatchSegmentControl value={matchSegment} onChange={setMatchSegment}
                        doneeCount={flowDonorMatches.length + liveDonorOffers.length} ngoCount={acceptedNgoOffers.length} />
                    </div>
                    {matchSegment === "ngo" ? (
                      <div className="pt-3.5 sm:pt-5">
                        <NgoAcceptedOffersList offers={acceptedNgoOffers} />
                      </div>
                    ) : (
                    <div className="pt-3.5 sm:pt-5 space-y-3 sm:space-y-4">
                      {/* Live offers to requests are donations in progress too. */}
                      {liveDonorOffers.length > 0 && (
                        <DonorOfferSection
                          offers={liveDonorOffers}
                          onReconfirm={handleOfferReconfirm}
                          onWithdraw={handleOfferWithdraw}
                          onCancelled={handleOfferCancelled}
                        />
                      )}
                      {flowDonorMatches.length === 0 && liveDonorOffers.length === 0 ? (
                        /* Truthful empty state: the sweep only spins while a listing is
                           live and the engine is actually checking incoming needs. */
                        <div className="py-7 sm:py-12 text-center space-y-3 sm:space-y-4">
                          <div className="relative w-16 sm:w-24 h-16 sm:h-24 mx-auto rounded-full border border-[var(--ck-role-accent)]/25">
                            <div className="absolute inset-3 rounded-full border border-[var(--ck-role-accent)]/20" />
                            <div className="absolute inset-6 rounded-full border border-[var(--ck-role-accent)]/15" />
                            {itemListings.some(l => ["ELIGIBLE_FOR_MATCHING", "AVAILABLE"].includes(l.status)) && (
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
                          {itemListings.some(l => ["ELIGIBLE_FOR_MATCHING", "AVAILABLE"].includes(l.status)) ? (
                            <div>
                              <p className="text-sm font-semibold text-stone-600 dark:text-stone-400"><UiText>Scanning incoming needs</UiText></p>
                              <p className="text-xs text-stone-400 max-w-[260px] mx-auto mt-1"><UiText>Your live items are checked against every verified need as it arrives. Matches appear here &mdash; and we&apos;ll notify you.</UiText></p>
                            </div>
                          ) : itemListings.length > 0 ? (
                            <div>
                              <p className="text-sm font-semibold text-stone-600 dark:text-stone-400"><UiText>Matching starts once an item goes live</UiText></p>
                              <p className="text-xs text-stone-400 max-w-[260px] mx-auto mt-1"><UiText>Your items are awaiting screening or paused &mdash; once one is live, the engine starts scanning for it.</UiText></p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-semibold text-stone-600 dark:text-stone-400"><UiText>Nothing to match yet</UiText></p>
                              <p className="text-xs text-stone-400 max-w-[240px] mx-auto mt-1"><UiText>List an item above &mdash; matching begins as soon as it passes screening.</UiText></p>
                            </div>
                          )}
                        </div>
                      ) : flowDonorMatches.length === 0 ? (
                        <p className="py-2 text-center text-xs text-stone-400">
                          <UiText>No accepted matches right now — your listed items stay in the matching engine.</UiText>
                        </p>
                      ) : (
                        <div className="divide-y space-y-3 sm:space-y-4">
                          {flowDonorMatches.map((m) => {
                            const badge = getFulfilmentStatusBadge(m.status);
                            const isDonorReview = m.status === "DONOR_REVIEW";
                            const isDeclining = declineMatchId === m.id;
                            // A match waiting on the donor is answered in the card above
                            // the tab bar (2026-10-07); here it is only a pointer, so the
                            // page never shows two sets of Accept / Decline buttons.
                            if (isDonorReview) {
                              return (
                                <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ck-role-accent)]/30 bg-[var(--ck-role-accent)]/5 p-3 text-sm">
                                  <p className="font-bold text-stone-800 dark:text-stone-100">
                                    {dt.rich("waitingForAnswer", { title: () => <TranslatedText text={m.requestTitle || ui("A nearby need")} /> })}
                                  </p>
                                  <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="shrink-0 text-xs font-black text-[var(--ck-role-accent)] hover:underline">
                                    <UiText>Answer at the top</UiText>
                                  </button>
                                </div>
                              );
                            }
                            return (
                              <div key={m.id} className={`pt-3 sm:pt-4 first:pt-0 space-y-2 group p-2 rounded-xl transition-all ${isDonorReview ? "border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "hover:bg-stone-50 dark:hover:bg-zinc-800/40"}`}>
                                {isDonorReview && (
                                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold pb-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <UiText>Action Required — Please confirm this donation</UiText>
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className={`font-bold text-sm text-stone-900 dark:text-stone-100 transition-colors ${isDonorReview ? "" : "group-hover:text-[var(--ck-role-accent)]"}`}>
                                      <UiText>Matched need for:</UiText> <TranslatedText text={m.requestTitle || ui("Requested Need")} />
                                    </p>
                                    <p className="text-xs text-stone-400 mt-0.5"><UiText>Matched with item:</UiText> <MatchItemText m={m} /></p>
                                  </div>
                                  <Badge variant={badge.variant} className="text-3xs whitespace-nowrap">{pl(badge.label)}</Badge>
                                </div>
                                <div className="flex flex-wrap justify-between items-center text-xs bg-stone-100/60 dark:bg-zinc-950 p-2.5 rounded-xl gap-2">
                                  <div><p className="text-stone-500"><UiText>Recipient Donee</UiText></p><p className="font-semibold text-stone-700 dark:text-stone-300">{m.doneeName}</p></div>
                                  {m.matchScore && (<div className="text-right"><p className="text-stone-500"><UiText>AI Score</UiText></p><p className="font-bold text-[var(--ck-role-accent)]">{m.matchScore}%</p></div>)}
                                </div>
                                {isDonorReview && (
                                  <div className="space-y-2 pt-1">
                                    {!isDeclining ? (
                                      <div className="flex gap-2">
                                        <button disabled={reviewLoading === m.id} onClick={async () => { setReviewLoading(m.id); try { await donorAcceptMatch(m.id); toast.success(ui("Match accepted! Admin will review shortly.")); await refreshMatches(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : ui("Failed to accept match")); } finally { setReviewLoading(null); } }} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                          {reviewLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />} <UiText>Accept</UiText>
                                        </button>
                                        <button disabled={reviewLoading === m.id} onClick={() => { setDeclineMatchId(m.id); setDeclineReason(""); setDeclineConditionChanged(false); }} className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                          <ThumbsDown className="w-3.5 h-3.5" /> <UiText>Decline</UiText>
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <input type="text" placeholder={ui("Optional reason for declining...")} value={declineReason} onChange={e => setDeclineReason(e.target.value)} className="w-full text-xs border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-400" />
                                        <label className="flex items-center gap-1.5 text-2xs text-stone-500 cursor-pointer select-none">
                                          <input type="checkbox" checked={declineConditionChanged} onChange={e => setDeclineConditionChanged(e.target.checked)} className="rounded border-stone-300" />
                                          <UiText>The item&apos;s condition has changed since I listed it (pauses the listing)</UiText>
                                        </label>
                                        <div className="flex gap-2">
                                          <button disabled={reviewLoading === m.id} onClick={async () => { setReviewLoading(m.id); try { await donorRejectMatch(m.id, declineReason || undefined, declineConditionChanged); toast.success(ui("Match declined. We're finding the next best donor.")); setDeclineMatchId(null); await refreshMatches(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : ui("Failed to decline match")); } finally { setReviewLoading(null); } }} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                            {reviewLoading === m.id ? ui("Declining...") : ui("Confirm Decline")}
                                          </button>
                                          <button onClick={() => setDeclineMatchId(null)} className="px-3 py-2 text-xs text-stone-500 hover:text-stone-800 rounded-lg border border-stone-200 dark:border-zinc-700"><UiText>Cancel</UiText></button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {m.status === "DONEE_ACCEPTED" && (
                                  <div className="space-y-1 pt-1">
                                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                      <Check className="w-3 h-3" /> <UiText>Donee confirmed — please give your final confirmation</UiText>
                                    </p>
                                    <button
                                      disabled={reviewLoading === m.id}
                                      onClick={async () => {
                                        setReviewLoading(m.id);
                                        try {
                                          await donorConfirmMatch(m.id);
                                          toast.success(ui("Donation confirmed! Logistics will be arranged next."));
                                          await refreshMatches();
                                        } catch (e: unknown) {
                                          toast.error(e instanceof Error ? e.message : ui("Failed to confirm"));
                                        } finally { setReviewLoading(null); }
                                      }}
                                      className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all"
                                    >
                                      {reviewLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> <UiText>Confirm Donation</UiText></>}
                                    </button>
                                  </div>
                                )}
                                {HANDOVER_HUB_STATUSES.has(m.status) && (
                                  <div className="flex gap-2 pt-1">
                                    <Link href={`/matches/${m.id}/handover`} className="flex flex-1 items-center justify-center gap-1.5 bg-[var(--ck-role-accent)] hover:bg-[var(--ck-role-hover)] text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                      <Truck className="w-3.5 h-3.5" /> <UiText>Go to Handover Hub</UiText>
                                    </Link>
                                    <button
                                      onClick={() => setChatMatch(m)}
                                      className="flex items-center justify-center gap-1.5 border border-[var(--ck-role-accent)]/40 text-[var(--ck-role-accent)] hover:bg-[var(--ck-role-accent)]/5 dark:text-[var(--ck-role-secondary)] dark:border-[var(--ck-role-secondary)]/40 text-xs font-bold py-2 px-3 rounded-lg transition-all"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" /> <UiText>Chat</UiText>
                                    </button>
                                  </div>
                                )}
                                <WithdrawFlowButton kind="match" id={m.id} role="DONOR" onChanged={refreshMatches} className="w-full" />
                                {m.status === "COMPLETED" && (
                                  <Link href={`/certificate?matchId=${m.id}`} className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                    <Award className="w-3.5 h-3.5" /> <UiText>View Certificate</UiText>
                                  </Link>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                    )}
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
                        <p className="text-xs text-stone-500"><UiText>Total Needs Posted</UiText></p>
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
                        <p className="text-xs text-stone-500"><UiText>Fulfilled Needs</UiText></p>
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
                        <CardTitle className="text-sm sm:text-base font-bold"><UiText>My Needs & Requests</UiText></CardTitle>
                        <div className="flex items-center gap-2">
                          <Link href="/dashboard/history" className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors text-xs font-bold text-stone-600 dark:text-stone-300">
                            <History className="w-3.5 h-3.5" /> <UiText>History</UiText>
                          </Link>
                          <NewRequestLink href="/requests/new">
                            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-[var(--ck-role-accent)]">
                              <Plus className="w-3.5 h-3.5 mr-1" /> <UiText>New Need</UiText>
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
                              ? ui("Every need you posted has been fulfilled — see History.")
                              : <UiText>You haven&apos;t posted any active needs yet.</UiText>}
                          </p>
                          <NewRequestLink href="/requests/new" className="inline-block mt-3">
                            <Button size="sm" className="bg-[var(--ck-role-accent)] text-white">
                              {doneeRequestGroups.fulfilled.length > 0 ? ui("Post a new need") : ui("Post your first need")}
                            </Button>
                          </NewRequestLink>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Pending Requests */}
                          {doneeRequestGroups.pending.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 px-2"><UiText>Pending</UiText></h4>
                              <div className="divide-y space-y-3">
                                {doneeRequestGroups.pending.map((r) => <CompactRequestRow key={r.id} request={r} />)}
                              </div>
                            </div>
                          )}

                          {/* Partially Fulfilled Requests */}
                          {doneeRequestGroups.partial.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 px-2"><UiText>Partially Fulfilled</UiText></h4>
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
                                          {pl(badge.label)}
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 mt-1">
                                        <div className="bg-white dark:bg-zinc-800 rounded p-1.5 text-center shadow-sm border border-stone-100 dark:border-zinc-700">
                                          <p className="text-[10px] text-stone-500 uppercase tracking-wider"><UiText>Requested</UiText></p>
                                          <p className="font-bold text-sm text-stone-700 dark:text-stone-300">{f.requested}</p>
                                        </div>
                                        <div className="bg-white dark:bg-zinc-800 rounded p-1.5 text-center shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                                          <p className="text-[10px] text-emerald-600 uppercase tracking-wider"><UiText>Fulfilled</UiText></p>
                                          <p className="font-bold text-sm text-emerald-600">{f.fulfilled}</p>
                                        </div>
                                        <div className="bg-[var(--ck-role-accent)] text-white rounded p-1.5 text-center shadow-sm">
                                          <p className="text-[10px] uppercase tracking-wider opacity-90"><UiText>Remaining</UiText></p>
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
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 px-2"><UiText>Closed</UiText></h4>
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
                      <CardTitle className="text-sm sm:text-base font-bold"><UiText>Matches &amp; Handover Status</UiText></CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 relative z-10">
                      {doneeMatches.filter(m => m.status !== "FULFILLED" && m.status !== "COMPLETED").length === 0 ? (
                        <div className="py-7 sm:py-12 text-center">
                          <p className="text-sm text-stone-400"><UiText>No active matches found for your requests yet.</UiText></p>
                          <p className="text-xs text-stone-400/80 mt-1"><UiText>We are actively checking private inventory to find matching items.</UiText></p>
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
                                      <UiText>Matched item:</UiText> <MatchItemText m={m} fallback={ui("Donated Item")} />
                                    </p>
                                    <p className="text-xs text-stone-400 mt-0.5"><UiText>For your need:</UiText> <TranslatedText text={m.requestTitle || ""} /></p>
                                  </div>
                                  <Badge variant={badge.variant} className="text-3xs whitespace-nowrap">{pl(badge.label)}</Badge>
                                </div>
                                <div className="flex flex-wrap justify-between items-center text-xs bg-stone-100/60 dark:bg-zinc-950 p-2.5 rounded-xl gap-2">
                                  <div><p className="text-stone-500"><UiText>Donor</UiText></p><p className="font-semibold text-stone-700 dark:text-stone-300">{m.donorName}</p></div>
                                  {m.matchScore && (<div className="text-right"><p className="text-stone-500"><UiText>AI Score</UiText></p><p className="font-bold text-[var(--ck-role-accent)]">{m.matchScore}%</p></div>)}
                                </div>
                                {HANDOVER_HUB_STATUSES.has(m.status) && (
                                  <div className="flex gap-2 pt-1">
                                    <Link href={`/matches/${m.id}/handover`} className="flex flex-1 items-center justify-center gap-1.5 bg-[#1e3a60] hover:bg-[#162d4a] text-white text-xs font-bold py-2 px-3 rounded-lg transition-all">
                                      <Truck className="w-3.5 h-3.5" /> <UiText>Go to Handover Hub</UiText>
                                    </Link>
                                    <button
                                      onClick={() => setChatMatch(m)}
                                      className="flex items-center justify-center gap-1.5 border border-[#1e3a60]/40 text-[#1e3a60] hover:bg-[#1e3a60]/5 dark:text-blue-400 dark:border-blue-400/40 text-xs font-bold py-2 px-3 rounded-lg transition-all"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" /> <UiText>Chat</UiText>
                                    </button>
                                  </div>
                                )}
                                <WithdrawFlowButton kind="match" id={m.id} role="DONEE" onChanged={refreshMatches} className="w-full" />
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
            partnerName={(iAmDonee ? chatMatch.donorName : chatMatch.doneeName) || ui("Match partner")}
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
        onWithdrawPrompt={(id) => setWithdrawListingId(id)}
        onDelete={handleDeleteListing}
        actionLoading={listingActionLoading}
      />

      <WithdrawListingDialog
        listingId={withdrawListingId}
        open={withdrawListingId !== null}
        onOpenChange={(open) => { if (!open) setWithdrawListingId(null); }}
        onConfirmed={async (id) => {
          await handleListingAction(id, "withdraw");
          if (selectedListing?.id === id) {
            setSelectedListing(null);
          }
        }}
      />
    </div>
  );
}

/** Display text for the English stage copy above (the builders stay English: tests and callers compare it). */
export function usePageLabels(): (text: string | null | undefined) => string {
  const ui = useUiText();
  const map = new Map<string, string>([
    ["Fulfilled", ui("Fulfilled")],
    ["Live — Matching", ui("Live — Matching")],
    ["Paused", ui("Paused")],
    ["Draft", ui("Draft")],
    ["Under Review", ui("Under Review")],
    ["More Info Needed", ui("More Info Needed")],
    ["Manual Review", ui("Manual Review")],
    ["Soft Reserved", ui("Soft Reserved")],
    ["Matched", ui("Matched")],
    ["Partially Donated", ui("Partially Donated")],
    ["Rejected", ui("Rejected")],
    ["Withdrawn", ui("Withdrawn")],
    ["Expired", ui("Expired")],
    ["Confirm it's available", ui("Confirm it's available")],
    ["Give final confirmation", ui("Give final confirmation")],
    ["Admin reviewing", ui("Admin reviewing")],
    ["Waiting on recipient", ui("Waiting on recipient")],
    ["Delivered — awaiting confirmation", ui("Delivered — awaiting confirmation")],
    ["Handover in progress", ui("Handover in progress")],
    ["⚠ Awaiting Donor's Confirmation", ui("⚠ Awaiting Donor's Confirmation")],
    ["Donor Declined", ui("Donor Declined")],
    ["Pending Admin Approval", ui("Pending Admin Approval")],
    ["Discussion Enabled", ui("Discussion Enabled")],
    ["Delivery Agreed", ui("Delivery Agreed")],
    ["Pickup Scheduled", ui("Pickup Scheduled")],
    ["Picked Up", ui("Picked Up")],
    ["In Transit", ui("In Transit")],
    ["Delivered (Pending)", ui("Delivered (Pending)")],
    ["Completed & Closed", ui("Completed & Closed")],
    ["Delivery Failed", ui("Delivery Failed")],
    ["Match Cancelled", ui("Match Cancelled")],
    ["Match Rejected", ui("Match Rejected")],
    ["Under Verification", ui("Under Verification")],
    ["Finding a donor", ui("Finding a donor")],
    ["Match Pending Approval", ui("Match Pending Approval")],
    ["Consent Needed", ui("Consent Needed")],
    ["Public Appeal", ui("Public Appeal")],
    ["Reserved", ui("Reserved")],
    ["Match In Progress", ui("Match In Progress")],
    ["Fulfilment In Progress", ui("Fulfilment In Progress")],
    ["Partially Matched", ui("Partially Matched")],
    ["Partially Fulfilled", ui("Partially Fulfilled")],
    ["On Hold", ui("On Hold")],
    ["Completed", ui("Completed")],
    ["Complete your item details and photos to submit the offer.", ui("Complete your item details and photos to submit the offer.")],
    ["Continue offer", ui("Continue offer")],
    ["Submitted", ui("Submitted")],
    ["Your offer has been submitted and is queued for AI screening.", ui("Your offer has been submitted and is queued for AI screening.")],
    ["AI Eligibility Check", ui("AI Eligibility Check")],
    ["We are checking if your item is safe and eligible to donate.", ui("We are checking if your item is safe and eligible to donate.")],
    ["AI Compatibility Check", ui("AI Compatibility Check")],
    ["We are comparing your item details against the request requirements.", ui("We are comparing your item details against the request requirements.")],
    ["Compatibility Checked", ui("Compatibility Checked")],
    ["AI check is complete. Sending to the recipient for review.", ui("AI check is complete. Sending to the recipient for review.")],
    ["More Information Needed", ui("More Information Needed")],
    ["Your offer needs additional details before it can proceed.", ui("Your offer needs additional details before it can proceed.")],
    ["Update details", ui("Update details")],
    ["Sent to Recipient", ui("Sent to Recipient")],
    ["Your offer is the primary offer and the recipient is reviewing it.", ui("Your offer is the primary offer and the recipient is reviewing it.")],
    ["Backup Offer", ui("Backup Offer")],
    ["Your offer is on standby as a backup in case the primary offer falls through.", ui("Your offer is on standby as a backup in case the primary offer falls through.")],
    ["Recipient Reviewing", ui("Recipient Reviewing")],
    ["The recipient is reviewing your item photos and details.", ui("The recipient is reviewing your item photos and details.")],
    ["Recipient Accepted", ui("Recipient Accepted")],
    ["Great! The recipient accepted your offer. Waiting for you to reconfirm.", ui("Great! The recipient accepted your offer. Waiting for you to reconfirm.")],
    ["Reconfirm availability", ui("Reconfirm availability")],
    ["Recipient Declined", ui("Recipient Declined")],
    ["The recipient declined this offer.", ui("The recipient declined this offer.")],
    ["Reconfirmation Required", ui("Reconfirmation Required")],
    ["Please confirm your item is still available and in the same condition.", ui("Please confirm your item is still available and in the same condition.")],
    ["Confirm item is ready", ui("Confirm item is ready")],
    ["Reconfirmed", ui("Reconfirmed")],
    ["You confirmed availability. Waiting for CauseKind admin to do a final review.", ui("You confirmed availability. Waiting for CauseKind admin to do a final review.")],
    ["Re-screening", ui("Re-screening")],
    ["Item condition changed — AI is re-checking your updated details.", ui("Item condition changed — AI is re-checking your updated details.")],
    ["Admin Reviewing", ui("Admin Reviewing")],
    ["CauseKind admin is doing a final check before approving the handover.", ui("CauseKind admin is doing a final check before approving the handover.")],
    ["Approved! Schedule Handover", ui("Approved! Schedule Handover")],
    ["Your offer was approved. Please schedule the handover now.", ui("Your offer was approved. Please schedule the handover now.")],
    ["Go to Handover Hub", ui("Go to Handover Hub")],
    ["Rejected by Admin", ui("Rejected by Admin")],
    ["Admin could not approve this offer. See the reason and your next steps below.", ui("Admin could not approve this offer. See the reason and your next steps below.")],
    ["Browse other requests", ui("Browse other requests")],
    ["NGO Reviewing", ui("NGO Reviewing")],
    ["The NGO is reviewing your photos and details.", ui("The NGO is reviewing your photos and details.")],
    ["Accepted! Plan Handover", ui("Accepted! Plan Handover")],
    ["The NGO accepted your offer. Plan the handover now.", ui("The NGO accepted your offer. Plan the handover now.")],
    ["Declined by NGO", ui("Declined by NGO")],
    ["The NGO could not use this offer. See the reason below.", ui("The NGO could not use this offer. See the reason below.")],
    ["Browse other needs", ui("Browse other needs")],
    ["Drive Ended", ui("Drive Ended")],
    ["This drive closed before your offer was handed over.", ui("This drive closed before your offer was handed over.")],
    ["Handover in Progress", ui("Handover in Progress")],
    ["The handover is scheduled. Confirm the OTP when you physically hand over the item.", ui("The handover is scheduled. Confirm the OTP when you physically hand over the item.")],
    ["Open Handover Hub", ui("Open Handover Hub")],
    ["Handover At Risk", ui("Handover At Risk")],
    ["The handover has been rescheduled multiple times. Admin review may be required.", ui("The handover has been rescheduled multiple times. Admin review may be required.")],
    ["View Handover Hub", ui("View Handover Hub")],
    ["Issue Window Open", ui("Issue Window Open")],
    ["Delivery confirmed! Both parties can report any problems within the issue window.", ui("Delivery confirmed! Both parties can report any problems within the issue window.")],
    ["Report an issue", ui("Report an issue")],
    ["Issue Under Review", ui("Issue Under Review")],
    ["An issue has been reported. Our team is looking into it.", ui("An issue has been reported. Our team is looking into it.")],
    ["Donation Complete!", ui("Donation Complete!")],
    ["The donation was successfully completed.", ui("The donation was successfully completed.")],
    ["View Certificate", ui("View Certificate")],
    ["Cancelled", ui("Cancelled")],
    ["This offer was cancelled.", ui("This offer was cancelled.")],
    ["You withdrew this offer.", ui("You withdrew this offer.")],
    ["Not approved", ui("Not approved")],
    ["You declined", ui("You declined")],
    ["Delivered", ui("Delivered")],
    ["Received", ui("Received")],
    ["Donor declined", ui("Donor declined")],
    ["Delivery failed", ui("Delivery failed")],
  ]);
  return (text) => (text ? map.get(text) ?? text : "");
}
