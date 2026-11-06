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
          "text": "Payments are processed through Razorpay. Fundraisers are reviewed by our admin team before they go live."
        }
      },
      {
        "@type": "Question",
        "name": "How do you check campaigns before they go live?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Fundraisers are reviewed by our admin team before they go live. Item listings and requests go through automatic screening first. Some are approved or rejected there, and unclear cases go to an admin. Anything that fails our checks is rejected."
        }
      },
      {
        "@type": "Question",
        "name": "How do you verify people?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Individuals are checked with ID and address. NGOs are checked with their official registration documents. Requests go through automatic screening, and an admin reviews any that need a closer look."
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
