import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans, Nunito, Source_Serif_4, Inter, Lora, Roboto_Mono } from "next/font/google";
import Script from "next/script";
import { RouteProgressBar } from "@/components/RouteProgressBar";
import "@/styles.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AuthProvider } from "@/hooks/useAuth";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { NeedProfileGateProvider } from "@/hooks/useNeedProfileGate";
import { GoogleProvider } from "@/components/GoogleProvider";
import { SiteHeader, SiteFooter } from "@/components/Navbar";
import { MobileBottomNav, FloatingSupportButton } from "@/components/MobileUI";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Toaster } from "sonner";
import { SuperAdminRedirect } from "@/components/SuperAdminRedirect";
import { AdminRedirect } from "@/components/AdminRedirect";
import GoogleTagManagerGated from "@/components/GoogleTagManagerGated";
import MetaPixel from "@/components/MetaPixel";
import { SiteBottomBlur } from "@/components/SiteBottomBlur";
import { RoleClickSpark } from "@/components/RoleClickSpark";
import { RoleThemeBridge } from "@/components/RoleThemeBridge";
import { ROLE_THEME_BOOT_SCRIPT } from "@/lib/roleTheme";
// Client boundary holding the deferred, client-only overlays and prompts.
// They live behind their own `"use client"` file because `next/dynamic` with
// `ssr: false` is rejected inside a Server Component, and this layout is one.
import { DeferredOverlays } from "@/components/DeferredOverlays";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

/**
 * Only the two fonts the site actually renders with on every page are
 * preloaded: Source Serif 4 (headings) and Plus Jakarta Sans (body). The other
 * four are used on a handful of surfaces each.
 *
 * <p>`next/font` emits a `<link rel="preload">` for every declared family by
 * default, on every page. Six families' worth of font files were therefore
 * preloaded everywhere and mostly never used, which is exactly what Chrome's
 * "resource was preloaded using link preload but not used within a few seconds"
 * warning is reporting — hundreds of times, once per family per navigation and
 * again after every hot reload.
 *
 * <p>`preload: false` does NOT stop these loading. The font still downloads the
 * moment something uses it; it just stops the browser being told to fetch it
 * eagerly on pages that never will.
 */
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  preload: false,
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  preload: false,
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  preload: false,
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.causekind.com"),
  title: "CauseKind — Give With Purpose",
  description: "Discover and support verified charity campaigns.",
  icons: { icon: "/logo-filled.webp" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sets data-ck-role-theme BEFORE first paint. Without it a recipient
            sees a terracotta flash: useAuth hydrates from localStorage in a
            useEffect, which runs after paint. Reads only the non-secret
            {email, role} metadata the app already caches, and whitelists the
            role to donor|donee — see lib/roleTheme.ts. */}
        <script suppressHydrationWarning>{ROLE_THEME_BOOT_SCRIPT}</script>
        {/* Material Symbols, subset and pinned.

            This was requesting the FULL variable axis range
            (opsz 20-48, wght 100-700, FILL 0-1, GRAD -50..200) — the entire
            icon font — as a render-blocking third-party stylesheet on EVERY
            route, while the font is used on exactly one: /blog/[slug].

            `icon_names` narrows it to the eight glyphs actually referenced
            there (grep `material-symbols-outlined` in BlogPostClient.tsx —
            all eight are string literals, so this list is verifiable, not a
            guess). The axes are pinned to the single instance used rather
            than a range. `display=swap` stops it blocking text paint, and
            the preconnect saves a connection setup on the gstatic origin the
            stylesheet then pulls the font file from.

            If a new Material Symbol is added to the blog, it must be added to
            icon_names or it renders as its literal ligature text. */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=check,expand_more,format_bold,link,mail,pause,play_arrow,replay&display=swap"
        />
      </head>
      <body className={`${plusJakarta.variable} ${nunito.variable} ${sourceSerif4.variable} ${inter.variable} ${lora.variable} ${robotoMono.variable} antialiased`} suppressHydrationWarning>
        <GoogleTagManagerGated />
        <MetaPixel />
        <NextIntlClientProvider messages={messages}>
          <GoogleProvider>
            <AuthProvider>
              <NotificationsProvider>
                <NeedProfileGateProvider>
                {/* Suspense is required, not stylistic: RouteProgressBar calls
                    useSearchParams, and without a boundary Next opts the whole
                    tree out of static rendering and fails the build. It has no
                    fallback because there is nothing to show before a
                    navigation starts. */}
                <Suspense fallback={null}>
                  <RouteProgressBar />
                </Suspense>
                <RoleThemeBridge />
                <SuperAdminRedirect />
                <AdminRedirect />
                {/* Site-wide click spark. The colour follows the signed-in
                    role — canvas painting can't read a CSS custom property per
                    frame, so RoleClickSpark resolves it from the same palette
                    module the tokens come from. */}
                <RoleClickSpark
                  sparkSize={10}
                  sparkRadius={15}
                  sparkCount={8}
                  duration={400}
                >
                  <ScrollProgress />
                  <SiteHeader />
                  <main className="min-h-[calc(100svh-3.5rem)] ck-main-bottom-pad">{children}</main>
                  <SiteFooter />
                  <MobileBottomNav />
                  <FloatingSupportButton />
                  {/* Site-wide bottom fade — hidden on /admin & /super-admin. */}
                  <SiteBottomBlur />
                  {/* top-center: bottom-left sat on the admin sidebar's Sign Out and the
                    mobile bottom nav; top corners hold the navbar's icons. The offset
                    clears the 3.5rem sticky header. */}
                  <Toaster
                    richColors
                    position="top-center"
                    offset={72}
                    mobileOffset={64}
                    visibleToasts={3}
                    duration={4500}
                    style={{ zIndex: 2147483647 }}
                  />
                  <DeferredOverlays />
                </RoleClickSpark>
                </NeedProfileGateProvider>
              </NotificationsProvider>
            </AuthProvider>
          </GoogleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
