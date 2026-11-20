/**
 * The /faq questions, stored once and tagged with their tab. The text lives in
 * messages/en.json under `faq.item{n}Q` / `faq.item{n}A` (other locales fall
 * back to English). "All" renders the whole list; each other tab filters it.
 * The category is only for tabs and is never shown on the page.
 */
export type FaqCategory = "trust" | "giving" | "money" | "ngo";

const CATEGORIES: FaqCategory[] = [
  "trust", "trust", "trust", "trust", "trust",
  "giving", "giving", "giving", "giving", "giving", "giving", "giving", "giving",
  "money", "money", "money", "money", "money", "money", "money",
  "ngo", "ngo", "ngo", "ngo", "ngo", "ngo",
];

export const FAQ_ITEMS: readonly { category: FaqCategory; q: string; a: string }[] = CATEGORIES.map((category, i) => ({
  category,
  q: `item${i + 1}Q`,
  a: `item${i + 1}A`,
}));

/** Tab order on the page. `null` is the "All" tab. */
export const FAQ_TABS: readonly { id: string; category: FaqCategory | null }[] = [
  { id: "all", category: null },
  { id: "trust-safety", category: "trust" },
  { id: "giving-receiving", category: "giving" },
  { id: "money-tracking", category: "money" },
  { id: "ngo-drives", category: "ngo" },
];
