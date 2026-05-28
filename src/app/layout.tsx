import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles.css";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/Navbar";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CauseKind — Give With Purpose",
  description: "Discover and support verified charity campaigns.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <SiteHeader />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
          <SiteFooter />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
