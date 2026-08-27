import {
  getCampaigns,
  getItemRequests,
  getPlatformStats,
  getPublicItemRequests,
  getRecentActivity
} from "@/lib/api";
import HomeClient from "./HomeClient";

export const revalidate = 60; // ISR cache for 60 seconds

export default async function HomePage() {
  // Fetch initial data concurrently on the server.
  // Listings are private donor inventory (admin-only) — never fetched here.
  // `getPublicItemRequests` and not `getItemRequests` for the campaign surfaces:
  // the authenticated board 401s on every server render (there is no session
  // cookie here — see the backend guide's Known Issues), so it returns [] for a
  // logged-out visitor and the campaign would silently render nothing. The
  // public endpoint is permitAll and its projection carries everything these
  // surfaces need: title, category, city, createdAt and the donee's first name.
  const [campaigns, stats, activity, itemRequests, publicRequests] = await Promise.all([
    getCampaigns().catch(() => []),
    getPlatformStats().catch(() => null),
    getRecentActivity().catch(() => []),
    getItemRequests().catch(() => []),
    getPublicItemRequests().catch(() => [])
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
        initialPublicRequests={publicRequests}
      />
    </>
  );
}
