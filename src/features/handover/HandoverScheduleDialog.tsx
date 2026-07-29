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
import { HandoverMapPinField } from "./HandoverMapPinField";
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
  const [error, setError] = useState<string | null>(null);

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
  const canSubmit = !busy && when.trim() !== "" && (!reasonRequired || reason.trim().length >= 3);

  async function submit() {
    if (busy || !canSubmit) return;      // `disabled` lags a fast double-click
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        method,
        scheduledDateTime: new Date(when).toISOString(),
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

        <DialogBody className="space-y-4">
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

          <Field label="When?" htmlFor="ho-when" required>
            <Input
              id="ho-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              disabled={busy}
              className={handoverInput}
            />
          </Field>

          <Field label="Where?" htmlFor="ho-address">
            <Input
              id="ho-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Andheri East, Mumbai"
              disabled={busy}
              className={handoverInput}
            />
            <Hint>An area is enough for now — you can share the exact spot later.</Hint>
          </Field>

          <Field label="Exact spot (optional)">
            {/* Deferred: Google Maps is not fetched until this is opened. An
                existing pin auto-expands so a reschedule never looks like it
                lost the location. */}
            <HandoverMapPinField
              lat={lat}
              lng={lng}
              disabled={busy}
              onChange={(a, b) => { setLat(a); setLng(b); }}
            />
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
