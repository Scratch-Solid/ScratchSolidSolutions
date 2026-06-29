import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Scratch Solid Solutions",
  description: "Get in touch with Scratch Solid Solutions for professional cleaning services.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
