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
      <SahasHubClient />
      {/* Server-rendered so the page has real text in its first HTML; it sits
          below the campaigns, so the top of the page is unchanged. */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 pb-12">
        <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-[#4A3B30] dark:text-stone-300">
          Sahas Charitable Trust is a registered non-profit based in Palghar, Maharashtra, working to uplift underprivileged children and families. Each campaign lists the specific items Sahas needs; give from the list and follow what was received and delivered.
        </p>
        <p className="mt-4 max-w-3xl text-sm sm:text-base leading-relaxed text-[#4A3B30] dark:text-stone-300">
          Sahas was established with the mission of fostering an inclusive and self-reliant society. It helps children and families with education, healthcare and everyday support, through sustainable support systems rather than one-off help. On CauseKind, Sahas posts campaigns for the specific needs it is collecting for right now, so you can see exactly what is being asked for before you give.
        </p>
        <p className="mt-4 max-w-3xl text-sm sm:text-base leading-relaxed text-[#4A3B30] dark:text-stone-300">
          You can support a Sahas campaign in two ways: give the items on its list, or donate money. Money donations are processed securely through Razorpay, and you can pay by UPI, cards, net banking or wallet. Sahas Charitable Trust is 12AA and 80G certified, and donations are eligible for tax exemption in India. Everyone who donates gets a donation certificate by email. If you want an 80G receipt, tick the box on the donation form and add your PAN and address; your documents are emailed to you and can also be downloaded from the campaign page.
        </p>
        <p className="mt-4 max-w-3xl text-sm sm:text-base leading-relaxed text-[#4A3B30] dark:text-stone-300">
          Only confirmed donations appear on a campaign&apos;s supporter list, and you can choose not to show your name publicly, in which case you appear as Anonymous. Any optional support you add for the CauseKind platform is separate from your donation and is not covered by the 80G receipt. When no Sahas campaign is open, you can see what earlier campaigns achieved, or give to Sahas directly.
        </p>
        <p className="mt-4 max-w-3xl text-sm sm:text-base leading-relaxed text-[#4A3B30] dark:text-stone-300">
          Each campaign page shows what has been received and delivered so far, so you can follow the items you gave from the list to the people they were collected for. CauseKind is free for donors, and money donations made on CauseKind go to Sahas Charitable Trust.
        </p>
      </section>
    </>
  );
}
