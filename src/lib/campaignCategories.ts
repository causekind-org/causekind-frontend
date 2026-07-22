// Single source of truth for campaign (fundraising) categories — shared by the
// create-campaign form, the browse/filter page, and every card/carousel that
// renders a category-based fallback image. Previously these were hardcoded
// separately in each file and had drifted ("Disaster" on the create form vs.
// "Disaster Relief" on the filter meant a real campaign could never be found
// by that filter chip).
export const CAMPAIGN_CATEGORIES = [
  "Medical", "Education", "Livelihood", "Disaster Relief",
  "Community", "Animal Welfare", "Environment", "Other",
];

export const CAMPAIGN_CATEGORY_IMAGES: Record<string, string[]> = {
  "Medical":         ["/images/medical-1.webp", "/images/medical-2.webp"],
  "Education":       ["/images/hero-7.webp"],
  "Livelihood":      ["/images/hero-3.webp"],
  "Disaster Relief": ["/images/hero-9.webp"],
  "Community":       ["/images/hero-6.webp"],
  "Animal Welfare":  ["/images/hero-5.webp"],
  "Environment":     ["/images/hero-8.webp"],
  // "Other" intentionally has no entry — falls back to the generic hero rotation.
};
