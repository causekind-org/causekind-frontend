import { FaqPageClient } from "./FaqPageClient";

export const metadata = {
  title: "FAQ — CauseKind",
  description: "Answers to common questions about donating, receiving, and how CauseKind's verification and matching works.",
};

export default function FaqPage() {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is it secure to use Causekind?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, completely secure. We process all payments through verified gateways like Razorpay, and every campaign is verified by our admin team."
        }
      },
      {
        "@type": "Question",
        "name": "How do you check campaigns before they go live?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Every campaign and item request is reviewed by our team before it appears on the site. We verify the person's identity and confirm that the need is genuine. Anything that doesn't pass our checks is rejected."
        }
      },
      {
        "@type": "Question",
        "name": "Can I donate physical items like clothes or books?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Browse the In-Kind Requests section to find people nearby who need specific items. Once you pick a request, you can arrange to hand over the items directly or through one of our listed drop points."
        }
      },
      {
        "@type": "Question",
        "name": "How does money get to the campaign?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Donations are collected and held securely. Once a campaign reaches its target or its deadline passes, funds are transferred directly to the recipient. You receive a confirmation email at each stage."
        }
      },
      {
        "@type": "Question",
        "name": "Can I track where my donation goes?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. After donating, you can log in to see the status of your donation and get a verified impact certificate once the funds or items are delivered."
        }
      },
      {
        "@type": "Question",
        "name": "Who can post a campaign or request?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Anyone can register as a Donee and submit a campaign or item request. Every submission goes through our approval process before it becomes visible to donors."
        }
      }
    ]
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
