/**
 * The drive page and its give form. Donor onboarding overlays (welcome splash,
 * "Choose your focus areas") pause here so the give flow and its success popup
 * stay on top; they show on the next other page, as before.
 */
export function isDriveGiveFlowPath(pathname: string | null | undefined): boolean {
  return /^\/drives\/\d+(\/give)?\/?$/.test(pathname ?? "");
}
