import type { ItemRequest, PublicNgoDrive } from "@/lib/api";
import { ALL_REQUEST_CATEGORIES } from "@/lib/categoryVisuals";

export type UnifiedNeedItem =
  | { kind: "request"; data: ItemRequest }
  | { kind: "drive"; data: PublicNgoDrive };

/**
 * Money drives: enabled when the money drive launches.
 * Kept in code and disabled behind this single constant.
 */
export const MONEY_DRIVES_ENABLED = false;

export type DriveTypeFilter = "all" | "items" | "money";
export type DriveUrgencyFilter = "all" | "normal" | "high" | "urgent";

export const DRIVE_TYPE_OPTIONS: { id: DriveTypeFilter; label: string; disabled?: boolean; badge?: string }[] = [
  { id: "all", label: "All" },
  { id: "items", label: "Items" },
  { id: "money", label: "Money", disabled: !MONEY_DRIVES_ENABLED, badge: !MONEY_DRIVES_ENABLED ? "Coming soon" : undefined },
];

export const DRIVE_URGENCY_OPTIONS: { id: DriveUrgencyFilter; label: string; backendEnum?: "NORMAL" | "HIGH" | "CRITICAL" }[] = [
  { id: "all", label: "All" },
  { id: "normal", label: "Normal", backendEnum: "NORMAL" },
  { id: "high", label: "High", backendEnum: "HIGH" },
  { id: "urgent", label: "Urgent", backendEnum: "CRITICAL" },
];

/**
 * Map backend urgency enum (NORMAL, HIGH, CRITICAL) to UI display label.
 * CRITICAL is labelled "Urgent" everywhere (no raw enum text).
 */
export function formatDriveUrgency(urgency?: string | null): string {
  if (!urgency) return "Normal";
  const upper = urgency.toUpperCase();
  if (upper === "CRITICAL" || upper === "URGENT") return "Urgent";
  if (upper === "HIGH") return "High";
  return "Normal";
}

/**
 * Numeric weight for sorting: Urgent/CRITICAL (3), HIGH (2), NORMAL (1).
 */
export function driveUrgencyWeight(urgency?: string | null): number {
  if (!urgency) return 1;
  const upper = urgency.toUpperCase();
  if (upper === "CRITICAL" || upper === "URGENT") return 3;
  if (upper === "HIGH") return 2;
  return 1;
}

/**
 * Sorts drives:
 * - "newest": newest first (highest id)
 * - "urgent", "nearest", "qty", or default: Part A rule (Urgent first, then nearest neededBy date)
 */
export function sortNgoDrives(
  drives: PublicNgoDrive[],
  sort?: "nearest" | "urgent" | "newest" | "qty"
): PublicNgoDrive[] {
  return [...drives].sort((a, b) => {
    if (sort === "newest") {
      return (b.id ?? 0) - (a.id ?? 0);
    }

    // Part A rule applied for "urgent", "nearest", "qty", and default:
    const uA = driveUrgencyWeight(a.urgency);
    const uB = driveUrgencyWeight(b.urgency);
    if (uA !== uB) return uB - uA; // Higher urgency first

    const dateA = a.neededBy ? new Date(a.neededBy).getTime() : Number.MAX_SAFE_INTEGER;
    const dateB = b.neededBy ? new Date(b.neededBy).getTime() : Number.MAX_SAFE_INTEGER;
    if (dateA !== dateB) return dateA - dateB; // Nearest date first

    return (b.id ?? 0) - (a.id ?? 0);
  });
}

/**
 * Filters drives by type, urgency, and optional category.
 */
export function filterNgoDrives(
  drives: PublicNgoDrive[],
  filters: {
    type?: DriveTypeFilter;
    urgency?: DriveUrgencyFilter;
    category?: string | null;
  }
): PublicNgoDrive[] {
  const { type = "all", urgency = "all", category } = filters;

  return drives.filter((drive) => {
    // Type filter
    if (type === "items") {
      const isMoney = (drive.driveType ?? "").toUpperCase() === "MONEY";
      if (isMoney) return false;
    } else if (type === "money") {
      const isMoney = (drive.driveType ?? "").toUpperCase() === "MONEY";
      if (!isMoney) return false;
    }

    // Urgency filter (mapped: urgent -> CRITICAL)
    if (urgency !== "all") {
      const driveUrgency = (drive.urgency ?? "NORMAL").toUpperCase();
      if (urgency === "urgent" && driveUrgency !== "CRITICAL" && driveUrgency !== "URGENT") return false;
      if (urgency === "high" && driveUrgency !== "HIGH") return false;
      if (urgency === "normal" && driveUrgency !== "NORMAL") return false;
    }

    // Category filter
    if (category && category !== "All" && category !== "All categories") {
      const mappedCat = mapNgoCategoryToRequestCategory(drive.category);
      if (mappedCat !== category) return false;
    }

    return true;
  });
}

/**
 * Calculates days left until neededBy.
 * Returns { label: string, isAmber: boolean } or null if neededBy is missing.
 */
export function formatDaysLeft(neededBy?: string | null): { label: string; isAmber: boolean } | null {
  if (!neededBy) return null;
  const targetDate = new Date(neededBy);
  if (Number.isNaN(targetDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null; // Expired / in past
  if (diffDays === 0) {
    return { label: "Ends today", isAmber: true };
  }
  if (diffDays === 1) {
    return { label: "1 day left", isAmber: true };
  }
  if (diffDays <= 3) {
    return { label: `${diffDays} days left`, isAmber: true };
  }
  return { label: `${diffDays} days left`, isAmber: false };
}

/**
 * Formats "Support {count} {beneficiaryGroup}".
 * Uses correct singular/plural and handles unknown groups cleanly.
 */
export type SupportMessage = "supportCommunity" | "supportGroupOnly" | "supportPeople" | "supportCountGroup";
const SUPPORT_EN: Record<SupportMessage, (v: { count?: number; group?: string }) => string> = {
  supportCommunity: () => "Support community",
  supportGroupOnly: (v) => `Support ${v.group}`,
  supportPeople: (v) => (v.count === 1 ? "Support 1 person" : `Support ${v.count} people`),
  supportCountGroup: (v) => `Support ${v.count} ${v.group}`,
};

/** `t` translates the sentence; the group is the NGO's own words and is passed through. English by default. */
export function formatBeneficiarySupport(count?: number | null, group?: string | null,
  t: (key: SupportMessage, values: { count?: number; group?: string }) => string = (key, v) => SUPPORT_EN[key](v)): string {
  const c = count != null && count > 0 ? count : null;
  const rawGroup = group?.trim();

  if (!c && !rawGroup) return t("supportCommunity", {});
  if (!c) return t("supportGroupOnly", { group: rawGroup });

  if (!rawGroup) {
    return t("supportPeople", { count: c });
  }

  // Handle pluralization gracefully if group is generic singular word
  let g = rawGroup;
  if (c === 1) {
    if (g.toLowerCase() === "students") g = "Student";
    else if (g.toLowerCase() === "children") g = "Child";
    else if (g.toLowerCase() === "families") g = "Family";
    else if (g.toLowerCase() === "people") g = "Person";
  } else {
    // Plural
    if (g.toLowerCase() === "student") g = "Students";
    else if (g.toLowerCase() === "child") g = "Children";
    else if (g.toLowerCase() === "family") g = "Families";
    else if (g.toLowerCase() === "person") g = "People";
  }

  return t("supportCountGroup", { count: c, group: g });
}

/**
 * Maps NGO drive categories to the existing request categories.
 * Maps only clear matches (e.g. Education -> Education, Medical -> Medical aid, Livelihood -> Livelihood).
 * Drives with no clear match return null and will only show under "All categories".
 */
export function mapNgoCategoryToRequestCategory(ngoCategory?: string | null): string | null {
  if (!ngoCategory) return null;
  const trimmed = ngoCategory.trim();

  // Exact match with known categories
  if (ALL_REQUEST_CATEGORIES.includes(trimmed)) {
    return trimmed;
  }

  // Common aliases
  const lower = trimmed.toLowerCase();
  if (lower === "medical") return "Medical aid";

  return null;
}

/**
 * Interleave donee requests and NGO drives for the "Everyone" view.
 * Exact rule:
 * 1. Urgent needs come first:
 *    - Urgent requests (isEmergency || urgency === "CRITICAL")
 *    - Urgent drives (urgency === "CRITICAL")
 * 2. Regular needs follow:
 *    - Regular requests
 *    - Regular drives
 * 3. Within each tier, items are interleaved (2 requests, 1 drive, etc.)
 *    strictly preserving the internal relative ordering of requests and drives.
 */
export function interleaveNeeds(
  sortedRequests: ItemRequest[],
  sortedDrives: PublicNgoDrive[]
): UnifiedNeedItem[] {
  const urgentReqs = sortedRequests.filter(r => r.isEmergency || r.urgency === "CRITICAL");
  const regularReqs = sortedRequests.filter(r => !r.isEmergency && r.urgency !== "CRITICAL");

  const urgentDrives = sortedDrives.filter(d => (d.urgency ?? "").toUpperCase() === "CRITICAL");
  const regularDrives = sortedDrives.filter(d => (d.urgency ?? "").toUpperCase() !== "CRITICAL");

  const interleave = (reqs: ItemRequest[], drvs: PublicNgoDrive[]): UnifiedNeedItem[] => {
    const res: UnifiedNeedItem[] = [];
    let rIdx = 0;
    let dIdx = 0;
    while (rIdx < reqs.length || dIdx < drvs.length) {
      for (let i = 0; i < 2 && rIdx < reqs.length; i++) {
        res.push({ kind: "request", data: reqs[rIdx++] });
      }
      if (dIdx < drvs.length) {
        res.push({ kind: "drive", data: drvs[dIdx++] });
      }
    }
    return res;
  };

  return [...interleave(urgentReqs, urgentDrives), ...interleave(regularReqs, regularDrives)];
}
