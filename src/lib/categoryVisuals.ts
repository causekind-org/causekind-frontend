import { Stethoscope, BookOpen, Sprout, Users, Home as HomeIcon, Armchair, Shirt, Smartphone, Dumbbell, type LucideIcon } from "lucide-react";

// Kept symmetric with donor listing categories (items/new/page.tsx's CATEGORIES) —
// Furniture/Clothing/Electronics/Sports were previously donor-only, which meant a
// donor-listed Furniture item could never match a donee request (requests had no
// Furniture option to pick, only the ill-fitting "Household"). Livelihood/Relief
// stay request-only — they're need-framings without a matching physical-item
// listing category, used for distance-staging in MatchingEngineService.
export const ALL_REQUEST_CATEGORIES = [
  "Medical aid", "Education", "Livelihood", "Relief", "Household",
  "Furniture", "Clothing", "Electronics", "Sports",
];

// Donor item-listing categories are ALL_REQUEST_CATEGORIES minus the two
// request-only need-framings (Livelihood/Relief have no matching physical-item
// listing category — see MatchingEngineService). Single source for the
// donate/edit-listing forms so they can't drift from the request-side list.
export const DONOR_LISTING_CATEGORIES = ALL_REQUEST_CATEGORIES.filter(
  (c) => c !== "Livelihood" && c !== "Relief"
);

// Subcategory options per donor listing category — shared by the item-listing
// create/edit forms. Mirrored by hand on the backend in ListingVisionService
// (Java can't import this file) — keep both in sync if this changes.
export const ITEM_SUBCATEGORIES: Record<string, string[]> = {
  Education:    ["Books", "Stationery", "School Bags", "Educational Toys", "Uniforms", "Other"],
  Clothing:     ["Men's", "Women's", "Children's", "Baby & Infant", "Footwear", "Accessories"],
  Furniture:    ["Chairs", "Tables", "Beds", "Sofas", "Wardrobes", "Storage", "Other"],
  Electronics:  ["Phones", "Laptops", "Tablets", "TVs", "Kitchen Appliances", "Accessories", "Other"],
  Household:    ["Cookware", "Utensils", "Bedding", "Curtains", "Cleaning Equipment", "Other"],
  Sports:       ["Fitness Equipment", "Outdoor Sports", "Indoor Sports", "Cycling", "Other"],
  "Medical aid":["Wheelchair", "Crutches / Walker", "Hospital Bed", "Medical Device", "Mobility Aid", "Other"],
};

export type CategoryVisual = {
  Icon: LucideIcon;
  text: string;
  fallbackImage: string;
  // Dark-glass tone classes for DonorCategoryModal. Literal strings on purpose —
  // Tailwind's JIT only generates classes it can see written out in full.
  col: string; iconBg: string; border: string; ring: string; badge: string;
  // One-line meaning of the category, shown in the focus-picker hover tooltip.
  blurb: string;
};

// Shared category → icon/color/fallback-image mapping — THE single source of
// truth for category visuals. DoneeRequestsSection, DoneeRequestPrompt, and
// DonorCategoryModal all derive from this + ALL_REQUEST_CATEGORIES, so adding a
// category here is all it takes for every surface to pick it up.
export const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  "Medical aid": { Icon: Stethoscope, text: "text-sky-700 dark:text-sky-400",     fallbackImage: "/images/medical-1.webp",
                   col: "text-sky-300",     iconBg: "bg-sky-500/20",     border: "border-sky-400/40",     ring: "ring-sky-400/50", badge: "bg-sky-400",
                   blurb: "Wheelchairs, medicines, hearing aids and other health-related needs." },
  "Education":   { Icon: BookOpen,    text: "text-amber-700 dark:text-amber-400", fallbackImage: "/images/hero-7.webp",
                   col: "text-amber-300",   iconBg: "bg-amber-500/20",   border: "border-amber-400/40",   ring: "ring-amber-400/50", badge: "bg-amber-400",
                   blurb: "Books, school bags, stationery and study support for students." },
  "Livelihood":  { Icon: Sprout,      text: "text-emerald-700 dark:text-emerald-400", fallbackImage: "/images/hero-3.webp",
                   col: "text-emerald-300", iconBg: "bg-emerald-500/20", border: "border-emerald-400/40", ring: "ring-emerald-400/50", badge: "bg-emerald-400",
                   blurb: "Tools, sewing machines and items that help someone earn a living." },
  "Relief":      { Icon: Users,       text: "text-violet-700 dark:text-violet-400",   fallbackImage: "/images/hero-5.webp",
                   col: "text-violet-300",  iconBg: "bg-violet-500/20",  border: "border-violet-400/40",  ring: "ring-violet-400/50", badge: "bg-violet-400",
                   blurb: "Essentials for families hit by emergencies, floods or hard times." },
  "Household":   { Icon: HomeIcon,    text: "text-rose-700 dark:text-rose-400",   fallbackImage: "/images/hero-6.webp",
                   col: "text-rose-300",    iconBg: "bg-rose-500/20",    border: "border-rose-400/40",    ring: "ring-rose-400/50", badge: "bg-rose-400",
                   blurb: "Daily-use home items — utensils, bedding and kitchen essentials." },
  "Furniture":   { Icon: Armchair,    text: "text-indigo-700 dark:text-indigo-400", fallbackImage: "/images/hero-6.webp",
                   col: "text-indigo-300",  iconBg: "bg-indigo-500/20",  border: "border-indigo-400/40",  ring: "ring-indigo-400/50", badge: "bg-indigo-400",
                   blurb: "Beds, chairs, tables and storage for homes that need them." },
  "Clothing":    { Icon: Shirt,       text: "text-teal-700 dark:text-teal-400",   fallbackImage: "/images/hero-3.webp",
                   col: "text-teal-300",    iconBg: "bg-teal-500/20",    border: "border-teal-400/40",    ring: "ring-teal-400/50", badge: "bg-teal-400",
                   blurb: "Clean, wearable clothes for all ages and seasons." },
  "Electronics": { Icon: Smartphone,  text: "text-orange-700 dark:text-orange-400", fallbackImage: "/images/hero-7.webp",
                   col: "text-orange-300",  iconBg: "bg-orange-500/20",  border: "border-orange-400/40",  ring: "ring-orange-400/50", badge: "bg-orange-400",
                   blurb: "Working phones, laptops and appliances someone can still use." },
  "Sports":      { Icon: Dumbbell,    text: "text-cyan-700 dark:text-cyan-400",   fallbackImage: "/images/hero-5.webp",
                   col: "text-cyan-300",    iconBg: "bg-cyan-500/20",    border: "border-cyan-400/40",    ring: "ring-cyan-400/50", badge: "bg-cyan-400",
                   blurb: "Sports gear, cycles and fitness equipment for kids and adults." },
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
