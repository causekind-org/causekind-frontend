import type { Metadata } from "next";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { SahasIntroCard } from "@/features/sahas/SahasIntroCard";
import FundraisersClient from "./FundraisersClient";

// Server wrapper so the page has its own title, description and canonical;
// the page itself is unchanged in FundraisersClient.
export const metadata: Metadata = {
  title: "Fundraisers",
  description: "Support fundraisers on CauseKind. Each one is reviewed by the CauseKind team before it goes live.",
  alternates: { canonical: "/fundraisers" },
};

export default function FundraisersPage() {
  // Server-rendered explainer (owner-approved text, 23 Nov 2026), shown under
  // the page header in the same card as /sahas. Only while fundraising is on.
  const intro = FEATURES.fundraising ? (
    <SahasIntroCard heading={{ id: "fundraisers-how-heading", text: "How fundraisers on CauseKind work" }}>
      <p>
        A fundraiser on CauseKind raises money for one specific person&apos;s need, such as medical treatment, education or emergency household support. Before any fundraiser goes public, our team reviews it, including the documents that support the need.
      </p>
      <p>
        The amount shown on each card counts only payments our server has confirmed, so the progress you see is real. No fundraiser can pay to be featured or placed higher; the order is never sold.
      </p>
      <p>
        You can see every fundraiser you have given to under &ldquo;Your fundraiser donations&rdquo;. If something about a fundraiser does not look right, use the report option on its page, and our team will look into it. You can follow the status of anything you report under &ldquo;Your reports&rdquo;.
      </p>
      <p>
        Prefer to give an item instead of money? Many people nearby have asked for specific things, and every request is checked before it goes live. <Link href="/requests" className="font-semibold text-[#6f2c0a] underline underline-offset-2 dark:text-[#e07b3a]">Browse verified requests</Link> and give directly, in person.
      </p>
    </SahasIntroCard>
  ) : null;
  return <FundraisersClient intro={intro} />;
}
