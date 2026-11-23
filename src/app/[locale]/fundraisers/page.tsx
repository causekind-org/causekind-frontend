import type { Metadata } from "next";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import s from "@/features/fundraising/fundraising.module.css";
import FundraisersClient from "./FundraisersClient";

// Server wrapper so the page has its own title, description and canonical;
// the page itself is unchanged in FundraisersClient.
export const metadata: Metadata = {
  title: "Fundraisers",
  description: "Support fundraisers on CauseKind. Each one is reviewed by the CauseKind team before it goes live.",
  alternates: { canonical: "/fundraisers" },
};

export default function FundraisersPage() {
  return (
    <>
      <FundraisersClient />
      {/* Server-rendered explainer (owner-approved text, 23 Nov 2026): the
          page was thin (169 words). Only while fundraising is switched on, so
          it never describes a feature the page says is unavailable. Same
          theme and width as the cards above. */}
      {FEATURES.fundraising && (
        <section aria-labelledby="fundraisers-how-heading" className={`${s.root} ${s.publicTheme}`}>
          <div className={s.wrap} style={{ paddingTop: 8, paddingBottom: 48 }}>
            <h2 id="fundraisers-how-heading" className={s.serif} style={{ fontSize: 24, lineHeight: 1.2, margin: "0 0 12px" }}>
              How fundraisers on CauseKind work
            </h2>
            <div className={s.muted} style={{ maxWidth: 720, lineHeight: 1.65, display: "grid", gap: 12 }}>
              <p style={{ margin: 0 }}>
                A fundraiser on CauseKind raises money for one specific person&apos;s need, such as medical treatment, education or emergency household support. Before any fundraiser goes public, our team reviews it, including the documents that support the need.
              </p>
              <p style={{ margin: 0 }}>
                The amount shown on each card counts only payments our server has confirmed, so the progress you see is real. No fundraiser can pay to be featured or placed higher; the order is never sold.
              </p>
              <p style={{ margin: 0 }}>
                You can see every fundraiser you have given to under &ldquo;Your fundraiser donations&rdquo;. If something about a fundraiser does not look right, use the report option on its page, and our team will look into it. You can follow the status of anything you report under &ldquo;Your reports&rdquo;.
              </p>
              <p style={{ margin: 0 }}>
                Prefer to give an item instead of money? Many people nearby have asked for specific things, and every request is checked before it goes live. <Link href="/requests">Browse verified requests</Link> and give directly, in person.
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
