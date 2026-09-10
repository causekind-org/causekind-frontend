/** Three request stages; reusable household facts and identity documents live in the profile. */

export const DONEE_REQUEST_STEPS = [
  "need-details",
  "household-situation",
  "declarations",
] as const;

export type DoneeRequestStep = (typeof DONEE_REQUEST_STEPS)[number];

export const STEP_LABELS: Record<DoneeRequestStep, string> = {
  "need-details": "Need Details",
  "household-situation": "Request context & evidence",
  "declarations": "Declarations",
};

export const STEP_INTROS: Record<DoneeRequestStep, string> = {
  "need-details": "What do you need, and why?",
  "household-situation": "Tell us who needs the item and add evidence specific to this request",
  "declarations": "Final confirmation",
};

export function doneeStepIndex(step: DoneeRequestStep): number {
  return DONEE_REQUEST_STEPS.indexOf(step);
}

/** 1-based, for the ordinal cases that genuinely need it. */
export function stepNumber(step: DoneeRequestStep): number {
  return doneeStepIndex(step) + 1;
}

/**
 * 1-based number back to an id. Clamped rather than throwing: the only callers
 * are the rejection heuristic and restored server state, and landing the donee
 * on step one is a far better failure than a blank screen.
 */
export function stepFromNumber(n: number): DoneeRequestStep {
  const i = Math.min(Math.max(Math.trunc(n) - 1, 0), DONEE_REQUEST_STEPS.length - 1);
  return DONEE_REQUEST_STEPS[i];
}

export const LAST_DONEE_STEP: DoneeRequestStep =
  DONEE_REQUEST_STEPS[DONEE_REQUEST_STEPS.length - 1];
