"use client";

import { useState } from "react";
import { Loader2, MapPin, Pencil, TriangleAlert } from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { WizardField, controlClass } from "../components/WizardField";
import type { WizardModel } from "../wizardModel";

/**
 * Step 4 — confirm location.
 *
 * <p>Default view is a summary of what the profile already told us, because for
 * most donors this step is a single tap. Manual entry stays one click away and
 * is always reachable: a GPS denial or a reverse-geocode failure surfaces an
 * inline error and leaves the form fully usable rather than blocking.
 */
export function LocationStep({
  model, errors, gps, onChange, onUseGps, onConfirm,
}: {
  model: WizardModel;
  errors: Record<string, string>;
  gps: { running: boolean; error: string | null };
  onChange: <K extends keyof WizardModel>(key: K, value: WizardModel[K]) => void;
  onUseGps: () => void;
  /** "Looks correct" advances — same path as the footer's Continue. */
  onConfirm: () => void;
}) {
  const { countries, states, cities } = useLocations(model.countryIso, model.stateIso);

  const summaryReady = !!(model.city && model.stateIso && model.pincode);
  // Start collapsed only when there is something complete to confirm.
  const [editing, setEditing] = useState(!summaryReady);
  const hasFieldErrors = ["countryIso", "stateIso", "city", "pincode", "locality"].some(k => errors[k]);
  const showForm = editing || hasFieldErrors;

  const stateLabel = states.find(s => s.value === model.stateIso)?.label ?? model.stateIso;
  const countryLabel = countries.find(c => c.value === model.countryIso)?.label ?? model.countryIso;

  return (
    <div className="space-y-3">
      {!showForm && (
        <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="flex items-start gap-2 text-[13px] font-semibold text-stone-800 dark:text-stone-100">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ck-role-accent)]" aria-hidden />
            <span>
              {[model.locality, model.city, stateLabel, model.pincode].filter(Boolean).join(", ")}
              <span className="block text-[11px] font-normal text-stone-500 dark:text-stone-400">{countryLabel}</span>
            </span>
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-[44px] flex-1 rounded-xl bg-[var(--ck-role-accent)] px-4 text-[13px] font-black text-white transition-colors hover:bg-[var(--ck-role-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
            >
              Looks correct
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-300 px-3.5 text-[13px] font-bold text-stone-600 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700 dark:text-stone-300 dark:hover:bg-zinc-800"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Change
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onUseGps}
        disabled={gps.running}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-stone-300 px-3 text-[13px] font-bold text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700 dark:text-stone-300 dark:hover:bg-zinc-800"
      >
        {gps.running
          ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Finding you…</>
          : <><MapPin className="h-4 w-4" aria-hidden /> Use my current location</>}
      </button>

      {gps.error && (
        <p role="alert" className="flex items-start gap-1.5 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {gps.error} You can still enter the address below.
        </p>
      )}

      {showForm && (
        <div className="space-y-3">
          <WizardField label="Country" required error={errors.countryIso}>
            {({ id, describedBy, invalid }) => (
              <select
                id={id} name="countryIso" aria-describedby={describedBy} aria-invalid={invalid}
                className={controlClass} value={model.countryIso}
                onChange={e => onChange("countryIso", e.target.value)}
              >
                <option value="">Select a country</option>
                {countries.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            )}
          </WizardField>

          <WizardField label="State / province" required error={errors.stateIso}>
            {({ id, describedBy, invalid }) => (
              <select
                id={id} name="stateIso" aria-describedby={describedBy} aria-invalid={invalid}
                className={controlClass} value={model.stateIso} disabled={!model.countryIso}
                onChange={e => onChange("stateIso", e.target.value)}
              >
                <option value="">{model.countryIso ? "Select a state" : "—"}</option>
                {states.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}
          </WizardField>

          {/* A city list exists for most states, but old drafts and unlisted
              places must remain enterable, so this stays a free-text input with
              a datalist rather than a closed select. */}
          <WizardField label="City" required error={errors.city}>
            {({ id, describedBy, invalid }) => (
              <>
                <input
                  id={id} name="city" type="text" list={`${id}-cities`}
                  aria-describedby={describedBy} aria-invalid={invalid}
                  className={controlClass} value={model.city}
                  onChange={e => onChange("city", e.target.value)}
                />
                <datalist id={`${id}-cities`}>
                  {cities.map(c => <option key={c.value} value={c.value} />)}
                </datalist>
              </>
            )}
          </WizardField>

          <WizardField label="Locality" hint="Optional — area or neighbourhood" error={errors.locality}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id} name="locality" type="text"
                aria-describedby={describedBy} aria-invalid={invalid}
                className={controlClass} value={model.locality}
                onChange={e => onChange("locality", e.target.value)}
              />
            )}
          </WizardField>

          <WizardField
            label={model.countryIso === "IN" ? "PIN code" : "Postal code"} required
            error={errors.pincode}
            hint={model.countryIso === "IN" ? "6 digits" : "3–10 letters, numbers, spaces or hyphens"}
          >
            {({ id, describedBy, invalid }) => (
              <input
                id={id} name="pincode" type="text"
                inputMode={model.countryIso === "IN" ? "numeric" : "text"}
                maxLength={10}
                aria-describedby={describedBy} aria-invalid={invalid}
                className={controlClass} value={model.pincode}
                onChange={e => onChange("pincode", e.target.value)}
              />
            )}
          </WizardField>
        </div>
      )}
    </div>
  );
}
