// Admin Dashboard Layout — Corporate-grade, world-class UX
// Replaces the old tab-based monolith with discrete, focused pages.

import { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";

// Admin pages show live, per-request, authenticated data (staff lists,
// pending applications, KPIs). Without this, Next.js/OpenNext treats them
// as static/ISR content and Cloudflare caches the HTML shell for up to a
// year (s-maxage), so a fresh deploy's UI/behavior can appear "unchanged"
// until that cached shell expires.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard — Scratch Solid Solutions",
  description: "Operations, workforce, and financial management console",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
