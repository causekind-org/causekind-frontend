"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ClipboardList,
  Camera,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import { useNgoStatus, triggerNgoLockedToast } from "./useNgoStatus";

interface NgoRequestsDropdownProps {
  onNavigate?: () => void;
}

export default function NgoRequestsDropdown({ onNavigate }: NgoRequestsDropdownProps) {
  const router = useRouter();
  const {
    isLoading, error, refresh,
    status,
    ngoName,
    isVerified,
    isPhotosDue,
    photosDueRequestName,
    canPostRequest,
    activeRequests,
    dropoffsToConfirm,
    photosDue,
  } = useNgoStatus();

  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerNgoLockedToast(status, isPhotosDue, photosDueRequestName, router);
  };

  // Status badge on top
  let statusBadge = (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-3xs font-bold uppercase tracking-wider bg-ngo-100/80 dark:bg-ngo-900/50 text-ngo-800 dark:text-ngo-200 border border-ngo-200 dark:border-ngo-800">
      <Clock className="w-3 h-3 text-ngo-700 dark:text-ngo-300" />
      Profile Incomplete
    </span>
  );

  if (isVerified) {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-3xs font-bold uppercase tracking-wider bg-emerald-500/10 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        Verified NGO Partner
      </span>
    );
  } else if (status === "under_review") {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-3xs font-bold uppercase tracking-wider bg-amber-500/10 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-500/20">
        <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        Under Review
      </span>
    );
  } else if (status === "changes_requested") {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-3xs font-bold uppercase tracking-wider bg-red-500/10 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-500/20">
        <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
        Changes Requested
      </span>
    );
  }

  if (isLoading) return <p role="status" className="p-4">Loading your organization’s activity…</p>;
  if (error) return <div role="alert" className="p-4"><p>{error}</p><button className="mt-2 underline" onClick={() => void refresh()}>Retry</button></div>;
  return (
    <div className="w-full">
      {/* ── Top Header Row ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-stone-200/70 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ngo-500/10 dark:bg-ngo-500/20 flex items-center justify-center text-ngo-700 dark:text-ngo-300 font-black text-sm">
            {ngoName ? ngoName.charAt(0).toUpperCase() : "N"}
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {ngoName || "NGO Management"}
            </h3>
            <p className="text-2xs text-stone-500 dark:text-stone-400">
              Manage your verified community in-kind requests &amp; drop-offs
            </p>
          </div>
        </div>
        <div>{statusBadge}</div>
      </div>

      {/* ── Main 3 Action Cards Grid ──────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5">
        {/* 1. Post a Request */}
        <div className="col-span-4">
          {canPostRequest ? (
            <Link
              href="/ngo/requests/new"
              onClick={onNavigate}
              className="group flex flex-col justify-between h-full p-5 rounded-2xl bg-white/70 dark:bg-black/55 hover:bg-white dark:hover:bg-black/75 border border-stone-200/70 dark:border-stone-800 hover:border-ngo-600/40 dark:hover:border-ngo-500/40 transition-all duration-300 shadow-2xs hover:shadow-md cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-xl bg-ngo-500/10 dark:bg-ngo-500/20 flex items-center justify-center text-ngo-700 dark:text-ngo-300 group-hover:scale-110 transition-transform duration-200">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    Create New
                  </span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-ngo-700 dark:group-hover:text-ngo-300 transition-colors mb-1.5 flex items-center gap-1.5">
                  Post a Request
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Request physical supplies, equipment, or emergency relief from givers within 10 km.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-ngo-700 dark:text-ngo-300 group-hover:translate-x-0.5 transition-transform">
                <span>Start new request</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </div>
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLockedClick}
              aria-disabled="true"
              className="w-full text-left group flex flex-col justify-between h-full p-5 rounded-2xl bg-stone-100/60 dark:bg-zinc-900/40 border border-dashed border-stone-300/80 dark:border-zinc-800 opacity-80 hover:opacity-100 transition-all duration-300 cursor-not-allowed"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-xl bg-stone-200/80 dark:bg-zinc-800 flex items-center justify-center text-stone-500 dark:text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Locked
                  </span>
                </div>
                <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center gap-1.5">
                  Post a Request
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  {isPhotosDue
                    ? `Upload photos for "${photosDueRequestName}" to unlock new posts.`
                    : "Unlocks once CauseKind verifies your NGO legal documents."}
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-medium text-amber-700 dark:text-amber-400">
                <span>{isPhotosDue ? "Photos due" : "Verification required"}</span>
              </div>
            </button>
          )}
        </div>

        {/* 2. Active Requests */}
        <div className="col-span-4">
          {isVerified ? (
            <Link
              href="/ngo/requests"
              onClick={onNavigate}
              className="group flex flex-col justify-between h-full p-5 rounded-2xl bg-white/70 dark:bg-black/55 hover:bg-white dark:hover:bg-black/75 border border-stone-200/70 dark:border-stone-800 hover:border-ngo-600/40 dark:hover:border-ngo-500/40 transition-all duration-300 shadow-2xs hover:shadow-md cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-xl bg-ngo-500/10 dark:bg-ngo-500/20 flex items-center justify-center text-ngo-700 dark:text-ngo-300 group-hover:scale-110 transition-transform duration-200">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-ngo-100 text-ngo-800 dark:bg-ngo-900/60 dark:text-ngo-200 border border-ngo-200 dark:border-ngo-800">
                    {activeRequests > 0 ? `${activeRequests} Active` : "Dashboard"}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-ngo-700 dark:group-hover:text-ngo-300 transition-colors mb-1.5 flex items-center gap-1.5">
                  Active Requests
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Monitor live requests, givers&apos; in-kind pledges, and current fulfillment status.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-ngo-700 dark:text-ngo-300 group-hover:translate-x-0.5 transition-transform">
                <span>View request list</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </div>
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLockedClick}
              aria-disabled="true"
              className="w-full text-left group flex flex-col justify-between h-full p-5 rounded-2xl bg-stone-100/60 dark:bg-zinc-900/40 border border-dashed border-stone-300/80 dark:border-zinc-800 opacity-80 hover:opacity-100 transition-all duration-300 cursor-not-allowed"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-xl bg-stone-200/80 dark:bg-zinc-800 flex items-center justify-center text-stone-500 dark:text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-stone-200/80 dark:bg-zinc-800 text-stone-600 dark:text-stone-400 border border-stone-300/60 dark:border-zinc-700 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Locked
                  </span>
                </div>
                <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center gap-1.5">
                  Active Requests
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Your organization&apos;s request management hub unlocks upon verification.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-medium text-stone-500 dark:text-stone-400">
                <span>Verification required</span>
              </div>
            </button>
          )}
        </div>

        {/* 3. Handovers & Photos */}
        <div className="col-span-4">
          {isVerified ? (
            <Link
              href="/ngo/handovers"
              onClick={onNavigate}
              className="group flex flex-col justify-between h-full p-5 rounded-2xl bg-white/70 dark:bg-black/55 hover:bg-white dark:hover:bg-black/75 border border-stone-200/70 dark:border-stone-800 hover:border-ngo-600/40 dark:hover:border-ngo-500/40 transition-all duration-300 shadow-2xs hover:shadow-md cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-xl bg-ngo-500/10 dark:bg-ngo-500/20 flex items-center justify-center text-ngo-700 dark:text-ngo-300 group-hover:scale-110 transition-transform duration-200">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-ngo-100 text-ngo-800 dark:bg-ngo-900/60 dark:text-ngo-200 border border-ngo-200 dark:border-ngo-800">
                    {dropoffsToConfirm > 0 ? `${dropoffsToConfirm} Drop-offs` : "Track"}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-ngo-700 dark:group-hover:text-ngo-300 transition-colors mb-1.5 flex items-center gap-1.5">
                  Handovers &amp; Photos
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Confirm drop-offs, verify handover OTPs, and upload delivery photo proof.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-ngo-700 dark:text-ngo-300 group-hover:translate-x-0.5 transition-transform">
                <span>Manage handovers</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </div>
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLockedClick}
              aria-disabled="true"
              className="w-full text-left group flex flex-col justify-between h-full p-5 rounded-2xl bg-stone-100/60 dark:bg-zinc-900/40 border border-dashed border-stone-300/80 dark:border-zinc-800 opacity-80 hover:opacity-100 transition-all duration-300 cursor-not-allowed"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-xl bg-stone-200/80 dark:bg-zinc-800 flex items-center justify-center text-stone-500 dark:text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-stone-200/80 dark:bg-zinc-800 text-stone-600 dark:text-stone-400 border border-stone-300/60 dark:border-zinc-700 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Locked
                  </span>
                </div>
                <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center gap-1.5">
                  Handovers &amp; Photos
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Drop-off tracking and photo uploads unlock upon verification.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-medium text-stone-500 dark:text-stone-400">
                <span>Verification required</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* ── Bottom Trust & Transparency Strip ─────────────────────── */}
      <div className="mt-6 pt-4 border-t border-stone-200/70 dark:border-zinc-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">Legally Verified NGOs</span>
          </div>
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-ngo-700 dark:text-ngo-300" />
            <span className="font-medium">100% Direct In-Kind Giving</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-medium">Photo-Proof Delivery Records</span>
          </div>
        </div>
        <Link
          href={isVerified ? "/profile" : "/profile/ngo-details"}
          onClick={onNavigate}
          className="flex items-center gap-1 font-semibold text-ngo-700 dark:text-ngo-300 hover:underline"
        >
          <span>{isVerified ? "View NGO Profile" : "Complete Verification"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
