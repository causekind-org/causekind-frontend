"use client";

import { WizardField, controlClass } from "@/features/wizard-kit/WizardField";
import type { OfferModel } from "../offerModel";

/**
 * What is being donated, and how much of it.
 *
 * <p>Only fields the previous form actually showed. `brand`, `model`,
 * `dimensions` and `approximateWeight` exist on the API and are deliberately
 * still not rendered — exposing them here would be a new demand on the donor
 * dressed up as a redesign.
 */
export function OfferDetailsStep({
  model, errors, onChange, requestedQuantity, showSpecNotes,
}: {
  model: OfferModel;
  errors: Record<string, string>;
  onChange: <K extends keyof OfferModel>(key: K, value: OfferModel[K]) => void;
  /** Shown as context only — never enforced here. */
  requestedQuantity?: number | null;
  showSpecNotes: boolean;
}) {
  return (
    <div className="space-y-3">
      <WizardField
        label="How many are you donating?"
        required
        error={errors.quantity}
        hint={requestedQuantity ? `The request asks for ${requestedQuantity}.` : undefined}
      >
        {({ id, describedBy, invalid }) => (
          <input
            id={id} name="quantity" type="number" inputMode="numeric" min={1} step={1}
            value={model.quantity}
            onChange={e => onChange("quantity", e.target.value)}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
          />
        )}
      </WizardField>

      <WizardField label="Approximate age" hint="Optional — roughly how old is it?" error={errors.approximateAge}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id} name="approximateAge" type="text" value={model.approximateAge}
            onChange={e => onChange("approximateAge", e.target.value)}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
            placeholder="e.g. 2 years"
          />
        )}
      </WizardField>

      <WizardField
        label="Accessories included"
        hint="Optional — cables, remote, parts, original box."
        error={errors.accessoriesIncluded}
      >
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id} name="accessoriesIncluded" rows={2}
            value={model.accessoriesIncluded}
            onChange={e => onChange("accessoriesIncluded", e.target.value)}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
            placeholder="Charger, carry case…"
          />
        )}
      </WizardField>

      {/* Only for a flow that is genuinely offering something other than the
          requested item. ALREADY_OWN never sees this. */}
      {showSpecNotes && (
        <WizardField
          label="How does yours differ?"
          hint="Tell the recipient what is different from what they asked for."
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
    </div>
  );
}
