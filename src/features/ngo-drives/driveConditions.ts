/**
 * "Condition accepted" on an NGO drive: the label shown everywhere and which donor item
 * conditions it takes. Mirrors the backend's NgoDriveCondition, which is the rule the
 * server enforces; the public drive also carries `acceptedConditions` from the server.
 */
export const DRIVE_CONDITIONS = [
  { value: "NEW_ONLY", label: "New only", accepts: ["Unused", "Like New"] },
  { value: "NEW_OR_GENTLY_USED", label: "New or gently used", accepts: ["Unused", "Like New", "Good"] },
  { value: "SEALED_ONLY", label: "Sealed / packaged only (food, medicine, hygiene items)", accepts: ["Unused"] },
  { value: "USED_WORKING", label: "Used, clean and working", accepts: ["Unused", "Like New", "Good", "Fair"] },
  { value: "ANY_USABLE", label: "Any usable condition (minor repairs OK)", accepts: ["Unused", "Like New", "Good", "Fair", "Needs Minor Repair"] },
] as const;

export type DriveCondition = (typeof DRIVE_CONDITIONS)[number]["value"];

const find = (value: string | null | undefined) => DRIVE_CONDITIONS.find((c) => c.value === value);

export function isDriveCondition(value: unknown): value is DriveCondition {
  return typeof value === "string" && !!find(value);
}

export function driveConditionLabel(value: string | null | undefined): string {
  return find(value)?.label ?? (value ? value.replaceAll("_", " ").toLowerCase() : "");
}

/** Donor conditions the drive accepts, or null when the drive has no known rule (accept any). */
export function driveAcceptedConditions(value: string | null | undefined): readonly string[] | null {
  return find(value)?.accepts ?? null;
}

/** Plain-language rule, e.g. "Accepts: Unused, Like New". */
export function driveConditionRule(value: string | null | undefined): string | null {
  const accepts = driveAcceptedConditions(value);
  return accepts ? `Accepts: ${accepts.join(", ")}` : null;
}

/** The 3 options shown in the NGO drive creation/edit wizard dropdown. */
export const WIZARD_DRIVE_CONDITIONS = [
  { value: "NEW_ONLY", label: "New only", helper: "Unused, with tags or in original packaging" },
  { value: "NEW_OR_GENTLY_USED", label: "New or gently used", helper: "Like-new, no visible wear" },
  { value: "ANY_USABLE", label: "Any usable condition", helper: "Clean and working, minor wear is fine" },
] as const;

export type WizardDriveCondition = (typeof WIZARD_DRIVE_CONDITIONS)[number]["value"];

export function wizardConditionHelper(value: string | null | undefined): string | undefined {
  const c = WIZARD_DRIVE_CONDITIONS.find((x) => x.value === value);
  return c?.helper ?? undefined;
}

/**
 * Maps legacy 5-condition values to the 3 options for the wizard.
 * SEALED_ONLY -> NEW_ONLY, USED_WORKING -> ANY_USABLE.
 */
export function normalizeLegacyCondition(value: string | null | undefined): WizardDriveCondition {
  if (value === "SEALED_ONLY") return "NEW_ONLY";
  if (value === "USED_WORKING") return "ANY_USABLE";
  if (value === "NEW_OR_GENTLY_USED") return "NEW_OR_GENTLY_USED";
  if (value === "ANY_USABLE") return "ANY_USABLE";
  return "NEW_ONLY";
}

