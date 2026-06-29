import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Scratch Solid Solutions",
  description: "Sign in to your Scratch Solid Solutions account.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
