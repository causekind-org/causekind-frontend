"use client";

import { Info } from "lucide-react";
import { DeclarationsBlock } from "@/features/wizard-kit/DeclarationsBlock";
import { ReviewRow, ReviewSection } from "@/features/wizard-kit/ReviewSection";
import { DECLARATION_GROUPS, uploadedUrls, type WizardModel, type WizardStep } from "../wizardModel";
import { fieldsFor } from "../wizardFields";

/**
 * Step 5 — review and submit.
 *
 * <p>Every section reads from the same model the API mapper serialises, so a
 * value that was cleared because it stopped being relevant is absent here too.
 * Conditional rows are omitted entirely rather than shown as blank, which is the
 * only honest way to reflect "this no longer applies to your item".
 */
export function ReviewSubmitStep({
  model, errors, groupTitles, declarationsInvalidated, onJump, onChange, resubmit,
}: {
  model: WizardModel;
  errors: Record<string, string>;
  groupTitles: Record<string, string>;
  declarationsInvalidated: boolean;
  onJump: (step: WizardStep) => void;
  onChange: <K extends keyof WizardModel>(key: K, value: WizardModel[K]) => void;
  resubmit: boolean;
}) {
  const urls = uploadedUrls(model.photos);
  const fields = fieldsFor(model.category, model.subcategory);

  return (
    <div className="space-y-2">
      <ReviewSection title="Photos" onEdit={() => onJump("photos")}>
        <div className="flex flex-wrap gap-1.5">
          {urls.length === 0 && <p className="text-2xs text-stone-400">No photos uploaded yet</p>}
          {urls.map((url, i) => (
            <div key={url} className="relative h-14 w-14 overflow-hidden rounded-lg border border-stone-200 dark:border-zinc-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Item photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute inset-x-0 bottom-0 bg-[var(--ck-role-accent)] text-center text-5xs font-black uppercase text-white">
                  Main
                </span>
              )}
            </div>
          ))}
        </div>
      </ReviewSection>

      {/* Rows follow the same manifest the form used, so review shows exactly
          what was asked — never a row for a field this category never had. */}
      <ReviewSection title="Item basics" onEdit={() => onJump("basics")}>
        <ReviewRow label="Category" value={model.category} />
        <ReviewRow label="Subcategory" value={model.subcategory} />
        <ReviewRow label="Title" value={model.title} />
        <ReviewRow label="Quantity" value={model.quantity} />
        {fields.visible("brand") && <ReviewRow label={fields.label("brand")} value={model.brand} />}
        {fields.visible("model") && <ReviewRow label={fields.label("model")} value={model.model} />}
      </ReviewSection>

      <ReviewSection title="Condition & details" onEdit={() => onJump("condition")}>
        <ReviewRow label="Approximate age" value={model.approximateAge} />
        <ReviewRow label="Condition" value={model.condition} />
        {fields.visible("workingStatus") && <ReviewRow label={fields.label("workingStatus")} value={model.workingStatus} />}
        <ReviewRow label="Known defects" value={model.noDefects ? "No known defects" : model.knownDefects} />
        {fields.visible("accessoriesIncluded") && <ReviewRow label={fields.label("accessoriesIncluded")} value={model.accessoriesIncluded} />}
        {fields.visible("dimensions") && <ReviewRow label={fields.label("dimensions")} value={model.dimensions} />}
        {fields.visible("approximateWeight") && <ReviewRow label={fields.label("approximateWeight")} value={model.approximateWeight} />}
        <ReviewRow label="Description" value={model.description} />
      </ReviewSection>

      <ReviewSection title="Location" onEdit={() => onJump("location")}>
        <ReviewRow label="City" value={model.city} />
        <ReviewRow label="State" value={model.stateIso} />
        <ReviewRow label="Country" value={model.countryIso} />
        <ReviewRow label="Locality" value={model.locality} />
        <ReviewRow label="PIN / postal code" value={model.pincode} />
      </ReviewSection>

      <section className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
          <Info className="h-3.5 w-3.5" aria-hidden /> What happens next
        </h3>
        <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-2xs text-stone-600 dark:text-stone-300">
          <li>AI screening checks your photos and details.</li>
          <li>Our team reviews the listing — usually within a day.</li>
          <li>We match it privately against verified needs near you.</li>
          <li>You confirm the item is still available before any handover.</li>
          <li>Handover is confirmed with an OTP, and your certificate is issued.</li>
        </ol>
      </section>

      <DeclarationsBlock
        groups={DECLARATION_GROUPS}
        groupTitles={groupTitles}
        confirmed={model.declarationsConfirmed}
        onConfirmedChange={v => onChange("declarationsConfirmed", v)}
        error={errors.declarationsConfirmed}
        invalidatedNotice={
          declarationsInvalidated
            ? "You changed the listing after agreeing, so please confirm the declarations again."
            : undefined
        }
      />

      <p className="text-2xs text-stone-400">
        {resubmit
          ? "Your listing goes back to our team for another review."
          : "You can pause or withdraw this listing at any time from your dashboard."}
      </p>
    </div>
  );
}
