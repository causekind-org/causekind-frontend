/**
 * Landing page constants & configuration.
 * Editable by developers/admins in one place.
 */

/**
 * Role brand colours across the landing page sections.
 * Centralised here so all landing sections read from one single source of truth.
 * - Donor: Terracotta Orange (#B5480F / dark: #F4A25B)
 * - Donee: Authentic CauseKind Blue (#1E3A60 / dark: #7FB0E8)
 * - NGO: Forest Green (#1F6B3F / dark: #52B788)
 */
export const HOME_ROLE_COLORS = {
  donor: {
    id: "donor",
    label: "I want to give",
    roleTitle: "FOR DONORS",
    roleSubtitle: "Give with absolute confidence",
    main: "#B5480F",
    hover: "#C95413",
    secondary: "#E07B3A",
    highlight: "#F0B97A",
    softBg: "#FBEDE3",
    softBgDark: "rgba(181, 72, 15, 0.15)",
    border: "rgba(181, 72, 15, 0.3)",
    borderDark: "rgba(224, 123, 58, 0.4)",
    glow: "rgba(181, 72, 15, 0.15)",
    onAccent: "#FFFFFF",
    darkAccent: "#F4A25B",
    accentBgClass: "bg-[#B5480F]/10 text-[#B5480F] dark:bg-[#B5480F]/20 dark:text-[#F4A25B]",
    borderHoverClass: "hover:border-[#B5480F]/50 hover:shadow-[#B5480F]/10 dark:hover:border-[#F4A25B]/50",
  },
  donee: {
    id: "donee",
    label: "I need help",
    roleTitle: "FOR DONEES",
    roleSubtitle: "Receive with safety and dignity",
    main: "#1E3A60",
    hover: "#2D5A96",
    secondary: "#4A7FC1",
    highlight: "#7FB0E8",
    softBg: "#EBF2FA",
    softBgDark: "rgba(127, 176, 232, 0.15)",
    border: "rgba(30, 58, 96, 0.25)",
    borderDark: "rgba(127, 176, 232, 0.35)",
    glow: "rgba(30, 58, 96, 0.15)",
    onAccent: "#FFFFFF",
    darkAccent: "#7FB0E8",
    accentBgClass: "bg-[#1E3A60]/10 text-[#1E3A60] dark:bg-[#7FB0E8]/20 dark:text-[#7FB0E8]",
    borderHoverClass: "hover:border-[#1E3A60]/50 hover:shadow-[#1E3A60]/10 dark:hover:border-[#7FB0E8]/50",
  },
  ngo: {
    id: "ngo",
    label: "I'm an NGO",
    roleTitle: "FOR NGOS",
    roleSubtitle: "Legitimate community partners",
    main: "#1F6B3F",
    hover: "#14482A",
    secondary: "#2E8B57",
    highlight: "#52B788",
    softBg: "#E5F1E9",
    softBgDark: "rgba(31, 107, 63, 0.15)",
    border: "rgba(31, 107, 63, 0.25)",
    borderDark: "rgba(82, 183, 136, 0.35)",
    glow: "rgba(31, 107, 63, 0.15)",
    onAccent: "#FFFFFF",
    darkAccent: "#52B788",
    accentBgClass: "bg-[#1F6B3F]/10 text-[#1F6B3F] dark:bg-[#1F6B3F]/20 dark:text-[#52B788]",
    borderHoverClass: "hover:border-[#1F6B3F]/50 hover:shadow-[#1F6B3F]/10 dark:hover:border-[#52B788]/50",
  },
} as const;

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

/**
 * Auto-rotation interval for the "How It Works" tabs on the home page.
 * Interval in milliseconds before advancing to the next role tab:
 * "I want to give" (donor) → "I need help" (donee) → "I'm an NGO" (ngo) → back to start.
 */
export const HOW_IT_WORKS_AUTOPLAY_MS = 2000;
