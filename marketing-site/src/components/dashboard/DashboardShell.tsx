"use client";

import { ReactNode, useState } from "react";

export type DashboardDepartment = "cleaning" | "transportation" | "digital";

export interface DashboardNavItem {
  key: string;
  label: string;
  icon: ReactNode;
}

export interface DashboardDeptOption {
  key: DashboardDepartment;
  label: string;
  icon: ReactNode;
  locked?: boolean;
}

interface DashboardShellProps {
  userName: string;
  userRoleLabel: string;
  departments: DashboardDeptOption[];
  activeDepartment: DashboardDepartment;
  onDepartmentChange: (dept: DashboardDepartment) => void;
  navItems: DashboardNavItem[];
  activeView: string;
  onViewChange: (view: string) => void;
  pageTitle: string;
  primaryAction?: { label: string; onClick: () => void };
  onLogout: () => void;
  children: ReactNode;
}

const HEADER_H = 64;
const SIDEBAR_W = 224;

export default function DashboardShell({
  userName,
  userRoleLabel,
  departments,
  activeDepartment,
  onDepartmentChange,
  navItems,
  activeView,
  onViewChange,
  pageTitle,
  primaryAction,
  onLogout,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const initial = (userName || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F7F2EA] font-sans">
      {/* Mobile top bar toggle */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 py-3 bg-[#2E1F16]">
        <span className="text-[#F7F2EA] font-semibold" style={{ fontFamily: "Georgia, serif" }}>Scratch Solid</span>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="text-[#CBB89A] hover:text-[#F7F2EA] p-1"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          style={{ top: 52 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 z-40 flex flex-col justify-between bg-gradient-to-b from-[#2E1F16] to-[#3a281a] transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ top: 0, bottom: 0, width: SIDEBAR_W }}
      >
        <div>
          <div className="hidden lg:flex items-center gap-2.5 px-4 py-5">
            <div className="w-8 h-8 rounded-lg bg-[#B08A5E] flex items-center justify-center text-[#2E1F16] font-semibold text-sm" style={{ fontFamily: "Georgia, serif" }}>
              S
            </div>
            <span className="font-semibold text-sm text-[#F7F2EA]" style={{ fontFamily: "Georgia, serif" }}>
              Scratch Solid
            </span>
          </div>
          <div className="h-14 lg:hidden" />

          <nav className="px-2.5 mt-2 lg:mt-0 space-y-0.5" aria-label="Department">
            <p className="px-2.5 mb-1.5 text-[10px] font-semibold text-[#B7A288] uppercase tracking-wider">Departments</p>
            {departments.map((dept) => {
              const active = activeDepartment === dept.key;
              return (
                <button
                  key={dept.key}
                  onClick={() => !dept.locked && onDepartmentChange(dept.key)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors text-left ${
                    active
                      ? "bg-[#B08A5E]/15 text-[#F7F2EA] shadow-[inset_2px_0_0_#B08A5E]"
                      : dept.locked
                      ? "text-[#75695a] cursor-default"
                      : "text-[#CBB89A] hover:bg-white/5 hover:text-[#F7F2EA]"
                  }`}
                >
                  <span className="shrink-0">{dept.icon}</span>
                  <span className="truncate">{dept.label}</span>
                  {dept.locked && (
                    <span className="ml-auto text-[9px] uppercase tracking-wide bg-white/10 text-[#B7A288] px-1.5 py-0.5 rounded-full">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="h-px bg-white/10 mx-3 my-3" />

          <nav className="px-2.5 space-y-0.5" aria-label="Section">
            <p className="px-2.5 mb-1.5 text-[10px] font-semibold text-[#B7A288] uppercase tracking-wider">Account</p>
            {navItems.map((item) => {
              const active = activeView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onViewChange(item.key)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors text-left ${
                    active ? "bg-white/10 text-[#F7F2EA]" : "text-[#CBB89A] hover:bg-white/5 hover:text-[#F7F2EA]"
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-2.5">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-[#B08A5E]/20 text-[#B08A5E] flex items-center justify-center font-semibold text-xs shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#F7F2EA]">{userName}</p>
              <p className="truncate text-xs text-[#B7A288]">{userRoleLabel}</p>
            </div>
            <button onClick={onLogout} className="text-[#CBB89A] hover:text-[#F7F2EA] p-1 shrink-0" aria-label="Log out" title="Log out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="lg:ml-[224px] pt-[52px] lg:pt-0">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-5 sm:px-8 py-4 border-b border-[#E9E0D3] bg-[#F7F2EA]/90 backdrop-blur-md">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#A79C7C]">
              {departments.find((d) => d.key === activeDepartment)?.label}
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-[#2E1F16] tracking-tight">{pageTitle}</h1>
          </div>
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="rounded-lg bg-[#B08A5E] px-4 py-2 text-sm font-semibold text-[#2E1F16] hover:bg-[#c39a6c] transition-colors whitespace-nowrap"
            >
              {primaryAction.label}
            </button>
          )}
        </div>
        <main className="px-5 sm:px-8 py-6 max-w-5xl">{children}</main>
      </div>
    </div>
  );
}
