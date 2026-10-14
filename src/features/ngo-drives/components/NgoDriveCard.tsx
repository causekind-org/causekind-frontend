"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MapPin, ShieldCheck, Heart, Package, Award } from "lucide-react";
import type { PublicNgoDrive } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { giveState, stillNeeded } from "@/features/ngo-drives/driveGiveState";
import { formatDaysLeft, formatBeneficiarySupport } from "@/features/ngo-drives/ngoDriveFilters";

export type NgoDriveCardProps = {
  drive: PublicNgoDrive;
  /** Optional custom click handler or link */
  className?: string;
};

export function NgoDriveCard({ drive, className = "" }: NgoDriveCardProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Reuse existing giveState logic
  const state = giveState(drive, user, []);

  const needed = drive.stillNeeded ?? stillNeeded(drive);
  const total = Math.max(1, drive.quantityNeeded);
  const receivedPct = Math.min(100, ((drive.quantityReceived ?? 0) / total) * 100);
  const pledgedPct = Math.min(100 - receivedPct, ((drive.quantityPledged ?? 0) / total) * 100);

  const daysInfo = formatDaysLeft(drive.neededBy);
  const beneficiaryText = formatBeneficiarySupport(drive.beneficiaryCount, drive.beneficiaryGroup);

  const isMoney = (drive.driveType ?? "").toUpperCase() === "MONEY";
  const urgencyUpper = (drive.urgency ?? "").toUpperCase();
  const isCritical = urgencyUpper === "CRITICAL" || urgencyUpper === "URGENT";
  const isHigh = urgencyUpper === "HIGH";

  const visual = CATEGORY_VISUALS[drive.category];
  const VisualIcon = visual?.Icon || Package;

  const displayLocation =
    [drive.locationArea, drive.locationCity].filter(Boolean).join(", ") || drive.ngoCity;

  const roleUpper = (user?.role ?? "").toUpperCase().replace(/^ROLE_/, "");
  const isDoneeOrNgo = roleUpper === "DONEE" || roleUpper === "NGO" || roleUpper === "NGO_PARTNER";

  // Button text and target
  let ctaLabel = "Give to this drive";
  let ctaHref = `/drives/${drive.id}/give`;
  let ctaDisabled = false;

  if (isDoneeOrNgo) {
    ctaLabel = "View drive";
    ctaHref = `/drives/${drive.id}`;
  } else if (state.kind === "login") {
    ctaHref = state.href;
  } else if (state.kind === "give") {
    ctaHref = state.href;
  } else if (state.kind === "continue") {
    ctaLabel = "Continue offer";
    ctaHref = state.href;
  } else if (state.kind === "offered") {
    ctaLabel = "View your offer";
    ctaHref = state.href;
  } else if (state.kind === "closed") {
    ctaLabel = needed === 0 ? "Fully offered" : "Drive closed";
    ctaDisabled = true;
  }

  const handleCtaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!ctaDisabled) {
      router.push(ctaHref);
    }
  };

  return (
    <Link
      href={`/drives/${drive.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
      data-testid={`ngo-drive-card-${drive.id}`}
    >
      {/* ── Top Photo Section (16:9, ~60% visual prominence) ── */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-100 dark:bg-zinc-950">
        {drive.referencePhotoUrl ? (
          <Image
            src={drive.referencePhotoUrl}
            alt={drive.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-stone-100 p-6 dark:from-zinc-900 dark:to-zinc-950">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/90 text-emerald-700 shadow-sm ring-1 ring-emerald-600/10 dark:bg-zinc-800 dark:text-emerald-400">
              <VisualIcon className="size-7" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* Gradient shadow overlay for chips */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Top-left: Urgency badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          {isCritical ? (
            <span
              data-testid="drive-urgent-badge"
              className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-4xs font-black uppercase tracking-wider text-white shadow-sm animate-pulse"
            >
              Urgent
            </span>
          ) : isHigh ? (
            <span
              data-testid="drive-high-badge"
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-4xs font-black uppercase tracking-wider text-white shadow-sm"
            >
              High
            </span>
          ) : null}
        </div>

        {/* Top-right: Verification / Tax badge */}
        <div className="absolute right-3 top-3">
          {isMoney && drive.taxBenefit ? (
            <span
              data-testid="drive-tax-badge"
              className="inline-flex items-center gap-1 rounded-full bg-emerald-700/90 backdrop-blur-md px-2.5 py-1 text-4xs font-bold uppercase tracking-wider text-white shadow-sm"
            >
              <Award className="size-3" aria-hidden="true" /> Tax benefits
            </span>
          ) : !isMoney ? (
            <span
              data-testid="drive-verified-badge"
              className="inline-flex items-center gap-1 rounded-full bg-stone-900/80 backdrop-blur-md px-2.5 py-1 text-4xs font-bold tracking-wide text-white shadow-sm dark:bg-zinc-800/90"
            >
              <ShieldCheck className="size-3 text-emerald-400" aria-hidden="true" /> Verified by CauseKind
            </span>
          ) : null}
        </div>

        {/* Bottom-left photo chip: Support {count} {beneficiaryGroup} */}
        <div className="absolute bottom-3 left-3 right-3">
          <span
            data-testid="drive-beneficiary-chip"
            className="inline-flex items-center max-w-full truncate rounded-lg bg-black/55 backdrop-blur-sm px-2.5 py-1 text-3xs font-semibold text-white/95"
          >
            {beneficiaryText}
          </span>
        </div>
      </div>

      {/* ── Body Section ── */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Title (max 2 lines with ellipsis) */}
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-stone-900 transition-colors group-hover:text-emerald-700 dark:text-stone-100 dark:group-hover:text-emerald-400">
          {drive.title}
        </h3>

        {/* Tagline (clamped to 1 line) */}
        {drive.tagline && (
          <p className="mt-1 line-clamp-1 text-xs text-stone-600 dark:text-stone-400">
            {drive.tagline}
          </p>
        )}

        {/* By NGO + Location */}
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs font-medium text-stone-500 dark:text-stone-400">
          <span className="truncate">
            By {drive.ngoOrganizationName || "Verified NGO"}
          </span>
          {displayLocation && (
            <span className="flex shrink-0 items-center gap-1 text-stone-400 dark:text-stone-500">
              <MapPin className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[120px]">{displayLocation}</span>
            </span>
          )}
        </div>

        {/* What's needed line */}
        <p className="mt-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
          {drive.quantityNeeded} {drive.unit?.toLowerCase() || "items"} of {drive.itemName}
        </p>

        {/* Progress bar */}
        <div className="mt-3.5 space-y-1.5">
          <div
            className="flex h-2 w-full overflow-hidden rounded-full bg-stone-100 shadow-inner dark:bg-zinc-800"
            role="progressbar"
            aria-label="Drive collection progress"
            aria-valuenow={drive.quantityReceived + drive.quantityPledged}
            aria-valuemax={drive.quantityNeeded}
          >
            <div
              className="h-full bg-emerald-600 transition-all duration-500 ease-out"
              style={{ width: `${receivedPct}%` }}
              title={`${drive.quantityReceived} received`}
            />
            <div
              className="h-full bg-emerald-300 transition-all duration-500 ease-out dark:bg-emerald-700"
              style={{ width: `${pledgedPct}%` }}
              title={`${drive.quantityPledged} on the way`}
            />
          </div>

          {/* Bottom row: left (needed/raised) & right (donor count) */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-800 dark:text-stone-200">
              {isMoney ? (
                `₹${(drive.quantityReceived || 0).toLocaleString("en-IN")} raised`
              ) : needed === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400">Fully offered</span>
              ) : (
                `${needed} still needed`
              )}
            </span>

            {/* Donor Count */}
            {drive.donorCount != null && drive.donorCount > 0 ? (
              <span
                data-testid="drive-donor-count"
                className="flex items-center gap-1 text-3xs font-semibold text-stone-500 dark:text-stone-400"
              >
                <Heart className="size-3 fill-rose-500/20 text-rose-500" aria-hidden="true" />
                {drive.donorCount} {drive.donorCount === 1 ? "Donor" : "Donors"}
              </span>
            ) : null}
          </div>

          {/* Days left indicator (under bottom row) */}
          {daysInfo && (
            <p
              data-testid="drive-days-left"
              className={`pt-0.5 text-3xs font-semibold ${
                daysInfo.isAmber
                  ? "text-amber-600 dark:text-amber-400 font-bold"
                  : "text-stone-400 dark:text-stone-500"
              }`}
            >
              {daysInfo.label}
            </p>
          )}
        </div>

        {/* CTA Button */}
        <div className="mt-4 pt-2">
          <button
            type="button"
            onClick={handleCtaClick}
            disabled={ctaDisabled}
            data-testid="drive-cta-button"
            className={`flex min-h-[42px] w-full items-center justify-center rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm active:scale-98 ${
              ctaDisabled
                ? "cursor-not-allowed bg-stone-100 text-stone-400 dark:bg-zinc-800 dark:text-stone-500 shadow-none"
                : isDoneeOrNgo
                ? "border border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
            }`}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </Link>
  );
}

export function NgoDriveCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 animate-pulse">
      <div className="aspect-[16/9] w-full bg-stone-200 dark:bg-zinc-800" />
      <div className="flex flex-1 flex-col p-4 sm:p-5 space-y-3">
        <div className="h-4 w-3/4 rounded bg-stone-200 dark:bg-zinc-800" />
        <div className="h-3 w-1/2 rounded bg-stone-150 dark:bg-zinc-800" />
        <div className="h-3 w-1/3 rounded bg-stone-100 dark:bg-zinc-850" />
        <div className="mt-auto pt-4 space-y-2">
          <div className="h-2 w-full rounded bg-stone-200 dark:bg-zinc-800" />
          <div className="h-9 w-full rounded-xl bg-stone-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
