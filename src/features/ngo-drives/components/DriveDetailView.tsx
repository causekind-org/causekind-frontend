"use client";

import { AboutNgoContent } from "./AboutNgoCard";
import { BackButton } from "@/components/BackButton";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  MapPin,
  CalendarClock,
  Users,
  Package,
  Clock,
  Building2,
  Lock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Globe,
  Award,
  CheckCircle2,
  Truck,
  Eye,
  FileCheck2,
  Heart,
  Flame,
} from "lucide-react";
import type { PublicNgoDrive, NgoDriveProofResponse } from "@/lib/api";
import { getNgoDriveProof } from "@/lib/api";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { driveConditionLabel, driveConditionRule } from "@/features/ngo-drives/driveConditions";
import { formatDdMmYyyy, formatHandoverMode, formatLegalStructure, getMapsUrl } from "@/features/ngo-drives/driveFormatters";
import type { GiveStateResult } from "@/features/ngo-drives/driveGiveState";
import { stillNeeded } from "@/features/ngo-drives/driveGiveState";
import { ShareButton } from "@/components/ShareButton";

const LEGACY_CONDITION_TEXT: Record<string, string> = {
  GENTLY_USED: "Gently used items are welcome (clean, working, no major damage).",
};

const DAY: Record<string, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

const humanize = (v?: string | null) =>
  v ? v.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "";



export type DriveDetailViewProps = {
  drive: PublicNgoDrive;
  mode?: "live" | "preview";
  giveStateResult?: GiveStateResult;
  offersError?: string | null;
  onRetryOffers?: () => void;
};

export function DriveDetailView({
  drive,
  mode = "live",
  giveStateResult,
  offersError,
  onRetryOffers,
}: DriveDetailViewProps) {
  const isPreview = mode === "preview";

  // Gallery state
  const photos =
    drive.photoUrls && drive.photoUrls.length > 0
      ? drive.photoUrls
      : drive.referencePhotoUrl
      ? [drive.referencePhotoUrl]
      : [];

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Fulfilled proof state
  const [proof, setProof] = useState<NgoDriveProofResponse | null>(null);
  const isFulfilled = drive.status === "FULFILLED";

  useEffect(() => {
    if (isFulfilled && !isPreview && drive.id) {
      getNgoDriveProof(drive.id)
        .then((p) => setProof(p))
        .catch(() => setProof(null));
    }
  }, [isFulfilled, isPreview, drive.id]);

  // FAQ accordion state

  // Compute progress numbers
  const needed = drive.stillNeeded ?? stillNeeded(drive);
  const total = Math.max(1, drive.quantityNeeded);
  const receivedPct = Math.min(100, ((drive.quantityReceived ?? 0) / total) * 100);
  const onTheWayPct = Math.min(100 - receivedPct, ((drive.quantityPledged ?? 0) / total) * 100);
  const totalOffered = (drive.quantityReceived ?? 0) + (drive.quantityPledged ?? 0);
  const totalOfferedPct = Math.min(100, Math.round((totalOffered / total) * 100));

  const urgent =
    (drive.urgency ?? "").toUpperCase() === "HIGH" ||
    (drive.urgency ?? "").toUpperCase() === "URGENT" ||
    (drive.urgency ?? "").toUpperCase() === "CRITICAL";

  const isHighOrCritical =
    (drive.urgency ?? "").toUpperCase() === "HIGH" ||
    (drive.urgency ?? "").toUpperCase() === "CRITICAL";

  const deadlineInfo = React.useMemo(() => {
    if (!drive.neededBy) return null;
    const target = new Date(drive.neededBy);
    if (Number.isNaN(target.getTime())) return null;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;
    const formatted = formatDdMmYyyy(drive.neededBy);
    const label = diffDays === 0 ? "Ends today" : diffDays === 1 ? "1 day left" : `${diffDays} days left`;
    const isUrgent = diffDays <= 3;
    return { formatted, label, isUrgent };
  }, [drive.neededBy]);

  const days = (drive.availableDays ?? []).map((d) => DAY[d] ?? d).join(", ");

  const displayLocation =
    [drive.locationArea, drive.locationCity].filter(Boolean).join(", ") || drive.ngoCity;

  const visual = CATEGORY_VISUALS[drive.category];
  const VisualIcon = visual?.Icon || Package;

  // Registered office address
  const fullAddress = drive.ngo?.registeredOfficeAddress;

  // Changemaker info
  const hasChangemaker = Boolean(drive.changemakerName && drive.changemakerName.trim());

  // Track record stats
  const trackRecord = drive.ngo?.trackRecord;
  const showTrackRecord = Boolean(trackRecord && trackRecord.completedDrives >= 1);

  // Story answers vs legacy description
  const hasStoryAnswers = Boolean(
    (drive.whoFor && drive.whoFor.trim()) ||
      (drive.whyNow && drive.whyNow.trim()) ||
      (drive.whatChanges && drive.whatChanges.trim())
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-16 dark:bg-zinc-950">
      {!isPreview && (
        <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
          <BackButton />
        </div>
      )}
      {/* ── Preview Mode Banner ── */}
      {isPreview && (
        <div
          role="status"
          className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-300 bg-amber-500 px-4 py-2.5 text-xs font-bold text-amber-950 shadow-sm"
        >
          <div className="mx-auto flex items-center gap-2">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>Preview, not published yet</span>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-emerald-900 to-emerald-800 px-4 py-10 text-white sm:px-6 lg:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {drive.verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-950/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" /> Verified NGO
                </span>
              )}
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-50">
                {drive.category}
              </span>
              {drive.urgency && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    urgent ? "bg-amber-400 text-amber-950" : "bg-white/10 text-emerald-50"
                  }`}
                >
                  {humanize(drive.urgency)} urgency
                </span>
              )}
            </div>

            {/* Share button */}
            {!isPreview && (
              <div className="flex items-center">
                <ShareButton
                  title={drive.title}
                  path={`/drives/${drive.id}`}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 hover:text-white"
                />
              </div>
            )}
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            {drive.title}
          </h1>

          {drive.tagline && (
            <p className="mt-3 max-w-2xl text-base text-emerald-100 sm:text-lg">
              {drive.tagline}
            </p>
          )}

          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-emerald-100">
            <li className="flex items-center gap-2">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {drive.ngoOrganizationName || "Verified NGO"}
            </li>
            {displayLocation && (
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {displayLocation}
              </li>
            )}
            {drive.pickupRadiusKm != null && (
              <li className="flex items-center gap-2" data-testid="drive-pickup-radius">
                <Truck className="h-4 w-4" aria-hidden="true" />
                Pickup available within {drive.pickupRadiusKm} km
              </li>
            )}
            <li className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Needed by {formatDdMmYyyy(drive.neededBy)}
            </li>
          </ul>
        </div>
      </section>

      {/* ── Main Content Grid ── */}
      <div className="mx-auto mt-8 grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:gap-8">
        {/* Main column */}
        <div className="order-2 lg:order-1 space-y-6 lg:col-span-2">
          {/* 1. Gallery */}
          {photos.length === 0 ? (
            <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-stone-200 bg-gradient-to-br from-emerald-50 to-stone-100 p-6 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
              <div className="flex size-20 items-center justify-center rounded-3xl bg-white/90 text-emerald-700 shadow-sm ring-1 ring-emerald-600/10 dark:bg-zinc-800 dark:text-emerald-400">
                <VisualIcon className="size-10" aria-hidden="true" />
              </div>
            </div>
          ) : photos.length === 1 ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 dark:border-zinc-800 dark:bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                onError={(e) => { e.currentTarget.style.display = "none"; }}
                src={photos[0]}
                alt={`Photo for ${drive.title}`}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Large Main Photo */}
              <div className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 dark:border-zinc-800 dark:bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  src={photos[activePhotoIdx]}
                  alt={`Photo ${activePhotoIdx + 1} of ${photos.length} for ${drive.title}`}
                  loading={activePhotoIdx === 0 ? "eager" : "lazy"}
                  className="h-full w-full object-cover transition-all duration-300"
                />

                {/* Left/Right Desktop Controls */}
                <button
                  type="button"
                  onClick={() =>
                    setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
                  }
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-opacity hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActivePhotoIdx((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
                  }
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-opacity hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>

                {/* Photo Counter */}
                <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {activePhotoIdx + 1} / {photos.length}
                </div>
              </div>

              {/* Thumbnail Strip with Scroll-Snap */}
              <div
                className="flex gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-zinc-700"
                style={{ scrollSnapType: "x mandatory" }}
                role="tablist"
                aria-label="Photo thumbnails"
              >
                {photos.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={activePhotoIdx === idx}
                    aria-label={`View photo ${idx + 1}`}
                    onClick={() => setActivePhotoIdx(idx)}
                    style={{ scrollSnapAlign: "start" }}
                    className={`relative aspect-video h-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      activePhotoIdx === idx
                        ? "border-emerald-600 ring-2 ring-emerald-600/30"
                        : "border-stone-200 opacity-70 hover:opacity-100 dark:border-zinc-800"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                      src={url}
                      alt={`Thumbnail ${idx + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. About this drive */}
          <Card title="About this drive">
            {hasStoryAnswers ? (
              <div className="space-y-5">
                {drive.whoFor && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Who is this for?
                    </h3>
                    <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-stone-800 dark:text-stone-200">
                      {drive.whoFor}
                    </p>
                  </div>
                )}
                {drive.whyNow && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Why now?
                    </h3>
                    <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-stone-800 dark:text-stone-200">
                      {drive.whyNow}
                    </p>
                  </div>
                )}
                {drive.whatChanges && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      What will change after you give?
                    </h3>
                    <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-stone-800 dark:text-stone-200">
                      {drive.whatChanges}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed text-stone-700 dark:text-stone-300">
                {drive.description}
              </p>
            )}
          </Card>

          {/* 3. What's needed */}
          <Card title="What's needed">
            <dl className="grid gap-5 sm:grid-cols-2">
              <Fact icon={<Package className="h-5 w-5" />} label="Item">
                {drive.quantityNeeded} {humanize(drive.unit)} of {drive.itemName}
              </Fact>

              <Fact icon={<ShieldCheck className="h-5 w-5" />} label="Condition">
                {drive.condition
                  ? LEGACY_CONDITION_TEXT[drive.condition] ?? driveConditionLabel(drive.condition)
                  : "Any good condition"}
                {(drive.conditionRule || driveConditionRule(drive.condition)) && (
                  <span className="mt-0.5 block text-sm font-normal text-stone-600 dark:text-stone-400">
                    {drive.conditionRule || driveConditionRule(drive.condition)}
                  </span>
                )}
                {drive.mustBeWorking && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    Items must be in working order
                  </span>
                )}
                {drive.requireClean && (
                  <span className="mt-1.5 ml-1.5 inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                    Items must be washed and clean
                  </span>
                )}
              </Fact>

              {drive.beneficiaryCount != null && (
                <Fact icon={<Users className="h-5 w-5" />} label="Who it helps">
                  <span>
                    {drive.beneficiaryCount} {drive.beneficiaryGroup}
                  </span>
                  {drive.beneficiaryDescription && (
                    <span className="mt-0.5 block text-xs font-normal text-stone-600 dark:text-stone-400">
                      {drive.beneficiaryDescription}
                    </span>
                  )}
                </Fact>
              )}

              {drive.details && (
                <Fact icon={<Package className="h-5 w-5" />} label="Details">
                  {drive.details}
                </Fact>
              )}
            </dl>
          </Card>

          {/* 4. Who is behind the drive */}
          {hasChangemaker && (
            <Card title="Who is behind the drive">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {drive.changemakerPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    src={drive.changemakerPhotoUrl}
                    alt={drive.changemakerName || "Changemaker"}
                    className="size-16 shrink-0 rounded-2xl object-cover ring-2 ring-stone-200 dark:ring-zinc-800"
                  />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <User className="size-8" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    {drive.changemakerName}
                  </h3>
                  {drive.changemakerRole && (
                    <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                      {drive.changemakerRole}
                    </p>
                  )}
                  {drive.changemakerWhy && (
                    <p className="mt-2.5 text-sm italic leading-relaxed text-stone-700 dark:text-stone-300">
                      &ldquo;{drive.changemakerWhy}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* 5. Handover */}
          <Card title="Handover">
            <dl className="grid gap-5 sm:grid-cols-2">
              <Fact icon={<Truck className="h-5 w-5" />} label="Handover mode">
                {formatHandoverMode(drive.handoverMode)}
              </Fact>

              <Fact icon={<Clock className="h-5 w-5" />} label="When the NGO receives items">
                {days || "Days agreed with the NGO"}
                {drive.availableFrom && drive.availableTo
                  ? `, ${drive.availableFrom}–${drive.availableTo}`
                  : ""}
              </Fact>

              <div className="sm:col-span-2">
                <Fact icon={<Lock className="h-5 w-5" />} label="Address">
                  {fullAddress ? (
                    <div>
                      <p className="font-semibold text-stone-900 dark:text-stone-100">
                        {fullAddress}
                      </p>
                      <a
                        href={getMapsUrl(fullAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open in Maps
                      </a>
                      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                        The drive contact person&apos;s phone number is shared after the NGO accepts your offer.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p>
                        Drop off at the NGO or ask for a pickup.
                      </p>
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        The drive contact person&apos;s phone number is shared after the NGO accepts your offer.
                      </p>
                    </div>
                  )}
                </Fact>
              </div>
            </dl>
          </Card>

          {/* 6. NGO Card */}
          <Card title="About the NGO">
            <div className="space-y-4">
              <AboutNgoContent ngo={{
                organizationName: drive.ngo?.organizationName || drive.ngoOrganizationName || "Verified NGO",
                founderName: drive.ngo?.founderName,
                founderDesignation: drive.ngo?.founderDesignation,
                yearOfEstablishment: drive.ngo?.yearOfEstablishment,
                verified: drive.verified,
                aboutUs: drive.ngo?.aboutUs,
                slug: isPreview ? null : drive.ngo?.slug,
              }} />
              {drive.verified && (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {drive.ngo?.verifiedAt && `Verified on ${formatDdMmYyyy(drive.ngo.verifiedAt)}. `}
                  What we checked: registration, address, contact person.
                  {(drive.ngo?.city || drive.ngoCity) && ` Based in ${drive.ngo?.city || drive.ngoCity}.`}
                </p>
              )}

              {/* Organisation Facts */}
              <dl className="grid gap-4 pt-1 sm:grid-cols-2">
                {drive.ngo?.legalStructure && (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Legal structure
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-stone-800 dark:text-stone-200">
                      {formatLegalStructure(drive.ngo.legalStructure)}
                    </dd>
                  </div>
                )}

                {drive.ngo?.registrationNumber && (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Registration number
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-stone-800 dark:text-stone-200">
                      {drive.ngo.registrationNumber}
                    </dd>
                  </div>
                )}


                {drive.ngo?.website && (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Website
                    </dt>
                    <dd className="mt-0.5 text-sm">
                      <a
                        href={drive.ngo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                        {drive.ngo.website.replace(/^https?:\/\//, "")}
                      </a>
                    </dd>
                  </div>
                )}

                {drive.pastWorkUrl && (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Past work
                    </dt>
                    <dd className="mt-0.5 text-sm">
                      <a
                        href={drive.pastWorkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        View past work
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {/* Track Record Stats Block */}
              {showTrackRecord && trackRecord && (
                <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Track Record on CauseKind
                  </p>
                  <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <dt className="text-xs text-stone-500 dark:text-stone-400">Completed drives</dt>
                      <dd className="mt-1 text-xl font-black text-stone-900 dark:text-stone-100">
                        {trackRecord.completedDrives}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-stone-500 dark:text-stone-400">Items received</dt>
                      <dd className="mt-1 text-xl font-black text-stone-900 dark:text-stone-100">
                        {trackRecord.itemsReceived}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-stone-500 dark:text-stone-400">With verified proof</dt>
                      <dd className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {trackRecord.drivesWithApprovedProof}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </Card>

          {/* 7. Updates / Impact (Only for FULFILLED drives) */}
          {isFulfilled && proof && (
            <Card title="Impact & Distribution">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  <span>This drive was completed and all items were distributed.</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-2">
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Items distributed
                    </p>
                    <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {drive.quantityReceived} of {drive.quantityNeeded}
                    </p>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Beneficiaries reached
                    </p>
                    <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {proof.beneficiariesReached ?? drive.beneficiaryCount}
                    </p>
                  </div>
                </div>

                {proof.media && proof.media.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Handover photos
                    </h4>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {proof.media.slice(0, 3).map((m, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-video overflow-hidden rounded-xl border border-stone-200 bg-stone-100 dark:border-zinc-800"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                            src={m.mediaUrl}
                            alt={`Distribution photo ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Link
                    href={`/drives/${drive.id}/proof`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                    View the full distribution proof report →
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {/* 8. Trust and Reassurance */}
          <Card title="How giving on CauseKind works">
            <ul className="grid gap-3.5 sm:grid-cols-2">
              <li className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/70 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-900/40">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Verified before going live
                  </h4>
                  <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                    Every NGO and drive is vetted by our team before accepting pledges.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/70 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-900/40">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    6-digit handover code
                  </h4>
                  <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                    Handovers are confirmed using your secure donor code in the app.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/70 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-900/40">
                <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Handover photos required
                  </h4>
                  <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                    NGOs upload proof photos when items reach beneficiaries.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50/70 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-900/40">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Private contact details
                  </h4>
                  <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">
                    Phone numbers are shared only after an offer is accepted.
                  </p>
                </div>
              </li>
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-zinc-800 dark:text-stone-400">
              <span>Learn more:</span>
              <Link href="/give-safely" className="font-bold text-emerald-700 hover:underline dark:text-emerald-400">
                Giving safely checklist
              </Link>
              <span>•</span>
              <Link href="/faq?category=ngo-drives" className="font-bold text-emerald-700 hover:underline dark:text-emerald-400">
                Frequently asked questions
              </Link>
            </div>
          </Card>

        </div>

        {/* Side card (Progress and CTA) */}
        <aside className="order-1 lg:order-2 lg:col-span-1">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-24">
            {/* Header: Label + Urgency chip */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Progress
              </span>
              {isHighOrCritical && (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-3xs font-bold uppercase tracking-wider text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
                  <Flame className="h-3 w-3 shrink-0" aria-hidden="true" /> High priority
                </span>
              )}
            </div>

            {/* Circular Ring SVG visual with percentage in center */}
            <div className="mt-4 flex flex-col items-center justify-center">
              <div className="relative flex h-36 w-36 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={40}
                    className="stroke-stone-100 dark:stroke-zinc-800"
                    strokeWidth="9"
                    fill="transparent"
                  />
                  {receivedPct > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={40}
                      className="stroke-emerald-600 transition-all duration-500 ease-out"
                      strokeWidth="9"
                      strokeDasharray={251.327}
                      strokeDashoffset={251.327 - (receivedPct / 100) * 251.327}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  )}
                  {onTheWayPct > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={40}
                      className="stroke-emerald-400 dark:stroke-emerald-500 transition-all duration-500 ease-out"
                      strokeWidth="9"
                      strokeDasharray={251.327}
                      strokeDashoffset={251.327 - (onTheWayPct / 100) * 251.327}
                      style={{
                        transform: `rotate(${(receivedPct / 100) * 360}deg)`,
                        transformOrigin: "50% 50%",
                      }}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
                    {totalOfferedPct}%
                  </span>
                  <span className="text-3xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    offered
                  </span>
                </div>
              </div>

              {/* Strong headline number and status line */}
              <div className="mt-2 text-center">
                <p className="text-xl font-black text-stone-900 dark:text-stone-100">
                  {totalOffered}{" "}
                  <span className="text-sm font-semibold text-stone-500 dark:text-stone-400">
                    of {drive.quantityNeeded} {humanize(drive.unit)} offered
                  </span>
                </p>
                <p className="mt-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {needed <= 0 ? "Fully offered" : `${needed} still needed`}
                </p>
              </div>
            </div>

            {/* Segmented bar for clear linear proportion and progressbar accessibility */}
            <div
              className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-zinc-800"
              role="progressbar"
              aria-label="Drive progress"
              aria-valuemin={0}
              aria-valuemax={drive.quantityNeeded}
              aria-valuenow={drive.quantityReceived + drive.quantityPledged}
            >
              <div className="h-full bg-emerald-600 transition-all duration-500" style={{ width: `${receivedPct}%` }} />
              <div
                className="h-full bg-emerald-400 dark:bg-emerald-500 transition-all duration-500"
                style={{ width: `${onTheWayPct}%` }}
              />
            </div>

            {/* Stat tiles with small icons */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5 dark:border-emerald-950/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-1 text-3xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>Received</span>
                </div>
                <span className="mt-1 text-base font-black text-stone-900 dark:text-stone-100">
                  {drive.quantityReceived}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-100/70 bg-emerald-50/30 p-2.5 dark:border-emerald-950/30 dark:bg-emerald-950/10">
                <div className="flex items-center gap-1 text-3xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <Truck className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>On way</span>
                </div>
                <span className="mt-1 text-base font-black text-stone-900 dark:text-stone-100">
                  {drive.quantityPledged}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200/80 bg-stone-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/50">
                <div className="flex items-center gap-1 text-3xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  <Package className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>Needed</span>
                </div>
                <span className="mt-1 text-base font-black text-stone-900 dark:text-stone-100">
                  {needed}
                </span>
              </div>
            </div>

            {/* Deadline row */}
            {deadlineInfo && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-stone-200/80 bg-stone-50/70 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-850">
                <span className="flex items-center gap-1.5 font-medium text-stone-700 dark:text-stone-300">
                  <CalendarClock className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
                  Needed by {deadlineInfo.formatted}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-3xs font-bold ${
                    deadlineInfo.isUrgent
                      ? "border border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      : "bg-stone-200/80 text-stone-700 dark:bg-zinc-700 dark:text-stone-300"
                  }`}
                >
                  {deadlineInfo.label}
                </span>
              </div>
            )}

            {/* Donor count with a heart icon */}
            {drive.donorCount != null && drive.donorCount > 0 && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
                <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" aria-hidden="true" />
                <span>
                  {drive.donorCount} {drive.donorCount === 1 ? "donor has" : "donors have"} backed this drive
                </span>
              </div>
            )}

            {/* CTA action area */}
            <div className="mt-5 border-t border-stone-100 pt-5 dark:border-zinc-800">
              {isFulfilled && !isPreview && (
                <Link
                  href={`/drives/${drive.id}/proof`}
                  className="mb-3 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-emerald-600 text-sm font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  See how the items were used
                </Link>
              )}

              {isPreview ? (
                <div>
                  <button
                    type="button"
                    disabled
                    data-testid="drive-cta-button"
                    className="flex min-h-[48px] w-full cursor-not-allowed items-center justify-center rounded-xl bg-stone-200 text-base font-bold text-stone-500 dark:bg-zinc-800 dark:text-stone-400"
                  >
                    Give to this drive
                  </button>
                  <p className="mt-3 text-center text-xs text-stone-500 dark:text-stone-400">
                    Preview only — donations are disabled until published.
                  </p>
                </div>
              ) : offersError ? (
                <div role="alert" className="text-sm text-red-700 dark:text-red-400">
                  {offersError}{" "}
                  {onRetryOffers && (
                    <button type="button" className="font-bold underline" onClick={onRetryOffers}>
                      Retry
                    </button>
                  )}
                </div>
              ) : giveStateResult?.kind === "give" || giveStateResult?.kind === "login" ? (
                <>
                  <Link
                    href={giveStateResult.href}
                    data-testid="drive-cta-button"
                    className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-600 text-base font-bold text-white shadow-sm hover:bg-emerald-700"
                  >
                    Give to this drive
                  </Link>
                  <p className="mt-3 text-center text-xs text-stone-500 dark:text-stone-400">
                    {giveStateResult.kind === "login"
                      ? "You'll log in first, then come straight back."
                      : "Many donors give to one drive. Give any amount, up to what's still needed."}
                  </p>
                </>
              ) : giveStateResult?.kind === "continue" ? (
                <Link
                  href={giveStateResult.href}
                  data-testid="drive-cta-button"
                  className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700"
                >
                  Continue your offer
                </Link>
              ) : giveStateResult?.kind === "offered" ? (
                <>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    You already offered {giveStateResult.offer.quantity} {humanize(drive.unit)}.
                  </p>
                  <Link
                    href={giveStateResult.href}
                    data-testid="drive-cta-button"
                    className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-stone-300 text-sm font-bold text-stone-800 hover:bg-stone-50 dark:border-zinc-700 dark:text-stone-100 dark:hover:bg-zinc-800"
                  >
                    {giveStateResult.href.includes("/handover")
                      ? "Open your handover"
                      : "See your offer"}
                  </Link>
                </>
              ) : giveStateResult?.kind === "closed" ? (
                <>
                  <button
                    type="button"
                    disabled
                    data-testid="drive-cta-button"
                    className="flex min-h-[48px] w-full cursor-not-allowed items-center justify-center rounded-xl bg-stone-200 text-base font-bold text-stone-500 dark:bg-zinc-800 dark:text-stone-400"
                  >
                    Give to this drive
                  </button>
                  <p className="mt-3 text-center text-xs text-stone-600 dark:text-stone-400">
                    {giveStateResult.reason}
                  </p>
                </>
              ) : (
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  {giveStateResult?.reason}
                </p>
              )}

              {/* Share button secondary action */}
              {!isPreview && (
                <div className="mt-3 flex justify-center">
                  <ShareButton
                    title={drive.title}
                    path={`/drives/${drive.id}`}
                    className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50/70 px-4 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-stone-300 dark:hover:bg-zinc-800"
                  />
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">{title}</h2>
      {children}
    </section>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          {label}
        </dt>
        <dd className="mt-1 break-words text-stone-800 dark:text-stone-200">{children}</dd>
      </div>
    </div>
  );
}

function Stat({ label, value, swatch }: { label: string; value: number; swatch: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1 flex items-center justify-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
        <span className={`h-2 w-2 rounded-full ${swatch}`} aria-hidden="true" />
        {label}
      </dt>
      <dd className="text-xl font-black text-stone-900 dark:text-stone-100">{value}</dd>
    </div>
  );
}
