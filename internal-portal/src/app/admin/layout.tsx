// Admin Dashboard Layout — Corporate-grade, world-class UX
// Replaces the old tab-based monolith with discrete, focused pages.

import { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = {
  title: "Admin Dashboard — Scratch Solid Solutions",
  description: "Operations, workforce, and financial management console",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
