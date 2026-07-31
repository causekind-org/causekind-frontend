import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Nunito, Source_Serif_4, Inter, Lora, Roboto_Mono } from "next/font/google";
import "@/styles.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AuthProvider } from "@/hooks/useAuth";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { GoogleProvider } from "@/components/GoogleProvider";
import { SiteHeader, SiteFooter } from "@/components/Navbar";
import { MobileBottomNav, FloatingSupportButton } from "@/components/MobileUI";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Toaster } from "sonner";
import { LocationGate } from "@/components/LocationGate";
import { CookieConsent } from "@/components/CookieConsent";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import TourController from "@/components/tour/TourController";
import { DonorListingPrompt } from "@/components/DonorListingPrompt";
import { DoneeRequestPrompt } from "@/components/DoneeRequestPrompt";
import { DoneeListingPrompt } from "@/components/DoneeListingPrompt";
import { DonorCategoryModal } from "@/components/DonorCategoryModal";
import { SuperAdminRedirect } from "@/components/SuperAdminRedirect";
import { AdminRedirect } from "@/components/AdminRedirect";
import { GoogleTagManager } from "@next/third-parties/google";
import MetaPixel from "@/components/MetaPixel";
import { SiteBottomBlur } from "@/components/SiteBottomBlur";
import { RoleClickSpark } from "@/components/RoleClickSpark";
import { RoleThemeBridge } from "@/components/RoleThemeBridge";
import { ROLE_THEME_BOOT_SCRIPT } from "@/lib/roleTheme";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
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

  const gtmId = process.env.NEXT_PUBLIC_GTM_ID || "GTM-P7693M56";

  return (
    <html lang="en" suppressHydrationWarning>
      <GoogleTagManager gtmId={gtmId} />
      <head>
        {/* Sets data-ck-role-theme BEFORE first paint. Without it a recipient
            sees a terracotta flash: useAuth hydrates from localStorage in a
            useEffect, which runs after paint. Reads only the non-secret
            {email, role} metadata the app already caches, and whitelists the
            role to donor|donee — see lib/roleTheme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: ROLE_THEME_BOOT_SCRIPT }} />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className={`${plusJakarta.variable} ${nunito.variable} ${sourceSerif4.variable} ${inter.variable} ${lora.variable} ${robotoMono.variable} antialiased`} suppressHydrationWarning>
        <MetaPixel />
        <NextIntlClientProvider messages={messages}>
          <GoogleProvider>
            <AuthProvider>
              <NotificationsProvider>
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
                  <main className="min-h-[calc(100svh-3.5rem)] pb-[72px] lg:pb-0">{children}</main>
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
                  <LocationGate />
                  <CookieConsent />
                  <WelcomeOverlay />
                  <TourController />
                  <DonorCategoryModal />
                  <DoneeListingPrompt />
                  <DonorListingPrompt />
                  <DoneeRequestPrompt />
                </RoleClickSpark>
              </NotificationsProvider>
            </AuthProvider>
          </GoogleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
