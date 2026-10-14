"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { OfferLocationStep, type OfferLocationStatus } from "./steps/OfferLocationStep";
import { emptyOfferModel, type OfferModel } from "./offerModel";

/** What the gate hands to the offer form: the pickup location and the travel answer. */
export type PassedOfferLocation = Pick<OfferModel,
  "latitude" | "longitude" | "pickupCity" | "pickupPincode" | "pickupLocality" | "donorDropOffAvailable">;

/** Remembered for the browser session, so a reload does not ask again. */
export function offerLocationKey(requestId: number) {
  return `ck-offer-location-${requestId}`;
}

export function readPassedOfferLocation(requestId: number): PassedOfferLocation | null {
  try {
    const raw = sessionStorage.getItem(offerLocationKey(requestId));
    const v = raw ? JSON.parse(raw) as PassedOfferLocation : null;
    return v && v.latitude != null && v.longitude != null && v.pickupCity ? v : null;
  } catch { return null; }
}

export function forgetPassedOfferLocation(requestId: number) {
  try { sessionStorage.removeItem(offerLocationKey(requestId)); } catch { /* best-effort */ }
}

/**
 * The location check that opens "Offer this item" (owner, 2026-10-10): it runs
 * before the offer-type choice and the form, not as a step inside the form.
 * Guests reach it after logging in (the offer page sends them to login and
 * back); signed-in donors see it straight away.
 *
 * <p>Within the 10 km radius the donor continues; further away they are shown
 * the recipient's area and asked whether they will take the item there. "No,
 * go back" returns them to where they clicked "Offer this item".
 */
export function OfferLocationGate({ requestId, requestTitle, onPass, onDecline }: {
  requestId: number;
  requestTitle: string | null;
  onPass: (location: PassedOfferLocation) => void;
  onDecline: () => void;
}) {
  const [model, setModel] = useState<OfferModel>(emptyOfferModel);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<OfferLocationStatus>({ busy: false, needsConsent: false, ready: false });

  function onChange<K extends keyof OfferModel>(key: K, value: OfferModel[K]) {
    setModel((m) => ({ ...m, [key]: value }));
    setErrors((e) => (e[key as string] ? { ...e, [key as string]: "" } : e));
  }

  function proceed() {
    if (status.busy) return;
    if (status.needsConsent) { setErrors({ donorDropOffAvailable: "Answer the question above to continue." }); return; }
    if (model.latitude == null || model.longitude == null) { setErrors({ latitude: "Use your current location, or find it on the map, to continue." }); return; }
    if (!model.pickupCity.trim()) { setErrors({ pickupCity: "Add your city." }); return; }
    if (!status.ready) return;
    const passed: PassedOfferLocation = {
      latitude: model.latitude, longitude: model.longitude,
      pickupCity: model.pickupCity.trim(), pickupPincode: model.pickupPincode.trim(),
      pickupLocality: model.pickupLocality.trim(), donorDropOffAvailable: model.donorDropOffAvailable,
    };
    try { sessionStorage.setItem(offerLocationKey(requestId), JSON.stringify(passed)); } catch { /* best-effort */ }
    onPass(passed);
  }

  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-2xs font-bold uppercase tracking-wider text-[var(--ck-role-accent)]">Before you offer</p>
      <h1 className="mt-1 text-lg font-bold text-stone-900 sm:text-xl dark:text-stone-100" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
        Check your location
      </h1>
      {requestTitle && (
        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">For: <b className="text-stone-700 dark:text-stone-200">{requestTitle}</b></p>
      )}

      <div className="mt-4">
        <OfferLocationStep
          requestId={requestId} model={model} errors={errors} onChange={onChange}
          onDecline={onDecline} onStatusChange={setStatus}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4 dark:border-zinc-800">
        <button type="button" onClick={onDecline}
          className="min-h-[44px] rounded-xl px-3 text-sm font-semibold text-stone-500 hover:text-stone-700 dark:text-stone-400">
          Cancel
        </button>
        <button type="button" onClick={proceed} disabled={status.busy || !status.ready}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ck-role-accent)] px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--ck-role-hover)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]">
          {status.busy
            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking location…</>
            : <>Continue to offer <ArrowRight className="h-4 w-4" aria-hidden /></>}
        </button>
      </div>
    </section>
  );
}
