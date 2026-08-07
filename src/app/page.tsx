import {
  getCampaigns,
  getItemRequests,
  getPlatformStats,
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

export default async function HomePage() {
  // Fetch initial data concurrently on the server.
  // Listings are private donor inventory (admin-only) — never fetched here.
  const [campaigns, stats, activity, itemRequests] = await Promise.all([
    getCampaigns().catch(() => []),
    getPlatformStats().catch(() => null),
    getRecentActivity().catch(() => []),
    getItemRequests().catch(() => [])
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
      <HomeClient
        initialCampaigns={campaigns}
        initialStats={stats}
        initialActivity={activity}
        initialItemRequests={itemRequests}
      />
    </>
  );
}
