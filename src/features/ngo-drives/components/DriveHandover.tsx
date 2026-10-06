"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Loader2, MapPin, Phone, Truck, Store, ShieldCheck } from "lucide-react";
import {
  scheduleNgoDriveOfferHandover, rescheduleNgoDriveOfferHandover, generateNgoDriveOfferHandoverOtp,
  uploadNgoDriveReceiptPhotos, confirmNgoDriveOfferHandoverNgo, reportNgoDriveOfferIssue,
  type NgoDriveOfferResponse, type NgoDriveOfferHandoverRecordResponse,
} from "@/lib/api";

/**
 * The handover for an offer to an NGO drive, for the donor or the drive's NGO.
 * Separate from the shared OFFER/MATCH handover hub: drive context on top, then
 * numbered steps (accepted, plan, hand over, done). On the NGO side the receipt photos
 * come before the OTP, because the server needs at least one before it confirms.
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
  ["ITEM_NOT_RECEIVED", "Items not received"], ["ITEM_DAMAGED", "Items damaged"],
  ["ITEM_NOT_AS_DESCRIBED", "Not as described"], ["INAPPROPRIATE_BEHAVIOUR", "Inappropriate behaviour"], ["OTHER", "Something else"],
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

function Step({ n, title, state, children }: { n: number; title: string; state: "done" | "current" | "upcoming"; children?: React.ReactNode }) {
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        state === "done" ? "bg-ngo-600 text-white" : state === "current" ? "bg-amber-400 text-amber-950" : "bg-stone-200 text-stone-500 dark:bg-zinc-800 dark:text-stone-400"}`}
        aria-hidden="true">
        {state === "done" ? <CheckCircle2 className="h-5 w-5" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className={`font-bold ${state === "upcoming" ? "text-stone-400 dark:text-stone-500" : "text-stone-900 dark:text-stone-100"}`}>
          <span className="sr-only">Step {n}{state === "done" ? " (done)" : state === "current" ? " (now)" : ""}: </span>{title}
        </h3>
        {children && <div className="mt-2">{children}</div>}
      </div>
    </li>
  );
}

const field = "mt-1 block w-full rounded-lg border border-stone-300 bg-white p-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950";
const primary = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-ngo-700 px-5 text-sm font-bold text-white hover:bg-ngo-800 disabled:opacity-50";
const secondary = "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-stone-300 px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50 dark:border-zinc-700 dark:text-stone-100 dark:hover:bg-zinc-800";

function PlanForm({ offer, handover, onDone, reschedule }: {
  offer: NgoDriveOfferResponse; handover: NgoDriveOfferHandoverRecordResponse | null; onDone: () => void; reschedule: boolean;
}) {
  const [method, setMethod] = useState<"DROP_OFF" | "PICKUP">(
    (handover?.method as "DROP_OFF" | "PICKUP") ?? (offer.handoverMethod === "NGO_PICKUP" ? "PICKUP" : "DROP_OFF"));
  const [date, setDate] = useState("");
  const [time, setTime] = useState(hhmm(offer.driveAvailableFrom) || "10:00");
  const [address, setAddress] = useState(handover?.locationAddress ?? "");
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
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-stone-200 p-4 dark:border-zinc-800">
      {!reschedule && (
        <fieldset>
          <legend className="text-sm font-bold text-stone-800 dark:text-stone-200">How will the items reach the NGO?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {([["DROP_OFF", "I'll drop them off", "At the NGO's address", Store], ["PICKUP", "The NGO picks them up", "From your address", Truck]] as const).map(([value, label, hint, Icon]) => (
              <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${method === value ? "border-ngo-600 bg-ngo-50 dark:bg-ngo-950/30" : "border-stone-200 dark:border-zinc-700"}`}>
                <input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} className="mt-1" />
                <Icon className="mt-0.5 h-5 w-5 text-ngo-700 dark:text-ngo-300" aria-hidden="true" />
                <span><span className="block text-sm font-semibold">{label}</span><span className="text-xs text-stone-500">{hint}</span></span>
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
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={field} maxLength={300} />
        </label>
      )}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className={primary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{reschedule ? "Save new time" : "Confirm the plan"}</button>
    </form>
  );
}

function PlanSummary({ offer, handover, role }: { offer: NgoDriveOfferResponse; handover: NgoDriveOfferHandoverRecordResponse; role: DriveHandoverRole }) {
  const when = new Date(handover.scheduledDateTime ?? "");
  const dropOff = handover.method === "DROP_OFF";
  const where = dropOff ? offer.handoverDetails?.registeredOfficeAddress : handover.locationAddress;
  return (
    <div className="rounded-xl bg-stone-50 p-4 text-sm dark:bg-zinc-800/60">
      <p className="font-semibold text-stone-900 dark:text-stone-100">
        {dropOff ? (role === "DONOR" ? "You drop off at the NGO" : "The donor drops off at your address") : (role === "DONOR" ? "The NGO picks up from you" : "You pick up from the donor")}
      </p>
      <p className="mt-1 text-stone-700 dark:text-stone-300">{when.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} at {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
      {where && <p className="mt-1 flex items-start gap-1.5 text-stone-700 dark:text-stone-300"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{where}</p>}
      {handover.atRisk && <p className="mt-2 font-semibold text-amber-700 dark:text-amber-400">This handover has been moved twice. Our team may step in.</p>}
    </div>
  );
}

export function DriveHandover({ role, offer, handover, onChanged }: {
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

  const planState = handover ? "done" : accepted ? "current" : "upcoming";
  const handState = delivered ? "done" : inHandover ? "current" : "upcoming";

  return (
    <main className="min-h-screen bg-stone-50 pb-16 dark:bg-zinc-950">
      <div className={`${role === "NGO" ? "bg-ngo-900" : "bg-gradient-to-br from-emerald-900 to-emerald-800"} px-4 py-6 text-white sm:px-6 sm:py-8`}>
        <div className="mx-auto max-w-3xl">
          <Link href={role === "NGO" ? driveHref : "/dashboard"} className="text-sm text-white/80 hover:text-white">
            ← {role === "NGO" ? "Back to the drive" : "Back to your dashboard"}
          </Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-white/70">Drive handover</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl"><Link href={driveHref} className="hover:underline">{offer.driveTitle}</Link></h1>
          <p className="mt-2 text-sm text-white/85">
            {offer.quantity} {unit} {offer.driveItemName ? `of ${offer.driveItemName}` : ""} · {role === "NGO" ? `from ${offer.donorDisplayName || "a donor"}` : `to ${offer.ngoName || "the NGO"}`}
          </p>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-3xl space-y-6 px-4 sm:px-6">
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

        {ENDED[status] ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-bold text-stone-900 dark:text-stone-100">{ENDED[status]}</p>
            {offer.ngoDeclineReason && <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Reason: {offer.ngoDeclineReason}</p>}
          </section>
        ) : (
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <ol aria-label="Handover steps">
              <Step n={1} title={accepted || inHandover || delivered ? "Offer accepted" : "Waiting for the NGO to accept"}
                state={accepted || inHandover || delivered ? "done" : "current"}>
                {role === "DONOR" && (accepted || inHandover) && offer.handoverDetails?.contactName && (
                  <p className="flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400">
                    <Phone className="h-4 w-4" aria-hidden="true" /> NGO contact: {offer.handoverDetails.contactName}{offer.handoverDetails.contactPhone ? ` · ${offer.handoverDetails.contactPhone}` : ""}
                  </p>
                )}
              </Step>

              <Step n={2} title="Plan the handover" state={planState}>
                {handover ? (
                  <div className="space-y-3">
                    <PlanSummary offer={offer} handover={handover} role={role} />
                    {role === "DONOR" && inHandover && !rescheduling && handover.rescheduleCount < 2 && (
                      <button type="button" className={secondary} onClick={() => setRescheduling(true)}>Change the time ({2 - handover.rescheduleCount} left)</button>
                    )}
                    {role === "DONOR" && rescheduling && <PlanForm offer={offer} handover={handover} reschedule onDone={() => { setRescheduling(false); onChanged(); }} />}
                  </div>
                ) : accepted ? (
                  role === "DONOR"
                    ? <PlanForm offer={offer} handover={null} reschedule={false} onDone={onChanged} />
                    : <p className="text-sm text-stone-600 dark:text-stone-400">Waiting for the donor to choose a drop-off or pickup time inside your drive&apos;s days and hours.</p>
                ) : null}
              </Step>

              <Step n={3} title={role === "DONOR" ? "Hand over your items" : "Receive the items"} state={handState}>
                {inHandover && role === "DONOR" && (
                  <div className="rounded-xl border-2 border-dashed border-emerald-300 p-5 text-center dark:border-emerald-800">
                    {otp ? (
                      <>
                        <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Show this code to the NGO</p>
                        <p className="mt-2 font-mono text-5xl font-black tracking-[0.3em] text-stone-900 dark:text-white" aria-live="polite">{otp}</p>
                        <p className="mt-2 text-xs text-stone-500">Only share it when you hand the items over. Getting a new code replaces this one.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-stone-700 dark:text-stone-300">At the handover, show the NGO your code. They enter it to confirm they received your items.</p>
                        <button type="button" className={`${primary} mt-3 bg-emerald-700 hover:bg-emerald-800`} disabled={busy === "otp"}
                          onClick={() => run("otp", async () => setOtp((await generateNgoDriveOfferHandoverOtp(offer.id)).otp), "We couldn't get your code.")}>
                          {busy === "otp" && <Loader2 className="h-4 w-4 animate-spin" />}Show my code
                        </button>
                      </>
                    )}
                  </div>
                )}
                {inHandover && role === "NGO" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-stone-200 p-4 dark:border-zinc-800">
                      <p className="text-sm font-bold text-stone-900 dark:text-stone-100">a. Photograph the items you received</p>
                      <p className="mt-1 text-xs text-stone-500">At least one clear photo. Avoid people and documents.</p>
                      {photos.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Receipt photos">
                          {photos.map((u) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <li key={u}><img src={u} alt="Items received" className="h-20 w-20 rounded-lg object-cover" /></li>
                          ))}
                        </ul>
                      )}
                      <label className={`${secondary} mt-3 cursor-pointer`}>
                        {busy === "photos" ? "Uploading…" : photos.length > 0 ? "Add more photos" : "Upload photos"}
                        <input type="file" accept="image/*" multiple className="sr-only" disabled={busy === "photos"}
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []); e.target.value = "";
                            if (files.length) void run("photos", () => uploadNgoDriveReceiptPhotos(offer.driveId, offer.id, files), "We couldn't upload those photos.");
                          }} />
                      </label>
                    </div>
                    <form className={`rounded-xl border border-stone-200 p-4 dark:border-zinc-800 ${photos.length === 0 ? "opacity-60" : ""}`}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const n = Number(qty);
                        if (!/^\d{6}$/.test(otpInput.trim())) { setError("Enter the 6-digit code the donor shows you."); return; }
                        if (!Number.isInteger(n) || n < 1 || n > (offer.quantity ?? n)) { setError(`Enter how many you received (1 to ${offer.quantity}).`); return; }
                        void run("confirm", () => confirmNgoDriveOfferHandoverNgo(offer.driveId, offer.id, { otp: otpInput.trim(), quantity: n }), "We couldn't confirm the handover.");
                      }}>
                      <p className="text-sm font-bold text-stone-900 dark:text-stone-100">b. Enter the donor&apos;s code and what you received</p>
                      {photos.length === 0 && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Upload at least one photo first.</p>}
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-semibold">Donor&apos;s code
                          <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                            className={`${field} font-mono text-lg tracking-widest`} disabled={photos.length === 0} />
                        </label>
                        <label className="text-sm font-semibold">Quantity received ({unit})
                          <input type="number" min={1} max={offer.quantity} value={qty} onChange={(e) => setQty(e.target.value)} className={field} disabled={photos.length === 0} />
                        </label>
                      </div>
                      <button type="submit" className={`${primary} mt-3`} disabled={photos.length === 0 || busy === "confirm"}>
                        {busy === "confirm" && <Loader2 className="h-4 w-4 animate-spin" />}Confirm handover
                      </button>
                    </form>
                  </div>
                )}
              </Step>

              <Step n={4} title={status === "COMPLETED" ? "Complete" : "Received"} state={delivered ? (status === "COMPLETED" ? "done" : "current") : "upcoming"}>
                {delivered && (
                  <div className="space-y-3 text-sm">
                    <p className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
                      <ShieldCheck className="h-4 w-4 text-ngo-600" aria-hidden="true" />
                      {handover?.confirmation?.ngoConfirmedQty ?? offer.quantity} {unit} received{handover?.confirmation?.otpVerified ? ", confirmed with the donor's code" : ""}.
                    </p>
                    {status === "COMPLETED" && role === "DONOR" && (
                      <Link href={`/certificate?offerId=${offer.id}&type=ngo_drive`} className={primary}>View your certificate</Link>
                    )}
                    {status === "ISSUE_WINDOW_OPEN" && !issueSent && (
                      <details className="rounded-xl border border-stone-200 p-4 dark:border-zinc-800">
                        <summary className="cursor-pointer font-semibold text-stone-800 dark:text-stone-200">Something wrong? Report an issue</summary>
                        <form className="mt-3 space-y-3" onSubmit={(e) => {
                          e.preventDefault();
                          if (issueText.trim().length < 10) { setError("Describe the issue in a few words (at least 10 characters)."); return; }
                          void run("issue", async () => {
                            await reportNgoDriveOfferIssue(offer.id, { issueType, description: issueText.trim(), windowCategory: "GENERAL" });
                            setIssueSent(true);
                          }, "We couldn't send your report.");
                        }}>
                          <label className="block font-semibold">What happened?
                            <select value={issueType} onChange={(e) => setIssueType(e.target.value)} className={field}>
                              {ISSUE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </label>
                          <label className="block font-semibold">Details
                            <textarea value={issueText} onChange={(e) => setIssueText(e.target.value)} rows={3} maxLength={1000} className={field} />
                          </label>
                          <button type="submit" className={primary} disabled={busy === "issue"}>Send report</button>
                        </form>
                      </details>
                    )}
                    {(status === "ISSUE_RAISED" || issueSent) && <p className="text-amber-800 dark:text-amber-300">An issue was reported. Our team will contact you both.</p>}
                    {status === "ISSUE_WINDOW_OPEN" && <p className="text-stone-500 dark:text-stone-400">{role === "DONOR" ? "Your certificate is issued when the NGO's distribution proof is approved." : "Upload your distribution proof on the drive page once you've handed the items out."}</p>}
                  </div>
                )}
              </Step>
            </ol>
          </section>
        )}
        {!delivered && !ENDED[status] && !accepted && !inHandover && (
          <p className="flex items-center gap-2 text-sm text-stone-500"><Circle className="h-3 w-3" aria-hidden="true" />The NGO reviews each offer. You&apos;ll be notified when it decides.</p>
        )}
      </div>
    </main>
  );
}
