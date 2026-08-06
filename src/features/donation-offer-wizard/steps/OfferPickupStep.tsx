"use client";

import { Loader2, MapPin } from "lucide-react";
import { ConditionalField, WizardField, controlClass } from "@/features/wizard-kit/WizardField";
import { DELIVERY_PAYERS, type OfferModel } from "../offerModel";

export function OfferPickupStep({
  model, errors, onChange, gps, onUseMyLocation,
}: {
  model: OfferModel;
  errors: Record<string, string>;
  onChange: <K extends keyof OfferModel>(key: K, value: OfferModel[K]) => void;
  gps: { running: boolean; error: string | null };
  onUseMyLocation: () => void;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onUseMyLocation}
        disabled={gps.running}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-bold text-stone-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200"
      >
        {gps.running
          ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Finding you…</>
          : <><MapPin className="h-4 w-4" aria-hidden /> Use my location</>}
      </button>

      {/* Denial and geocoding failure are both non-blocking: the fields below
          are the real input, and location is a convenience on top of them. */}
      {gps.error && (
        <p role="status" className="text-2xs text-stone-500 dark:text-stone-400">{gps.error}</p>
      )}

      <WizardField label="Pickup city" required error={errors.pickupCity}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id} name="pickupCity" value={model.pickupCity}
            onChange={e => onChange("pickupCity", e.target.value)}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass} autoComplete="address-level2"
          />
        )}
      </WizardField>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WizardField label="Pincode" hint="Optional" error={errors.pickupPincode}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id} name="pickupPincode" inputMode="numeric" value={model.pickupPincode}
              onChange={e => onChange("pickupPincode", e.target.value)}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass} autoComplete="postal-code"
            />
          )}
        </WizardField>

        <WizardField label="Locality" hint="Optional — area or landmark" error={errors.pickupLocality}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id} name="pickupLocality" value={model.pickupLocality}
              onChange={e => onChange("pickupLocality", e.target.value)}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass}
            />
          )}
        </WizardField>
      </div>

      <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
        <input
          type="checkbox" name="donorDropOffAvailable"
          checked={model.donorDropOffAvailable}
          onChange={e => onChange("donorDropOffAvailable", e.target.checked)}
          className="h-5 w-5 shrink-0 accent-[var(--ck-role-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
        />
        <span className="text-sm font-bold text-stone-800 dark:text-stone-100">
          I can drop this off myself
        </span>
      </label>

      {/* Only a question when the donor is not delivering it. */}
      <ConditionalField show={!model.donorDropOffAvailable}>
        <WizardField label="Who pays for delivery?" error={errors.deliveryCostBornBy}>
          {({ id, describedBy, invalid }) => (
            <select
              id={id} name="deliveryCostBornBy" value={model.deliveryCostBornBy}
              onChange={e => onChange("deliveryCostBornBy", e.target.value)}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass}
            >
              {DELIVERY_PAYERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          )}
        </WizardField>
      </ConditionalField>
    </div>
  );
}
