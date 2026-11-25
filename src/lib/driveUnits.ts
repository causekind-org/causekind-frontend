/**
 * Drive unit as shown next to a quantity: "1 piece", "3 pieces", "1 box", "2 kg".
 * Drive units are stored as PIECES / SETS / PAIRS / KG / BOXES / PACKETS (or similar).
 */
const SINGULAR: Record<string, string> = {
  pieces: "piece",
  sets: "set",
  pairs: "pair",
  boxes: "box",
  packets: "packet",
  units: "unit",
  items: "item",
  bags: "bag",
  bottles: "bottle",
  litres: "litre",
  liters: "liter",
};

/** Lower-case unit for a quantity; singular when the quantity is exactly 1. */
export function unitFor(unit: string | null | undefined, qty: number | null | undefined): string {
  if (!unit) return "";
  const plain = unit.replaceAll("_", " ").toLowerCase().trim();
  if (qty === 1 && SINGULAR[plain]) return SINGULAR[plain];
  return plain;
}

/** As {@link unitFor}, with the first letter capitalised ("1 Piece", "6 Pieces"). */
export function unitForTitle(unit: string | null | undefined, qty: number | null | undefined): string {
  const u = unitFor(unit, qty);
  return u ? u[0].toUpperCase() + u.slice(1) : "";
}
