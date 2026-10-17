/**
 * Filter chips for the donor's "Your Inventory" tab.
 *
 * <p>A listing has one of ~24 statuses (including legacy values kept for old
 * rows). A donor does not think in those — they think "my drafts", "what is
 * live and being matched", "what got matched". Each chip is a named group of
 * statuses; every status belongs to exactly one group, so the per-chip counts
 * always add up to the "All" count and nothing can fall through a gap.
 */

export type InventoryFilter =
  | "all"
  | "drafts"
  | "review"
  | "needsInfo"
  | "live"
  | "matched"
  | "paused"
  | "donated"
  | "closed";

export const INVENTORY_FILTERS: { key: Exclude<InventoryFilter, "all">; label: string; statuses: readonly string[] }[] = [
  { key: "drafts", label: "Drafts", statuses: ["DRAFT"] },
  { key: "review", label: "In review", statuses: ["SUBMITTED", "AI_SCREENING", "MANUAL_REVIEW", "PENDING_REVIEW"] },
  { key: "needsInfo", label: "Needs info", statuses: ["NEEDS_INFORMATION"] },
  { key: "live", label: "Live · matching", statuses: ["ELIGIBLE_FOR_MATCHING", "AVAILABLE", "POTENTIAL_MATCH"] },
  {
    key: "matched",
    label: "Matched",
    statuses: ["SOFT_RESERVED", "MATCHED", "AWAITING_DONOR_CONFIRMATION", "RESERVED", "HANDOVER_SCHEDULED", "IN_TRANSIT"],
  },
  { key: "paused", label: "Paused", statuses: ["PAUSED"] },
  { key: "donated", label: "Donated", statuses: ["PARTIALLY_DONATED", "DONATED", "FULFILLED"] },
  { key: "closed", label: "Closed", statuses: ["EXPIRED", "WITHDRAWN", "REJECTED"] },
];

/** The group a status belongs to. Unknown (future) statuses land in "review" rather than vanishing. */
export function inventoryGroupOf(status: string): Exclude<InventoryFilter, "all"> {
  return INVENTORY_FILTERS.find(f => f.statuses.includes(status))?.key ?? "review";
}

export function matchesInventoryFilter(status: string, filter: InventoryFilter): boolean {
  return filter === "all" || inventoryGroupOf(status) === filter;
}

/** Counts per chip, including "all". */
export function inventoryCounts(statuses: readonly string[]): Record<InventoryFilter, number> {
  const counts = { all: statuses.length } as Record<InventoryFilter, number>;
  for (const f of INVENTORY_FILTERS) counts[f.key] = 0;
  for (const s of statuses) counts[inventoryGroupOf(s)] += 1;
  return counts;
}
