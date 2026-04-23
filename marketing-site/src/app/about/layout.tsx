import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Scratch Solid Solutions",
  description:
    "Learn more about Scratch Solid Solutions and our commitment to spotless, reliable cleaning services.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
