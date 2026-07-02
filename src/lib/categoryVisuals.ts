import { Stethoscope, BookOpen, Sprout, Users, Home as HomeIcon, type LucideIcon } from "lucide-react";

export const ALL_REQUEST_CATEGORIES = ["Medical aid", "Education", "Livelihood", "Relief", "Household"];

export type CategoryVisual = { Icon: LucideIcon; text: string; fallbackImage: string };

// Shared category → icon/color/fallback-image mapping, reused by
// DoneeRequestsSection and DoneeRequestPrompt so both stay in sync.
export const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  "Medical aid": { Icon: Stethoscope, text: "text-sky-700 dark:text-sky-400",     fallbackImage: "/images/medical-1.webp" },
  "Education":   { Icon: BookOpen,    text: "text-amber-700 dark:text-amber-400", fallbackImage: "/images/hero-7.webp" },
  "Livelihood":  { Icon: Sprout,      text: "text-emerald-700 dark:text-emerald-400", fallbackImage: "/images/hero-3.webp" },
  "Relief":      { Icon: Users,       text: "text-violet-700 dark:text-violet-400",   fallbackImage: "/images/hero-5.webp" },
  "Household":   { Icon: HomeIcon,    text: "text-rose-700 dark:text-rose-400",   fallbackImage: "/images/hero-6.webp" },
};

const DONOR_CATEGORY_STORAGE_KEY = "causekind_donor_category";

// `null` = the donor has never opened/applied the focus-area picker at all.
// `[]`   = explicitly applied with nothing toggled — DonorCategoryModal treats
//          that as "Apply Selection (All)" / "Show all needs instead".
export function readSelectedDonorCategories(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DONOR_CATEGORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
