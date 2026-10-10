"use client";

import { WizardPhotoImage } from "@/features/wizard-kit/WizardPhotoImage";
import { DeclarationsBlock } from "@/features/wizard-kit/DeclarationsBlock";
import { ReviewRow, ReviewSection } from "@/features/wizard-kit/ReviewSection";
import type { CompatibilityCheck } from "@/lib/api";
import {
  OFFER_GROUP_TITLES, declarationGroupsFor,
  isPurchaseFlow, purchaseTimelineLabel, uploadedOfferPhotos,
  type OfferModel, type OfferStep,
} from "../offerModel";

export function OfferReviewStep({
  model, errors, requestTitle, compat, declarationsInvalidated, onChange, onEdit, flowType, declarationGroups,
  hidePickup = false, photoGallery, video,
}: {
  model: OfferModel;
  errors: Record<string, string>;
  requestTitle: string | null;
  compat: CompatibilityCheck | null;
  declarationsInvalidated: boolean;
  onChange: <K extends keyof OfferModel>(key: K, value: OfferModel[K]) => void;
  onEdit: (step: OfferStep) => void;
  flowType?: string | null;
  declarationGroups?: readonly any[];
  /** Optional. Leaves out the Pickup & delivery section (a flow without that step). */
  hidePickup?: boolean;
  /**
   * Optional. Renders the photos (and the video, if any) with this instead of the
   * small thumbnail strip. Without it the strip is shown as before.
   */
  photoGallery?: (photos: { id: string; url: string }[]) => React.ReactNode;
  /** Optional. A short description of the item video, shown in the Photos section. */
  video?: React.ReactNode;
}) {
  const photos = uploadedOfferPhotos(model.photos);
  // Every section's Edit jumps to a step. Rendering the photos or condition
  // section on a purchase offer would hand the donor a link to a step this
  // flow does not have — a dead end, not just an empty row.
  const purchase = isPurchaseFlow(flowType);

  return (
    <div className="space-y-3">
      {requestTitle && (
        <p className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-2xs text-stone-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-stone-300">
          You are offering this towards <strong className="font-bold text-stone-800 dark:text-stone-100">{requestTitle}</strong>.
        </p>
      )}

      {purchase ? (
        <ReviewSection title="What you'll buy" onEdit={() => onEdit("purchasePlan")}>
          <ReviewRow label="Buying by" value={purchaseTimelineLabel(model.purchaseTimeline)} />
          <ReviewRow label="Brand" value={model.proposedBrand || "Not decided"} />
          <ReviewRow label="Model" value={model.proposedModel || "Not decided"} />
          <ReviewRow label="Estimated cost" value={model.estimatedCost ? `₹${model.estimatedCost}` : "Not given"} />
          <ReviewRow label="Where from" value={model.intendedStore || "Not decided"} />
          {model.purchaseNotes && <ReviewRow label="Note" value={model.purchaseNotes} />}
        </ReviewSection>
      ) : (
        <ReviewSection title="Photos" onEdit={() => onEdit("photos")}>
          {photos.length === 0 ? (
            <p className="text-2xs text-stone-400">No photos yet</p>
          ) : photoGallery ? (
            photoGallery(photos.map(p => ({ id: p.id, url: p.remoteUrl as string })))
          ) : (
            <ul className="flex gap-2 overflow-x-auto">
              {photos.map((p, i) => (
                <li key={p.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-stone-200 dark:border-zinc-800">
                  <WizardPhotoImage src={p.remoteUrl as string} alt={`Photo ${i + 1}`} className="object-cover" />
                </li>
              ))}
            </ul>
          )}
          {video}
        </ReviewSection>
      )}

      <ReviewSection title="Item" onEdit={() => onEdit("details")}>
        <ReviewRow label="Quantity" value={model.quantity} />
        {/* Age is not collected on a purchase offer, so it must not be summarised
            on one either — a review row for a field the donor was never shown
            invites them to "correct" something the form will not accept. */}
        {!purchase && <ReviewRow label="Item age" value={model.approximateAge} />}
        <ReviewRow
          label={purchase ? "Comes with" : "Accessories"}
          value={model.accessoriesIncluded}
        />
      </ReviewSection>

      {!purchase && (
        <ReviewSection title="Condition" onEdit={() => onEdit("condition")}>
          <ReviewRow label="Condition" value={model.condition} />
          <ReviewRow
            label="Known defects"
            value={model.hasKnownDefects ? model.knownDefects : "None disclosed"}
          />
          {compat && (
            <ReviewRow
              label="Fit with request"
              value={compat.indicator === "STRONG_MATCH" ? "Strong match"
                : compat.indicator === "NOT_ELIGIBLE" ? "May not match"
                : "Possible match"}
            />
          )}
        </ReviewSection>
      )}

      {!hidePickup && <ReviewSection title="Your location" onEdit={() => onEdit("location")}>
        <ReviewRow label="City" value={model.pickupCity} />
        <ReviewRow label="Locality" value={model.pickupLocality} />
        <ReviewRow label="PIN code" value={model.pickupPincode} />
        <ReviewRow label="Handover" value={model.donorDropOffAvailable
          ? "You'll take it to the recipient's area if they can't come"
          : "Within 10 km of the recipient"} />
      </ReviewSection>}

      <DeclarationsBlock
        groups={declarationGroups ?? declarationGroupsFor(flowType)}
        groupTitles={OFFER_GROUP_TITLES}
        confirmed={model.declarationsConfirmed}
        onConfirmedChange={v => onChange("declarationsConfirmed", v)}
        error={errors.declarationsConfirmed}
        confirmLabel="I accept all the above declarations"
        invalidatedNotice={
          declarationsInvalidated
            ? "You changed the offer after agreeing, so please confirm the declarations again."
            : undefined
        }
      />
    </div>
  );
}
