import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Events | Scratch Solid Solutions",
  description: "Event cleaning services for corporate and private functions.",
};

export default function BusinessEventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
