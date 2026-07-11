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
import { ScrollRestoration } from "@/components/ScrollRestoration";
import { Toaster } from "sonner";
import { LocationGate } from "@/components/LocationGate";
import { CookieConsent } from "@/components/CookieConsent";
import { WelcomeOverlay } from "@/components/WelcomeOverlay";
import { DonorListingPrompt } from "@/components/DonorListingPrompt";
import { DoneeRequestPrompt } from "@/components/DoneeRequestPrompt";
import { DoneeListingPrompt } from "@/components/DoneeListingPrompt";
import { DonorCategoryModal } from "@/components/DonorCategoryModal";
import { SuperAdminRedirect } from "@/components/SuperAdminRedirect";
import { AdminRedirect } from "@/components/AdminRedirect";
import { GoogleTagManager } from "@next/third-parties/google";
import MetaPixel from "@/components/MetaPixel";

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
  title: "CauseKind — Give With Purpose",
  description: "Discover and support verified charity campaigns.",
  icons: { icon: "/logo-filled.png" },
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
                <SuperAdminRedirect />
                <AdminRedirect />
                <ScrollProgress />
                <ScrollRestoration />
                <SiteHeader />
                <main className="min-h-[calc(100svh-3.5rem)] pb-[72px] lg:pb-0">{children}</main>
                <SiteFooter />
                <MobileBottomNav />
                <FloatingSupportButton />
                <Toaster
                  richColors
                  position="bottom-left"
                  offset={24}
                  visibleToasts={3}
                  duration={4500}
                  style={{ zIndex: 2147483647 }}
                />
                <LocationGate />
                <CookieConsent />
                <WelcomeOverlay />
                <DonorCategoryModal />
                <DoneeListingPrompt />
                <DonorListingPrompt />
                <DoneeRequestPrompt />
              </NotificationsProvider>
            </AuthProvider>
          </GoogleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
