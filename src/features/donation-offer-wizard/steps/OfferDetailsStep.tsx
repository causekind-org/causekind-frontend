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
  model, errors, onChange, requestedQuantity, showSpecNotes, purchase = false,
}: {
  model: OfferModel;
  errors: Record<string, string>;
  onChange: <K extends keyof OfferModel>(key: K, value: OfferModel[K]) => void;
  /** Shown as context only — never enforced here. */
  requestedQuantity?: number | null;
  showSpecNotes: boolean;
  /**
   * Flow B — the donor has not bought the item yet.
   *
   * <p>This step was written for a donor describing something already in their
   * hands, and Flow B reused it whole. Two of its three fields then read as
   * written for somebody else, which is the same objection that got `condition`
   * dropped from the purchase flow entirely.
   */
  purchase?: boolean;
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

      {/* Age is a property of an item that exists. On a purchase offer the item
          has not been bought yet and will be new, so "roughly how old is it?"
          has no answer — the field invites a number that means nothing and is
          then stored against the offer. Dropped for that flow, exactly as
          `condition` already is. */}
      {!purchase && (
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
      )}

      {/* Same field, but the question is different depending on whether the
          donor is looking at the item or planning to buy it. */}
      <WizardField
        label={purchase ? "What will it come with?" : "Accessories included"}
        hint={purchase
          ? "Optional — cables, parts or extras you intend to buy alongside it."
          : "Optional — cables, remote, parts, original box."}
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
