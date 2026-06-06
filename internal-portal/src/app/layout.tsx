import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { CookieConsentBanner } from "@/components/CookieConsent";

const inter = Inter({subsets:['latin'],variable:'--font-sans',display:'swap'});

export const metadata: Metadata = {
  title: "Scratch Solid Solutions - Internal Portal",
  description: "Internal portal for Scratch Solid Solutions staff and management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", inter.variable)}>
      <body className="min-h-full flex flex-col">
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
