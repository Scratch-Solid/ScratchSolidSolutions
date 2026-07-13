"use client";

import React, { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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
    <div className="flex min-h-screen bg-background text-foreground">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - dark espresso, the shell's one high-contrast surface */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 flex h-screen flex-col bg-sidebar text-sidebar-foreground",
          "transition-all duration-200 ease-out shrink-0",
          collapsed ? "lg:w-[68px]" : "lg:w-60",
          "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center gap-2.5 px-4 border-b border-sidebar-border">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-xs">
            SS
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">Scratch Solid</p>
              <p className="truncate text-[10px] text-sidebar-foreground/50 font-medium tracking-wide uppercase">Admin console</p>
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-md p-2 hover:bg-sidebar-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-2.5 mb-1.5 text-[10px] font-medium text-sidebar-foreground/40 uppercase tracking-wider">
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
                          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                          collapsed && "lg:justify-center lg:px-0",
                        )}
                      >
                        <Icon className={cn("h-4.5 w-4.5 shrink-0", active && "text-sidebar-primary")} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && item.badge && (
                          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white">
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

        <div className="border-t border-sidebar-border p-2.5 space-y-1">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md bg-sidebar-accent/40">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
                <p className="truncate text-xs text-sidebar-foreground/50 capitalize">{userRole}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium",
              "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors",
              collapsed && "lg:justify-center lg:px-0",
            )}
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-4.5 w-4.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-md p-2 hover:bg-muted lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                !collapsed && "rotate-180"
              )}
            />
          </button>

          <div className="hidden md:flex items-center text-sm">
            <span className="font-medium text-foreground">Admin</span>
            <ChevronRight className="h-3.5 w-3.5 mx-1 text-muted-foreground" />
            <span className="text-muted-foreground">{pageTitle}</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:border-accent transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Search…</span>
              <kbd className="hidden lg:inline-flex h-5 items-center rounded border border-border bg-card px-1.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
            </button>

            <button
              className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
            </button>

            <Link
              href="/admin/monitoring"
              className="hidden rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-4.5 w-4.5" />
            </Link>

            <Avatar className="h-7 w-7 border border-border ml-1">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        <footer className="border-t border-border bg-card px-4 py-3 sm:px-6">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Scratch Solid Solutions
          </p>
        </footer>
      </div>
    </div>
  );
}
