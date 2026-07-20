"use client";

import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LogOut, Menu, X, LayoutDashboard, Users, DollarSign, FileText,
  Settings, Eye, UserCheck, GraduationCap, BarChart3, Shield, Monitor,
  ClipboardList, Lock, Briefcase,
} from 'lucide-react';

// ERP console is gated until ERPNext is onboarded (see /admin/erp).
const ERP_ENABLED = (process.env.NEXT_PUBLIC_ERP_URL || '').length > 0;

type Role = 'admin' | 'staff' | 'cleaner' | 'digital' | 'transport';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  role?: Role;
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  admin: [
    { href: '/admin-dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin-dashboard?tab=employees', label: 'Employees', icon: Users },
    { href: '/admin-dashboard?tab=services-banking', label: 'Services & Banking', icon: DollarSign },
    { href: '/admin-dashboard?tab=content', label: 'Content', icon: FileText },
    { href: '/admin-dashboard?tab=cleaner-analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/onboarding', label: 'Onboarding', icon: ClipboardList },
    { href: '/admin/security', label: 'Security', icon: Lock },
    { href: '/admin/roles', label: 'Roles', icon: Shield },
    { href: '/admin/monitoring', label: 'Monitoring', icon: Monitor },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: Eye },
    ...(ERP_ENABLED ? [{ href: '/admin/erp', label: 'ERP Console', icon: Briefcase }] : []),
  ],
  staff: [
    { href: '/supervisor-dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/supervisor-dashboard?tab=jobs', label: 'Jobs', icon: ClipboardList },
    { href: '/supervisor-dashboard?tab=team', label: 'Team', icon: Users },
    // Supervisors are also a working cleaner (users.role='staff' still gets
    // a cleaner_profiles row and is now allowed on every cleaner-facing
    // route) - let them reach their own assigned jobs too.
    { href: '/cleaner-dashboard', label: 'My Jobs', icon: UserCheck },
  ],
  cleaner: [
    { href: '/CleanerDashboard', label: 'Profile', icon: UserCheck },
    { href: '/CleanerDashboard?tab=tasks', label: 'Tasks', icon: ClipboardList },
    { href: '/CleanerDashboard?tab=earnings', label: 'Earnings', icon: DollarSign },
    { href: '/cleaner-training', label: 'Training', icon: GraduationCap },
  ],
  digital: [
    { href: '/digital-dashboard', label: 'Tasks', icon: ClipboardList },
  ],
  transport: [
    { href: '/transport-dashboard', label: 'Deliveries', icon: ClipboardList },
  ],
};

export default function DashboardLayout({ children, title, role = 'admin' }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('username');
      localStorage.removeItem('user_id');
      window.location.href = '/auth/login';
    }
  };

  const navItems = NAV_ITEMS[role] ?? [];
  const username = (typeof window !== 'undefined' ? localStorage.getItem('username') : '') || 'User';

  const isActive = (href: string) => {
    const base = href.split('?')[0];
    return pathname === base;
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 flex h-screen flex-col bg-sidebar text-sidebar-foreground',
          'transition-all duration-300 ease-in-out shrink-0',
          collapsed ? 'lg:w-20' : 'lg:w-64',
          'w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-bold">
            SS
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">Scratch Solid</p>
              <p className="truncate text-xs text-sidebar-foreground/60">Internal Portal</p>
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-2 hover:bg-sidebar-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      collapsed && 'lg:justify-center lg:px-0',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
              'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
              collapsed && 'lg:justify-center lg:px-0',
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-xl sm:px-6">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Desktop collapse */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-lg p-2 hover:bg-muted lg:inline-flex"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/auth/change-password"
              className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2 rounded-full bg-muted px-2 py-1">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[120px] truncate text-sm font-medium text-foreground sm:inline">
                {username}
              </span>
            </div>
            <Button onClick={handleLogout} variant="ghost" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card/60 px-4 py-5 sm:px-6">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Scratch Solid Solutions. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
