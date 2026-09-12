import type { Metadata } from "next";
import { getPublicItemRequests } from "@/lib/api";
import RequestsClient from "./RequestsClient";

// Server wrapper so this route can carry its own metadata — a "use client"
// module cannot export it, which previously left this page inheriting the root
// layout's site-wide title and description. The canonical is relative and
// resolves against metadataBase in src/app/layout.tsx, pinning it to the www
// host that the apex domain redirects to.
export const metadata: Metadata = {
  title: "Verified Requests — CauseKind",
  description: "See admin-verified in-kind requests from families and organisations near you, and donate the specific items they have asked for.",
  alternates: { canonical: "/requests" },
};

// Matches the homepage. The public board is @Cacheable on the backend and its
// projection carries no per-visitor data, so a shared 60s cache is safe here.
export const revalidate = 60;

/**
 * Fetch the public board on the server so a logged-out visitor gets needs in the
 * HTML.
 *
 * <p>This route used to render nothing but {@code <RequestsClient />}, which
 * meant the board's data request could not even be sent until React had
 * hydrated the whole 1200-line client module. Measured on a production build at
 * 390px, DOM-ready landed at 2.6s and the fetch left at 5.5s — most of the wait
 * a visitor arriving from the hero's "Explore needs near you" actually
 * experiences, and none of it spent on the data.
 *
 * <p>The fetch is unauthenticated by necessity, not by choice: there is no
 * session cookie on a server render, so the authenticated board would 401 here.
 * That is the same reason the homepage uses this endpoint — see the note in
 * src/app/page.tsx.
 *
 * <p>Failure is not fatal. An empty array puts the client back on exactly the
 * path it had before: mount, fetch, render. A dead backend must not blank a page
 * that also serves signed-in donors and donees.
 */
export default async function Page() {
  const initialRequests = await getPublicItemRequests().catch((error: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[requests] getPublicItemRequests failed; the client will retry:", error);
    }
    return [];
  });

  return <RequestsClient initialPublicRequests={initialRequests} />;
}
