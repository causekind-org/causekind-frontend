import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Serif_4, Inter, Lora, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { AnimatedWrapper } from "./components/AnimatedWrapper";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Kind Earth Journal - Perspectives for a changing planet",
  description: "Real impact, verified by the community. Join our community and take action today.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${sourceSerif4.variable} ${inter.variable} ${lora.variable} ${robotoMono.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-surface-cream text-on-surface antialiased font-body-md selection:bg-rust-action/30 selection:text-on-surface"
        suppressHydrationWarning
      >
        <AnimatedWrapper className="min-h-screen" direction="up" duration={0.6} delay={0}>
          {children}
        </AnimatedWrapper>
      </body>
    </html>
  );
}
