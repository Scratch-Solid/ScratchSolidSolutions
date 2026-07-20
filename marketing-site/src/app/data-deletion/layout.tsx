import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete My Data | Scratch Solid Solutions",
  description: "Request removal of your personal information from Scratch Solid Solutions.",
};

export default function DataDeletionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
