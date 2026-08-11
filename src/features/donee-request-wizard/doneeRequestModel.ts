/**
 * Step model for the donee "Request an Item" wizard.
 *
 * <p>The four business stages are fixed and ordered: a need is described, the
 * household context is given, documents are supplied, and only then are the
 * legal declarations accepted. Reordering or merging them would change what a
 * donee agrees to and when, so the order here is not a presentational choice.
 *
 * <p>Semantic ids rather than 1..4. The page previously threaded a bare number
 * through validation, rejection routing and the progress UI, where `step === 3`
 * told a reader nothing and an off-by-one would be silent. The numeric form
 * still exists — `stepNumber` / `stepFromNumber` — because two pieces of
 * behaviour genuinely are ordinal (the rejection-reason heuristic, and the
 * server's own notion of progress), and those conversions are now the only
 * places the number appears.
 */

export const DONEE_REQUEST_STEPS = [
  "need-details",
  "household-situation",
  "verification-documents",
  "declarations",
] as const;

export type DoneeRequestStep = (typeof DONEE_REQUEST_STEPS)[number];

export const STEP_LABELS: Record<DoneeRequestStep, string> = {
  "need-details": "Need Details",
  "household-situation": "Household & Situation",
  "verification-documents": "Verification Documents",
  "declarations": "Declarations",
};

export const STEP_INTROS: Record<DoneeRequestStep, string> = {
  "need-details": "What do you need, and why?",
  "household-situation": "Help us understand your situation",
  "verification-documents": "Required for admin verification",
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
