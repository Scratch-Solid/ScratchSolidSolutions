import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Scratch Solid Solutions",
  description: "Our privacy policy outlines how we protect your data.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
