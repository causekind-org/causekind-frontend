import type { DriveCategoryDetails } from "@/lib/api";

/** Category-specific drive fields. Kept in step with the backend's NgoDriveFormRules. */
export const WORKING_ORDER_CATEGORIES = ["Electronics", "Household"] as const;
export const REQUIRE_CLEAN_CATEGORIES = ["Clothing", "Household", "Furniture"] as const;

export const CLOTHING_SIZES = [
  { id: "XS", label: "XS" }, { id: "S", label: "S" }, { id: "M", label: "M" }, { id: "L", label: "L" },
  { id: "XL", label: "XL" }, { id: "XXL", label: "XXL" }, { id: "FREE", label: "Free size" },
  { id: "KIDS_0_2", label: "0–2 yrs" }, { id: "KIDS_3_5", label: "3–5 yrs" }, { id: "KIDS_6_8", label: "6–8 yrs" },
  { id: "KIDS_9_12", label: "9–12 yrs" }, { id: "KIDS_13_16", label: "13–16 yrs" },
] as const;

export const CLOTHING_FITS = [
  { id: "MEN", label: "Men" }, { id: "WOMEN", label: "Women" }, { id: "UNISEX", label: "Unisex" },
  { id: "BOYS", label: "Boys" }, { id: "GIRLS", label: "Girls" },
] as const;

export function showsWorkingOrder(category: string): boolean {
  return (WORKING_ORDER_CATEGORIES as readonly string[]).includes(category);
}

export function showsRequireClean(category: string): boolean {
  return (REQUIRE_CLEAN_CATEGORIES as readonly string[]).includes(category);
}

const sizeLabel = (id: string) => CLOTHING_SIZES.find(s => s.id === id)?.label ?? id;
const fitLabel = (id: string) => CLOTHING_FITS.find(f => f.id === id)?.label ?? id;

/** Readable rows for the drive's category fields (Review, drive page, admin). Empty when there are none. */
export function categoryDetailRows(category: string | null | undefined, d: DriveCategoryDetails | null | undefined): { label: string; value: string }[] {
  if (!d) return [];
  if (category === "Clothing") {
    const rows: { label: string; value: string }[] = [];
    if (d.sizes?.length) rows.push({ label: "Sizes", value: d.sizes.map(sizeLabel).join(", ") });
    const fits = d.fits?.length ? d.fits : d.fit ? [d.fit] : [];
    if (fits.length) rows.push({ label: "For", value: fits.map(fitLabel).join(", ") });
    return rows;
  }
  if (category === "Furniture") {
    const rows: { label: string; value: string }[] = [];
    if (d.lengthCm && d.breadthCm && d.heightCm) rows.push({ label: "Dimensions", value: `${d.lengthCm} × ${d.breadthCm} × ${d.heightCm} cm (L × B × H)` });
    if (d.weightKg) rows.push({ label: "Approx. weight", value: `${d.weightKg} kg` });
    if (d.material) rows.push({ label: "Material", value: d.material });
    rows.push({ label: "Needs assembly", value: d.needsAssembly ? "Yes" : "No" });
    return rows;
  }
  return [];
}
