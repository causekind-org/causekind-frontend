import { useUiText } from "@/components/UiText";
import type { DoneeRequestStep } from "./doneeRequestModel";

/** Translated step labels and intros for the donee request wizard. */
export function useDoneeStepCopy(): { labels: Record<DoneeRequestStep, string>; intros: Record<DoneeRequestStep, string> } {
  const ui = useUiText();
  return {
    labels: {
      "need-details": ui("Need Details", "request step"),
      "location": ui("Location", "request step"),
      "household-situation": ui("Request context & evidence", "request step"),
      "review": ui("Review Request", "request step"),
      "declarations": ui("Declarations", "request step"),
    },
    intros: {
      "need-details": ui("What do you need, and why?"),
      "location": ui("Where should the item reach you? We look for donors within 10 km of this pin."),
      "household-situation": ui("Tell us who needs the item and add evidence specific to this request"),
      "review": ui("Review your request details before submitting"),
      "declarations": ui("Final confirmation"),
    },
  };
}
