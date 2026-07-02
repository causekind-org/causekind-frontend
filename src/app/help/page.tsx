import { redirect } from "next/navigation";

// The Help Center's content was split into dedicated /faq and /contact pages.
// Keep this route alive so old links/bookmarks still land somewhere real.
export default function HelpPage() {
  redirect("/faq");
}
