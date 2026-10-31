"use client";

import { WizardField, controlClass } from "@/features/wizard-kit/WizardField";
import type { OfferModel } from "@/features/donation-offer-wizard/offerModel";
import { DRIVE_OFFER_AGE_RANGES, mapLegacyAgeToAgeRange, formatAgeRange } from "@/features/ngo-drives/driveOfferAge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
import { useDriveCopy } from "@/features/ngo-drives/driveCopy";
function useSizeSpecPlaceholder(category: string | null | undefined): string {
  const ui = useUiText();
  const cat = (category ?? "").trim().toLowerCase();
  if (cat === "clothing") return ui("e.g. Age 6-8 years, size M");
  if (cat === "electronics") return ui("e.g. Model / brand and specs");
  if (cat === "furniture") return ui("e.g. 4 ft x 2 ft x 3 ft");
  if (cat === "education") return ui("e.g. Class 5 notebooks, 200 pages");
  return ui("Size, model or any specification");
}

/**
 * What is being donated, and how much of it.
 */
/**
 * The drive give form's details step: quantity, size/specification, age range and the
 * drive's working/clean confirmations. The donor-to-donee offer wizard keeps its own
 * OfferDetailsStep unchanged.
 */
export function DriveOfferDetailsStep({
  model, errors, onChange, requestedQuantity, stillNeededQuantity, showSpecNotes, purchase = false,
  driveCategory, mustBeWorking, requireClean,
}: {
  model: OfferModel;
  errors: Record<string, string>;
  onChange: <K extends keyof OfferModel>(key: K, value: OfferModel[K]) => void;
  /** Shown as context only — never enforced here. */
  requestedQuantity?: number | null;
  /** What is left once earlier donations are counted; also caps the input. */
  stillNeededQuantity?: number | null;
  showSpecNotes: boolean;
  purchase?: boolean;
  driveCategory?: string | null;
  mustBeWorking?: boolean;
  requireClean?: boolean;
}) {
  const ui = useUiText();
  const wt = useTranslations("wizardFlow");
  const dc = useDriveCopy();
  const sizeSpecPlaceholder = useSizeSpecPlaceholder(driveCategory);
  const partlyMet = requestedQuantity != null && stillNeededQuantity != null
    && stillNeededQuantity < requestedQuantity;

  return (
    <div className="space-y-3">
      <WizardField
        label={ui("How many are you donating?")}
        required
        error={errors.quantity}
        hint={partlyMet
          ? wt("partlyMetHint", { still: stillNeededQuantity, requested: requestedQuantity })
          : requestedQuantity ? wt("requestAsks", { requested: requestedQuantity }) : undefined}
      >
        {({ id, describedBy, invalid }) => (
          <input
            id={id} name="quantity" type="number" inputMode="numeric" min={1} step={1}
            {...(stillNeededQuantity != null && stillNeededQuantity > 0 ? { max: stillNeededQuantity } : {})}
            value={model.quantity}
            onChange={e => onChange("quantity", e.target.value)}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
          />
        )}
      </WizardField>

      {/* NEW Size / specification field under quantity */}
      <WizardField
        label={ui("Size / specification")}
        hint={ui("Optional (up to 100 characters)")}
        error={errors.sizeSpec}
      >
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            name="sizeSpec"
            type="text"
            maxLength={100}
            value={model.sizeSpec ?? ""}
            onChange={e => onChange("sizeSpec", e.target.value)}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={controlClass}
            placeholder={sizeSpecPlaceholder}
          />
        )}
      </WizardField>

      {!purchase && (
        <WizardField
          label={ui("How old is the item?")}
          required
          hint={ui("Roughly how long you've had it or used it.")}
          error={errors.ageRange || errors.approximateAge}
        >
          {({ id, describedBy, invalid }) => {
            const effectiveAge = model.ageRange || mapLegacyAgeToAgeRange(model.approximateAge, model.condition);
            return (
              <>
                <Select
                  value={effectiveAge}
                  onValueChange={v => {
                    onChange("ageRange", v);
                    onChange("approximateAge", formatAgeRange(v));
                  }}
                >
                  <SelectTrigger
                    id={id}
                    data-field="ageRange"
                    variant="wizard"
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    className={`w-full box-border h-11 ${controlClass} ${invalid ? "border-red-500" : ""}`}
                  >
                    <SelectValue placeholder={ui("Select item age")} />
                  </SelectTrigger>
                  <SelectContent>
                    {DRIVE_OFFER_AGE_RANGES.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {dc(opt.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                  name="approximateAge"
                  value={model.approximateAge || formatAgeRange(effectiveAge)}
                  onChange={e => {
                    const val = e.target.value;
                    const mapped = mapLegacyAgeToAgeRange(val, model.condition);
                    onChange("ageRange", mapped);
                    onChange("approximateAge", formatAgeRange(mapped) || val);
                  }}
                />
                <input
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                  name="ageRange"
                  value={effectiveAge}
                  onChange={e => {
                    const val = e.target.value;
                    onChange("ageRange", val);
                    onChange("approximateAge", formatAgeRange(val));
                  }}
                />
              </>
            );
          }}
        </WizardField>
      )}

      {/* Same field, but the question is different depending on whether the
          donor is looking at the item or planning to buy it. */}
      <WizardField
        label={purchase ? ui("What will it come with?") : ui("Accessories included")}
        hint={purchase
          ? ui("Optional — cables, parts or extras you intend to buy alongside it.")
          : ui("Optional — cables, remote, parts, original box.")}
        error={errors.accessoriesIncluded}
      >
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id} name="accessoriesIncluded" rows={2}
            value={model.accessoriesIncluded}
            onChange={e => onChange("accessoriesIncluded", e.target.value)}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
            placeholder={ui("Charger, carry case…")}
          />
        )}
      </WizardField>

      {/* Only for a flow that is genuinely offering something other than the
          requested item. ALREADY_OWN never sees this. */}
      {showSpecNotes && (
        <WizardField
          label={ui("How does yours differ?")}
          hint={ui("Tell the recipient what is different from what they asked for.")}
          error={errors.specNotes}
        >
          {({ id, describedBy, invalid }) => (
            <textarea
              id={id} name="specNotes" rows={2}
              value={model.specNotes}
              onChange={e => onChange("specNotes", e.target.value)}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass}
            />
          )}
        </WizardField>
      )}

      {/* Confirmation checkboxes, shown only when drive requires them */}
      {mustBeWorking && (
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="confirmedWorking"
              checked={Boolean(model.confirmedWorking)}
              onChange={e => onChange("confirmedWorking", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700"
            />
            <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
              <UiText>I&apos;ve tested it and it works</UiText>
            </span>
          </label>
          {errors.confirmedWorking && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
              {errors.confirmedWorking}
            </p>
          )}
        </div>
      )}

      {requireClean && (
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="confirmedClean"
              checked={Boolean(model.confirmedClean)}
              onChange={e => onChange("confirmedClean", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700"
            />
            <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
              <UiText>Washed and clean</UiText>
            </span>
          </label>
          {errors.confirmedClean && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
              {errors.confirmedClean}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
