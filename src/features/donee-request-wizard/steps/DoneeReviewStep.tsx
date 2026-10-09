"use client";

import { ReviewRow, ReviewSection } from "@/features/wizard-kit/ReviewSection";
import type { RequestVerification, VerificationDocumentType, VerificationDocument } from "@/lib/api";
import type { DoneeRequestStep } from "../doneeRequestModel";

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
  return (
    <div className="space-y-3">
      <ReviewSection title="Need Details" onEdit={() => onEdit("need-details")}>
        <ReviewRow label="Title" value={title || "Not specified"} />
        <ReviewRow label="Category" value={category || "Not specified"} />
        <ReviewRow label="Quantity" value={quantity} />
        <ReviewRow label="Urgency" value={urgency || "NORMAL"} />
        <div className="py-2 border-t border-stone-100 dark:border-zinc-800/50 mt-2">
          <p className="text-xs text-stone-500 mb-1">Description</p>
          <p className="text-sm text-stone-900 dark:text-stone-100 whitespace-pre-line wrap-anywhere">{description || "No description provided"}</p>
        </div>
      </ReviewSection>

      <ReviewSection title="Location" onEdit={() => onEdit("location")}>
        <ReviewRow label="City" value={city || "Not specified"} />
        {locality?.trim() && <ReviewRow label="Locality" value={locality} />}
        <ReviewRow label="PIN code" value={pincode || "Not specified"} />
      </ReviewSection>

      {isEmergency && (
        <ReviewSection title="Emergency Details" onEdit={() => onEdit("need-details")}>
          <ReviewRow label="Nature of emergency" value={emergencyNature || "Not specified"} />
          {incidentDate && <ReviewRow label="Incident date" value={new Date(incidentDate).toLocaleDateString()} />}
        </ReviewSection>
      )}

      <ReviewSection title="Request Context" onEdit={() => onEdit("household-situation")}>
        <ReviewRow label="Requesting for" value={verification.requestingForSomeoneElse ? "Someone else" : "Myself"} />
        {verification.requestingForSomeoneElse && (
          <ReviewRow label="Beneficiary Details" value={verification.beneficiaryDetails || "Not specified"} />
        )}
        <div className="py-2 border-t border-stone-100 dark:border-zinc-800/50 mt-2">
          <p className="text-xs text-stone-500 mb-1">Why they cannot buy this item</p>
          <p className="text-sm text-stone-900 dark:text-stone-100 whitespace-pre-line wrap-anywhere">{verification.reasonCannotBuy || "Not provided"}</p>
        </div>
      </ReviewSection>

      <ReviewSection title="Evidence" onEdit={() => onEdit("household-situation")}>
        <ReviewRow label="Documents uploaded" value={`${uploadedDocs.size} document(s)`} />
      </ReviewSection>
    </div>
  );
}
