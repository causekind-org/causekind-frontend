"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X, CheckCircle2, AlertCircle, Clock, Circle,
  MapPin, Package, Wrench, Tag, Layers, FileText,
  Truck, CalendarDays, Box, Info, ChevronRight,
} from "lucide-react";
import type { ItemListing } from "@/lib/api";

// ── Journey phases ────────────────────────────────────────────────────────────

const PHASES = [
  {
    key: "DRAFT",
    label: "Draft Created",
    done: "You started your listing.",
    current: "Your listing is saved as a draft. Complete all steps and submit.",
    upcoming: "Create a listing by clicking List an Item.",
  },
  {
    key: "SUBMITTED",
    label: "Submitted for Review",
    done: "Your listing was submitted to CauseKind.",
    current: "Your listing is queued for screening.",
    upcoming: "After you submit, it enters our review pipeline.",
  },
  {
    key: "AI_SCREENING",
    label: "AI Safety Check",
    done: "Automated check passed — images and description look good.",
    current: "Our automated system is checking your images and description now.",
    upcoming: "An automated check verifies the item, images and description match.",
    problem: "The automated check flagged an issue with your listing.",
    review: "Passed to our team for manual review (usually 24–48 hours).",
  },
  {
    key: "ELIGIBLE_FOR_MATCHING",
    label: "Live — Matching",
    done: "Your item entered the matching pool.",
    current: "Your item is live. The system is scanning for compatible requests.",
    upcoming: "Once approved, your item is matched with verified recipient requests.",
  },
  {
    key: "SOFT_RESERVED",
    label: "Match Found — Confirming",
    done: "A match was found and you confirmed availability.",
    current: "A potential recipient was identified. We need you to confirm the item is still available.",
    upcoming: "When a request matches your item, we ask you to reconfirm availability before the recipient sees it.",
  },
  {
    key: "MATCHED",
    label: "Approved by CauseKind",
    done: "CauseKind admin verified and approved the match.",
    current: "Both parties have agreed. Our team is doing a final review.",
    upcoming: "After mutual consent, a CauseKind admin does a final check before enabling contact.",
  },
  {
    key: "HANDOVER",
    label: "Handover Hub",
    done: "Delivery was coordinated through the Handover Hub.",
    current: "You can now coordinate delivery through the Handover Hub. Use the OTP for verified handover.",
    upcoming: "After admin approval, the Handover Hub opens for scheduling, masked communication and OTP-verified delivery.",
  },
  {
    key: "DONATED",
    label: "Donated 🎉",
    done: "Item successfully donated. Your Donation Certificate has been issued.",
    current: "Donation verified. Your certificate is being generated.",
    upcoming: "After verified handover, your Donation Certificate is issued.",
  },
];

// Map listing status → phase index + variant
type PhaseVariant = "done" | "current" | "problem" | "review" | "upcoming";

interface PhaseResult {
  state: PhaseVariant;
  contextMessage?: string;
}

function getPhaseResults(status: string): PhaseResult[] {
  // Special statuses that sit between phases
  if (status === "NEEDS_INFORMATION") {
    return PHASES.map((_, i) => {
      if (i < 2) return { state: "done" };
      if (i === 2) return {
        state: "problem",
        contextMessage: "Action needed: your listing was flagged for missing or unclear information. Update your listing and resubmit.",
      };
      return { state: "upcoming" };
    });
  }

  if (status === "MANUAL_REVIEW") {
    return PHASES.map((_, i) => {
      if (i < 2) return { state: "done" };
      if (i === 2) return {
        state: "review",
        contextMessage: "Your listing is being reviewed by our team manually. This usually takes 24–48 hours.",
      };
      return { state: "upcoming" };
    });
  }

  if (status === "PAUSED") {
    return PHASES.map((_, i) => {
      if (i < 3) return { state: "done" };
      if (i === 3) return {
        state: "current",
        contextMessage: "Your listing is paused and not visible to the matching engine. Resume it when you're ready.",
      };
      return { state: "upcoming" };
    });
  }

  // Normal status → phase index map
  const STATUS_IDX: Record<string, number> = {
    DRAFT: 0,
    SUBMITTED: 1,
    AI_SCREENING: 2,
    ELIGIBLE_FOR_MATCHING: 3,
    AVAILABLE: 3,
    SOFT_RESERVED: 4,
    MATCHED: 5,
    PARTIALLY_DONATED: 6,
    DONATED: 7,
    FULFILLED: 7,
    REJECTED: -1,
    EXPIRED: -1,
    WITHDRAWN: -1,
  };

  const currentIdx = STATUS_IDX[status] ?? -1;

  return PHASES.map((_, i) => {
    if (currentIdx < 0) return { state: "upcoming" };
    if (i < currentIdx) return { state: "done" };
    if (i === currentIdx) return { state: "current" };
    return { state: "upcoming" };
  });
}

// ── Phase icon ────────────────────────────────────────────────────────────────

function PhaseIcon({ state }: { state: PhaseVariant }) {
  if (state === "done")
    return <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />;
  if (state === "current")
    return <div className="w-5 h-5 rounded-full border-2 border-[#1e3a60] bg-[#1e3a60]/10 shrink-0 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-[#1e3a60] animate-pulse" /></div>;
  if (state === "problem")
    return <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />;
  if (state === "review")
    return <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-spin" style={{ animationDuration: "3s" }} />;
  return <Circle className="w-5 h-5 text-stone-300 dark:text-zinc-600 shrink-0" />;
}

// ── Detail row helper ─────────────────────────────────────────────────────────

function Detail({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
      <div>
        <span className="text-[10px] text-stone-400 uppercase tracking-wide block">{label}</span>
        <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">{value}</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  listing: ItemListing | null;
  onClose: () => void;
  onAction: (id: number, action: "pause" | "resume" | "withdraw") => Promise<void>;
  actionLoading: number | null;
}

export function ListingDetailPanel({ listing, onClose, onAction, actionLoading }: Props) {
  // Lock body scroll while open
  useEffect(() => {
    if (listing) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [listing]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!listing) return null;

  const photos = [
    listing.imageUrl,
    ...(listing.imageUrls ? listing.imageUrls.split("|") : []),
  ].filter(Boolean) as string[];

  const phaseResults = getPhaseResults(listing.status);
  const statusMeta: Record<string, { label: string; color: string }> = {
    DRAFT:                 { label: "Draft",            color: "text-stone-500 bg-stone-100 border-stone-300" },
    SUBMITTED:             { label: "Under Review",     color: "text-blue-700 bg-blue-50 border-blue-200" },
    AI_SCREENING:          { label: "AI Screening",     color: "text-blue-700 bg-blue-50 border-blue-200" },
    NEEDS_INFORMATION:     { label: "More Info Needed", color: "text-amber-700 bg-amber-50 border-amber-300" },
    MANUAL_REVIEW:         { label: "Manual Review",    color: "text-amber-700 bg-amber-50 border-amber-300" },
    ELIGIBLE_FOR_MATCHING: { label: "Live — Matching",  color: "text-green-700 bg-green-50 border-green-300" },
    AVAILABLE:             { label: "Live — Matching",  color: "text-green-700 bg-green-50 border-green-300" },
    SOFT_RESERVED:         { label: "Match Found",      color: "text-teal-700 bg-teal-50 border-teal-300" },
    MATCHED:               { label: "Matched",          color: "text-emerald-700 bg-emerald-50 border-emerald-300" },
    PAUSED:                { label: "Paused",           color: "text-stone-600 bg-stone-100 border-stone-300" },
    PARTIALLY_DONATED:     { label: "Partially Donated",color: "text-emerald-700 bg-emerald-50 border-emerald-300" },
    DONATED:               { label: "Donated",          color: "text-emerald-700 bg-emerald-50 border-emerald-300" },
    FULFILLED:             { label: "Fulfilled",        color: "text-emerald-700 bg-emerald-50 border-emerald-300" },
    EXPIRED:               { label: "Expired",          color: "text-red-600 bg-red-50 border-red-300" },
    WITHDRAWN:             { label: "Withdrawn",        color: "text-red-600 bg-red-50 border-red-300" },
    REJECTED:              { label: "Rejected",         color: "text-red-600 bg-red-50 border-red-300" },
  };
  const meta = statusMeta[listing.status] ?? { label: listing.status, color: "text-stone-500 bg-stone-100 border-stone-200" };

  const isNeedsInfo = listing.status === "NEEDS_INFORMATION";
  const isEligible  = listing.status === "ELIGIBLE_FOR_MATCHING" || listing.status === "AVAILABLE";
  const isPaused    = listing.status === "PAUSED";
  const isTerminal  = ["DONATED", "FULFILLED", "REJECTED", "WITHDRAWN", "EXPIRED"].includes(listing.status);

  // Find first context message across phases
  const contextPhase = phaseResults.find(r => r.contextMessage);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Panel — slides from right on desktop, from bottom on mobile */}
      <div className="fixed z-50 inset-x-0 bottom-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[460px] flex flex-col bg-white dark:bg-zinc-950 shadow-2xl
        rounded-t-2xl lg:rounded-none
        max-h-[92vh] lg:max-h-full
        animate-in slide-in-from-bottom lg:slide-in-from-right duration-300">

        {/* Handle bar (mobile) */}
        <div className="lg:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-stone-100 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="font-extrabold text-stone-900 dark:text-stone-50 text-base leading-tight truncate">{listing.title}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
              {listing.category && <span className="text-[10px] text-stone-400">{listing.category}{listing.subcategory ? ` · ${listing.subcategory}` : ""}</span>}
              <span className="text-[10px] text-stone-400">Qty: {listing.quantity}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors mt-0.5"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Photos */}
          {photos.length > 0 && (
            <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-none border-b border-stone-100 dark:border-zinc-800">
              {photos.map((src, i) => (
                <div key={i} className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700">
                  <Image src={src} alt={`Photo ${i + 1}`} fill className="object-cover" unoptimized />
                  {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] bg-[#1e3a60] text-white rounded px-1 py-0.5 font-bold">MAIN</span>}
                </div>
              ))}
            </div>
          )}

          {/* ── Journey Timeline ─────────────────────────────────────────── */}
          <div className="px-5 py-4 border-b border-stone-100 dark:border-zinc-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">Donation Journey</p>

            <div className="space-y-0">
              {PHASES.map((phase, i) => {
                const result = phaseResults[i];
                const state = result.state;
                const isDone    = state === "done";
                const isCurrent = state === "current" || state === "review";
                const isProblem = state === "problem";
                const isUpcoming = state === "upcoming";
                const isLast = i === PHASES.length - 1;

                let bodyText = phase.upcoming;
                if (isDone)    bodyText = phase.done;
                if (isCurrent) bodyText = phase.current;
                if (isProblem) bodyText = phase.problem ?? phase.current;
                if (state === "review") bodyText = phase.review ?? phase.current;

                return (
                  <div key={phase.key} className="flex gap-3">
                    {/* Connector column */}
                    <div className="flex flex-col items-center">
                      <PhaseIcon state={state} />
                      {!isLast && (
                        <div className={`w-0.5 flex-1 mt-1 mb-1 min-h-[24px] rounded-full ${isDone ? "bg-green-300 dark:bg-green-700" : "bg-stone-200 dark:bg-zinc-700"}`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`pb-4 flex-1 min-w-0 ${isLast ? "pb-0" : ""}`}>
                      <p className={`text-sm font-bold leading-tight ${
                        isDone    ? "text-stone-700 dark:text-stone-300" :
                        isCurrent ? "text-[#1e3a60] dark:text-blue-300" :
                        isProblem ? "text-amber-700 dark:text-amber-400" :
                        state === "review" ? "text-amber-600 dark:text-amber-400" :
                        "text-stone-400 dark:text-zinc-500"
                      }`}>
                        {phase.label}
                        {(isCurrent || isProblem || state === "review") && (
                          <span className={`ml-2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            isProblem ? "bg-amber-100 text-amber-700 border border-amber-300" :
                            state === "review" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                            "bg-[#1e3a60]/10 text-[#1e3a60] border border-[#1e3a60]/20"
                          }`}>
                            {isProblem ? "Action Needed" : state === "review" ? "In Review" : "Now"}
                          </span>
                        )}
                      </p>
                      <p className={`text-xs mt-0.5 leading-relaxed ${
                        isUpcoming ? "text-stone-300 dark:text-zinc-600" : "text-stone-500 dark:text-stone-400"
                      }`}>
                        {bodyText}
                      </p>

                      {/* Context message for this phase */}
                      {result.contextMessage && (
                        <div className={`mt-2 text-xs rounded-lg p-2.5 leading-relaxed font-medium flex items-start gap-1.5 ${
                          isProblem ? "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800" :
                          "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
                        }`}>
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          {result.contextMessage}
                        </div>
                      )}

                      {/* Admin note on the NEEDS_INFORMATION phase */}
                      {isProblem && listing.rejectionReason && (
                        <div className="mt-1.5 text-xs rounded-lg p-2 bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-medium">
                          Admin note: {listing.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Item Details ─────────────────────────────────────────────── */}
          <div className="px-5 py-4 border-b border-stone-100 dark:border-zinc-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Item Details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Detail icon={Tag}      label="Condition"      value={listing.condition} />
              <Detail icon={Layers}   label="Age"            value={listing.approximateAge} />
              <Detail icon={Wrench}   label="Working Status" value={listing.workingStatus?.replace(/_/g, " ")} />
              <Detail icon={Package}  label="Quantity"       value={String(listing.quantity)} />
              {listing.brand && <Detail icon={Tag}   label="Brand"  value={listing.brand} />}
              {listing.model && <Detail icon={Tag}   label="Model"  value={listing.model} />}
              {listing.dimensions && <Detail icon={Box}  label="Dimensions"  value={listing.dimensions} />}
              {listing.approximateWeight && <Detail icon={Box} label="Weight" value={listing.approximateWeight} />}
            </div>

            {listing.knownDefects && listing.knownDefects !== "NONE" && (
              <div className="mt-3 text-xs text-stone-600 dark:text-stone-400">
                <span className="font-bold text-stone-700 dark:text-stone-300">Known defects: </span>
                {listing.knownDefects}
              </div>
            )}
            {listing.accessoriesIncluded && (
              <div className="mt-1.5 text-xs text-stone-600 dark:text-stone-400">
                <span className="font-bold text-stone-700 dark:text-stone-300">Accessories: </span>
                {listing.accessoriesIncluded}
              </div>
            )}
            {listing.description && (
              <div className="mt-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Description</p>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">{listing.description}</p>
              </div>
            )}
          </div>

          {/* ── Location & Delivery ──────────────────────────────────────── */}
          <div className="px-5 py-4 border-b border-stone-100 dark:border-zinc-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Location & Delivery</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Detail icon={MapPin}      label="City"      value={listing.city?.split(",")[0]} />
              <Detail icon={MapPin}      label="PIN Code"  value={listing.pincode ?? undefined} />
              {listing.locality && <Detail icon={MapPin} label="Locality" value={listing.locality} />}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {listing.pickupDays && (
                <span className="text-[10px] bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-stone-400 rounded-full px-2 py-0.5 font-semibold">
                  Pickup: {listing.pickupDays.split(",").slice(0, 3).join(", ")}{listing.pickupDays.split(",").length > 3 ? "…" : ""}
                </span>
              )}
              {listing.donorDropOffAvailable && (
                <span className="text-[10px] bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 rounded-full px-2 py-0.5 font-semibold flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Drop-off available {listing.maxTravelDistance ? `(${listing.maxTravelDistance}km)` : ""}
                </span>
              )}
              {listing.packagingAvailable === "YES" && (
                <span className="text-[10px] bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-full px-2 py-0.5 font-semibold">
                  Packaging available
                </span>
              )}
              {listing.specialHandling && listing.specialHandling.split("|").slice(0, 2).map(h => (
                <span key={h} className="text-[10px] bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 rounded-full px-2 py-0.5 font-semibold">
                  {h}
                </span>
              ))}
            </div>
            {listing.preferredHandoverDate && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                <CalendarDays className="w-3.5 h-3.5" />
                Earliest handover: <span className="font-semibold">{listing.preferredHandoverDate}</span>
              </div>
            )}
          </div>

          {/* Listing submitted date */}
          {listing.submittedAt && (
            <div className="px-5 py-3 border-b border-stone-100 dark:border-zinc-800">
              <p className="text-[10px] text-stone-400">
                Submitted on {new Date(listing.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          )}
        </div>

        {/* ── Sticky action bar ────────────────────────────────────────────── */}
        {!isTerminal && (
          <div className="border-t border-stone-100 dark:border-zinc-800 px-5 py-4 flex flex-wrap gap-2 bg-white dark:bg-zinc-950">
            {isNeedsInfo && (
              <Link href={`/items/${listing.id}/edit`} className="flex-1">
                <button className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors">
                  Edit & Resubmit <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            )}
            {isEligible && (
              <button
                onClick={() => onAction(listing.id, "pause")}
                disabled={actionLoading === listing.id}
                className="flex-1 text-sm font-semibold py-2.5 px-4 rounded-xl border border-stone-300 dark:border-zinc-600 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {actionLoading === listing.id ? "Pausing…" : "Pause"}
              </button>
            )}
            {isPaused && (
              <button
                onClick={() => onAction(listing.id, "resume")}
                disabled={actionLoading === listing.id}
                className="flex-1 text-sm font-semibold py-2.5 px-4 rounded-xl border border-green-400 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors disabled:opacity-50"
              >
                {actionLoading === listing.id ? "Resuming…" : "Resume Listing"}
              </button>
            )}
            <button
              onClick={() => { if (confirm("Withdraw this listing? This cannot be undone.")) onAction(listing.id, "withdraw"); }}
              disabled={actionLoading === listing.id}
              className="text-sm font-semibold py-2.5 px-4 rounded-xl border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
            >
              Withdraw
            </button>
          </div>
        )}
      </div>
    </>
  );
}
