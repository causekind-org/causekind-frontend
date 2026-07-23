import { ContactPageClient } from "./ContactPageClient";

export const metadata = {
  title: "Contact — CauseKind",
  description: "Reach the CauseKind team directly by email, phone, or WhatsApp — no bots, no middlemen.",
};

export default function ContactPage() {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact — CauseKind",
    "description": "Reach the CauseKind team directly by email, phone, or WhatsApp — no bots, no middlemen.",
    "url": "https://causekind.com/contact",
    "mainEntity": {
      "@type": "Organization",
      "name": "CauseKind",
      "url": "https://causekind.com",
      "logo": "https://causekind.com/logo-filled.webp",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": "support@causekind.com",
        "url": "https://causekind.com/contact"
      }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <ContactPageClient />
    </>
  );
}
