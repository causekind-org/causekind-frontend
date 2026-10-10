import { FaqPageClient } from "./FaqPageClient";

export const metadata = {
  title: "FAQ — CauseKind",
  description: "Answers to common questions about donating, receiving, and how CauseKind's verification and matching works.",
  alternates: { canonical: "/faq" },
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
        "name": "How do you verify people?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Individuals are checked with ID and address. NGOs are checked with their official registration documents. Every request is reviewed by our team before it goes live."
        }
      },
      {
        "@type": "Question",
        "name": "Will my address be shared?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Only your area is shown publicly. Handover details are shared only between the donor and the person receiving, once a match is confirmed."
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
        "name": "Who can post a campaign or request?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Anyone can register as a Donee and submit a campaign or item request. Every submission goes through our approval process before it becomes visible to donors."
        }
      },
      {
        "@type": "Question",
        "name": "What can I donate?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Useful items like books, clothes, furniture, electronics, household and sports items, and more. Used items are welcome. Just describe the condition honestly when you list it, including anything that needs repair."
        }
      },
      {
        "@type": "Question",
        "name": "How does the handover work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You meet in person to hand over the item, and confirm it in the app with a one-time code. We recommend meeting in a public place."
        }
      },
      {
        "@type": "Question",
        "name": "What if the handover doesn't happen?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can cancel, and the need goes back live for other donors."
        }
      },
      {
        "@type": "Question",
        "name": "Which cities are you in?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We're currently live in Mumbai with more cities coming soon."
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
        "name": "Is CauseKind free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. It's completely free for donors, donees and NGOs."
        }
      },
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
