import { loadGoogleReviews } from '@/lib/googleReviewsServer';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };

export async function GET() {
  const result = await loadGoogleReviews();
  if ('status' in result) {
    return Response.json({ error: 'Reviews are unavailable.' }, { status: result.status, headers });
  }
  return Response.json(result.data, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
