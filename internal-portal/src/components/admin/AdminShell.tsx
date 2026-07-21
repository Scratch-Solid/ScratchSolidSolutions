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
  MapPin,
  CalendarDays,
  FolderKanban,
} from "lucide-react";

const ERP_ENABLED = (process.env.NEXT_PUBLIC_ERP_URL || "").length > 0;

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

// Sidebar: application/business functions.
const APP_NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/admin/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/employees", label: "Employees", icon: Users },
      { href: "/admin/services", label: "Services & Banking", icon: DollarSign },
      { href: "/admin/content", label: "Content", icon: FileText },
      { href: "/admin/digital-projects", label: "Digital Projects", icon: FolderKanban },
      ...(ERP_ENABLED ? [{ href: "/admin/erp", label: "ERP Console", icon: Briefcase }] : []),
    ],
  },
  {
    label: "Workforce",
    items: [
      { href: "/admin/cleaners", label: "Cleaners", icon: Sparkles },
      { href: "/admin/job-tracking", label: "Job Tracking", icon: MapPin },
      { href: "/admin/pools", label: "Pool Management", icon: Users },
      { href: "/admin/training", label: "Training", icon: GraduationCap },
      { href: "/admin/leave", label: "Leave Requests", icon: CalendarDays },
      { href: "/admin/reviews", label: "Staff Reviews", icon: ClipboardList },
      { href: "/admin/onboarding", label: "Onboarding", icon: BarChart3 },
    ],
  },
];

// Top bar: system-administration functions.
const SYSTEM_NAV_ITEMS: NavItem[] = [
  { href: "/admin/security", label: "Security", icon: Lock },
  { href: "/admin/roles", label: "Users & Roles", icon: Shield },
  { href: "/admin/monitoring", label: "Monitoring", icon: Monitor },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: Eye },
];

const ALL_NAV_ITEMS = [...APP_NAV_GROUPS.flatMap((g) => g.items), ...SYSTEM_NAV_ITEMS];

const HEADER_H = 56; // px
const SIDEBAR_W = 224; // px, expanded
const SIDEBAR_W_COLLAPSED = 64; // px

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
        router.push(role === "cleaner" ? "/cleaner-dashboard" : "/supervisor-dashboard");
      }
    }
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const pageTitle = ALL_NAV_ITEMS.find((i) => isActive(i.href))?.label || "Dashboard";
  const sidebarWidth = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar - fixed, corner to corner, sits above everything */}
      <header
        className="fixed top-0 inset-x-0 z-50 flex items-center gap-2 bg-sidebar text-sidebar-foreground px-3 sm:px-4"
        style={{ height: HEADER_H }}
      >
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-md p-2 hover:bg-sidebar-accent lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden rounded-md p-2 hover:bg-sidebar-accent lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", !collapsed && "rotate-180")} />
        </button>

        <Link href="/admin/overview" className="flex items-center gap-2 shrink-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-xs">
            SS
          </div>
          <span className="hidden sm:block text-sm font-medium truncate">Scratch Solid</span>
        </Link>

        <div className="hidden lg:flex items-center text-sm ml-2 text-sidebar-foreground/50">
          <ChevronRight className="h-3.5 w-3.5 mx-0.5" />
          <span className="text-sidebar-foreground/80">{pageTitle}</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* System-administration controls */}
          <nav className="hidden md:flex items-center gap-0.5 pr-2 mr-1 border-r border-sidebar-border">
            {SYSTEM_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "rounded-md p-2 transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                </Link>
              );
            })}
          </nav>

          <button
            className="hidden sm:flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/30 px-3 py-1.5 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="hidden lg:inline-flex h-5 items-center rounded border border-sidebar-border px-1.5 text-[10px] font-medium">⌘K</kbd>
          </button>

          <button className="relative rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors" aria-label="Notifications">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
          </button>

          <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-sidebar-border">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleLogout}
              className="rounded-md p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          style={{ top: HEADER_H }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - fixed, below the top bar, application nav */}
      <aside
        className={cn(
          "fixed left-0 z-40 flex flex-col bg-card border-r border-border overflow-y-auto",
          "transition-transform duration-200 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ top: HEADER_H, bottom: 0, width: mobileOpen ? 240 : sidebarWidth }}
      >
        <nav className="flex-1 px-2.5 py-4 space-y-5">
          {APP_NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {(!collapsed || mobileOpen) && (
                <p className="px-2.5 mb-1.5 text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const showLabel = !collapsed || mobileOpen;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={showLabel ? undefined : item.label}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-accent/15 text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          !showLabel && "lg:justify-center lg:px-0",
                        )}
                      >
                        <Icon className={cn("h-4.5 w-4.5 shrink-0", active && "text-accent")} />
                        {showLabel && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-2.5">
          <div className={cn("flex items-center gap-2.5 px-2.5 py-2 rounded-md bg-muted", !collapsed || mobileOpen ? "" : "lg:justify-center lg:px-0")}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {(!collapsed || mobileOpen) && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                <p className="truncate text-xs text-muted-foreground capitalize">{userRole}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Content - offset by the fixed header always, and by the sidebar from lg upward
          (below lg the sidebar is an overlay and shouldn't push content over) */}
      <div
        style={{ paddingTop: HEADER_H, ["--sbw" as string]: `${sidebarWidth}px` } as React.CSSProperties}
      >
        <div className="lg:ml-[var(--sbw)] transition-[margin] duration-200">
          <ContentBody>{children}</ContentBody>
        </div>
      </div>
    </div>
  );
}

function ContentBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col">
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
      <footer className="border-t border-border bg-card px-4 py-3 sm:px-6">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Scratch Solid Solutions
        </p>
      </footer>
    </div>
  );
}
