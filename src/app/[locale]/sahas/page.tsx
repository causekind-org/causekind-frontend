import type { Metadata } from "next";
import SahasHubClient from "./SahasHubClient";

// Server wrapper so the page has its own title, description and canonical.
export const metadata: Metadata = {
  title: "Sahas Charitable Trust Campaigns",
  description: "Give to campaigns run by Sahas Charitable Trust, a registered non-profit based in Palghar, Maharashtra.",
  alternates: { canonical: "/sahas" },
};

export default function SahasHubPage() {
  // CollectionPage JSON-LD: the hub lists Sahas campaigns. Same name and
  // description as the metadata above.
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Sahas Charitable Trust Campaigns | CauseKind",
    description: "Give to campaigns run by Sahas Charitable Trust, a registered non-profit based in Palghar, Maharashtra.",
    url: "https://www.causekind.com/sahas",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      {/* Server-rendered intro, passed into the hub so it shows under the
          heading and is in the first HTML (no JS needed to see it). */}
      <SahasHubClient
        intro={
          <section className="space-y-4 rounded-2xl border border-[#D9C9B8] bg-white p-6 text-left text-base leading-[1.6] text-[#4A3B30] shadow-sm break-words sm:p-8 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-300">
            <p className="m-0">
              Sahas Charitable Trust is a registered non-profit based in Palghar, Maharashtra, helping underprivileged children and families with education, healthcare and everyday support. On CauseKind, Sahas posts campaigns for what it needs right now.
            </p>
            <p className="m-0">
              You can support a campaign by giving the items on its list or by donating money, securely through Razorpay by UPI, cards, net banking or wallet. Money donations go to Sahas Charitable Trust, which is 12A and 80G certified. Every donor gets a donation certificate by email; for an 80G receipt, tick the box on the donation form and add your PAN and address.
            </p>
          </section>
        }
      />
    </>
  );
}
