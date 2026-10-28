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

// Reviews barely change, and every Place Details call that asks for `reviews` is
// billed at the Enterprise + Atmosphere rate. Uncached, each homepage visit was
// one call (about Rs 700 on 2026-10-19). Google is now asked at most once a day.
const REVALIDATE_SECONDS = 86400;

export async function GET() {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_REVIEWS_PLACE_ID?.trim();
  if (!key || !placeId) {
    return Response.json({ error: 'Reviews are unavailable.' }, { status: 503, headers });
  }

  try {
    // Fixed server-configured place; callers cannot supply arbitrary billable lookups.
    // Cached in the Next data cache for a day; only successful responses are kept.
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews,attributions',
      },
      next: { revalidate: REVALIDATE_SECONDS },
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
    return Response.json(data, {
      headers: { 'Cache-Control': `public, s-maxage=3600, stale-while-revalidate=${REVALIDATE_SECONDS}` },
    });
  } catch {
    return Response.json({ error: 'Reviews are unavailable.' }, { status: 502, headers });
  }
}
