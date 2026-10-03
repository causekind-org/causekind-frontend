import { Review, SAMPLE_REVIEWS } from "@/data/sampleReviews";

export interface GetReviewsOptions {
  source?: "sample" | "google";
  maxReviews?: number;
}

/**
 * Filter and prioritize reviews:
 * When source is "google" or external, sort by rating (descending),
 * then prioritize reviews with <= 180 characters to guarantee clean 4-line fit.
 * Only includes longer reviews if fewer than 5 short reviews are available.
 */
export function filterAndPrioritizeReviews(reviews: Review[], maxReviews = 10): Review[] {
  // Sort descending by rating first
  const sorted = [...reviews].sort((a, b) => b.rating - a.rating);

  const shortReviews = sorted.filter((r) => r.text.length <= 180);
  const longReviews = sorted.filter((r) => r.text.length > 180);

  let result: Review[];
  if (shortReviews.length >= 5) {
    result = [...shortReviews, ...longReviews];
  } else {
    result = sorted;
  }

  return result.slice(0, maxReviews);
}

export async function getReviews({
  source = "sample",
  maxReviews = 10,
}: GetReviewsOptions = {}): Promise<Review[]> {
  if (source === "google") {
    try {
      // Future Google integration endpoint / hook
      // If external Google Places API fails or is not enabled, fall back gracefully
      return filterAndPrioritizeReviews(SAMPLE_REVIEWS, maxReviews);
    } catch {
      return filterAndPrioritizeReviews(SAMPLE_REVIEWS, maxReviews);
    }
  }

  return filterAndPrioritizeReviews(SAMPLE_REVIEWS, maxReviews);
}

export default getReviews;
