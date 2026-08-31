"use client";

import { useTranslations } from "next-intl";
import { photoStatusCopy, approvedCount, photoView } from "../photoStatusCopy";
import type { OfferVideoState } from "@/features/donation-offer-wizard/useOfferVideo";
import { Info } from "lucide-react";
import { DeclarationsBlock } from "@/features/wizard-kit/DeclarationsBlock";
import { ReviewRow, ReviewSection } from "@/features/wizard-kit/ReviewSection";
import { DECLARATION_GROUPS, type WizardModel, type WizardStep } from "../wizardModel";
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
  model, errors, groupTitles, declarationsInvalidated, onJump, onChange, resubmit, video,
}: {
  model: WizardModel;
  errors: Record<string, string>;
  groupTitles: Record<string, string>;
  declarationsInvalidated: boolean;
  onJump: (step: WizardStep) => void;
  onChange: <K extends keyof WizardModel>(key: K, value: WizardModel[K]) => void;
  resubmit: boolean;
  /** The optional item video, so review can show its screening state. */
  video?: OfferVideoState;
}) {
  const t = useTranslations();
  const fields = fieldsFor(model.category, model.subcategory);

  return (
    <div className="space-y-2">
      {/*
        Media, as the server has it.

        <p>This used to render `uploadedUrls(model.photos)` — every photo that
        had finished *transferring*, with no notion of whether any of them had
        been cleared. A donor reviewing their listing therefore saw a rejected
        photo sitting in the summary looking exactly like an approved one, and
        the first they heard of it was Submit failing.

        <p>Now every photo shows its own state, and a photo that is not approved
        is not shown as an image at all: it has no URL, because the server does
        not issue one for unapproved media.
      */}
      <ReviewSection title="Photos" onEdit={() => onJump("photos")}>
        <div className="flex flex-wrap gap-1.5">
          {model.photos.length === 0 && <p className="text-2xs text-stone-400">No photos uploaded yet</p>}
          {model.photos.map((photo, i) => {
            const view = photoView(photo);
            const copy = photoStatusCopy(view);
            const approved = view.status === "APPROVED";
            return (
              <div
                key={photo.id}
                className={`relative h-14 w-14 overflow-hidden rounded-lg border ${
                  copy.blocks
                    ? "border-red-400 dark:border-red-700"
                    : "border-stone-200 dark:border-zinc-700"
                }`}
                title={t(copy.labelKey)}
              >
                {approved && photo.remoteUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.remoteUrl} alt={`Item photo ${i + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-stone-100 p-0.5 text-center dark:bg-zinc-800">
                    <span className="text-5xs font-black uppercase leading-tight text-stone-500 dark:text-stone-400">
                      {t(copy.labelKey)}
                    </span>
                  </div>
                )}
                {approved && i === 0 && (
                  <span className="absolute inset-x-0 bottom-0 bg-[var(--ck-role-accent)] text-center text-5xs font-black uppercase text-white">
                    Main
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-2xs text-stone-500 dark:text-stone-400">
          {t("listingWizard.photo.progress", { approved: approvedCount(model.photos.map(photoView)), required: 2 })}
        </p>
      </ReviewSection>

      {/*
        The optional video, if one is attached.

        <p>Absent entirely when there is none — zero videos is a valid listing
        and an empty row saying "no video" would imply otherwise. Shown when
        there is one, because a video still being screened, or one that was
        rejected, is exactly what a donor needs to see before Submit rather than
        after it.
      */}
      {video?.video && (
        <ReviewSection title="Short video" onEdit={() => onJump("photos")}>
          <p className="text-2xs text-stone-600 dark:text-stone-300">
            {video.video.status === "APPROVED"
              ? "Checked and ready."
              : video.video.status === "REJECTED"
                ? "This video can't be accepted. Remove or replace it before submitting."
                : video.video.status === "REVIEW_REQUIRED"
                  ? "Someone needs to look at this video. You can remove it and submit without one."
                  : video.video.status === "FAILED"
                    ? "We couldn't check this video. Retry, or remove it and submit without one."
                    : "Still being checked."}
          </p>
        </ReviewSection>
      )}

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
