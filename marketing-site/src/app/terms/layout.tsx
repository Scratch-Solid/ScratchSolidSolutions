import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Scratch Solid Solutions",
  description: "Read our terms of service for using Scratch Solid Solutions.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
