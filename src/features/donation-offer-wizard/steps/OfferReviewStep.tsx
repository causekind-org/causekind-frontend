"use client";

import Image from "next/image";
import { DeclarationsBlock } from "@/features/wizard-kit/DeclarationsBlock";
import { ReviewRow, ReviewSection } from "@/features/wizard-kit/ReviewSection";
import type { CompatibilityCheck } from "@/lib/api";
import {
  DELIVERY_PAYERS, OFFER_DECLARATION_GROUPS, OFFER_GROUP_TITLES,
  uploadedOfferPhotos, type OfferModel, type OfferStep,
} from "../offerModel";

export function OfferReviewStep({
  model, errors, requestTitle, compat, declarationsInvalidated, onChange, onEdit,
}: {
  model: OfferModel;
  errors: Record<string, string>;
  requestTitle: string | null;
  compat: CompatibilityCheck | null;
  declarationsInvalidated: boolean;
  onChange: <K extends keyof OfferModel>(key: K, value: OfferModel[K]) => void;
  onEdit: (step: OfferStep) => void;
}) {
  const photos = uploadedOfferPhotos(model.photos);
  const payer = DELIVERY_PAYERS.find(p => p.value === model.deliveryCostBornBy);

  return (
    <div className="space-y-3">
      {requestTitle && (
        <p className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-2xs text-stone-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-stone-300">
          You are offering this towards <strong className="font-bold text-stone-800 dark:text-stone-100">{requestTitle}</strong>.
        </p>
      )}

      <ReviewSection title="Photos" onEdit={() => onEdit("photos")}>
        {photos.length === 0 ? (
          <p className="text-2xs text-stone-400">No photos yet</p>
        ) : (
          <ul className="flex gap-2 overflow-x-auto">
            {photos.map((p, i) => (
              <li key={p.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-stone-200 dark:border-zinc-800">
                <Image src={p.remoteUrl as string} alt={`Photo ${i + 1}`} fill sizes="64px" className="object-cover" unoptimized />
              </li>
            ))}
          </ul>
        )}
      </ReviewSection>

      <ReviewSection title="Item" onEdit={() => onEdit("details")}>
        <ReviewRow label="Quantity" value={model.quantity} />
        <ReviewRow label="Approximate age" value={model.approximateAge} />
        <ReviewRow label="Accessories" value={model.accessoriesIncluded} />
      </ReviewSection>

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

      <ReviewSection title="Pickup & delivery" onEdit={() => onEdit("pickup")}>
        <ReviewRow label="City" value={model.pickupCity} />
        <ReviewRow label="Pincode" value={model.pickupPincode} />
        <ReviewRow label="Locality" value={model.pickupLocality} />
        <ReviewRow label="Drop-off" value={model.donorDropOffAvailable ? "I'll drop it off" : "Needs collection"} />
        {!model.donorDropOffAvailable && <ReviewRow label="Delivery paid by" value={payer?.label ?? model.deliveryCostBornBy} />}
      </ReviewSection>

      <DeclarationsBlock
        groups={OFFER_DECLARATION_GROUPS}
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
