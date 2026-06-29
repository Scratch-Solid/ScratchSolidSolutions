import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery | Scratch Solid Solutions",
  description: "See our before and after cleaning transformations.",
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
