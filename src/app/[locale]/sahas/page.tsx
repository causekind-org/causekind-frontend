import type { Metadata } from "next";
import SahasHubClient from "./SahasHubClient";

// Server wrapper so the page has its own title, description and canonical.
export const metadata: Metadata = {
  title: "Sahas Charitable Trust Campaigns",
  description: "Give to campaigns run by Sahas Charitable Trust, a registered non-profit based in Palghar, Maharashtra.",
  alternates: { canonical: "/sahas" },
};

export default function SahasHubPage() {
  return (
    <>
      <SahasHubClient />
      {/* Server-rendered so the page has real text in its first HTML; it sits
          below the campaigns, so the top of the page is unchanged. */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 pb-12">
        <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-[#4A3B30] dark:text-stone-300">
          Sahas Charitable Trust is a registered non-profit based in Palghar, Maharashtra, working to uplift underprivileged children and families. Each campaign lists the specific items Sahas needs; give from the list and follow what was received and delivered.
        </p>
      </section>
    </>
  );
}
