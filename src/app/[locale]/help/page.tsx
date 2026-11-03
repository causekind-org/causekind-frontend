import { permanentRedirect } from "next/navigation";

// The Help Center's content was split into dedicated /faq and /contact pages.
// Keep this route alive so old links/bookmarks still land somewhere real.
//
// permanentRedirect (308), not redirect (307): the move is permanent, and a
// temporary redirect tells Google to keep /help indexed and to withhold the
// link equity it would otherwise pass to /faq. /help is deliberately absent
// from sitemap.ts for the same reason — a sitemap should only list canonical,
// final-destination URLs, never ones that redirect.
export default function HelpPage() {
  permanentRedirect("/faq");
}
