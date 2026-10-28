import { useTranslations } from "next-intl";

/**
 * Display label for a fixed category ID ("Medical aid", "Education", …).
 *
 * The ID itself is data — it filters requests, looks up CATEGORY_VISUALS, and is
 * what forms submit — so it is never changed; only what's shown is translated,
 * from the existing catalogue entries in messages/en.json → categoryStrip.categories.
 * An unknown category is shown exactly as given.
 */
const CATEGORY_KEYS: Record<string, string> = {
  Education: "education",
  Clothing: "clothing",
  Household: "household",
  Furniture: "furniture",
  "Medical aid": "medicalAid",
  Livelihood: "livelihood",
  Relief: "relief",
  Electronics: "electronics",
  Sports: "sports",
};

export function useCategoryLabel(): (categoryId: string) => string {
  const t = useTranslations("categoryStrip.categories");
  return (categoryId: string) => {
    const key = CATEGORY_KEYS[categoryId];
    return key && t.has(key) ? t(key) : categoryId;
  };
}
