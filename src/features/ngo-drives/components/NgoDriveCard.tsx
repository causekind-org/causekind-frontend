"use client";

import { useState } from "react";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MapPin, ShieldCheck, Heart, Package, Award, ArrowRight } from "lucide-react";
import type { PublicNgoDrive, NgoDriveOfferResponse } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import AnimatedCategoryIcon from "@/components/AnimatedCategoryIcon";
import { giveState, stillNeeded } from "@/features/ngo-drives/driveGiveState";
import { formatBeneficiarySupport } from "@/features/ngo-drives/ngoDriveFilters";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
export type NgoDriveCardProps = {
  drive: PublicNgoDrive;
  /** Optional custom click handler or link */
  className?: string;
  offers?: NgoDriveOfferResponse[];
};

export function NgoDriveCard({ drive, className = "", offers = [] }: NgoDriveCardProps) {
  const ui = useUiText();
  const df = useTranslations("driveFlow");
  const router = useRouter();
  const { user } = useAuth();
  // A cover that fails to load (expired link, missing file) falls back to the category icon.
  const [coverFailed, setCoverFailed] = useState(false);

  // Reuse existing giveState logic
  const state = giveState(drive, user, offers);

  const needed = drive.stillNeeded ?? stillNeeded(drive);
  const total = Math.max(1, drive.quantityNeeded);
  const receivedPct = Math.min(100, ((drive.quantityReceived ?? 0) / total) * 100);
  const pledgedPct = Math.min(100 - receivedPct, ((drive.quantityPledged ?? 0) / total) * 100);

  const beneficiaryText = formatBeneficiarySupport(drive.beneficiaryCount, drive.beneficiaryGroup, (key, v) => df(key, v));

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
  let ctaLabel = ui("View drive & give");
  let ctaHref = `/drives/${drive.id}`;
  let ctaDisabled = false;

  if (isDoneeOrNgo) {
    ctaLabel = ui("View drive");
    ctaHref = `/drives/${drive.id}`;
  } else if (state.kind === "login" || state.kind === "give") {
    ctaLabel = ui("View drive & give");
    ctaHref = `/drives/${drive.id}`;
  } else if (state.kind === "continue") {
    ctaLabel = ui("Continue offer");
    ctaHref = state.href;
  } else if (state.kind === "offered") {
    ctaLabel = ui("View your offer");
    ctaHref = state.href;
  } else if (state.kind === "closed") {
    ctaLabel = needed === 0 ? ui("Fully offered") : ui("Drive closed");
    ctaDisabled = true;
    ctaHref = `/drives/${drive.id}`;
  }

  const isDefaultTarget = !ctaDisabled && ctaHref === `/drives/${drive.id}`;

  return (
    <article
      data-testid={`ngo-drive-card-${drive.id}`}
      className={`group relative flex min-w-0 flex-col cursor-pointer rounded-[1.25rem] overflow-hidden bg-white dark:bg-zinc-900/95 border border-stone-200/90 dark:border-zinc-800 lg:rounded-[2rem] lg:border-0 lg:bg-black/[0.03] lg:p-1.5 lg:ring-1 lg:ring-black/[0.05] dark:lg:bg-white/[0.04] dark:lg:ring-white/10 lg:transition-transform lg:duration-700 lg:ease-[cubic-bezier(0.32,0.72,0,1)] lg:hover:-translate-y-1 ${className}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return;
        router.push(`/drives/${drive.id}`);
      }}
    >
      {!isDefaultTarget && (
        <Link
          href={`/drives/${drive.id}`}
          className="absolute inset-0 z-0 rounded-[1.25rem] lg:rounded-[2rem]"
          aria-label={df("viewDriveTitle", { title: drive.title })}
          tabIndex={-1}
        />
      )}
      {/* Double-bezel inner core at lg matching Live Board */}
      <div className="flex flex-col grow overflow-hidden lg:rounded-[calc(2rem-0.375rem)] lg:bg-white lg:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_24px_48px_-28px_rgba(6,78,59,0.18)] dark:lg:bg-zinc-900">
        {/* ── Top Photo Section (16:9) ── */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-100 dark:bg-zinc-950">
          {drive.referencePhotoUrl && !coverFailed ? (
            <Image
              src={drive.referencePhotoUrl}
              alt={drive.title}
              onError={() => setCoverFailed(true)}
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
                <UiText>Urgent</UiText>
              </span>
            ) : isHigh ? (
              <span
                data-testid="drive-high-badge"
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-4xs font-black uppercase tracking-wider text-white shadow-sm"
              >
                <UiText>High</UiText>
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
                <Award className="size-3" aria-hidden="true" /> <UiText>Tax benefits</UiText>
              </span>
            ) : !isMoney ? (
              <span
                data-testid="drive-verified-badge"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-2.5 py-1 text-4xs font-bold tracking-wide text-white shadow-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-ngo-400" aria-hidden="true" />
                <UiText>Verified by CauseKind</UiText>
              </span>
            ) : null}
          </div>

          {/* Bottom-left photo chip: Support {count} {beneficiaryGroup} */}
          <div className="absolute bottom-0 left-0 right-3">
            <span
              data-testid="drive-beneficiary-chip"
              className="inline-flex items-center max-w-full truncate rounded-tr-xl bg-white px-3 py-1.5 text-2xs font-bold text-stone-800 shadow-sm dark:bg-zinc-900 dark:text-stone-100"
            >
              {beneficiaryText}
            </span>
          </div>
        </div>

        {/* ── Body Section ── */}
        <div className="flex flex-1 flex-col p-4 sm:p-5 lg:p-6">
          {/* Category Pill above Title */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-3xs font-extrabold uppercase tracking-wider ${
                visual?.iconBg ?? "bg-stone-100 dark:bg-zinc-800"
              } ${visual?.text ?? "text-stone-700 dark:text-stone-300"}`}
            >
              <AnimatedCategoryIcon category={drive.category} iconClassName="w-3.5 h-3.5" />
              {drive.category}
            </span>
          </div>

          {/* Title (max 2 lines with ellipsis) */}
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-stone-900 transition-colors group-hover:text-emerald-700 dark:text-stone-100 dark:group-hover:text-emerald-400">
            {drive.title}
          </h3>


          {/* By NGO + Location */}
          <div className="mt-1.5 flex items-center justify-between gap-2 text-xs font-medium text-stone-500 dark:text-stone-400">
            <span className="truncate">
              {df("byNgo", { name: drive.ngoOrganizationName || ui("Verified NGO") })}
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
            {df("qtyUnitOfItem", { qty: drive.quantityNeeded, unit: drive.unit?.toLowerCase() || ui("items"), item: drive.itemName ?? "" })}
          </p>

          {/* Progress bar */}
          <div className="mt-3.5 space-y-1.5">
            <div
              className="flex h-2 w-full overflow-hidden rounded-full bg-stone-100 shadow-inner dark:bg-zinc-800"
              role="progressbar"
              aria-label={ui("Drive collection progress")}
              aria-valuenow={drive.quantityReceived + drive.quantityPledged}
              aria-valuemax={drive.quantityNeeded}
            >
              <div
                className="h-full bg-emerald-600 transition-all duration-500 ease-out"
                style={{ width: `${receivedPct}%` }}
                title={df("nReceived", { count: drive.quantityReceived })}
              />
              <div
                className="h-full bg-emerald-300 transition-all duration-500 ease-out dark:bg-emerald-700"
                style={{ width: `${pledgedPct}%` }}
                title={df("nOnTheWay", { count: drive.quantityPledged })}
              />
            </div>

            {/* Bottom row: left (needed/raised) & right (donor count) */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800 dark:text-stone-200">
                {isMoney ? (
                  df("amountRaised", { amount: `₹${(drive.quantityReceived || 0).toLocaleString("en-IN")}` })
                ) : needed === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400"><UiText>Fully offered</UiText></span>
                ) : (
                  df("nStillNeeded", { count: needed })
                )}
              </span>

              {/* Donor Count */}
              {drive.donorCount != null && drive.donorCount > 0 ? (
                <span
                  data-testid="drive-donor-count"
                  className="flex items-center gap-1 text-3xs font-semibold text-stone-500 dark:text-stone-400"
                >
                  <Heart className="size-3 fill-rose-500/20 text-rose-500" aria-hidden="true" />
                  {drive.donorCount} {drive.donorCount === 1 ? ui("Donor") : ui("Donors")}
                </span>
              ) : null}
            </div>

          </div>

          {/* CTA Button */}
          <div className="mt-auto pt-4">
            {ctaDisabled ? (
              <button
                type="button"
                disabled
                data-testid="drive-cta-button"
                className="relative z-10 flex w-full items-center justify-center gap-2 rounded-full py-2.5 px-3.5 text-xs font-bold transition-all duration-200 shadow-none border border-transparent cursor-not-allowed bg-stone-100 text-stone-400 dark:bg-zinc-800 dark:text-stone-500"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </button>
            ) : isDefaultTarget ? (
              <Link
                href={ctaHref}
                data-testid="drive-cta-button"
                className={`before:absolute before:inset-0 before:z-0 flex w-full items-center justify-center gap-2 rounded-full py-2.5 px-3.5 text-xs font-bold transition-all duration-200 shadow-2xs group/btn active:scale-[0.98] ${
                  isDoneeOrNgo
                    ? "border border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-200"
                    : "bg-emerald-50 hover:bg-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-700 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 hover:text-white dark:text-emerald-300 dark:hover:text-white"
                }`}
              >
                <span className="relative z-10">{ctaLabel}</span>
                <ArrowRight className="relative z-10 w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-1 shrink-0" aria-hidden="true" />
              </Link>
            ) : (
              <Link
                href={ctaHref}
                data-testid="drive-cta-button"
                className="relative z-10 flex w-full items-center justify-center gap-2 rounded-full py-2.5 px-3.5 text-xs font-bold transition-all duration-200 shadow-2xs group/btn active:scale-[0.98] bg-emerald-50 hover:bg-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-700 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 hover:text-white dark:text-emerald-300 dark:hover:text-white"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-1 shrink-0" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function NgoDriveCardSkeleton() {
  return (
    <div className="flex min-w-0 flex-col rounded-[1.25rem] overflow-hidden bg-white dark:bg-zinc-900 border border-stone-200/90 dark:border-zinc-800 lg:rounded-[2rem] lg:border-0 lg:bg-black/[0.03] lg:p-1.5 lg:ring-1 lg:ring-black/[0.05] dark:lg:bg-white/[0.04] dark:lg:ring-white/10 animate-pulse">
      <div className="flex flex-col grow overflow-hidden lg:rounded-[calc(2rem-0.375rem)] lg:bg-white dark:lg:bg-zinc-900">
        <div className="aspect-[16/9] w-full bg-stone-200 dark:bg-zinc-800" />
        <div className="flex flex-1 flex-col p-4 sm:p-5 lg:p-6 space-y-3">
          <div className="h-4 w-20 rounded-full bg-stone-200 dark:bg-zinc-800" />
          <div className="h-5 w-3/4 rounded bg-stone-200 dark:bg-zinc-800" />
          <div className="h-3 w-1/2 rounded bg-stone-150 dark:bg-zinc-800" />
          <div className="h-3 w-1/3 rounded bg-stone-100 dark:bg-zinc-850" />
          <div className="mt-auto pt-4 space-y-2">
            <div className="h-2 w-full rounded bg-stone-200 dark:bg-zinc-800" />
            <div className="h-9 w-full rounded-full bg-stone-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
