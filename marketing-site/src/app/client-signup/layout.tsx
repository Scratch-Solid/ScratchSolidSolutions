import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | Scratch Solid Solutions",
  description: "Create your Scratch Solid Solutions client account.",
};

export default function ClientSignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
