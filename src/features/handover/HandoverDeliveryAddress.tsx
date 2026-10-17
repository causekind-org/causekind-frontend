"use client";

import { serverDate } from "@/lib/serverTime";
import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, MapPin, Package, Phone, Send, Truck, UserRound, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DeliveryAddressInput, DeliveryAddressSuggestion } from "@/lib/api";
import { HandoverMapPinField } from "./HandoverMapPinField";
import { Panel } from "./HandoverScheduleSummary";
import { hasCoordinates, mapsHref } from "./adapters";
import {
  deliveryAddressPending, deliveryAddressState,
  type HandoverDelivery, type HandoverViewModel,
} from "./model";
import { handoverInput, handoverLabel, handoverPrimary, handoverSecondary } from "./handoverStyles";

/**
 * The courier delivery address and donor courier dispatch tracking.
 *
 * <p>Flow:
 * 1. The donor requests the address from the recipient.
 * 2. The recipient provides their recipient name, phone, and delivery address
 *    (typed by hand or 1-click filled with "Use my profile details").
 *    Recipient is NEVER asked for courier company name or tracking number.
 * 3. Once address is supplied, the donor dispatches the courier and enters
 *    the courier company name and tracking / courier number on the donor side.
 * 4. Both participants can see the courier name and tracking details.
 */

export type DeliveryAddressActions = {
  request: () => Promise<void>;
  submit: (input: DeliveryAddressInput) => Promise<void>;
  suggest: () => Promise<DeliveryAddressSuggestion>;
  updateCourier?: (data: { courierName: string; trackingNumber?: string }) => Promise<void>;
};

const whenShort = (iso: string | null) =>
  iso ? serverDate(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : null;

/** The address step as the next action, while it's pending. */
export function DeliveryAddressStep({ vm, actions }: { vm: HandoverViewModel; actions: DeliveryAddressActions }) {
  if (vm.role === "DONOR") return <DonorRequest vm={vm} actions={actions} />;
  return <DeliveryAddressForm vm={vm} actions={actions} />;
}

/** The reference panel — renders recipient delivery address and donor courier details. */
export function HandoverDeliveryPanel({ vm, actions }: { vm: HandoverViewModel; actions?: DeliveryAddressActions }) {
  const [editing, setEditing] = useState(false);
  const d = vm.delivery;
  if (!d?.needed || deliveryAddressPending(vm)) return null;
  const state = deliveryAddressState(vm);
  const donor = vm.role === "DONOR";
  const canAct = !vm.closed && actions != null;

  if (!donor && canAct && editing) {
    return (
      <Panel title="Your delivery address">
        <DeliveryAddressForm vm={vm} actions={actions!} onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)} />
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel title={donor ? "Deliver to" : "Your delivery address"}>
        {d.address ? (
          <AddressDetails delivery={d} showCopy={donor} />
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {donor ? "The recipient hasn't sent their delivery address yet." : "You haven't added a delivery address."}
          </p>
        )}
        {canAct && donor && (
          <div className="mt-3 space-y-2">
            {state === "recheck" && (
              <p className="text-xs text-stone-500 dark:text-stone-400">You asked them to check this {whenShort(d.requestedAt)}.</p>
            )}
            <RequestButton actions={actions!} label={d.address ? "Ask them to check it" : "Request delivery address"} secondary={Boolean(d.address)} />
          </div>
        )}
        {canAct && !donor && d.address && (
          <Button variant="outline" onClick={() => setEditing(true)} className={`${handoverSecondary} mt-3 w-full`}>
            Edit address
          </Button>
        )}
      </Panel>

      <CourierDetailsCard vm={vm} actions={actions} />
    </div>
  );
}

// ── Donor ───────────────────────────────────────────────────────────────────

function DonorRequest({ vm, actions }: { vm: HandoverViewModel; actions: DeliveryAddressActions }) {
  const d = vm.delivery!;
  const state = deliveryAddressState(vm);
  return (
    <div className="space-y-3">
      {d.address && (
        <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-2 text-2xs font-bold uppercase tracking-wider text-stone-400">Recipient address</p>
          <AddressDetails delivery={d} showCopy />
        </div>
      )}
      <RequestButton
        actions={actions}
        label={d.address ? "Ask them to check it" : "Request delivery address"}
        secondary={Boolean(d.address)}
      />
      <p className="text-xs text-stone-500 dark:text-stone-400">
        {state === "requested"
          ? "Request sent. The recipient has been asked to provide their address."
          : "The recipient will be notified to provide their delivery address for the courier."}
      </p>
    </div>
  );
}

function RequestButton({ actions, label, secondary }: { actions: DeliveryAddressActions; label: string; secondary?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (busy) return;
    setBusy(true); setError(null); setSent(false);
    try { await actions.request(); setSent(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't send the request."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-1.5">
      <Button onClick={send} disabled={busy} variant={secondary ? "outline" : "default"}
        className={`${secondary ? handoverSecondary : handoverPrimary} w-full sm:w-auto`}>
        {busy ? <><Loader2 className="animate-spin" aria-hidden /> Sending</> : <><Send aria-hidden /> {label}</>}
      </Button>
      <span role="status" className="block text-xs text-green-700 dark:text-green-400">
        {sent ? "Sent — they've been notified." : ""}
      </span>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

// ── Recipient Form (NO courier name or number asked) ───────────────────────────

function DeliveryAddressForm({ vm, actions, onDone, onCancel }: {
  vm: HandoverViewModel;
  actions: DeliveryAddressActions;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const d = vm.delivery;
  const [name, setName] = useState(d?.contactName ?? "");
  const [phone, setPhone] = useState(d?.contactPhone ?? "");
  const [address, setAddress] = useState(d?.address ?? "");
  const [lat, setLat] = useState<number | null>(d?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(d?.longitude ?? null);
  const [busy, setBusy] = useState<"suggest" | "submit" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const phoneValid = /^\+?(?=(?:\D*\d){10,15}\D*$)[0-9\s-]+$/.test(phone.trim());
  const valid = name.trim() !== "" && phoneValid && address.trim().length >= 10;

  async function fillFromProfile() {
    if (busy) return;
    setBusy("suggest"); setError(null); setNote(null);
    try {
      const s = await actions.suggest();
      if (s.contactName) setName(s.contactName);
      if (s.contactPhone) setPhone(s.contactPhone);
      if (s.address) setAddress(s.address);
      if (s.latitude != null && s.longitude != null) { setLat(s.latitude); setLng(s.longitude); }
      setNote(s.address
        ? "Filled from your profile. Add your house/flat number and street, then check the pin."
        : "Your profile had no address to use — please type it in.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your profile details.");
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    if (busy || !valid) return;
    setBusy("submit"); setError(null);
    try {
      await actions.submit({
        address: address.trim(),
        contactName: name.trim(),
        contactPhone: phone.trim(),
        ...(lat != null && lng != null ? { latitude: lat, longitude: lng } : {}),
      });
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your address.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <Button type="button" variant="outline" onClick={fillFromProfile} disabled={busy !== null}
        className={`${handoverSecondary} w-full sm:w-auto`}>
        {busy === "suggest"
          ? <><Loader2 className="animate-spin" aria-hidden /> Loading</>
          : <><Wand2 aria-hidden /> Use my profile details</>}
      </Button>
      {note && <p role="status" className="text-xs text-stone-600 dark:text-stone-300">{note}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="da-name" className={handoverLabel}>Recipient full name <span className="text-red-500" aria-hidden>*</span></label>
          <Input id="da-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120}
            autoComplete="name" disabled={busy !== null} className={handoverInput} placeholder="Name of person receiving item" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="da-phone" className={handoverLabel}>Contact phone number <span className="text-red-500" aria-hidden>*</span></label>
          <Input id="da-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            maxLength={20} autoComplete="tel" disabled={busy !== null} className={handoverInput}
            placeholder="10-digit mobile number"
            aria-invalid={phone.trim() !== "" && !phoneValid}
            aria-describedby={phone.trim() !== "" && !phoneValid ? "da-phone-err" : undefined} />
          {phone.trim() !== "" && !phoneValid && (
            <p id="da-phone-err" className="text-xs text-red-600 dark:text-red-400">Enter 10 to 15 digits.</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="da-address" className={handoverLabel}>Full delivery address <span className="text-red-500" aria-hidden>*</span></label>
        <Textarea id="da-address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={500}
          autoComplete="street-address" disabled={busy !== null} className={handoverInput}
          placeholder="House or flat number, building, street, area, city, pincode" />
      </div>

      <div className="space-y-1.5">
        <span className={handoverLabel}>Map pin (optional)</span>
        <HandoverMapPinField lat={lat} lng={lng} disabled={busy !== null} onChange={(a, b) => { setLat(a); setLng(b); }} />
      </div>

      <p className="text-xs text-stone-500 dark:text-stone-400">
        Only the donor sees your delivery address, exclusively for this courier shipment.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={submit} disabled={!valid || busy !== null} className={`${handoverPrimary} w-full sm:w-auto`}>
          {busy === "submit" ? <><Loader2 className="animate-spin" aria-hidden /> Sending</> : <><Send aria-hidden /> Send to donor</>}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={busy !== null} className={`${handoverSecondary} w-full sm:w-auto`}>
            Cancel
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

// ── Courier Details Card (Donor enters, both view) ─────────────────────────────

function CourierDetailsCard({ vm, actions }: { vm: HandoverViewModel; actions?: DeliveryAddressActions }) {
  const d = vm.delivery;
  const donor = vm.role === "DONOR";
  const existingCourier = d?.courierName || vm.schedule?.courierName;
  const existingTracking = d?.trackingNumber || vm.schedule?.trackingNumber;

  const [editing, setEditing] = useState(false);
  const [courierName, setCourierName] = useState(existingCourier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(existingTracking ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCourier = Boolean(existingCourier || existingTracking);

  async function handleSaveCourier() {
    if (!actions?.updateCourier || busy) return;
    setBusy(true); setError(null);
    try {
      await actions.updateCourier({
        courierName: courierName.trim(),
        trackingNumber: trackingNumber.trim() || undefined,
      });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save courier details.");
    } finally {
      setBusy(false);
    }
  }

  if (donor) {
    if (!editing && hasCourier) {
      return (
        <Panel title="Courier dispatch details">
          <dl className="space-y-2 text-sm">
            {existingCourier && (
              <Row icon={Truck} label="Courier service">
                <span className="font-semibold text-stone-800 dark:text-stone-200">{existingCourier}</span>
              </Row>
            )}
            {existingTracking && (
              <Row icon={Package} label="Courier / Tracking number">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-stone-800 dark:text-stone-200">{existingTracking}</span>
                  <CopyButton text={existingTracking} label="Copy number" />
                </div>
              </Row>
            )}
          </dl>
          {!vm.closed && actions?.updateCourier && (
            <Button
              variant="outline"
              onClick={() => {
                setCourierName(existingCourier ?? "");
                setTrackingNumber(existingTracking ?? "");
                setEditing(true);
              }}
              className={`${handoverSecondary} mt-3 w-full`}
            >
              Edit courier details
            </Button>
          )}
        </Panel>
      );
    }

    if (editing || (!hasCourier && !vm.closed && actions?.updateCourier)) {
      return (
        <Panel title="Courier dispatch details">
          <div className="space-y-3">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Enter the courier service name and tracking/courier number once you have booked or dispatched the package.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="ho-courier-name" className={handoverLabel}>Courier service name</label>
              <Input
                id="ho-courier-name"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="e.g. Delhivery, BlueDart, DTDC, Porter, India Post"
                disabled={busy}
                className={handoverInput}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ho-courier-tracking" className={handoverLabel}>Courier / Tracking number</label>
              <Input
                id="ho-courier-tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. TRK987654321, AWB123456"
                disabled={busy}
                className={handoverInput}
              />
            </div>
            {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex flex-col gap-2 sm:flex-row pt-1">
              <Button
                onClick={handleSaveCourier}
                disabled={busy || courierName.trim() === ""}
                className={`${handoverPrimary} w-full sm:w-auto`}
              >
                {busy ? <><Loader2 className="animate-spin" aria-hidden /> Saving</> : "Save courier details"}
              </Button>
              {hasCourier && (
                <Button
                  variant="outline"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                  className={`${handoverSecondary} w-full sm:w-auto`}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </Panel>
      );
    }

    return null;
  }

  // Donee View
  return (
    <Panel title="Courier tracking">
      {hasCourier ? (
        <dl className="space-y-2 text-sm">
          {existingCourier && (
            <Row icon={Truck} label="Courier service">
              <span className="font-semibold text-stone-800 dark:text-stone-200">{existingCourier}</span>
            </Row>
          )}
          {existingTracking && (
            <Row icon={Package} label="Courier / Tracking number">
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-stone-800 dark:text-stone-200">{existingTracking}</span>
                <CopyButton text={existingTracking} label="Copy number" />
              </div>
            </Row>
          )}
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
            The donor has dispatched your package. Use the tracking number to check shipment status with {existingCourier || "the courier"}.
          </p>
        </dl>
      ) : (
        <p className="text-sm text-stone-500 dark:text-stone-400">
          The donor will book the courier and enter the courier name and tracking number here once dispatched.
        </p>
      )}
    </Panel>
  );
}

// ── Shared ──────────────────────────────────────────────────────────────────

function AddressDetails({ delivery: d, showCopy }: { delivery: HandoverDelivery; showCopy?: boolean }) {
  const pin = hasCoordinates(d.latitude, d.longitude);
  return (
    <dl className="space-y-2 text-sm">
      {d.contactName && (
        <Row icon={UserRound} label="Recipient name">{d.contactName}</Row>
      )}
      {d.contactPhone && (
        <Row icon={Phone} label="Contact phone">
          <a href={`tel:${d.contactPhone.replace(/[^\d+]/g, "")}`} className="font-semibold text-[var(--handover-accent)] hover:underline">
            {d.contactPhone}
          </a>
        </Row>
      )}
      <Row icon={MapPin} label="Delivery address">
        <span className="block whitespace-pre-line break-words">{d.address}</span>
        <span className="mt-2 flex flex-wrap gap-2">
          {showCopy && d.address && <CopyButton text={[d.contactName, d.contactPhone, d.address].filter(Boolean).join("\n")} label="Copy address" />}
          {pin && (
            <a href={mapsHref(d.latitude!, d.longitude!)} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[var(--handover-accent)]/30 bg-[var(--handover-soft)] px-3 text-sm font-semibold text-[var(--handover-on-soft)] hover:bg-[var(--handover-soft)]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)]">
              <MapPin className="size-4" aria-hidden /> Open in Google Maps
              <ExternalLink className="size-3.5 opacity-70" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </span>
      </Row>
      {d.submittedAt && (
        <p className="text-xs text-stone-400">Provided {whenShort(d.submittedAt)}</p>
      )}
    </dl>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }).catch(() => {});
      }}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-stone-200 px-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)] dark:border-zinc-700 dark:text-stone-300 dark:hover:bg-zinc-800">
      {copied ? <Check className="size-3.5 text-green-600" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? "Copied" : label}
    </button>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <dt className="text-2xs font-semibold uppercase tracking-wide text-stone-400">{label}</dt>
        <dd className="text-stone-700 dark:text-stone-300">{children}</dd>
      </div>
    </div>
  );
}
