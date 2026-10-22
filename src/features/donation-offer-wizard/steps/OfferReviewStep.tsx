"use client";

import { WizardPhotoImage } from "@/features/wizard-kit/WizardPhotoImage";
import { DeclarationsBlock } from "@/features/wizard-kit/DeclarationsBlock";
import { ReviewRow, ReviewSection } from "@/features/wizard-kit/ReviewSection";
import type { CompatibilityCheck } from "@/lib/api";
import { formatAgeRange } from "@/features/ngo-drives/driveOfferAge";
import {
  OFFER_GROUP_TITLES, declarationGroupsFor,
  isPurchaseFlow, purchaseMethodLabel, purchaseTimelineLabel, uploadedOfferPhotos,
  type OfferModel, type OfferStep,
} from "../offerModel";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
import { useOfferCopy } from "../offerCopy";
export function OfferReviewStep({
  model, errors, requestTitle, compat, declarationsInvalidated, onChange, onEdit, flowType, declarationGroups,
  hidePickup = false, photoGallery, video, onChangeLocation, driveDetails = false,
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
  /** Optional. Leaves out the location section (a flow without a location, e.g. NGO drives). */
  hidePickup?: boolean;
  /**
   * NGO drive give form only: show size/specification, the age range and the
   * working/clean confirmations. Off (the default) keeps this step exactly as before.
   */
  driveDetails?: boolean;
  /** "Your location"'s Edit: back to the location check that opens the offer. */
  onChangeLocation?: () => void;
  /**
   * Optional. Renders the photos (and the video, if any) with this instead of the
   * small thumbnail strip. Without it the strip is shown as before.
   */
  photoGallery?: (photos: { id: string; url: string }[]) => React.ReactNode;
  /** Optional. A short description of the item video, shown in the Photos section. */
  video?: React.ReactNode;
}) {
  const wt = useTranslations("wizardFlow");
  const tr = useOfferCopy();
  const ui = useUiText();
  const photos = uploadedOfferPhotos(model.photos);
  // Every section's Edit jumps to a step. Rendering the photos or condition
  // section on a purchase offer would hand the donor a link to a step this
  // flow does not have — a dead end, not just an empty row.
  const purchase = isPurchaseFlow(flowType);

  return (
    <div className="space-y-3">
      {requestTitle && (
        <p className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-2xs text-stone-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-stone-300">
          {wt.rich("offeringTowards", { title: requestTitle ?? "", strong: (chunks) => <strong className="font-bold text-stone-800 dark:text-stone-100">{chunks}</strong> })}
        </p>
      )}

      {purchase ? (
        <ReviewSection title={ui("What you'll buy")} onEdit={() => onEdit("purchasePlan")}>
          <p className="mb-2 rounded-lg bg-orange-50 p-2 text-2xs font-semibold text-stone-700 dark:bg-orange-950/30 dark:text-stone-200">
            <UiText>Please wait until your offer is accepted and ready to buy before purchasing.</UiText>
          </p>
          <ReviewRow label={ui("Delivery")} value={tr(purchaseMethodLabel(model.fulfilmentMethod))} />
          <ReviewRow label={ui("Buying by")} value={tr(purchaseTimelineLabel(model.purchaseTimeline))} />
          {model.productUrl && <ReviewRow label={ui("Product link")} value={model.productUrl} />}
          <ReviewRow label={ui("Brand")} value={model.proposedBrand || "Not decided"} />
          <ReviewRow label={ui("Model")} value={model.proposedModel || "Not decided"} />
          <ReviewRow label={ui("Estimated cost")} value={model.estimatedCost ? `₹${model.estimatedCost}` : "Not given"} />
          <ReviewRow label={ui("Where from")} value={model.intendedStore || "Not decided"} />
          {model.purchaseNotes && <ReviewRow label={ui("Note")} value={model.purchaseNotes} />}
        </ReviewSection>
      ) : (
        <ReviewSection title={ui("Photos")} onEdit={() => onEdit("photos")}>
          {photos.length === 0 ? (
            <p className="text-2xs text-stone-400"><UiText>No photos yet</UiText></p>
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

      <ReviewSection title={ui("Item")} onEdit={() => onEdit("details")}>
        <ReviewRow label={ui("Quantity")} value={model.quantity} />
        {/* Age is not collected on a purchase offer, so it must not be summarised
            on one either — a review row for a field the donor was never shown
            invites them to "correct" something the form will not accept. */}
        {!driveDetails && !purchase && <ReviewRow label={ui("Item age")} value={tr(model.approximateAge)} />}
        {driveDetails && (
          <>
            {model.sizeSpec && <ReviewRow label={ui("Size / specification")} value={model.sizeSpec} />}
            {!purchase && <ReviewRow label={ui("Item age")} value={formatAgeRange(model.ageRange) || model.approximateAge} />}
            {model.confirmedWorking && <ReviewRow label={ui("Working order")} value="Tested and works" />}
            {model.confirmedClean && <ReviewRow label={ui("Cleanliness")} value="Washed and clean" />}
          </>
        )}
        <ReviewRow
          label={purchase ? ui("Comes with") : ui("Accessories")}
          value={model.accessoriesIncluded}
        />
      </ReviewSection>

      {!purchase && (
        <ReviewSection title={ui("Condition")} onEdit={() => onEdit("condition")}>
          <ReviewRow label={ui("Condition")} value={tr(model.condition)} />
          <ReviewRow
            label={ui("Known defects")}
            value={model.hasKnownDefects ? model.knownDefects : "None disclosed"}
          />
          {compat && (
            <ReviewRow
              label={ui("Fit with request")}
              value={compat.indicator === "STRONG_MATCH" ? "Strong match"
                : compat.indicator === "NOT_ELIGIBLE" ? "May not match"
                : "Possible match"}
            />
          )}
        </ReviewSection>
      )}

      {!hidePickup && <ReviewSection title={ui("Your location")} onEdit={onChangeLocation}>
        <ReviewRow label={ui("City")} value={model.pickupCity} />
        <ReviewRow label={ui("Locality")} value={model.pickupLocality} />
        <ReviewRow label={ui("PIN code")} value={model.pickupPincode} />
        <ReviewRow label={ui("Handover")} value={model.fulfilmentMethod === "DIRECT_DELIVERY"
          ? "Shipped by the retailer to the recipient"
          : model.donorDropOffAvailable
          ? "You'll take it to the recipient's area if they can't come"
          : "Within 10 km of the recipient"} />
      </ReviewSection>}

      <DeclarationsBlock
        groups={(declarationGroups ?? declarationGroupsFor(flowType, model.fulfilmentMethod)).map(g => ({ ...g, items: g.items.map(tr) }))}
        groupTitles={Object.fromEntries(Object.entries(OFFER_GROUP_TITLES).map(([k, v]) => [k, tr(v)]))}
        confirmed={model.declarationsConfirmed}
        onConfirmedChange={v => onChange("declarationsConfirmed", v)}
        error={errors.declarationsConfirmed}
        confirmLabel={ui("I accept all the above declarations")}
        invalidatedNotice={
          declarationsInvalidated
            ? "You changed the offer after agreeing, so please confirm the declarations again."
            : undefined
        }
      />
    </div>
  );
}
