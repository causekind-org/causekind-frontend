"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, MapPin, Phone, Send, UserRound, Wand2 } from "lucide-react";
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
 * The courier delivery address, both sides of it.
 *
 * <p>The donor asks; the recipient answers — typed by hand, or started from their
 * own profile with "Use my profile details" and then corrected — with a map pin and
 * a number the courier can call. The donor then sees where to send it.
 *
 * <p>Two placements. While the address is what's holding the handover up
 * ({@link deliveryAddressPending}), {@link DeliveryAddressStep} is the "Your next
 * step" action. Otherwise {@link HandoverDeliveryPanel} sits beside the schedule as
 * the reference both sides come back to.
 */

export type DeliveryAddressActions = {
  request: () => Promise<void>;
  submit: (input: DeliveryAddressInput) => Promise<void>;
  suggest: () => Promise<DeliveryAddressSuggestion>;
};

const whenShort = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : null;

/** The address step as the next action, while it's pending. */
export function DeliveryAddressStep({ vm, actions }: { vm: HandoverViewModel; actions: DeliveryAddressActions }) {
  if (vm.role === "DONOR") return <DonorRequest vm={vm} actions={actions} />;
  return <DeliveryAddressForm vm={vm} actions={actions} />;
}

/** The reference panel — renders nothing when no address is needed or the next step already shows it. */
export function HandoverDeliveryPanel({ vm, actions }: { vm: HandoverViewModel; actions?: DeliveryAddressActions }) {
  const [editing, setEditing] = useState(false);
  const d = vm.delivery;
  if (!d?.needed || deliveryAddressPending(vm)) return null;
  const state = deliveryAddressState(vm);
  const donor = vm.role === "DONOR";
  const canAct = !vm.closed && actions != null;

  if (!donor && canAct && (editing || state === "awaiting" || state === "requested" || state === "recheck")) {
    return (
      <Panel title="Your delivery address">
        <DeliveryAddressForm vm={vm} actions={actions!} onDone={() => setEditing(false)}
          onCancel={state === "provided" ? () => setEditing(false) : undefined} />
      </Panel>
    );
  }

  return (
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
          <RequestButton actions={actions!} label={d.address ? "Ask them to check it" : "Request delivery address"} secondary />
        </div>
      )}
      {canAct && !donor && d.address && (
        <Button variant="outline" onClick={() => setEditing(true)} className={`${handoverSecondary} mt-3 w-full`}>
          Edit address
        </Button>
      )}
    </Panel>
  );
}

// ── Donor ───────────────────────────────────────────────────────────────────

function DonorRequest({ vm, actions }: { vm: HandoverViewModel; actions: DeliveryAddressActions }) {
  const d = vm.delivery!;
  const state = deliveryAddressState(vm);
  return (
    <div className="space-y-3">
      {state !== "awaiting" && (
        <p className="text-sm text-stone-600 dark:text-stone-300">
          Asked {whenShort(d.requestedAt)} — you&apos;ll get a notification when they reply.
        </p>
      )}
      {state === "recheck" && d.address && (
        <div className="rounded-lg border border-stone-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-2 text-2xs font-bold uppercase tracking-wider text-stone-400">Current address</p>
          <AddressDetails delivery={d} showCopy />
        </div>
      )}
      <RequestButton
        actions={actions}
        label={state === "awaiting" ? "Request delivery address" : "Send a reminder"}
        secondary={state !== "awaiting"}
      />
      <p className="text-xs text-stone-500 dark:text-stone-400">
        They&apos;ll be asked for the full address, a map pin and a phone number for the courier.
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

// ── Recipient ───────────────────────────────────────────────────────────────

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

  const digits = phone.replace(/\D/g, "").length;
  const phoneValid = /^\+?[0-9\s-]+$/.test(phone.trim()) && digits >= 10 && digits <= 15;
  const valid = name.trim() !== "" && phoneValid && address.trim().length >= 10;

  async function fillFromProfile() {
    if (busy) return;
    setBusy("suggest"); setError(null); setNote(null);
    try {
      const s = await actions.suggest();
      // Only fill what the profile has — never blank out something already typed.
      if (s.contactName) setName(s.contactName);
      if (s.contactPhone) setPhone(s.contactPhone);
      if (s.address) setAddress(s.address);
      if (s.latitude != null && s.longitude != null) { setLat(s.latitude); setLng(s.longitude); }
      setNote(s.address
        ? "Filled from your profile. Add your house or flat number and street, then check the pin."
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
      // Stays open with everything typed — a failed send must not cost them the form.
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
          <label htmlFor="da-name" className={handoverLabel}>Name for the courier <span className="text-red-500" aria-hidden>*</span></label>
          <Input id="da-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120}
            autoComplete="name" disabled={busy !== null} className={handoverInput} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="da-phone" className={handoverLabel}>Phone number <span className="text-red-500" aria-hidden>*</span></label>
          <Input id="da-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            maxLength={20} autoComplete="tel" disabled={busy !== null} className={handoverInput}
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
          placeholder="House or flat, building, street, area, city, pincode" />
      </div>

      <div className="space-y-1.5">
        <span className={handoverLabel}>Map pin (optional)</span>
        <HandoverMapPinField lat={lat} lng={lng} disabled={busy !== null} onChange={(a, b) => { setLat(a); setLng(b); }} />
      </div>

      <p className="text-xs text-stone-500 dark:text-stone-400">
        Only the donor sees this, and only for this delivery.
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

// ── Shared ──────────────────────────────────────────────────────────────────

function AddressDetails({ delivery: d, showCopy }: { delivery: HandoverDelivery; showCopy?: boolean }) {
  const pin = hasCoordinates(d.latitude, d.longitude);
  return (
    <dl className="space-y-2 text-sm">
      {d.contactName && (
        <Row icon={UserRound} label="Name">{d.contactName}</Row>
      )}
      {d.contactPhone && (
        <Row icon={Phone} label="Phone">
          <a href={`tel:${d.contactPhone.replace(/[^\d+]/g, "")}`} className="font-semibold text-[var(--handover-accent)] hover:underline">
            {d.contactPhone}
          </a>
        </Row>
      )}
      <Row icon={MapPin} label="Address">
        <span className="block whitespace-pre-line break-words">{d.address}</span>
        <span className="mt-2 flex flex-wrap gap-2">
          {showCopy && d.address && <CopyButton text={[d.contactName, d.contactPhone, d.address].filter(Boolean).join("\n")} />}
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
        <p className="text-xs text-stone-400">Sent {whenShort(d.submittedAt)}</p>
      )}
    </dl>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }).catch(() => {});
      }}
      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-stone-200 px-3 text-sm font-semibold text-stone-600 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)] dark:border-zinc-700 dark:text-stone-300 dark:hover:bg-zinc-800">
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? "Copied" : "Copy for the courier"}
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
