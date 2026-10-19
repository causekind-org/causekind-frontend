"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HandoverLocationField } from "./HandoverLocationField";
import { methodNeedsCourierFields } from "./adapters";
import { handoverScope, type HandoverViewModel } from "./model";
import {
  handoverPrimary, handoverSecondary, handoverInput, handoverLabel,
  handoverSelectTrigger, handoverSelectItem,
} from "./handoverStyles";

export type SchedulePayload = {
  method: string;
  scheduledDateTime: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  courierName?: string;
  reason?: string;
};

/**
 * Donor-only scheduling and rescheduling.
 *
 * <p>Progressive: courier fields exist only for the methods that need them, so
 * an in-person handover isn't asked which courier is carrying it.
 *
 * <p>Built on the project's Radix primitives. The method picker in particular is
 * a Radix `Select`, not a native `<select>`: a native menu is drawn by the OS and
 * paints its highlighted row in the browser's own blue, which no amount of CSS
 * can reach — that mismatch against the warm CauseKind palette is exactly what
 * looked broken. Radix renders the menu itself, so the selected option can carry
 * the role-tinted fill with readable dark text and a check icon.
 *
 * <p>The role token class is applied to `DialogContent` and `SelectContent`
 * directly, because both portal to `<body>` and would otherwise land outside the
 * `.handover-donor` scope with no accent at all.
 */
const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_WORDS: Record<string, string> = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };
type DriveWindow = { availableDays?: string | string[] | null; availableFrom?: string | null; availableTo?: string | null };
const dayCodes = (d: DriveWindow) => (Array.isArray(d.availableDays) ? d.availableDays : String(d.availableDays ?? "").split(","))
  .map(x => x.trim().toUpperCase().slice(0, 3)).filter(Boolean);
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");

/** "on Mon, Wed between 18:11 and 19:11". */
export function driveWindowText(d: DriveWindow): string {
  const days = dayCodes(d).map(c => DAY_WORDS[c] ?? c).join(", ");
  const hours = d.availableFrom && d.availableTo ? `between ${hhmm(d.availableFrom)} and ${hhmm(d.availableTo)}` : "";
  return [days ? `on ${days}` : "", hours].filter(Boolean).join(" ") || "at a time you agree";
}

/** Why a picked local time (yyyy-MM-ddTHH:mm) is outside the NGO's days and hours, or null. */
export function driveSlotProblem(d: DriveWindow, when: string, now = new Date()): string | null {
  const [date, time] = when.split("T");
  if (!date || !time) return null;
  const [y, m, day] = date.split("-").map(Number);
  const local = new Date(y, m - 1, day, Number(time.slice(0, 2)), Number(time.slice(3, 5)));
  if (local <= now) return "Pick a date and time in the future.";
  const codes = dayCodes(d);
  if (codes.length && !codes.includes(DAY_CODES[local.getDay()])) return `The NGO receives items on ${codes.map(c => DAY_WORDS[c] ?? c).join(", ")} only.`;
  const t = time.slice(0, 5);
  if (d.availableFrom && d.availableTo && (t < hhmm(d.availableFrom) || t > hhmm(d.availableTo))) {
    return `Pick a time between ${hhmm(d.availableFrom)} and ${hhmm(d.availableTo)}.`;
  }
  return null;
}

export function HandoverScheduleDialog({
  vm, open, onOpenChange, onSubmit, isReschedule,
}: {
  vm: HandoverViewModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: SchedulePayload) => Promise<void>;
  isReschedule: boolean;
}) {
  const [method, setMethod] = useState(vm.schedule?.method ?? vm.methodOptions[0].value);
  const [when, setWhen] = useState("");
  const [address, setAddress] = useState(vm.schedule?.address ?? "");
  const [lat, setLat] = useState<number | null>(vm.schedule?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(vm.schedule?.longitude ?? null);
  const [notes, setNotes] = useState(vm.schedule?.notes ?? "");
  const [courierName, setCourierName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  /** The map or the address box is still working out the location. */
  const [locationBusy, setLocationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [drive, setDrive] = useState<any>(null);

  useEffect(() => {
    if (vm.flow === "NGO_OFFER" && vm.parentId && open) {
      import("@/lib/api").then(({ getNgoDrive }) => {
        getNgoDrive(vm.parentId!).then(setDrive).catch(() => {});
      });
    }
  }, [vm.flow, vm.parentId, open]);

  const scope = handoverScope(vm.role);

  // Re-seed from the record each time it opens, so reopening to reschedule
  // doesn't reset the pin the donor already dropped.
  useEffect(() => {
    if (!open) return;
    setMethod(vm.schedule?.method ?? vm.methodOptions[0].value);
    setAddress(vm.schedule?.address ?? "");
    setLat(vm.schedule?.latitude ?? null);
    setLng(vm.schedule?.longitude ?? null);
    setNotes(vm.schedule?.notes ?? "");
    setError(null);
  }, [open, vm.schedule, vm.methodOptions]);

  const needsCourier = methodNeedsCourierFields(method);
  // A reschedule costs the other person a trip, so it has to say why.
  const reasonRequired = isReschedule;
  const hasPin = lat != null && lng != null;
  // The donee is sent both the written address and a map link, so both are
  // required, and Save waits for any lookup still filling one from the other.
  let canSubmit = !busy && !locationBusy && when.trim() !== "" && address.trim() !== "" && hasPin
    && (!reasonRequired || reason.trim().length >= 3);

  // NGO drive offers: the NGO's handover days and hours (the same rule the server checks).
  const slotProblem = vm.flow === "NGO_OFFER" && drive && when ? driveSlotProblem(drive, when) : null;
  if (slotProblem) canSubmit = false;

  async function submit() {
    if (busy || !canSubmit) return;      // `disabled` lags a fast double-click
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        method,
        // Drive handovers: the local (IST) time as picked — toISOString() turned 18:30 IST into
        // 13:00, which the server read as outside the NGO's hours. Other flows unchanged.
        scheduledDateTime: vm.flow === "NGO_OFFER" ? `${when.slice(0, 16)}:00` : new Date(when).toISOString(),
        address: address.trim() || undefined,
        ...(lat != null && lng != null ? { latitude: lat, longitude: lng } : {}),
        notes: notes.trim() || undefined,
        courierName: needsCourier && courierName.trim() ? courierName.trim() : undefined,
        reason: reasonRequired ? reason.trim() : undefined,
      });
      onOpenChange(false);
    } catch (e) {
      // Stays open, keeping everything typed — a transient 500 must not cost the
      // donor the pin they just dropped.
      setError(e instanceof Error ? e.message : "Couldn't save this. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const selectedHint = vm.methodOptions.find((o) => o.value === method)?.hint;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className={scope}>
        <DialogHeader>
          <DialogTitle>
            {isReschedule ? "Change the handover time" : "Schedule the handover"}
          </DialogTitle>
          <DialogDescription>
            {isReschedule
              ? "They're planning around the current time, so tell them why it's moving."
              : "Pick a time and place that works for both of you."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3 sm:space-y-4">
          <Field label="How will it happen?" htmlFor="ho-method">
            <Select value={method} onValueChange={setMethod} disabled={busy}>
              <SelectTrigger id="ho-method" className={handoverSelectTrigger}>
                <SelectValue />
              </SelectTrigger>
              {/* scope repeated here: SelectContent portals to <body> too */}
              <SelectContent className={scope}>
                {vm.methodOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} className={handoverSelectItem}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedHint && <Hint>{selectedHint}</Hint>}
          </Field>

          {vm.flow === "NGO_OFFER" && drive && (
            <p data-testid="drive-handover-window" className="text-sm text-stone-700 dark:text-stone-300">
              The NGO receives items {driveWindowText(drive)}.
            </p>
          )}
          {method === "DONOR_DROP_OFF" && vm.flow === "NGO_OFFER" && (
            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-100 text-sm text-amber-800 dark:text-amber-400">
              <strong>Drop-off Location:</strong> {vm.counterpart.name}
              <br />
              {drive ? (
                <>
                  Available days: {drive.availableDays} (up to {new Date(drive.neededBy).toLocaleDateString()})
                  <br/>
                  Hours: {drive.availableFrom} - {drive.availableTo}
                </>
              ) : (
                "Please select a time during their operating hours."
              )}
            </div>
          )}

          <Field label="When?" htmlFor="ho-when" required>
            <Input
              id="ho-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              disabled={busy}
              className={handoverInput}
              min={method === "DONOR_DROP_OFF" ? new Date(Date.now() + 86400000).toISOString().slice(0, 16) : undefined}
              max={method === "DONOR_DROP_OFF" && drive ? new Date(drive.neededBy).toISOString().slice(0, 16) : undefined}
            />
            {slotProblem && <p role="alert" data-testid="drive-slot-problem" className="mt-1 text-sm font-medium text-destructive">{slotProblem}</p>}
          </Field>

          <Field label="Where?" required>
            <HandoverLocationField
              address={address}
              lat={lat}
              lng={lng}
              disabled={busy}
              onAddressChange={setAddress}
              onPinChange={(a, b) => { setLat(a); setLng(b); }}
              onBusyChange={setLocationBusy}
            />
            {!hasPin && address.trim() !== "" && !locationBusy && (
              <Hint>Place the pin too (search, use your current location, or tap the map) so the donee gets a map link.</Hint>
            )}
          </Field>

          {needsCourier && (
            <Field label="Courier or service name (optional)" htmlFor="ho-courier">
              <Input
                id="ho-courier"
                type="text"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                disabled={busy}
                className={handoverInput}
              />
            </Field>
          )}

          {vm.flow === "MATCH" && (
            <Field label="Anything else they should know? (optional)" htmlFor="ho-notes">
              <Input
                id="ho-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={busy}
                className={handoverInput}
              />
            </Field>
          )}

          {reasonRequired && (
            <Field label="Why are you changing it?" htmlFor="ho-reason" required>
              <Input
                id="ho-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="A short reason helps them replan."
                disabled={busy}
                className={handoverInput}
              />
              {vm.schedule && (
                <Hint>
                  {vm.schedule.maxReschedules - vm.schedule.rescheduleCount} change
                  {vm.schedule.maxReschedules - vm.schedule.rescheduleCount === 1 ? "" : "s"} left
                  before this is flagged for review.
                </Hint>
              )}
            </Field>
          )}

          {/* Error sits with the action that failed, not at the top of the page. */}
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className={handoverSecondary}
          >
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={submit} className={handoverPrimary}>
            {busy
              ? <><Loader2 className="animate-spin" aria-hidden /> Saving</>
              : locationBusy
                ? <><Loader2 className="animate-spin" aria-hidden /> Checking location…</>
                : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, htmlFor, required, children }: {
  label: string; htmlFor?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className={handoverLabel}>
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden>*</span>}
      </label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
