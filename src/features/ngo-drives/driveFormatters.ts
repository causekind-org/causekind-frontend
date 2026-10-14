/**
 * Shared formatters for donor-facing NGO drive views.
 */

/**
 * Formats any date string or Date object to `dd-mm-yyyy`.
 * Preserves the exact date without timezone drift for `YYYY-MM-DD` strings.
 */
export function formatDdMmYyyy(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateInput);
    if (match) {
      const [, y, m, d] = match;
      return `${d}-${m}-${y}`;
    }
  }
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return typeof dateInput === "string" ? dateInput : "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Formats handover mode into plain language.
 */
export function formatHandoverMode(mode?: string | null): string {
  if (!mode) return "Drop-off or pickup";
  const upper = mode.toUpperCase();
  if (upper === "DROP_OFF") return "Drop-off only";
  if (upper === "PICKUP") return "Pickup only";
  if (upper === "BOTH") return "Drop-off or pickup";
  return mode.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Formats NGO legal structure into plain language.
 */
export function formatLegalStructure(structure?: string | null): string {
  if (!structure) return "";
  const upper = structure.toUpperCase();
  if (upper === "TRUST") return "Trust";
  if (upper === "SOCIETY") return "Society";
  if (upper === "SECTION_8") return "Section 8 company";
  return structure.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Builds a Google Maps search URL from an address string.
 */
export function getMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
