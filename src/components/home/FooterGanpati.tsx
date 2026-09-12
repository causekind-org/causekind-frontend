"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";
import { CareNestLogo } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/lib/features";
import { ModakIcon } from "@/components/home/GanpatiVisuals";

/**
 * FooterGanpati — Festive Ganpati skin for the site footer.
 * Keeps exact same links, contact info, and legal structure,
 * retinted to a warm festive palette (maroon, saffron, and auspicious gold).
 */
export function FooterGanpati() {
  const t = useTranslations("footer");
  const pathname = usePathname();
  const { user } = useAuth();
  const isWizard =
    pathname === "/items/new" ||
    (pathname?.startsWith("/items/") && pathname?.endsWith("/edit")) ||
    (pathname?.startsWith("/requests/") && pathname?.endsWith("/offer")) ||
    pathname === "/donations/offer";

  if (
    pathname?.startsWith("/super-admin") ||
    pathname?.startsWith("/admin/dashboard") ||
    isWizard ||
    user?.role === "SUPER_ADMIN"
  ) return null;

  const giveBackLinks = [
    ...(FEATURES.money ? [{ href: "/campaigns", l: t("moneyDrives") }] : []),
    ...(user ? [{ href: "/requests", l: t("inkindRequests") }] : []),
  ];

  return (
    <>
      <style>{`body:has(.ck-ganpati-active) > #footer, body:has(.ck-ganpati-active) footer#footer:not(#ganpati-footer) { display: none !important; }`}</style>
      <footer className="bg-gradient-to-b from-[#1c0a04] to-[#100401] text-stone-300 border-t border-amber-900/40" id="ganpati-footer">
        <div className={`mx-auto grid max-w-7xl items-start gap-x-4 gap-y-5 sm:gap-y-6 px-4 py-8 sm:px-6 sm:py-10 text-sm grid-cols-2 ${giveBackLinks.length > 0 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        
        {/* Brand column */}
        <div className="col-span-2 space-y-2 sm:space-y-2.5 md:col-span-1">
          <div className="inline-block bg-white dark:bg-stone-900 px-3 py-1.5 rounded-xl shadow-sm border border-amber-400/30">
            <CareNestLogo size="md" />
          </div>
          <p className="text-amber-100/70 leading-relaxed font-medium">{t("tagline")}</p>
          <div className="text-amber-100/70 font-medium text-xs">
            <span className="text-amber-300 font-semibold">{t("contact")}:</span> +91 7719938619
          </div>
          <div className="flex gap-1.5 sm:gap-2 pt-0.5 sm:pt-1 flex-wrap">
            <span className="flex items-center gap-1 sm:gap-1.5 text-3xs sm:text-2xs bg-amber-950/60 border border-amber-700/40 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-amber-200">
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" /> {t("adminVerified")}
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5 text-3xs sm:text-2xs bg-amber-950/60 border border-amber-700/40 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-amber-200">
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#fbbf24]" /> {t("razorpaySecured")}
            </span>
          </div>
        </div>

        {/* Give Back links */}
        {giveBackLinks.length > 0 && (
          <div className="space-y-2 sm:space-y-2.5">
            <p className="font-bold text-amber-400 tracking-wider uppercase text-xs">{t("giveBack")}</p>
            <ul className="space-y-1 sm:space-y-1.5 text-amber-100/70 font-medium">
              {giveBackLinks.map(({ href, l }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-amber-300 hover:underline underline-offset-4 transition duration-200">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Get support column */}
        <div className="row-span-2 md:row-span-1 space-y-2 sm:space-y-2.5">
          <p className="font-bold text-amber-400 tracking-wider uppercase text-xs">{t("getSupport")}</p>
          <ul className="space-y-1 sm:space-y-1.5 text-amber-100/70 font-medium">
            {[
              { href: "/register", l: t("createAccount") },
              { href: user ? "/dashboard" : "/login", l: t("myDashboard") },
              ...(FEATURES.money ? [{ href: "/campaigns/new", l: t("startCampaign") }] : []),
              { href: "/faq", l: t("helpFaq") },
              { href: "/blog", l: t("blog") },
            ].map(({ href, l }) => (
              <li key={href}>
                <Link href={href} className="hover:text-amber-300 hover:underline underline-offset-4 transition duration-200">
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Trust column */}
        <div className="space-y-2 sm:space-y-2.5">
          <p className="font-bold text-amber-400 tracking-wider uppercase text-xs">{t("trust")}</p>
          <ul className="space-y-1 sm:space-y-1.5 text-amber-100/70 font-medium">
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" /> {t("adminVerifiedFull")}
            </li>
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" /> {t("zeroFees")}
            </li>
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" /> {t("certificates")}
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright row with modak & diya accents */}
      <div className="border-t border-amber-950/80 py-3 sm:py-3.5 text-center text-2xs sm:text-xs text-amber-200/60 font-medium px-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3 gap-y-1 sm:gap-y-1.5">
          <span className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5">
            <ModakIcon className="size-3 text-amber-400" />
            <span>© {new Date().getFullYear()} <span className="font-black text-amber-400">Cause</span><span className="font-black text-amber-200">Kind</span>. {t("rights")}</span>
            <ModakIcon className="size-3 text-amber-400" />
          </span>
          <Link href="/privacy" className="font-semibold text-amber-200/70 transition-colors hover:text-amber-200 hover:underline underline-offset-4">
            Privacy Policy
          </Link>
          <span className="hidden h-3 w-px bg-amber-800/60 sm:inline-block" />
          <Link href="/terms" className="font-semibold text-amber-200/70 transition-colors hover:text-amber-200 hover:underline underline-offset-4">
            Terms &amp; Conditions
          </Link>
          <span className="hidden h-3 w-px bg-amber-800/60 sm:inline-block" />
          <Link href="/refund" className="font-semibold text-amber-200/70 transition-colors hover:text-amber-200 hover:underline underline-offset-4">
            Refund &amp; Cancellation Policy
          </Link>
          <span className="hidden h-3 w-px bg-amber-800/60 sm:inline-block" />
          <Link href="/contact" className="font-semibold text-amber-200/70 transition-colors hover:text-amber-200 hover:underline underline-offset-4">
            Contact Us
          </Link>
        </div>
      </div>
    </footer>
    </>
  );
}
