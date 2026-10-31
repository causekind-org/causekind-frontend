"use client";

import { ReviewRow, ReviewSection } from "@/features/wizard-kit/ReviewSection";
import type { RequestVerification, VerificationDocumentType, VerificationDocument } from "@/lib/api";
import type { DoneeRequestStep } from "../doneeRequestModel";

import { UiText, useUiText } from "@/components/UiText";
export function DoneeReviewStep({
  title,
  category,
  quantity,
  urgency,
  description,
  isEmergency,
  emergencyNature,
  incidentDate,
  city,
  locality,
  pincode,
  verification,
  uploadedDocs,
  onEdit,
}: {
  title: string;
  category: string;
  quantity: number;
  urgency: string;
  description: string;
  isEmergency: boolean;
  emergencyNature: string;
  incidentDate: string;
  city: string;
  /** Optional area or neighbourhood. */
  locality?: string;
  pincode: string;
  verification: Partial<RequestVerification>;
  uploadedDocs: Map<VerificationDocumentType, VerificationDocument>;
  onEdit: (step: DoneeRequestStep) => void;
}) {
  const ui = useUiText();
  return (
    <div className="space-y-3">
      <ReviewSection title={ui("Need Details")} onEdit={() => onEdit("need-details")}>
        <ReviewRow label={ui("Title")} value={title || "Not specified"} />
        <ReviewRow label={ui("Category")} value={category || "Not specified"} />
        <ReviewRow label={ui("Quantity")} value={quantity} />
        <ReviewRow label={ui("Urgency")} value={urgency || "NORMAL"} />
        <div className="py-2 border-t border-stone-100 dark:border-zinc-800/50 mt-2">
          <p className="text-xs text-stone-500 mb-1"><UiText>Description</UiText></p>
          <p className="text-sm text-stone-900 dark:text-stone-100 whitespace-pre-line wrap-anywhere">{description || ui("No description provided")}</p>
        </div>
      </ReviewSection>

      <ReviewSection title={ui("Location")} onEdit={() => onEdit("location")}>
        <ReviewRow label={ui("City")} value={city || "Not specified"} />
        {locality?.trim() && <ReviewRow label={ui("Locality")} value={locality} />}
        <ReviewRow label={ui("PIN code")} value={pincode || "Not specified"} />
      </ReviewSection>

      {isEmergency && (
        <ReviewSection title={ui("Emergency Details")} onEdit={() => onEdit("need-details")}>
          <ReviewRow label={ui("Nature of emergency")} value={emergencyNature || "Not specified"} />
          {incidentDate && <ReviewRow label={ui("Incident date")} value={new Date(incidentDate).toLocaleDateString()} />}
        </ReviewSection>
      )}

      <ReviewSection title={ui("Request Context")} onEdit={() => onEdit("household-situation")}>
        <ReviewRow label={ui("Requesting for")} value={verification.requestingForSomeoneElse ? "Someone else" : "Myself"} />
        {verification.requestingForSomeoneElse && (
          <ReviewRow label={ui("Beneficiary Details")} value={verification.beneficiaryDetails || "Not specified"} />
        )}
        <div className="py-2 border-t border-stone-100 dark:border-zinc-800/50 mt-2">
          <p className="text-xs text-stone-500 mb-1"><UiText>Why they cannot buy this item</UiText></p>
          <p className="text-sm text-stone-900 dark:text-stone-100 whitespace-pre-line wrap-anywhere">{verification.reasonCannotBuy || ui("Not provided")}</p>
        </div>
      </ReviewSection>

      <ReviewSection title={ui("Evidence")} onEdit={() => onEdit("household-situation")}>
        <ReviewRow label={ui("Documents uploaded")} value={`${uploadedDocs.size} document(s)`} />
      </ReviewSection>
    </div>
  );
}
