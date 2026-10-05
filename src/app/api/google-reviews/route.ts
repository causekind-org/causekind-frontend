import type { GoogleReviewsData } from '@/data/googleReviews';

export const dynamic = 'force-dynamic';

interface PlaceDetails {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  attributions?: { provider: string; providerUri?: string }[];
  reviews?: {
    name?: string;
    rating?: number;
    text?: { text?: string };
    relativePublishTimeDescription?: string;
    googleMapsUri?: string;
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }[];
}

const headers = { 'Cache-Control': 'no-store' };

export async function GET() {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_REVIEWS_PLACE_ID?.trim();
  if (!key || !placeId) {
    return Response.json({ error: 'Reviews are unavailable.' }, { status: 503, headers });
  }

  try {
    // Fixed server-configured place; callers cannot supply arbitrary billable lookups.
    // No review caching or persistence. Configure Cloud quotas to bound spend.
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews,attributions',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      // Do not log Google response bodies or credentials.
      console.warn('Google reviews request failed:', response.status);
      return Response.json({ error: 'Reviews are unavailable.' }, { status: 502, headers });
    }
    const place = await response.json() as PlaceDetails;
    if (typeof place.rating !== 'number' || typeof place.userRatingCount !== 'number' || !place.googleMapsUri) {
      return Response.json({ error: 'Reviews are unavailable.' }, { status: 502, headers });
    }
    const data: GoogleReviewsData = {
      overallRating: place.rating,
      totalReviews: place.userRatingCount,
      mapsUrl: place.googleMapsUri,
      attributions: place.attributions ?? [],
      // Keep Google's relevance order and ratings, including textless reviews.
      reviews: (place.reviews ?? []).slice(0, 5).map((review, index) => ({
        id: review.name ?? String(index),
        name: review.authorAttribution?.displayName ?? 'Google Maps user',
        rating: review.rating ?? 0,
        text: review.text?.text ?? '',
        avatarUrl: review.authorAttribution?.photoUri,
        authorUrl: review.authorAttribution?.uri,
        reviewUrl: review.googleMapsUri,
        date: review.relativePublishTimeDescription ?? '',
      })),
    };
    return Response.json(data, { headers });
  } catch {
    return Response.json({ error: 'Reviews are unavailable.' }, { status: 502, headers });
  }
}
