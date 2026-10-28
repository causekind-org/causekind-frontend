"use client";

import { LocationStep, type LocationStepHandle } from "@/features/item-listing-wizard/steps/LocationStep";
import type { LocationFields } from "@/hooks/useLocationPinHandlers";
import { controlClass } from "@/features/wizard-kit/WizardField";
import { cn } from "@/lib/utils";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
export const RADIUS_PRESETS = [10, 20, 30, 50, 100] as const;
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 500;

/** The pickup radius in km, or null when it is not a whole number from 1 to 500. */
export function radiusKm(choice: string, custom: string): number | null {
  const n = Number(choice === "custom" ? custom : choice);
  return Number.isInteger(n) && n >= MIN_RADIUS_KM && n <= MAX_RADIUS_KM ? n : null;
}

/** "Where is this drive?": the shared location step in NGO green, plus the pickup radius. */
export function DriveLocationStep({
  model, errors, lookup, profileCenter, onChange, onPin, onGeocodeTyped, controlRef, onBusyChange,
  radiusChoice, customRadius, onRadiusChoice, onCustomRadius, registeredOfficeAddress,
}: {
  model: LocationFields;
  errors: Record<string, string>;
  lookup: { running: boolean; error: string | null; whenIdle?: () => Promise<void> };
  profileCenter: { lat: number; lng: number } | null;
  onChange: <K extends keyof LocationFields>(key: K, value: LocationFields[K]) => void;
  onPin: (lat: number, lng: number, opts?: { onlyEmpty?: boolean }) => void;
  onGeocodeTyped: (q: { postalcode: string; city: string; state: string; countryCode: string }, useProfileFallback: boolean) => Promise<boolean> | void;
  controlRef?: React.Ref<LocationStepHandle>;
  onBusyChange?: (busy: boolean) => void;
  radiusChoice: string;
  customRadius: string;
  onRadiusChoice: (choice: string) => void;
  onCustomRadius: (value: string) => void;
  registeredOfficeAddress?: string;
}) {
  const ui = useUiText();
  const df = useTranslations("driveFlow");
  const options = [...RADIUS_PRESETS.map(String), "custom"];
  return (
    <div className="space-y-6">
      <section aria-labelledby="drive-where-heading" className="space-y-2">
        <h3 id="drive-where-heading" className="text-base font-bold text-stone-900 dark:text-stone-100"><UiText>Where is this drive?</UiText></h3>
        <p className="text-sm text-stone-600 dark:text-stone-400"><UiText>Donors near this place will see that you can pick up their items.</UiText></p>
        {registeredOfficeAddress && (
          <p className="text-xs text-stone-500 dark:text-stone-400">{df("registeredAddress", { address: registeredOfficeAddress })}</p>
        )}
        <LocationStep
          model={model} errors={errors} lookup={lookup} profileCenter={profileCenter}
          onChange={onChange} onPin={onPin} onGeocodeTyped={onGeocodeTyped}
          controlRef={controlRef} onBusyChange={onBusyChange} tone="ngo"
        />
      </section>

      <section aria-labelledby="drive-radius-heading" className="space-y-2" data-field="pickupRadiusKm" tabIndex={-1}>
        <h3 id="drive-radius-heading" className="text-base font-bold text-stone-900 dark:text-stone-100"><UiText>How far can you collect items from?</UiText></h3>
        <div role="radiogroup" aria-labelledby="drive-radius-heading" className="flex flex-wrap gap-2">
          {options.map(o => (
            <button
              key={o} type="button" role="radio" aria-checked={radiusChoice === o}
              onClick={() => onRadiusChoice(o)}
              className={cn(
                "min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700",
                radiusChoice === o
                  ? "border-ngo-700 bg-ngo-700 text-white"
                  : "border-stone-300 text-stone-700 hover:border-ngo-600 dark:border-zinc-700 dark:text-stone-200",
              )}
            >
              {o === "custom" ? ui("Custom") : `${o} km`}
            </button>
          ))}
        </div>
        {radiusChoice === "custom" && (
          <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
            <span><UiText>Distance</UiText></span>
            <input
              type="number" inputMode="numeric" min={MIN_RADIUS_KM} max={MAX_RADIUS_KM} step={1}
              aria-label={ui("Custom pickup distance in km")} value={customRadius}
              onChange={e => onCustomRadius(e.target.value)}
              className={cn(controlClass, "w-28")}
            />
            <span><UiText>km (1 to 500)</UiText></span>
          </label>
        )}
        {errors.pickupRadiusKm && <p role="alert" className="text-xs font-semibold text-red-600">{errors.pickupRadiusKm}</p>}
        <p className="text-xs text-stone-500 dark:text-stone-400">
          <UiText>You will pick up items from donors within this distance. Donors farther away will drop the items off at your location.</UiText>
        </p>
      </section>
    </div>
  );
}
