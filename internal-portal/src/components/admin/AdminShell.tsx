"use client";

import React, { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Users,
  DollarSign,
  FileText,
  Settings,
  Eye,
  BarChart3,
  Shield,
  Monitor,
  ClipboardList,
  Lock,
  Briefcase,
  Search,
  Bell,
  ChevronRight,
  Sparkles,
  GraduationCap,
} from "lucide-react";

const ERP_ENABLED = (process.env.NEXT_PUBLIC_ERP_URL || "").length > 0;

interface NavGroup {
  label: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/admin/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/employees", label: "Employees", icon: Users },
      { href: "/admin/services", label: "Services & Banking", icon: DollarSign },
      { href: "/admin/content", label: "Content", icon: FileText },
    ],
  },
  {
    label: "Workforce",
    items: [
      { href: "/admin/cleaners", label: "Cleaners", icon: Sparkles },
      { href: "/admin/pools", label: "Pool Management", icon: Users },
      { href: "/admin/training", label: "Training", icon: GraduationCap },
      { href: "/admin/reviews", label: "Staff Reviews", icon: ClipboardList },
      { href: "/admin/onboarding", label: "Onboarding", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/security", label: "Security", icon: Lock },
      { href: "/admin/roles", label: "Roles", icon: Shield },
      { href: "/admin/monitoring", label: "Monitoring", icon: Monitor },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: Eye },
      ...(ERP_ENABLED ? [{ href: "/admin/erp", label: "ERP Console", icon: Briefcase }] : []),
    ],
  },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [userRole, setUserRole] = useState("admin");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const name = localStorage.getItem("username") || "Admin";
      const role = localStorage.getItem("userRole") || "admin";
      setUserName(name);
      setUserRole(role);

      // Guard: non-admin gets kicked to their own dashboard
      if (role !== "admin" && role !== "super_admin") {
        router.push(role === "cleaner" ? "/CleanerDashboard" : "/supervisor-dashboard");
      }
    }
  }, [router]);

  const handleLogout = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("Logout error:", err);
      }
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("username");
      localStorage.removeItem("user_id");
      window.location.href = "/auth/login";
    }
  };

  const isActive = (href: string) => {
    if (href === "/admin/overview") return pathname === "/admin" || pathname === "/admin/overview";
    return pathname.startsWith(href);
  };

  const pageTitle = NAV_GROUPS
    .flatMap((g) => g.items)
    .find((i) => isActive(i.href))?.label || "Dashboard";

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 flex h-screen flex-col bg-white border-r border-slate-200",
          "transition-all duration-300 ease-out shrink-0 shadow-[2px_0_12px_rgba(0,0,0,0.04)]",
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          "w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-4 border-b border-slate-100">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1E3A8A] text-white font-bold text-sm">
            SS
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">Scratch Solid</p>
              <p className="truncate text-[11px] text-slate-400 font-medium tracking-wide uppercase">Admin Console</p>
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                          active
                            ? "bg-[#1E3A8A]/10 text-[#1E3A8A] shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                          collapsed && "lg:justify-center lg:px-0",
                        )}
                      >
                        <Icon className={cn("h-5 w-5 shrink-0", active && "text-[#1E3A8A]")} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && item.badge && (
                          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-slate-100 p-3 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#1E3A8A] text-white text-xs font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{userName}</p>
                <p className="truncate text-xs text-slate-400 capitalize">{userRole}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
              "text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors",
              collapsed && "lg:justify-center lg:px-0",
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-slate-500" />
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-lg p-2 hover:bg-slate-100 lg:inline-flex"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5 text-slate-500" />
          </button>

          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center text-sm text-slate-400">
            <span className="font-medium text-slate-900">Admin</span>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="text-slate-600">{pageTitle}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="hidden lg:inline">Search…</span>
              <kbd className="hidden lg:inline-flex h-5 items-center rounded border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-400">⌘K</kbd>
            </button>

            {/* Notifications */}
            <button
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {/* Settings */}
            <Link
              href="/admin/monitoring"
              className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 sm:inline-flex transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>

            {/* Avatar */}
            <Avatar className="h-8 w-8 border border-slate-200">
              <AvatarFallback className="bg-[#1E3A8A] text-white text-xs font-semibold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <p className="text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Scratch Solid Solutions. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
