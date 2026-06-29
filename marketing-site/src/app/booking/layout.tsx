import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking | Scratch Solid Solutions",
  description: "Book your cleaning service with Scratch Solid Solutions.",
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
