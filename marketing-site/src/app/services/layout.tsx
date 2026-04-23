import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services | Scratch Solid Solutions",
  description: "Explore our detailed list of cleaning services and request a quote.",
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
