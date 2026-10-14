"use client";

import React from "react";
import Link from "@/components/AppLink";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/lib/features";
import { CareNestLogo } from "@/components/Navbar";
import { MapPin, Phone, Mail } from "lucide-react";
import { SOCIAL_LINKS, type SocialLink } from "@/config/social";
import { LandingText } from "@/components/LandingTranslation";
import { DonateNowButton } from "@/components/donate/DonateNowButton";

export interface FooterProps {
  /**
   * Optional user role override ("DONOR" | "DONEE" | "NGO" etc.).
   * If omitted, reads from `useAuth().user?.role`.
   */
  role?: string | null;
}

export interface SupportLinkItem {
  href: string;
  label: string;
  disabled?: boolean;
}

export const FOOTER_LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/refund", label: "Refund & Cancellation Policy" },
  { href: "/razorpay", label: "Razorpay Policies" },
  { href: "/terms#payments", label: "Donation Policy" },
  { href: "/terms#campaigns", label: "Campaign Policy (Coming Soon)" },
  { href: "/contact", label: "Contact Us" },
] as const;

/**
 * Returns the "Get Support" links based on user role.
 * - Guest (not logged in): Create an account, My dashboard (/login), Register your NGO, Safety guidelines, Help & FAQ, Read our Blog
 * - Logged-in Donor / Donee: In-kind requests (at top!), My dashboard (/dashboard), Safety guidelines, Help & FAQ, Read our Blog
 */
export function getSupportLinks(role?: string | null): SupportLinkItem[] {
  const isDonorOrDonee = role === "DONOR" || role === "DONEE" || role === "RECIPIENT";
  const isNgo = role === "NGO" || role === "NGO_PARTNER";

  if (isDonorOrDonee) {
    return [
      { href: "/requests", label: "In-kind requests" },
      { href: "/dashboard", label: "My dashboard" },
      { href: "/give-safely", label: "Safety guidelines" },
      { href: "/faq", label: "Help & FAQ" },
      { href: "/blog", label: "Read our Blog" },
    ];
  }

  if (isNgo) {
    return [
      { href: "/", label: "My dashboard" },
      { href: "/give-safely", label: "Safety guidelines" },
      { href: "/faq", label: "Help & FAQ" },
      { href: "/blog", label: "Read our Blog" },
    ];
  }

  // Guest (not logged in)
  const isNgoLive = Boolean(FEATURES?.ngoRegistration);

  return [
    { href: "/register", label: "Create an account" },
    { href: "/login", label: "My dashboard" },
    {
      href: isNgoLive ? "/register?role=NGO" : "",
      label: isNgoLive ? "Register your NGO" : "Register your NGO · Coming soon",
      disabled: !isNgoLive,
    },
    { href: "/give-safely", label: "Safety guidelines" },
    { href: "/faq", label: "Help & FAQ" },
    { href: "/blog", label: "Read our Blog" },
  ];
}

/** Pixel-perfect SVG icons for the 6 official social platforms. */
function SocialIcon({ id }: { id: SocialLink["id"] }) {
  switch (id) {
    case "instagram":
      return (
        <svg className="w-4.5 h-4.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      );
    case "youtube":
      return (
        <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm-3.53 4.44c-.2-.01-.43 0-.62.03-.25.04-.54.15-.75.4-.3.35-.97 1.01-.97 2.42s1.02 2.76 1.16 2.95c.14.2 1.95 3.12 4.84 4.25 2.4.94 2.89.75 3.41.7 1.04-.1 1.74-.75 1.98-1.48.24-.73.24-1.36.17-1.49-.07-.13-.26-.2-.55-.35-.29-.15-1.73-.85-2-.95-.27-.1-.47-.15-.67.15-.2.3-.77.95-.94 1.15-.17.2-.34.22-.63.07-.29-.15-1.22-.45-2.33-1.44-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.51.15-.17.2-.29.3-.48.1-.2.05-.37-.02-.52-.08-.15-.65-1.61-.92-2.22-.26-.61-.53-.52-.73-.53z" />
        </svg>
      );
    case "facebook":
      return (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "x":
      return (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
  }
}

/**
 * Shared Site Footer for CauseKind.
 * Renders identical Warm Sand layout and bottom bar for all roles,
 * varying only the "Get Support" links based on user role.
 */
export function Footer({ role }: FooterProps) {
  const pathname = usePathname();
  const { user, isRestoring } = useAuth();

  // If role is explicitly provided, use it; otherwise read from auth state
  const effectiveRole = role !== undefined ? role : (isRestoring ? undefined : (user?.role ?? null));

  const isWizard =
    pathname === "/items/new" ||
    (pathname?.startsWith("/items/") && pathname?.endsWith("/edit")) ||
    (pathname?.startsWith("/requests/") && pathname?.endsWith("/offer")) ||
    pathname === "/donations/offer";

  if (
    pathname?.startsWith("/super-admin") ||
    pathname?.startsWith("/admin/dashboard") ||
    isWizard ||
    effectiveRole === "SUPER_ADMIN"
  ) {
    return null;
  }

  const supportLinks = getSupportLinks(effectiveRole);
  const normalizedRole = effectiveRole?.replace(/^ROLE_/, "");
  const showDonate = !normalizedRole || normalizedRole === "DONOR";

  return (
    <footer
      className="bg-[#F1E6D3] text-[#6B5242] border-t border-[#E2D2B8] pb-20 md:pb-0"
      id="footer"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/*
          Responsive layout:
          - Mobile: 2 columns grid
            1. Brand: col-span-2 (full width)
            2. Get Support: col-span-1 (left)
            3. Our Trust Promise: col-span-1 (right, side-by-side with Get Support)
            4. Contact: col-span-2 (full width below)
          - Desktop (md:): 4 columns side by side
        */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 lg:gap-x-10 items-start text-sm">
          {/* Column 1: Brand */}
          <div className="col-span-2 md:col-span-1 flex flex-col items-center text-center md:items-start md:text-left space-y-3.5">
            <Link href="/" className="inline-block" aria-label="CauseKind Home">
              <div className="inline-flex items-center bg-white px-3 py-1.5 rounded-xl border border-[#E2D2B8] shadow-xs [&_*]:dark:text-[#3B2416]! [&_.ck-logo-kind-shimmer]:text-[#B4541A]!">
                <CareNestLogo size="md" />
              </div>
            </Link>
            <p className="text-[#6B5242] text-sm leading-relaxed font-medium max-w-xs mx-auto md:mx-0 md:max-w-none">
              <LandingText>India&apos;s verified giving platform connecting donors directly with verified recipients.</LandingText>
            </p>

            {/* Donate button for Guest and Donor (hidden for Donee) */}
            {showDonate && (
              <div className="pt-0.5">
                <DonateNowButton
                  size="sm"
                  label="Donate"
                  showArrow={false}
                  className="!bg-[#B4541A] hover:!bg-[#9A4616] !text-white dark:!text-white dark:!bg-[#B4541A] dark:hover:!bg-[#9A4616] rounded-full font-semibold !px-6 !py-2.5 !h-auto text-sm transition-all duration-200 focus:outline-none focus-visible:!ring-2 focus-visible:!ring-[#B4541A] focus-visible:!ring-offset-2 focus-visible:!ring-offset-[#F1E6D3] shadow-xs w-fit inline-flex items-center gap-2 [&_.ck-donate-sheen]:hidden [&_.ck-donate-ring]:hidden [animation:none]!"
                />
              </div>
            )}

            {/* Social Icons: Single line flex on mobile (6 in a row), 3x2 grid on desktop */}
            <div
              className="flex flex-nowrap justify-center gap-2 md:grid md:grid-cols-3 md:gap-3 md:w-fit pt-1"
              aria-label="Social media links"
            >
              {SOCIAL_LINKS.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.ariaLabel}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white text-[#B4541A] border border-[#E2D2B8] hover:bg-[#B4541A] hover:text-white hover:border-[#B4541A] transition-all duration-200 inline-flex items-center justify-center shrink-0 shadow-xs"
                >
                  <SocialIcon id={item.id} />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Get Support */}
          <div className="col-span-1 md:col-span-1 space-y-3">
            <p className="font-bold text-[#3B2416] tracking-wider uppercase text-xs">
              <LandingText>Get Support</LandingText>
            </p>
            <ul className="space-y-2 text-[#6B5242] text-sm font-medium">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  {link.href && !link.disabled ? (
                    <Link
                      href={link.href}
                      className="hover:text-[#B4541A] hover:underline underline-offset-4 transition-colors duration-200"
                    >
                      <LandingText>{link.label}</LandingText>
                    </Link>
                  ) : (
                    <span
                      className="text-[#A8957F] cursor-not-allowed select-none inline-block"
                      aria-disabled="true"
                      tabIndex={-1}
                    >
                      <LandingText>{link.label}</LandingText>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Our Trust Promise */}
          <div className="col-span-1 md:col-span-1 space-y-3">
            <p className="font-bold text-[#3B2416] tracking-wider uppercase text-xs">
              <LandingText>Our Trust Promise</LandingText>
            </p>
            <ul className="space-y-2.5 text-[#6B5242] text-sm font-medium">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#B4541A]" aria-hidden="true" />
                <span><LandingText>Admin-verified listings</LandingText></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#B4541A]" aria-hidden="true" />
                <span><LandingText>OTP-confirmed handovers</LandingText></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#B4541A]" aria-hidden="true" />
                <span><LandingText>Verified delivery certificates</LandingText></span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div className="col-span-2 md:col-span-1 space-y-4 md:space-y-3">
            <p className="font-bold text-[#3B2416] tracking-wider uppercase text-xs text-center md:text-left">
              <LandingText>Contact</LandingText>
            </p>
            <div className="space-y-5 md:space-y-3 text-sm text-[#6B5242]">
              {/* Item 1: Address */}
              <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left gap-2 md:gap-2.5">
                <div
                  className="w-10 h-10 rounded-full bg-white border border-[#E2D2B8] text-[#B4541A] flex items-center justify-center shrink-0 shadow-xs md:w-auto md:h-auto md:rounded-none md:bg-transparent md:border-0 md:shadow-none md:mt-0.5"
                  aria-hidden="true"
                >
                  <MapPin className="w-4.5 h-4.5 md:w-4 md:h-4 text-[#B4541A] shrink-0" aria-hidden="true" />
                </div>
                <span className="leading-relaxed max-w-xs mx-auto md:max-w-none md:mx-0">
                  <LandingText>
                    3rd Floor, Apoorva Bldg, Flat no. 19, Vartak School Road, Veer Savarkar Nagar, Anand Nagar, Vasai West, Vasai-Virar, Maharashtra 401202
                  </LandingText>
                </span>
              </div>

              {/* Item 2: Phone */}
              <div className="flex flex-col items-center text-center md:flex-row md:items-center md:text-left gap-1 md:gap-2.5">
                <div
                  className="w-10 h-10 rounded-full bg-white border border-[#E2D2B8] text-[#B4541A] flex items-center justify-center shrink-0 shadow-xs md:w-auto md:h-auto md:rounded-none md:bg-transparent md:border-0 md:shadow-none"
                  aria-hidden="true"
                >
                  <Phone className="w-4.5 h-4.5 md:w-4 md:h-4 text-[#B4541A] shrink-0" aria-hidden="true" />
                </div>
                <a
                  href="tel:+917719938619"
                  className="min-h-[44px] md:min-h-0 inline-flex items-center justify-center hover:text-[#B4541A] transition-colors"
                >
                  +91 7719938619
                </a>
              </div>

              {/* Item 3: Email */}
              <div className="flex flex-col items-center text-center md:flex-row md:items-center md:text-left gap-1 md:gap-2.5">
                <div
                  className="w-10 h-10 rounded-full bg-white border border-[#E2D2B8] text-[#B4541A] flex items-center justify-center shrink-0 shadow-xs md:w-auto md:h-auto md:rounded-none md:bg-transparent md:border-0 md:shadow-none"
                  aria-hidden="true"
                >
                  <Mail className="w-4.5 h-4.5 md:w-4 md:h-4 text-[#B4541A] shrink-0" aria-hidden="true" />
                </div>
                <a
                  href="mailto:support@causekind.com"
                  className="min-h-[44px] md:min-h-0 inline-flex items-center justify-center hover:text-[#B4541A] transition-colors"
                >
                  <LandingText>support@causekind.com</LandingText>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divider above bottom bar */}
      <div className="border-t border-[#E2D2B8] py-4 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#6B5242] font-medium">
          {/* Left: Copyright */}
          <div className="text-center md:text-left">
            © 2026 <span className="font-bold text-[#3B2416]">Cause</span><span className="font-bold text-[#B4541A]">Kind</span>. <LandingText>Made with care in India.</LandingText>
          </div>

          {/* Right: Legal Links */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-2.5 sm:gap-x-3 gap-y-1 sm:gap-y-1.5 text-center">
            {FOOTER_LEGAL_LINKS.map((item, idx) => (
              <React.Fragment key={item.href}>
                {idx > 0 && (
                  <span className="hidden sm:inline-block h-3 w-px bg-[#E2D2B8]" aria-hidden="true" />
                )}
                <Link
                  href={item.href}
                  className="font-medium text-[#6B5242] hover:text-[#B4541A] hover:underline underline-offset-4 transition-colors"
                >
                  <LandingText>{item.label}</LandingText>
                </Link>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * Backwards-compatible export mapping to Footer.
 */
export const SiteFooter = Footer;
export default Footer;
