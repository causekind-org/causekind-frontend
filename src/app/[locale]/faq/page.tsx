import { getTranslations, setRequestLocale } from "next-intl/server";
import { FaqPageClient } from "./FaqPageClient";
import { FAQ_ITEMS } from "./faqItems";

export const metadata = {
  title: "FAQ",
  description: "Answers to common questions about donating, receiving, and how CauseKind's verification and matching works.",
  alternates: { canonical: "/faq" },
};

/**
 * FAQPage JSON-LD built from the same 26 questions the page shows (faqItems.ts
 * + the faq messages), so the schema and the visible text cannot drift apart.
 */
export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  // Keeps the page static: next-intl reads the locale from the segment.
  setRequestLocale((await params).locale);
  const t = await getTranslations("faq");
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      "name": t(item.q),
      "acceptedAnswer": { "@type": "Answer", "text": t(item.a) },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <FaqPageClient />
    </>
  );
}
