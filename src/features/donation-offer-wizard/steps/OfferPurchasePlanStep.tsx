"use client";

import { ShieldCheck } from "lucide-react";
import { WizardField, controlClass } from "@/features/wizard-kit/WizardField";
import { PURCHASE_TIMELINES, type OfferModel } from "../offerModel";

/**
 * Step 1 of the WILL_PURCHASE flow, in the slot the photos step occupies for a
 * donor who already owns the item.
 *
 * <p>Two things about this screen are load-bearing rather than decorative.
 *
 * <p>**The request stays on screen while they type.** The donor is promising to
 * buy a specific thing for a specific need; the need should not be one screen
 * back. Everything here is a claim about how well the purchase will match it,
 * and none of those claims can be judged against a memory.
 *
 * <p>**Only the timeline is required.** It is the field a scheduler acts on.
 * Brand, model and store are how the donee judges the promise, but a donor who
 * has not chosen a shop yet is still making a real commitment — making those
 * required would only teach them to type something.
 *
 * <p>There is deliberately no image upload here, and adding one later would be
 * a mistake worth arguing about: having nothing to screen before acceptance is
 * what keeps this flow cheap, and the screening gate moves to proof time, where
 * there is a real item to look at.
 */
export function OfferPurchasePlanStep({
  model, errors, onChange, requestTitle,
}: {
  model: OfferModel;
  errors: Record<string, string>;
  onChange: <K extends keyof OfferModel>(key: K, value: OfferModel[K]) => void;
  requestTitle: string | null;
}) {
  return (
    <div className="space-y-5">
      <WizardField
        label="How soon can you buy it?"
        required
        hint="Counted from the day the recipient accepts, not from today."
        error={errors.purchaseTimeline}
      >
        {({ id, describedBy, invalid }) => (
          <select
            id={id} name="purchaseTimeline" data-field="purchaseTimeline"
            value={model.purchaseTimeline}
            onChange={e => onChange("purchaseTimeline", e.target.value as OfferModel["purchaseTimeline"])}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
          >
            <option value="" disabled hidden>Choose your purchase timeline</option>
            {PURCHASE_TIMELINES.map(opt => <option key={opt.value} value={opt.value}>{opt.label} after acceptance</option>)}
          </select>
        )}
      </WizardField>

      <div className="flex items-start gap-2 rounded-xl bg-orange-50 p-3 text-sm leading-relaxed text-stone-700 dark:bg-orange-950/30 dark:text-stone-300">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--ck-role-accent)]" aria-hidden />
        <p>Buy {requestTitle ? <strong>{requestTitle}</strong> : "the item"} only after the recipient accepts. Nothing is charged here.</p>
      </div>

      {/* Everything below is optional and says so, so the donor can submit a
          real commitment before they have shopped around. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <WizardField label="Brand you have in mind" hint="Optional" error={errors.proposedBrand}>
          {({ id, describedBy, invalid }) => (
            <input
              type="text" id={id} name="proposedBrand" maxLength={100}
              value={model.proposedBrand}
              onChange={e => onChange("proposedBrand", e.target.value)}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass}
              placeholder="Not decided yet is fine"
            />
          )}
        </WizardField>

        <WizardField label="Model or variant" hint="Optional" error={errors.proposedModel}>
          {({ id, describedBy, invalid }) => (
            <input
              type="text" id={id} name="proposedModel" maxLength={100}
              value={model.proposedModel}
              onChange={e => onChange("proposedModel", e.target.value)}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass}
              placeholder="Not decided yet is fine"
            />
          )}
        </WizardField>
      </div>

      <WizardField
        label="Roughly what will it cost?"
        hint="Optional — in rupees. Helps the recipient judge the fit; nothing is charged here."
        error={errors.estimatedCost}
      >
        {({ id, describedBy, invalid }) => (
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
              ₹
            </span>
            <input
              type="text" inputMode="decimal" id={id} name="estimatedCost"
              value={model.estimatedCost}
              onChange={e => onChange("estimatedCost", e.target.value)}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={`${controlClass} pl-7`}
              placeholder="0"
            />
          </div>
        )}
      </WizardField>

      <WizardField label="Where will you buy it?" hint="Optional — a shop, a market, or an online store" error={errors.intendedStore}>
        {({ id, describedBy, invalid }) => (
          <input
            type="text" id={id} name="intendedStore" maxLength={200}
            value={model.intendedStore}
            onChange={e => onChange("intendedStore", e.target.value)}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
            placeholder="Local shop, Amazon, Flipkart…"
          />
        )}
      </WizardField>

      <WizardField
        label="Anything the recipient should know?"
        hint="Optional"
        error={errors.purchaseNotes}
      >
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id} name="purchaseNotes" rows={2}
            value={model.purchaseNotes}
            onChange={e => onChange("purchaseNotes", e.target.value)}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
            placeholder="Waiting on a sale, buying it on my way back from work…"
          />
        )}
      </WizardField>

      <p className="px-1 text-2xs leading-relaxed text-stone-500 dark:text-stone-400">
        After the recipient accepts, you&apos;ll be asked for a photo of the item and a
        receipt before the handover is arranged.
      </p>
    </div>
  );
}
