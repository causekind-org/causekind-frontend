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

/**
 * SAMPLE DATA — staging/dev preview only (see src/lib/placeholderPreview.ts).
 * Never shown on production; replace by configuring GOOGLE_PLACES_API_KEY and
 * GOOGLE_REVIEWS_PLACE_ID so the live /api/google-reviews route takes over.
 */
export const SAMPLE_REVIEWS: GoogleReviewsData = {
  overallRating: 4.9,
  totalReviews: 48,
  mapsUrl: 'https://www.google.com/maps/search/CauseKind',
  attributions: [],
  reviews: [
    { id: 'sample-1', name: 'Priya S.', rating: 5, date: '2 weeks ago', text: 'Donated my old study table and some books. The pickup was arranged within a day and I got photos of the student who received them. Really touching experience.' },
    { id: 'sample-2', name: 'Arjun M.', rating: 5, date: '1 month ago', text: 'Simple and honest. No money involved, just things going to people who actually need them nearby.' },
    { id: 'sample-3', name: 'Fatima K.', rating: 5, date: '1 month ago', text: 'As an NGO coordinator, CauseKind has made it so much easier to find exactly what our shelter needs from people in the neighbourhood. The verification process gives donors real confidence.' },
    { id: 'sample-4', name: 'Rohit V.', rating: 4, date: '2 months ago', text: 'Great idea and smooth app. Would love to see more categories, but the handover process worked perfectly.' },
    { id: 'sample-5', name: 'Sneha D.', rating: 5, date: '3 months ago', text: 'Gave away winter clothes my kids outgrew. Knowing they reached a family a few streets away felt so much better than a drop box.' },
  ],
};

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
