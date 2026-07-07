"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  CalendarDays,
  DollarSign,
  Users,
  Wrench,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface DashboardData {
  stats: {
    totalBookings: number;
    totalRevenue: number;
    activeCleaners: number;
    pendingWeekendAssignments: number;
  };
  recentBookings: any[];
  recentJoiners: any[];
  pendingApprovals: number;
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mb-2" />
        <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [bookingsRes, employeesRes, newJoinersRes, approvalsRes] = await Promise.allSettled([
          fetch("/api/admin/bookings", { headers }),
          fetch("/api/employees", { headers }),
          fetch("/api/admin/new-joiners", { headers }),
          fetch("/api/admin/pending-approvals", { headers }),
        ]);

        let bookings: any[] = [];
        let employees: any[] = [];
        let joiners: any[] = [];
        let approvals = 0;

        if (bookingsRes.status === "fulfilled" && bookingsRes.value.ok) {
          bookings = await bookingsRes.value.json();
        }
        if (employeesRes.status === "fulfilled" && employeesRes.value.ok) {
          employees = await employeesRes.value.json();
        }
        if (newJoinersRes.status === "fulfilled" && newJoinersRes.value.ok) {
          const j = await newJoinersRes.value.json();
          joiners = j.data || j || [];
        }
        if (approvalsRes.status === "fulfilled" && approvalsRes.value.ok) {
          const a = await approvalsRes.value.json();
          approvals = a.count || a.pendingApprovals?.length || 0;
        }

        // Auth guard: redirect on 401/403 from any endpoint
        const responses = [bookingsRes, employeesRes, newJoinersRes, approvalsRes];
        const authError = responses.find(
          (r): r is PromiseFulfilledResult<Response> =>
            r.status === "fulfilled" && (r.value.status === 401 || r.value.status === 403)
        );
        if (authError) {
          localStorage.removeItem("authToken");
          window.location.href = "/auth/login";
          return;
        }

        const weekendAssignments = bookings.filter((b: any) => {
          const d = b?.booking_date ? new Date(b.booking_date) : null;
          if (!d || isNaN(d.getTime())) return false;
          const day = d.getUTCDay();
          return (day === 0 || day === 6) && (b?.status ?? "").toLowerCase() !== "completed";
        }).length;

        setData({
          stats: {
            totalBookings: bookings.length,
            totalRevenue: 0,
            activeCleaners: employees.length,
            pendingWeekendAssignments: weekendAssignments,
          },
          recentBookings: bookings.slice(0, 5),
          recentJoiners: joiners.slice(0, 5),
          pendingApprovals: approvals,
        });
      } catch (err) {
        setError("Unable to load dashboard data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Unable to load dashboard</h2>
        <p className="text-sm text-slate-500 max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-6" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  const stats = data?.stats ?? { totalBookings: 0, totalRevenue: 0, activeCleaners: 0, pendingWeekendAssignments: 0 };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of operations, workforce, and finances.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/employees">
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="h-4 w-4" />
              Employees
            </Button>
          </Link>
          <Link href="/admin/services">
            <Button size="sm" className="gap-2 bg-[#1E3A8A] hover:bg-[#1e3a8a]/90">
              <DollarSign className="h-4 w-4" />
              Services
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <KpiCard
              title="Total Bookings"
              value={stats.totalBookings.toString()}
              subtitle="All time"
              icon={CalendarDays}
              trend="+12%"
              trendUp
            />
            <KpiCard
              title="Active Cleaners"
              value={stats.activeCleaners.toString()}
              subtitle="On workforce"
              icon={Wrench}
              trend="+3"
              trendUp
            />
            <KpiCard
              title="Weekend Pending"
              value={stats.pendingWeekendAssignments.toString()}
              subtitle="Unassigned"
              icon={Clock}
              trend={stats.pendingWeekendAssignments > 5 ? "High" : "Low"}
              trendUp={stats.pendingWeekendAssignments <= 5}
            />
            <KpiCard
              title="Pending Approvals"
              value={(data?.pendingApprovals ?? 0).toString()}
              subtitle="New joiners"
              icon={ClipboardList}
              trend={data?.pendingApprovals && data.pendingApprovals > 0 ? "Action needed" : "Clear"}
              trendUp={!data?.pendingApprovals || data.pendingApprovals === 0}
            />
          </>
        )}
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent bookings */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Recent Bookings</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Latest 5 booking entries</p>
            </div>
            <Link href="/admin/services">
              <Button variant="ghost" size="sm" className="gap-1 text-[#1E3A8A]">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : data?.recentBookings.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No bookings found</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentBookings.map((b: any) => (
                  <div key={b.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{b.client_name || "Unknown"}</p>
                      <p className="text-xs text-slate-500 truncate">{b.service_type} — {b.booking_date}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Common admin tasks</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction href="/admin/employees" icon={Users} label="Manage Employees" />
            <QuickAction href="/admin/services" icon={DollarSign} label="Services & Banking" />
            <QuickAction href="/admin/content" icon={ClipboardList} label="Content Management" />
            <QuickAction href="/admin/cleaners" icon={Wrench} label="Cleaner Visibility" />
            <QuickAction href="/admin/pools" icon={TrendingUp} label="Pool Management" />
            <QuickAction href="/admin/reviews" icon={CheckCircle2} label="Staff Reviews" />
            <QuickAction href="/admin/security" icon={AlertCircle} label="Security Settings" />
          </CardContent>
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* New joiners */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">New Joiners</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Pending applications</p>
            </div>
            <Link href="/admin/onboarding">
              <Button variant="ghost" size="sm" className="gap-1 text-[#1E3A8A]">
                Manage <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : data?.recentJoiners.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No pending joiners</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.recentJoiners.map((j: any) => (
                  <div key={j.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{j.full_name || j.name || "Applicant"}</p>
                      <p className="text-xs text-slate-500 truncate">{j.position_applied_for || j.position || "Cleaner"}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">System Health</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Live service status</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <HealthRow label="Database" status="operational" />
            <HealthRow label="Authentication" status="operational" />
            <HealthRow label="Email Service" status="operational" />
            <HealthRow label="Payment Gateway" status="degraded" />
            <HealthRow label="ERPNext" status={ERP_ENABLED ? "operational" : "paused"} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        <div className="rounded-lg bg-[#1E3A8A]/10 p-2">
          <Icon className="h-4 w-4 text-[#1E3A8A]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn("text-xs font-medium", trendUp ? "text-emerald-600" : "text-amber-600")}>
            {trend}
          </span>
          <span className="text-xs text-slate-400">{subtitle}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const map: Record<string, { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
    completed: { color: "text-emerald-700", bg: "bg-emerald-50 ring-emerald-600/20", icon: CheckCircle2 },
    pending: { color: "text-amber-700", bg: "bg-amber-50 ring-amber-600/20", icon: Clock },
    assigned: { color: "text-blue-700", bg: "bg-blue-50 ring-blue-600/20", icon: CheckCircle2 },
    cancelled: { color: "text-red-700", bg: "bg-red-50 ring-red-600/20", icon: XCircle },
  };
  const style = map[s] || { color: "text-slate-700", bg: "bg-slate-50 ring-slate-600/20", icon: Clock };
  const Icon = style.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", style.color, style.bg)}>
      <Icon className="h-3 w-3" />
      {status || "Unknown"}
    </span>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#1E3A8A] transition-colors"
    >
      <Icon className="h-4 w-4 text-slate-400" />
      {label}
      <ArrowRight className="h-4 w-4 ml-auto text-slate-300" />
    </Link>
  );
}

function HealthRow({ label, status }: { label: string; status: "operational" | "degraded" | "paused" | "down" }) {
  const colors = {
    operational: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
    degraded: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
    paused: { dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-50" },
    down: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
  };
  const c = colors[status];
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700">{label}</span>
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", c.text, c.bg)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
}

const ERP_ENABLED = (process.env.NEXT_PUBLIC_ERP_URL || "").length > 0;

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
