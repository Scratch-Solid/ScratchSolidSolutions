import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Booking | Scratch Solid Solutions",
  description: "Book commercial cleaning services for your business.",
};

export default function BusinessBookingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
