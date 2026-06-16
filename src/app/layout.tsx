import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Nunito } from "next/font/google";
import "@/styles.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AuthProvider } from "@/hooks/useAuth";
import { GoogleProvider } from "@/components/GoogleProvider";
import { SiteHeader, SiteFooter } from "@/components/Navbar";
import { MobileBottomNav, FloatingSupportButton } from "@/components/MobileUI";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Toaster } from "sonner";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

export const metadata: Metadata = {
  title: "CauseKind — Give With Purpose",
  description: "Discover and support verified charity campaigns.",
  icons: { icon: "/favicon.svg" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakarta.className} ${nunito.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <GoogleProvider>
            <AuthProvider>
              <ScrollProgress />
              <SiteHeader />
              <main className="min-h-[calc(100svh-3.5rem)] pb-[72px] lg:pb-0">{children}</main>
              <SiteFooter />
              <MobileBottomNav />
              <FloatingSupportButton />
              <Toaster richColors position="bottom-left" offset={90} toastOptions={{ style: { zIndex: 9999 } }} />
            </AuthProvider>
          </GoogleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
