import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="w-full flex justify-center mt-4 mb-2 z-40 gap-2">
          <a href="/gallery" className="text-blue-700 font-semibold px-4 py-2 rounded hover:bg-blue-50 dark:hover:bg-zinc-900 transition-colors">Gallery</a>
          <a href="/services" className="text-blue-700 font-semibold px-4 py-2 rounded hover:bg-blue-50 dark:hover:bg-zinc-900 transition-colors">Services</a>
          <a href="/about" className="text-blue-700 font-semibold px-4 py-2 rounded hover:bg-blue-50 dark:hover:bg-zinc-900 transition-colors">About Us</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
