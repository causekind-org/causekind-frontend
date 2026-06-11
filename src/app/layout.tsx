import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Nunito } from "next/font/google";
import "@/styles.css";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/Navbar";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakarta.className} ${nunito.variable} antialiased`}>
        <AuthProvider>
          <ScrollProgress />
          <SiteHeader />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
          <SiteFooter />
          <Toaster richColors position="top-right" toastOptions={{ style: { zIndex: 99999 } }} />
        </AuthProvider>
      </body>
    </html>
  );
}
