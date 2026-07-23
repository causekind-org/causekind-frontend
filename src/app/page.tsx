import {
  getCampaigns,
  getItemRequests,
  getPlatformStats,
  getRecentActivity
} from "@/lib/api";
import HomeClient from "./HomeClient";

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
        "@id": "https://causekind.com/#organization",
        "name": "CauseKind",
        "url": "https://causekind.com",
        "logo": "https://causekind.com/logo-filled.webp",
        "image": "https://causekind.com/logo-filled.webp",
        "description": "A transparent and verified in-kind giving platform connecting donors directly with community needs."
      },
      {
        "@type": "WebSite",
        "@id": "https://causekind.com/#website",
        "url": "https://causekind.com",
        "name": "CauseKind",
        "publisher": {
          "@id": "https://causekind.com/#organization"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://causekind.com/blog?q={search_term_string}",
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
