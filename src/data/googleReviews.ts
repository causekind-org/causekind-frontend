export interface GoogleReview {
  id: string;
  name: string;
  rating: number;
  text: string;
  avatarUrl?: string;
  authorUrl?: string;
  reviewUrl?: string;
  date: string;
}

export interface GoogleReviewsData {
  overallRating: number;
  totalReviews: number;
  mapsUrl: string;
  attributions: { provider: string; providerUri?: string }[];
  reviews: GoogleReview[];
}

export async function getReviews(signal?: AbortSignal): Promise<GoogleReviewsData | null> {
  try {
    const response = await fetch('/api/google-reviews', { cache: 'no-store', signal });
    if (!response.ok) return null;
    return await response.json() as GoogleReviewsData;
  } catch {
    // Never present sample reviews as Google reviews when the service is unavailable.
    return null;
  }
}
