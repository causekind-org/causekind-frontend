"use client";

import { CallAction } from "@/features/handover/HandoverContactPanel";
import { DriveOfferChatPanel } from "./DriveOfferChatPanel";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, CheckCircle2, Clock, Loader2, MapPin, Package, Phone,
  ShieldCheck, Store, Truck, AlertTriangle, ChevronRight,
} from "lucide-react";
import {
  scheduleNgoDriveOfferHandover, rescheduleNgoDriveOfferHandover, generateNgoDriveOfferHandoverOtp,
  uploadNgoDriveReceiptPhotos, confirmNgoDriveOfferHandoverNgo, reportNgoDriveOfferIssue,
  type NgoDriveOfferResponse, type NgoDriveOfferHandoverRecordResponse,
} from "@/lib/api";
import { formatAgeRange } from "@/features/ngo-drives/driveOfferAge";
import { formatIST } from "@/lib/formatIST";

/**
 * The handover for an offer to an NGO drive, for the donor or the drive's NGO.
 * Adopts the reference donee handover design: compact context header with transaction code,
 * horizontal journey rail, 12-column layout (7-8 col action area, 4-5 col coordination rail),
 * flat 8px radius panels, neutral surfaces with role accent, and complete dark mode support.
 */
export type DriveHandoverRole = "DONOR" | "NGO";

const ACCEPTED = new Set(["NGO_ACCEPTED", "PENDING_ADMIN_APPROVAL", "ADMIN_APPROVED"]);
const IN_HANDOVER = new Set(["HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"]);
const DELIVERED = new Set(["ISSUE_WINDOW_OPEN", "ISSUE_RAISED", "COMPLETED"]);
const ENDED: Record<string, string> = {
  NGO_DECLINED: "The NGO declined this offer.",
  WITHDRAWN: "This offer was withdrawn.",
  CANCELLED: "This handover was cancelled.",
  ENDED: "The drive closed before this handover happened.",
  ADMIN_REJECTED: "This offer didn't pass our checks.",
};
const DAY_NAMES: Record<string, string> = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };
const JS_DAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const ISSUE_TYPES: [string, string][] = [
  ["ITEM_NOT_RECEIVED", "Items not received"],
  ["ITEM_DAMAGED", "Items damaged"],
  ["ITEM_NOT_AS_DESCRIBED", "Not as described"],
  ["INAPPROPRIATE_BEHAVIOUR", "Inappropriate behaviour"],
  ["OTHER", "Something else"],
];

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");
const unitLabel = (u?: string | null) => (u ? u.replaceAll("_", " ").toLowerCase() : "");
const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** Client-side mirror of the server's slot rule (days and hours of the drive, in the future). */
export function slotProblem(offer: NgoDriveOfferResponse, date: string, time: string): string | null {
  if (!date || !time) return "Pick a date and a time.";
  const when = new Date(`${date}T${time}:00`);
  if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) return "Pick a date and time in the future.";
  const days = offer.driveAvailableDays ?? [];
  if (days.length > 0 && !days.includes(JS_DAY[when.getDay()])) {
    return `The NGO receives items on ${days.map((d) => DAY_NAMES[d] ?? d).join(", ")} only.`;
  }
  const from = hhmm(offer.driveAvailableFrom), to = hhmm(offer.driveAvailableTo);
  if (from && to && (time < from || time > to)) return `Pick a time between ${from} and ${to}.`;
  return null;
}

const field = "mt-1 block w-full rounded-lg border border-stone-300 bg-white p-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition-colors";
const primary = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors";
const secondary = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-100 dark:hover:bg-zinc-800 transition-colors";

function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-stone-200 bg-white p-4 sm:p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      {title && <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">{title}</h2>}
      {children}
    </section>
  );
}

function PlanForm({
  offer, handover, onDone, reschedule,
}: {
  offer: NgoDriveOfferResponse; handover: NgoDriveOfferHandoverRecordResponse | null; onDone: () => void; reschedule: boolean;
}) {
  // Outside the NGO's pickup radius the donor can only drop the items off.
  const dropOffOnly = offer.dropOffOnly === true;
  const [method, setMethod] = useState<"DROP_OFF" | "PICKUP">(
    dropOffOnly ? "DROP_OFF"
      : (handover?.method as "DROP_OFF" | "PICKUP") ?? (offer.handoverMethod === "NGO_PICKUP" ? "PICKUP" : "DROP_OFF")
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState(hhmm(offer.driveAvailableFrom) || "10:00");
  const [address, setAddress] = useState(handover?.locationAddress
    ?? [offer.donorLocality, offer.donorCity, offer.donorPincode].filter(Boolean).join(", "));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const days = (offer.driveAvailableDays ?? []).map((d) => DAY_NAMES[d] ?? d).join(", ");
  const hours = offer.driveAvailableFrom ? `${hhmm(offer.driveAvailableFrom)}–${hhmm(offer.driveAvailableTo)}` : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = slotProblem(offer, date, time) ?? (method === "PICKUP" && !address.trim() ? "Add the pickup address." : null)
      ?? (reschedule && !reason.trim() ? "Tell the NGO why you're changing the plan." : null);
    if (problem) { setError(problem); return; }
    setBusy(true); setError(null);
    const scheduledDateTime = `${date}T${time}:00`;
    try {
      if (reschedule) await rescheduleNgoDriveOfferHandover(offer.id, { scheduledDateTime, locationAddress: method === "PICKUP" ? address.trim() : undefined, rescheduleReason: reason.trim() });
      else await scheduleNgoDriveOfferHandover(offer.id, { method, scheduledDateTime, locationAddress: method === "PICKUP" ? address.trim() : undefined });
      onDone();
    } catch (err) { setError(errorText(err, "We couldn't save the plan. Please try again.")); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/90">
      {!reschedule && (
        <fieldset>
          <legend className="text-sm font-bold text-stone-800 dark:text-stone-200">How will the items reach the NGO?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {([["DROP_OFF", "I'll drop them off", "At the NGO's address", Store], ["PICKUP", "The NGO picks them up", "From your address", Truck]] as const).filter(([value]) => !(dropOffOnly && value === "PICKUP")).map(([value, label, hint, Icon]) => (
              <label key={value} className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${method === value ? "border-emerald-600 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/30" : "border-stone-200 dark:border-zinc-700 hover:border-stone-300 dark:hover:border-zinc-600"}`}>
                <input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} className="mt-1 text-emerald-600 focus:ring-emerald-500" />
                <Icon className="mt-0.5 h-5 w-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span><span className="block text-sm font-semibold text-stone-900 dark:text-stone-100">{label}</span><span className="text-xs text-stone-500 dark:text-stone-400">{hint}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold text-stone-800 dark:text-stone-200">Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} required />
        </label>
        <label className="text-sm font-bold text-stone-800 dark:text-stone-200">Time
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} min={hhmm(offer.driveAvailableFrom) || undefined}
            max={hhmm(offer.driveAvailableTo) || undefined} className={field} required />
        </label>
      </div>
      {(days || hours) && <p className="text-xs text-stone-500 dark:text-stone-400">The NGO receives items {days ? `on ${days}` : ""}{hours ? `, ${hours}` : ""}.</p>}
      {method === "PICKUP" && (
        <label className="block text-sm font-bold text-stone-800 dark:text-stone-200">Pickup address
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={field} placeholder="House, street, area, city" />
        </label>
      )}
      {reschedule && (
        <label className="block text-sm font-bold text-stone-800 dark:text-stone-200">Why are you changing the plan?
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={field} maxLength={300} placeholder="Brief reason" />
        </label>
      )}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className={primary}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {reschedule ? "Save new time" : "Confirm the plan"}
      </button>
    </form>
  );
}

function PlanSummary({ offer, handover, role }: { offer: NgoDriveOfferResponse; handover: NgoDriveOfferHandoverRecordResponse; role: DriveHandoverRole }) {
  const when = new Date(handover.scheduledDateTime ?? "");
  const dropOff = handover.method === "DROP_OFF";
  const where = dropOff ? offer.handoverDetails?.registeredOfficeAddress : handover.locationAddress;
  return (
    <div className="rounded-lg bg-stone-50 p-4 text-sm dark:bg-zinc-800/60">
      <p className="font-semibold text-stone-900 dark:text-stone-100">
        {dropOff ? (role === "DONOR" ? "You drop off at the NGO" : "The donor drops off at your address") : (role === "DONOR" ? "The NGO picks up from you" : "You pick up from the donor")}
      </p>
      <p className="mt-1 text-stone-700 dark:text-stone-300">
        {formatIST(handover.scheduledDateTime)}
      </p>
      {where && (
        <p className="mt-1.5 flex items-start gap-1.5 text-stone-700 dark:text-stone-300">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
          <span>{where}</span>
        </p>
      )}
      {handover.atRisk && (
        <p className="mt-2 font-semibold text-amber-700 dark:text-amber-400">
          This handover has been moved twice. Our team may step in.
        </p>
      )}
    </div>
  );
}

function JourneyRail({
  steps,
  currentIdx,
  isEnded,
}: {
  steps: { key: string; label: string }[];
  currentIdx: number;
  isEnded: boolean;
}) {
  return (
    <nav aria-label="Handover progress" className="w-full">
      <ol className="flex items-start">
        {steps.map((step, i) => {
          const done = !isEnded && i < currentIdx;
          const isCurrent = !isEnded && i === currentIdx;
          const leftDone = !isEnded && i - 1 < currentIdx;
          const rightDone = done;

          return (
            <li key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center">
                <div className="h-0.5 flex-1 overflow-hidden bg-stone-200 dark:bg-zinc-700" style={{ visibility: i === 0 ? "hidden" : undefined }}>
                  <div
                    className="h-full w-full bg-emerald-600 transition-transform duration-300"
                    style={{ transform: `scaleX(${leftDone ? 1 : 0})`, transformOrigin: "left" }}
                  />
                </div>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-2xs font-bold transition-colors ${
                    done
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : isCurrent
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-300"
                        : "border-stone-300 bg-stone-100 text-stone-400 dark:border-zinc-700 dark:bg-zinc-800"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" /> : i + 1}
                </span>
                <div className="h-0.5 flex-1 overflow-hidden bg-stone-200 dark:bg-zinc-700" style={{ visibility: i === steps.length - 1 ? "hidden" : undefined }}>
                  <div
                    className="h-full w-full bg-emerald-600 transition-transform duration-300"
                    style={{ transform: `scaleX(${rightDone ? 1 : 0})`, transformOrigin: "left" }}
                  />
                </div>
              </div>
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={`w-full truncate text-center text-3xs font-semibold sm:text-2xs ${
                  isCurrent
                    ? "text-emerald-700 dark:text-emerald-400"
                    : done
                      ? "text-stone-700 dark:text-stone-300"
                      : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {isEnded
          ? "This handover is closed and did not complete."
          : `Step ${currentIdx + 1} of ${steps.length}: ${steps[currentIdx]?.label}.`}
      </p>
    </nav>
  );
}

export function DriveHandover({
  role, offer, handover, onChanged,
}: {
  role: DriveHandoverRole; offer: NgoDriveOfferResponse; handover: NgoDriveOfferHandoverRecordResponse | null; onChanged: () => void;
}) {
  const [otp, setOtp] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [qty, setQty] = useState(String(offer.quantity ?? ""));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [issueType, setIssueType] = useState("ITEM_NOT_RECEIVED");
  const [issueText, setIssueText] = useState("");
  const [issueSent, setIssueSent] = useState(false);

  const status = offer.status;
  const isEnded = Boolean(ENDED[status]);
  const accepted = ACCEPTED.has(status);
  const inHandover = IN_HANDOVER.has(status);
  const delivered = DELIVERED.has(status);
  const photos = offer.receiptPhotos ?? [];
  const unit = unitLabel(offer.driveUnit);
  const driveHref = role === "NGO" ? `/ngo/drives/${offer.driveId}` : `/drives/${offer.driveId}`;

  async function run(key: string, work: () => Promise<unknown>, fallback: string) {
    setBusy(key); setError(null);
    try { await work(); onChanged(); }
    catch (e) { setError(errorText(e, fallback)); }
    finally { setBusy(null); }
  }

  // 4 steps in the rail: Accepted (0), Planned (1), In person / Receipt (2), Complete / Received (3)
  const steps = [
    { key: "accepted", label: "Accepted" },
    { key: "planned", label: "Planned" },
    { key: "handover", label: role === "DONOR" ? "In person" : "Receipt" },
    { key: "complete", label: status === "COMPLETED" ? "Complete" : "Received" },
  ];

  let currentStepIdx = 0;
  if (delivered) currentStepIdx = status === "COMPLETED" ? 3 : 3;
  else if (inHandover) currentStepIdx = 2;
  else if (handover) currentStepIdx = 1;
  else if (accepted) currentStepIdx = 1;

  const roleClass = role === "NGO" ? "handover-ngo-drive" : "handover-donor";

  return (
    <main data-ck-role-theme={role === "NGO" ? "ngo" : undefined} className={`${roleClass} min-h-[100dvh] bg-[var(--background)] pb-16`}>
      <div className="mx-auto max-w-6xl px-4 pt-5">
        {/* ── Context Header (Donee Reference style) ───────────────────────── */}
        <header className="mb-5">
          <Link
            href={role === "NGO" ? driveHref : "/dashboard"}
            className="group mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-emerald-700 dark:text-stone-400 dark:hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            {role === "NGO" ? "Back to the drive" : "Back to your dashboard"}
          </Link>

          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400 dark:bg-zinc-800">
              <Package className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold text-stone-900 dark:text-stone-100 sm:text-xl">
                <Link href={driveHref} className="hover:underline">{offer.driveTitle}</Link>
              </h1>
              <p className="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400">
                {offer.quantity} {unit} {offer.driveItemName ? `of ${offer.driveItemName}` : ""}
                {" · "}
                {role === "NGO" ? `from ${offer.donorDisplayName || "a donor"}` : `to ${offer.ngoName || "the NGO"}`}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-2xs text-stone-400 dark:text-stone-500">CK-DRV-{offer.id}</span>
                <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified handover
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Horizontal Journey Rail ───────────────────────────────────────── */}
        <div className="mb-6 rounded-lg border border-stone-200 bg-white px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
          <JourneyRail steps={steps} currentIdx={currentStepIdx} isEnded={isEnded} />
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {/* ── 12-Column Workspace ──────────────────────────────────────────── */}
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-12">
          {/* Main Action Area (7-8 cols) */}
          <div className="space-y-4 sm:space-y-5 lg:col-span-7 xl:col-span-8">
            {/* "YOUR NEXT STEP" Card */}
            <section
              aria-labelledby="next-step-heading"
              className="rounded-lg border border-emerald-500/25 bg-emerald-50/40 p-4 sm:p-5 dark:border-emerald-800/40 dark:bg-emerald-950/20"
            >
              <p className="text-2xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Your next step
              </p>

              {isEnded ? (
                <div className="mt-2 space-y-2">
                  <h2 id="next-step-heading" className="text-base font-bold text-stone-900 dark:text-stone-100 sm:text-2xl">
                    {ENDED[status]}
                  </h2>
                  {offer.ngoDeclineReason && (
                    <p className="text-sm text-stone-600 dark:text-stone-400">Reason: {offer.ngoDeclineReason}</p>
                  )}
                </div>
              ) : !handover && accepted ? (
                <div className="mt-2 space-y-3">
                  <h2 id="next-step-heading" className="text-base font-bold text-stone-900 dark:text-stone-100 sm:text-2xl">
                    Plan the handover
                  </h2>
                  {role === "DONOR" ? (
                    <>
                      <p className="text-sm text-stone-600 dark:text-stone-300">
                        Choose whether to drop the items off or have the NGO collect them, and pick a date and time inside their hours.
                      </p>
                      <PlanForm offer={offer} handover={null} reschedule={false} onDone={onChanged} />
                    </>
                  ) : (
                    <p className="text-sm text-stone-600 dark:text-stone-300">
                      Waiting for the donor to choose a drop-off or pickup time inside your drive&apos;s days and hours.
                    </p>
                  )}
                </div>
              ) : inHandover ? (
                <div className="mt-2 space-y-4">
                  <h2 id="next-step-heading" className="text-base font-bold text-stone-900 dark:text-stone-100 sm:text-2xl">
                    {role === "DONOR" ? "Hand over your items" : "Receive the items"}
                  </h2>
                  {role === "DONOR" ? (
                    <div className="rounded-lg border-2 border-dashed border-emerald-300 bg-white/70 p-5 text-center dark:border-emerald-800 dark:bg-zinc-900/70">
                      {otp ? (
                        <>
                          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Show this code to the NGO</p>
                          <p className="mt-3 font-mono text-4xl sm:text-5xl font-black tracking-[0.3em] text-emerald-800 dark:text-emerald-300" aria-live="polite">
                            {otp}
                          </p>
                          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                            Only share it when you hand the items over. Getting a new code replaces this one.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-stone-700 dark:text-stone-300">
                            At the handover, show the NGO your code. They enter it to confirm they received your items.
                          </p>
                          <button
                            type="button"
                            className={`${primary} mt-4`}
                            disabled={busy === "otp"}
                            onClick={() => run("otp", async () => setOtp((await generateNgoDriveOfferHandoverOtp(offer.id)).otp), "We couldn't get your code.")}
                          >
                            {busy === "otp" && <Loader2 className="h-4 w-4 animate-spin" />}
                            Show my code
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <p className="text-sm font-bold text-stone-900 dark:text-stone-100">a. Photograph the items you received</p>
                        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">At least one clear photo. Avoid people and documents.</p>
                        {photos.length > 0 && (
                          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Receipt photos">
                            {photos.map((u) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <li key={u}><img src={u} alt="Items received" className="h-20 w-20 rounded-lg object-cover border border-stone-200 dark:border-zinc-700" /></li>
                            ))}
                          </ul>
                        )}
                        <label className={`${secondary} mt-3 cursor-pointer`}>
                          {busy === "photos" ? "Uploading…" : photos.length > 0 ? "Add more photos" : "Upload photos"}
                          <input
                            type="file" accept="image/*" multiple className="sr-only" disabled={busy === "photos"}
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? []); e.target.value = "";
                              if (files.length) void run("photos", () => uploadNgoDriveReceiptPhotos(offer.driveId, offer.id, files), "We couldn't upload those photos.");
                            }}
                          />
                        </label>
                      </div>

                      <form
                        className={`rounded-lg border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${photos.length === 0 ? "opacity-60" : ""}`}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const n = Number(qty);
                          if (!/^\d{6}$/.test(otpInput.trim())) { setError("Enter the 6-digit code the donor shows you."); return; }
                          if (!Number.isInteger(n) || n < 1 || n > (offer.quantity ?? n)) { setError(`Enter how many you received (1 to ${offer.quantity}).`); return; }
                          void run("confirm", () => confirmNgoDriveOfferHandoverNgo(offer.driveId, offer.id, { otp: otpInput.trim(), quantity: n }), "We couldn't confirm the handover.");
                        }}
                      >
                        <p className="text-sm font-bold text-stone-900 dark:text-stone-100">b. Enter the donor&apos;s code and what you received</p>
                        {photos.length === 0 && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Upload at least one photo first.</p>}
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                            Donor&apos;s code
                            <input
                              inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otpInput}
                              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                              className={`${field} font-mono text-lg tracking-widest`} disabled={photos.length === 0}
                            />
                          </label>
                          <label className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                            Quantity received ({unit})
                            <input
                              type="number" min={1} max={offer.quantity} value={qty}
                              onChange={(e) => setQty(e.target.value)} className={field} disabled={photos.length === 0}
                            />
                          </label>
                        </div>
                        <button type="submit" className={`${primary} mt-3`} disabled={photos.length === 0 || busy === "confirm"}>
                          {busy === "confirm" && <Loader2 className="h-4 w-4 animate-spin" />}Confirm handover
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ) : delivered ? (
                <div className="mt-2 space-y-3">
                  <h2 id="next-step-heading" className="text-base font-bold text-stone-900 dark:text-stone-100 sm:text-2xl">
                    {status === "COMPLETED" ? (role === "DONOR" ? "Donation complete" : "Handover complete") : "Items received"}
                  </h2>
                  <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>
                      {handover?.confirmation?.ngoConfirmedQty ?? offer.quantity} {unit} received{handover?.confirmation?.otpVerified ? ", confirmed with the donor's code" : ""}.
                    </span>
                  </div>
                  {status === "COMPLETED" && role === "DONOR" && (
                    <div className="pt-2">
                      <Link href={`/certificate?offerId=${offer.id}&type=ngo_drive`} className={primary}>
                        View your certificate
                      </Link>
                    </div>
                  )}
                  {status === "ISSUE_WINDOW_OPEN" && (
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {role === "DONOR"
                        ? "Your certificate is issued when the NGO's distribution proof is approved."
                        : "Upload your distribution proof on the drive page once you've handed the items out."}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <h2 id="next-step-heading" className="text-base font-bold text-stone-900 dark:text-stone-100 sm:text-2xl">
                    Waiting for the NGO to accept
                  </h2>
                  <p className="text-sm text-stone-600 dark:text-stone-300">
                    The NGO reviews each offer. You&apos;ll be notified when it decides.
                  </p>
                </div>
              )}
            </section>

            {/* Below-the-fold Unframed Sections (Donee Reference style) */}
            {/* Safety / Report an Issue */}
            {status === "ISSUE_WINDOW_OPEN" && !issueSent && (
              <details className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <summary className="cursor-pointer font-semibold text-stone-800 dark:text-stone-200">
                  Something wrong? Report an issue
                </summary>
                <form
                  className="mt-3 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (issueText.trim().length < 10) { setError("Describe the issue in a few words (at least 10 characters)."); return; }
                    void run("issue", async () => {
                      await reportNgoDriveOfferIssue(offer.id, { issueType, description: issueText.trim(), windowCategory: "GENERAL" });
                      setIssueSent(true);
                    }, "We couldn't send your report.");
                  }}
                >
                  <label className="block text-sm font-semibold text-stone-800 dark:text-stone-200">
                    What happened?
                    <select value={issueType} onChange={(e) => setIssueType(e.target.value)} className={field}>
                      {ISSUE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-stone-800 dark:text-stone-200">
                    Details
                    <textarea value={issueText} onChange={(e) => setIssueText(e.target.value)} rows={3} maxLength={1000} className={field} />
                  </label>
                  <button type="submit" className={primary} disabled={busy === "issue"}>
                    {busy === "issue" && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send report
                  </button>
                </form>
              </details>
            )}

            {(status === "ISSUE_RAISED" || issueSent) && (
              <div className="rounded-lg bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                An issue was reported. Our team will contact you both.
              </div>
            )}

            {/* Help Section: How this works */}
            <section className="border-t border-stone-200 pt-5 dark:border-zinc-800">
              <h2 className="text-2xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">How this works</h2>
              <dl className="mt-2.5 space-y-2.5 text-sm text-stone-600 dark:text-stone-400">
                <div>
                  <dt className="font-semibold text-stone-700 dark:text-stone-300">The code</dt>
                  <dd>The donor generates a 6-digit code and gives it to the NGO in person. It confirms you both met.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-stone-700 dark:text-stone-300">Receiving the items</dt>
                  <dd>The NGO photographs the items received, verifies the donor&apos;s code, and confirms the quantity received.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-stone-700 dark:text-stone-300">Changing the time</dt>
                  <dd>Only the donor can reschedule, up to twice inside the NGO&apos;s receiving days and hours.</dd>
                </div>
              </dl>
            </section>
          </div>

          {/* Coordination Rail (4-5 cols, sticky on desktop) */}
          <aside className="space-y-3 sm:space-y-4 lg:col-span-5 lg:sticky lg:top-4 lg:self-start xl:col-span-4">
            {/* Schedule Summary Card */}
            {handover && (
              <Panel title="Schedule">
                <div className="space-y-3">
                  <PlanSummary offer={offer} handover={handover} role={role} />
                  {role === "DONOR" && inHandover && !rescheduling && handover.rescheduleCount < 2 && (
                    <button type="button" className={secondary} onClick={() => setRescheduling(true)}>
                      Change the time ({2 - handover.rescheduleCount} left)
                    </button>
                  )}
                  {role === "DONOR" && rescheduling && (
                    <PlanForm offer={offer} handover={handover} reschedule onDone={() => { setRescheduling(false); onChanged(); }} />
                  )}
                </div>
              </Panel>
            )}

            {/* Contact Panel */}
            <Panel title="Contact">
              {role === "DONOR" ? (
                accepted || inHandover || delivered ? (
                  <div className="space-y-2 text-sm">
                    {offer.handoverDetails?.contactName && (
                      <p className="flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-200">
                        <Phone className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                        <span>NGO contact: {offer.handoverDetails.contactName}{offer.handoverDetails.contactPhone ? ` · ${offer.handoverDetails.contactPhone}` : ""}</span>
                      </p>
                    )}
                    {offer.handoverDetails?.registeredOfficeAddress && !handover && (
                      <p className="flex items-start gap-1.5 text-stone-600 dark:text-stone-400">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                        <span>{offer.handoverDetails.registeredOfficeAddress}</span>
                      </p>
                    )}
                    {!offer.handoverDetails?.contactName && !offer.handoverDetails?.registeredOfficeAddress && (
                      <p className="text-stone-500 dark:text-stone-400">NGO details will appear once accepted.</p>
                    )}
                    {!isEnded && (
                      <CallAction phone={offer.handoverDetails?.contactPhone?.replace(/[^\d+]/g, "") || null}
                        label="Call NGO" lockedMessage="The NGO's number isn't available yet. Use the chat for now." />
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    The drive contact person&apos;s phone number is shared after the NGO accepts your offer.
                  </p>
                )
              ) : (
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-stone-800 dark:text-stone-200">
                    Donor: {offer.donorDisplayName || "A donor"}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Coordinate the handover in person or at your registered address.
                  </p>
                </div>
              )}
            </Panel>

            <Panel title="Messages">
              <DriveOfferChatPanel offerId={offer.id} status={status} role={role === "NGO" ? "NGO" : "DONOR"} />
            </Panel>

            {/* Offered Item Details Panel */}
            <Panel title="Item details">
              <div className="space-y-1.5 text-sm">
                <p className="font-semibold text-stone-800 dark:text-stone-200">
                  {offer.quantity} {unit} {offer.driveItemName ? `· ${offer.driveItemName}` : ""}
                </p>
                {offer.condition && (
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Condition: <span className="font-medium text-stone-800 dark:text-stone-200">{offer.condition}</span>
                  </p>
                )}
                {(formatAgeRange(offer.ageRange) || offer.approximateAge) && (
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Age: <span className="font-medium text-stone-800 dark:text-stone-200">{formatAgeRange(offer.ageRange) || offer.approximateAge}</span>
                  </p>
                )}
                {offer.sizeSpec && (
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Size / spec: <span className="font-medium text-stone-800 dark:text-stone-200">{offer.sizeSpec}</span>
                  </p>
                )}
                {(offer.confirmedWorking || offer.confirmedClean) && (
                  <div className="pt-1 flex flex-wrap items-center gap-2.5 text-xs font-medium text-stone-700 dark:text-stone-300">
                    {offer.confirmedWorking && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                        Tested and works
                      </span>
                    )}
                    {offer.confirmedClean && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                        Washed and clean
                      </span>
                    )}
                  </div>
                )}
                {offer.notesForNgo && (
                  <p className="mt-2 rounded bg-stone-50 p-2 text-xs italic text-stone-600 dark:bg-zinc-800 dark:text-stone-300">
                    &ldquo;{offer.notesForNgo}&rdquo;
                  </p>
                )}
                {(offer.media ?? []).some(m => m.status === "APPROVED") && (
                  <div className="pt-2" data-testid="handover-item-media">
                    <ul className="flex flex-wrap gap-2" aria-label="Item photos">
                      {(offer.media ?? []).filter(m => m.mediaType !== "VIDEO" && m.status === "APPROVED").map(m => (
                        <li key={m.id}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo URL */}
                          <img src={m.mediaUrl} alt="Item photo" className="h-16 w-16 rounded-md border border-stone-200 object-cover dark:border-zinc-700" />
                        </li>
                      ))}
                    </ul>
                    {(offer.media ?? []).filter(m => m.mediaType === "VIDEO" && m.playbackUrl).map(m => (
                      <video key={m.id} controls preload="metadata" src={m.playbackUrl as string} aria-label="Donor's item video"
                        className="mt-2 aspect-video w-full max-w-sm rounded-lg border border-stone-200 bg-black object-contain dark:border-zinc-700" />
                    ))}
                  </div>
                )}
              </div>
            </Panel>

            {/* Drive Details Card */}
            <Panel title="Drive details">
              <div className="space-y-2 text-sm">
                <Link href={driveHref} className="block font-bold text-stone-900 hover:text-emerald-700 dark:text-stone-100 dark:hover:text-emerald-400">
                  {offer.driveTitle}
                </Link>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {offer.quantity} {unit} pledged for this drive
                </p>
                {offer.driveAvailableDays && offer.driveAvailableDays.length > 0 && (
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Receiving days: {offer.driveAvailableDays.map((d) => DAY_NAMES[d] ?? d).join(", ")}
                  </p>
                )}
                {offer.driveAvailableFrom && (
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Hours: {hhmm(offer.driveAvailableFrom)}–{hhmm(offer.driveAvailableTo)}
                  </p>
                )}
                <div className="pt-2">
                  <Link
                    href={driveHref}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    View drive page <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </main>
  );
}
