import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CookieConsent from "@/components/CookieConsent";
import { getDb } from "@/lib/db";

// Read the active background image directly from the database. A server-side
// relative fetch (e.g. fetch('/api/content?...')) does not work under the
// self-hosted Node runtime, so we query the content table directly.
let cachedBackgroundUrl: string | null | undefined = undefined;
let cacheTimestamp = 0;
const BACKGROUND_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getBackgroundUrl(): Promise<string | null> {
  // In-memory cache with TTL to avoid querying the DB on every request
  if (cachedBackgroundUrl !== undefined && Date.now() - cacheTimestamp < BACKGROUND_CACHE_TTL_MS) {
    return cachedBackgroundUrl;
  }

  try {
    const db = await getDb();
    if (!db) return null;
    const row = await db
      .prepare('SELECT text as content FROM content WHERE slug = ?')
      .bind('site-background')
      .first();
    const url = (row as { content?: string } | null)?.content || null;
    cachedBackgroundUrl = url;
    cacheTimestamp = Date.now();
    return url;
  } catch (err) {
    // Log for diagnostics but never let a decorative background query crash the layout
    console.error('[layout] Background URL query failed:', err);
    return null;
  }
}

function cdn(url: string | null, width = 1920, quality = 82) {
  if (!url) return null;
  try {
    const u = new URL(url);
    u.searchParams.set('width', String(width));
    u.searchParams.set('quality', String(quality));
    u.searchParams.set('format', 'auto');
    return u.toString();
  } catch {
    return url;
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
  title: "Spotless | Scratch Solid Solutions - Professional Cleaning Services",
  description: "Professional, reliable, and affordable cleaning services for homes and businesses. Scratch-Free, Solidly Clean.",
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const backgroundUrl = await getBackgroundUrl();
  const optimizedBackground = cdn(backgroundUrl);
  const backgroundStyle = backgroundUrl
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(10,17,40,0.65), rgba(12,36,80,0.55)), url(${optimizedBackground || backgroundUrl})`,
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
        <footer className="w-full py-4 text-center text-white/70 text-sm bg-black/20 backdrop-blur-sm">
          © {new Date().getFullYear()} Scratch Solid Solutions. All rights reserved.
        </footer>
        <CookieConsent />
      </body>
    </html>
  );
}
