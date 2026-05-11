import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CookieConsent from "@/components/CookieConsent";

async function getBackgroundUrl(): Promise<string | null> {
  try {
    const res = await fetch(`/api/content?type=background-image`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json() as { content?: string };
    return data?.content || null;
  } catch (err) {
    return null;
  }
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scratch Solid Solutions - Professional Cleaning Services",
  description: "Professional, reliable, and affordable cleaning services for homes and businesses. Scratch-Free, Solidly Clean.",
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const backgroundUrl = await getBackgroundUrl();
  const backgroundStyle = backgroundUrl
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(10,17,40,0.65), rgba(12,36,80,0.55)), url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
      }
    : {
        backgroundImage: 'linear-gradient(135deg, #0b1a3a, #0f274f, #123366)',
      };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={backgroundStyle}>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
