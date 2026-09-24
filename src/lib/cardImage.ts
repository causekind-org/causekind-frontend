import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";

/**
 * The one rule for which image a need card shows.
 *
 * <p>Precedence: a real photo the donee uploaded, then the category image.
 * Nothing else.
 *
 * <p>This exists because the rule used to be written out separately at each call
 * site, and one of those copies was wrong in a way nothing could catch. The card
 * on the landing page carried its own `MOBILE_CATEGORY_IMAGES` map keyed on
 * `"Medical"`, `"Education"`, `"Livelihood"` and `"Community"`, while the
 * canonical category names are `"Medical aid"`, `"Relief"` and so on
 * (`ALL_REQUEST_CATEGORIES`, categoryVisuals.ts). Six of the nine keys never
 * matched anything, so almost every need fell through to a single hero photo of
 * a food handout — including a wheelchair request. A missing key produces no
 * error and no blank image, just the wrong picture, which is why this is one
 * function with one test rather than a convention people are asked to follow.
 *
 * Keep the parameter structural rather than typed to `PublicItemRequest`: the
 * same rule serves `ItemRequest`, the public projection, and the handover view
 * models, and widening it here is cheaper than four near-identical helpers.
 */
export function cardImageFor(request: {
  imageUrl?: string | null;
  category?: string | null;
}): string {
  if (request.imageUrl) return request.imageUrl;

  const visual = request.category ? CATEGORY_VISUALS[request.category] : undefined;
  return visual?.fallbackImage ?? FINAL_FALLBACK;
}

/**
 * Only reachable for a category that is not in `CATEGORY_VISUALS` at all — i.e.
 * one added to the backend without a frontend visual. Deliberately a real image
 * rather than an empty string so a card never renders a broken `<img>`.
 */
export const FINAL_FALLBACK = "/images/hero-1.webp";
