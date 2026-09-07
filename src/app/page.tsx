import {
  getCampaigns,
  getItemRequests,
  getPlatformStats,
  getPublicItemRequests,
  getRecentActivity
} from "@/lib/api";
import type { Metadata } from "next";
import HomeClient from "./HomeClient";

// Self-referencing canonical on the apex route. Resolves against metadataBase
// in src/app/layout.tsx, so it emits https://www.causekind.com — the host the
// non-www domain redirects to — and stops the two hostnames competing as
// separate URLs for the same page.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export const revalidate = 60; // ISR cache for 60 seconds

/**
 * Swallow a failed home-page fetch, but say so in development.
 *
 * <p>Every fetch below is optional — one dead endpoint must not blank the whole
 * page — but a bare `.catch(() => [])` makes "the backend is down", "you got a
 * 401", "it 500'd" and "there genuinely is no data" produce the identical empty
 * array. That cost real debugging time: the Live Needs section was empty and
 * looked broken, when in fact the API was answering 200 with [] because nothing
 * had PUBLIC_REQUEST status.
 *
 * <p>Server-side and development-only; inert in production.
 */
function emptyOnError<T>(label: string, fallback: T) {
  return (error: unknown): T => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[home] ${label} failed; rendering without it:`, error);
    }
    return fallback;
  };
}

export default async function HomePage() {
  // Fetch initial data concurrently on the server.
  // Listings are private donor inventory (admin-only) — never fetched here.
  // `getPublicItemRequests` and not `getItemRequests` for the campaign surfaces:
  // the authenticated board 401s on every server render (there is no session
  // cookie here — see the backend guide's Known Issues), so it returns [] for a
  // logged-out visitor and the campaign would silently render nothing. The
  // public endpoint is permitAll and its projection carries everything these
  // surfaces need: title, category, city, createdAt and the donee's first name.
  const [campaigns, stats, activity, publicRequests] = await Promise.all([
    getCampaigns().catch(emptyOnError("getCampaigns", [])),
    getPlatformStats().catch(emptyOnError("getPlatformStats", null)),
    getRecentActivity().catch(emptyOnError("getRecentActivity", [])),
    getPublicItemRequests().catch(emptyOnError("getPublicItemRequests", []))
  ]);

  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.causekind.com/#organization",
        "name": "CauseKind",
        "url": "https://www.causekind.com",
        "logo": "https://www.causekind.com/logo-filled.webp",
        "image": "https://www.causekind.com/logo-filled.webp",
        "description": "A transparent and verified in-kind giving platform connecting donors directly with community needs."
      },
      {
        "@type": "WebSite",
        "@id": "https://www.causekind.com/#website",
        "url": "https://www.causekind.com",
        "name": "CauseKind",
        "publisher": {
          "@id": "https://www.causekind.com/#organization"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://www.causekind.com/blog?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      {/* initialItemRequests is [] by construction. The server has no session
          cookie, so the authenticated /api/v1/item-requests always 401'd here
          and returned []; the call was removed rather than kept as a
          guaranteed-wasted round trip on every ISR regeneration. HomeClient
          refetches it on the client once auth resolves, which is the only
          place it can succeed. */}
      <HomeClient
        initialCampaigns={campaigns}
        initialStats={stats}
        initialActivity={activity}
        initialItemRequests={[]}
        initialPublicRequests={publicRequests}
      />
    </>
  );
}
