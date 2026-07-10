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

  return (
    <HomeClient
      initialCampaigns={campaigns}
      initialStats={stats}
      initialActivity={activity}
      initialItemRequests={itemRequests}
    />
  );
}
