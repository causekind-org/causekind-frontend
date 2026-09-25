/**
 * Landing page constants & configuration.
 * Editable by developers/admins in one place.
 */

export const OPERATING_CITIES = [
  "Pune",
  "Mumbai",
  "Bengaluru",
  "Delhi NCR",
] as const;

export const CONTACT_INFO = {
  email: "support@causekind.com",
  phone: "+91 7719938619",
  whatsappUrl: "https://wa.me/917719938619",
  socials: {
    instagram: "https://www.instagram.com/causekind",
    linkedin: "https://www.linkedin.com/company/causekind/",
    twitter: "https://x.com/causekind", // placeholder
    youtube: "https://youtube.com/@causekind", // placeholder
  },
} as const;

export const LANDING_ROUTES = {
  donorRegister: "/register?role=DONOR",
  doneeRegister: "/register?role=DONEE",
  ngoRegister: "/register?role=NGO",
  postNeed: "/requests/new",
  browseNeeds: "/requests",
  safetyGuidelines: "/give-safely",
  login: "/login",
  faq: "/faq",
  contact: "/contact",
} as const;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FOUNDER'S NOTE CONFIGURATION
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO REPLACE WITH REAL FOUNDER DETAILS:
 * 1. Set `name` to your full name (e.g. "Jane Doe").
 * 2. Set `title` to your title (e.g. "Founder, CauseKind").
 * 3. Place your portrait photo in `public/images/founder.jpg` (approx 4:5 aspect ratio)
 *    and set `photo: "/images/founder.jpg"`.
 * 4. Place your signature SVG in `public/images/founder-signature.svg` and set
 *    `signature: "/images/founder-signature.svg"`. (Optional; set to null if none).
 * 5. Add a 1–2 sentence personal reason to `personalLine` (e.g. "Growing up, I saw how much was wasted...").
 * 6. When all details are ready, set `isPlaceholder: false` to make it go live in production.
 *
 * SAFETY RULE:
 * When `isPlaceholder` is true, this section is rendered ONLY in development
 * (process.env.NODE_ENV === "development") with a visible "PLACEHOLDER" badge.
 * In production, it is completely hidden until `isPlaceholder` is set to false.
 */
export const FOUNDER = {
  isPlaceholder: true,
  name: "Ramzan Hasnani",
  title: "Founder, CauseKind",
  photo: "/images/ramzan-hasnani.webp",
  photoDimensions: {
    width: 1856,
    height: 1986,
    aspectRatio: "4 / 5",
  },
  signature: null as string | null, // later: "/images/founder-signature.svg"
  signatureDimensions: {
    width: 240,
    height: 80,
  },
  personalLine: "", // later: my personal reason, 1–2 sentences
};

/**
 * Scroll animation for the "Where your support goes" section.
 * true  = full pinned horizontal scroll animation
 * false = static layout with simple fade-ins
 */
export const ENABLE_SUPPORT_JOURNEY_ANIMATION = true;