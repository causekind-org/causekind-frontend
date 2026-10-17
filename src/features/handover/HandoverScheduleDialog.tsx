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
  trackingNumber?: string;
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
  const [courierName, setCourierName] = useState(vm.schedule?.courierName ?? "");
  const [trackingNumber, setTrackingNumber] = useState(vm.schedule?.trackingNumber ?? "");
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
    setCourierName(vm.schedule?.courierName ?? "");
    setTrackingNumber(vm.schedule?.trackingNumber ?? "");
    setError(null);
  }, [open, vm.schedule, vm.methodOptions]);

  // A reschedule costs the other person a trip, so it has to say why.
  const reasonRequired = isReschedule;
  const isCourier = method === "COURIER" || method === "THIRD_PARTY";
  const hasPin = lat != null && lng != null;
  // For in-person handovers, the donee is sent both the written address and a map link,
  // so both are required. For courier deliveries, the delivery address will be provided
  // by the recipient in the hub, so meeting location is not required here.
  const locationValid = isCourier || (!locationBusy && address.trim() !== "" && hasPin);
  let canSubmit = !busy && when.trim() !== "" && locationValid
    && (!reasonRequired || reason.trim().length >= 3);

  // Validate NGO Drop off limits
  if (canSubmit && method === "DONOR_DROP_OFF" && drive) {
    const d = new Date(when);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const availableDays = (drive.availableDays || "").split(",").map((s: string) => s.trim());
    if (availableDays.length > 0 && !availableDays.includes("Everyday") && !availableDays.includes(dayName)) {
      canSubmit = false;
    }
    const neededBy = new Date(drive.neededBy);
    if (d > neededBy) {
      canSubmit = false;
    }
    // Time slot validation could go here, but for simplicity we rely on the submit warning if it fails.
  }

  async function submit() {
    if (busy || !canSubmit) return;      // `disabled` lags a fast double-click
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        method,
        scheduledDateTime: new Date(when).toISOString(),
        address: isCourier ? undefined : (address.trim() || undefined),
        ...(!isCourier && lat != null && lng != null ? { latitude: lat, longitude: lng } : {}),
        notes: notes.trim() || undefined,
        courierName: courierName.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
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
            {isReschedule
              ? "Change the handover time"
              : (isCourier ? "Schedule courier dispatch" : "Schedule the handover")}
          </DialogTitle>
          <DialogDescription>
            {isReschedule
              ? "They're planning around the current time, so tell them why it's moving."
              : (isCourier ? "Pick when you plan to dispatch the item." : "Pick a time and place that works for both of you.")}
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

          <Field label={isCourier ? "When will you dispatch?" : "When?"} htmlFor="ho-when" required>
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
            {isCourier && (
              <Hint>Estimated date and time you plan to hand over or dispatch the parcel.</Hint>
            )}
          </Field>

          {isCourier ? (
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              <p className="font-semibold text-stone-900 dark:text-stone-100 text-sm mb-1">
                Recipient delivery address
              </p>
              <p className="text-stone-600 dark:text-stone-400">
                You won't need to specify a meeting location for courier delivery. Once scheduled, you will request the recipient's delivery address directly in the handover hub.
              </p>
            </div>
          ) : (
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
          )}


          {(method === "COURIER" || method === "THIRD_PARTY") && (
            <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="text-2xs font-bold uppercase tracking-wider text-stone-500">
                Courier details (optional)
              </p>
              <Field label="Courier service name" htmlFor="ho-sched-courier">
                <Input
                  id="ho-sched-courier"
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g. Delhivery, BlueDart, DTDC, India Post, Porter"
                  disabled={busy}
                  className={handoverInput}
                />
              </Field>
              <Field label="Courier / Tracking number" htmlFor="ho-sched-tracking">
                <Input
                  id="ho-sched-tracking"
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. TRK987654321, AWB123456"
                  disabled={busy}
                  className={handoverInput}
                />
              </Field>
              <Hint>You can enter tracking details now or add them later in the hub once booked.</Hint>
            </div>
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
              : (!isCourier && locationBusy)
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
