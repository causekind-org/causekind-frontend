"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, MapPin, Phone } from "lucide-react";
import { getNgoDrive, scheduleNgoDriveOfferHandover, type NgoDriveOfferResponse } from "@/lib/api";
import { ngoOfferDropOffAddress } from "@/features/handover/adapters";
import { driveSlotProblem, driveWindowText, istWallTime } from "@/features/handover/HandoverScheduleDialog";
import { formatISTDate } from "@/lib/formatIST";

/**
 * Drop-off planner for a donor outside the NGO's pickup radius, shown in place of the
 * "Schedule handover" button: the NGO's address first, then the drop-off date and time,
 * checked instantly (IST) against the NGO's days, hours and the needed-by date.
 */
export function dropOffProblem(window_: { availableDays: string[]; availableFrom?: string | null; availableTo?: string | null },
  date: string, time: string, neededBy: string | null, now = new Date()): string | null {
  if (!date || !time) return "Pick a date and a time.";
  const nb = neededBy ? neededBy.slice(0, 10) : "";
  if (nb && date > nb) return `Pick a date on or before ${formatISTDate(nb)}, when the drive needs the items.`;
  return driveSlotProblem(window_, `${date}T${time}`, now);
}

export function DriveDropOffPlanner({ offer, onDone }: { offer: NgoDriveOfferResponse; onDone: () => void }) {
  const address = ngoOfferDropOffAddress(offer);
  const window_ = { availableDays: offer.driveAvailableDays ?? [], availableFrom: offer.driveAvailableFrom, availableTo: offer.driveAvailableTo };
  const [neededBy, setNeededBy] = useState<string | null>(offer.driveNeededBy ?? null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (neededBy || !offer.driveId) return;
    getNgoDrive(offer.driveId).then(d => setNeededBy(d?.neededBy ?? null)).catch(() => {});
  }, [neededBy, offer.driveId]);

  const problem = dropOffProblem(window_, date, time, neededBy);
  const showProblem = touched && problem != null;
  const lat = offer.driveLocationLatitude, lng = offer.driveLocationLongitude;
  const mapsHref = lat != null && lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  const contact = [offer.handoverDetails?.contactName, offer.handoverDetails?.contactPhone].filter(Boolean).join(", ");
  const windowText = window_.availableDays.length || window_.availableFrom ? driveWindowText(window_) : offer.handoverDetails?.availableHours || "";
  const today = istWallTime().slice(0, 10);

  async function copy() {
    try { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (problem) return;
    setBusy(true); setSaveError(null);
    try {
      await scheduleNgoDriveOfferHandover(offer.id, { method: "DROP_OFF", scheduledDateTime: `${date}T${time}:00` });
      onDone();
    } catch (err) {
      setSaveError(err instanceof Error && err.message ? err.message : "We couldn't save the drop-off time. Please try again.");
    } finally { setBusy(false); }
  }

  const input = (bad: boolean) => `mt-1 block min-h-11 w-full rounded-lg border bg-white px-3 text-sm text-stone-900 dark:bg-zinc-950 dark:text-stone-100 focus:outline-none focus:ring-1 ${bad ? "border-red-600 focus:ring-red-600 dark:border-red-500" : "border-stone-300 focus:border-emerald-600 focus:ring-emerald-600 dark:border-zinc-700"}`;

  return (
    <div data-testid="drive-dropoff-planner" className="space-y-4">
      <section data-testid="drive-dropoff-address-block" className="space-y-2 rounded-lg border border-emerald-200 bg-white p-3.5 text-sm text-stone-800 dark:border-emerald-900 dark:bg-zinc-900 dark:text-stone-200">
        <p className="flex items-start gap-2 font-bold text-stone-900 dark:text-stone-100">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
          <span>Drop off at {offer.handoverDetails?.organizationName || offer.ngoName}</span>
        </p>
        <p data-testid="drive-dropoff-address" className="break-words">{address || "The NGO will share its address soon."}</p>
        <div className="flex flex-wrap gap-2">
          {address && (
            <button type="button" onClick={() => void copy()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-100 dark:hover:bg-zinc-800">
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? "Copied" : "Copy address"}
            </button>
          )}
          {mapsHref && (
            <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-emerald-800 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-zinc-800">
              <MapPin className="h-4 w-4" aria-hidden /> Open in Maps
            </a>
          )}
        </div>
        {contact && (
          <p className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
            <span><span className="font-semibold">Handover contact:</span> {contact}</span></p>
        )}
        {windowText && <p><span className="font-semibold">Open for drop-off:</span> {windowText} (India time)</p>}
      </section>

      <form onSubmit={save} noValidate className="space-y-3">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">When will you drop it off?</h3>
        <p data-testid="drive-dropoff-allowed" className="text-xs text-stone-600 dark:text-stone-400">
          Allowed: {windowText || "any day"}{neededBy ? `, on or before ${formatISTDate(neededBy)}` : ""} (India time).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-stone-800 dark:text-stone-200">Date
            <input type="date" data-testid="drive-dropoff-date" value={date} min={today} max={neededBy ? neededBy.slice(0, 10) : undefined}
              onChange={e => { setDate(e.target.value); setTouched(true); }} aria-invalid={showProblem}
              aria-describedby={showProblem ? "drive-dropoff-problem" : undefined} className={input(showProblem)} />
          </label>
          <label className="text-sm font-semibold text-stone-800 dark:text-stone-200">Time
            <input type="time" data-testid="drive-dropoff-time" value={time}
              min={window_.availableFrom ? window_.availableFrom.slice(0, 5) : undefined} max={window_.availableTo ? window_.availableTo.slice(0, 5) : undefined}
              onChange={e => { setTime(e.target.value); setTouched(true); }} aria-invalid={showProblem}
              aria-describedby={showProblem ? "drive-dropoff-problem" : undefined} className={input(showProblem)} />
          </label>
        </div>
        {showProblem && <p id="drive-dropoff-problem" role="alert" data-testid="drive-dropoff-problem" className="text-sm font-medium text-red-700 dark:text-red-400">{problem}</p>}
        {saveError && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{saveError}</p>}
        <button type="submit" disabled={busy || problem != null}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save drop-off time
        </button>
      </form>
    </div>
  );
}
