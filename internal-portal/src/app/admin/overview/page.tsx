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
  TrendingDown,
  Activity,
  UserPlus,
  RefreshCw,
} from "lucide-react";

interface DashboardData {
  stats: {
    totalBookings: number;
    activeCleaners: number;
    pendingWeekendAssignments: number;
    completed: number;
    completionRate: number;
    bookingsThisWeek: number;
    bookingsLastWeek: number;
  };
  allBookings: any[];
  recentBookings: any[];
  recentJoiners: any[];
  pendingApprovals: number;
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

        // Auth guard: only a genuine 401 (invalid/expired token) logs the user
        // out. A 403 means the session is valid but lacks permission for a
        // specific resource and must NOT clear the session.
        const responses = [bookingsRes, employeesRes, newJoinersRes, approvalsRes];
        const tokenInvalid = responses.every(
          (r): r is PromiseFulfilledResult<Response> =>
            r.status === "fulfilled" && r.value.status === 401
        );
        if (token && tokenInvalid) {
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

        const completed = bookings.filter(
          (b: any) => (b?.status ?? "").toLowerCase() === "completed"
        ).length;
        const completionRate = bookings.length > 0 ? Math.round((completed / bookings.length) * 100) : 0;

        // Real week-over-week booking counts (by booking_date)
        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;
        const inRange = (b: any, startDaysAgo: number, endDaysAgo: number) => {
          const d = b?.booking_date ? new Date(b.booking_date).getTime() : NaN;
          if (isNaN(d)) return false;
          return d >= now - startDaysAgo * DAY && d < now - endDaysAgo * DAY;
        };
        const bookingsThisWeek = bookings.filter((b) => inRange(b, 7, 0)).length;
        const bookingsLastWeek = bookings.filter((b) => inRange(b, 14, 7)).length;

        const sortedRecent = [...bookings].sort((a: any, b: any) => {
          const da = new Date(`${a?.booking_date ?? ""} ${a?.booking_time ?? ""}`).getTime();
          const db = new Date(`${b?.booking_date ?? ""} ${b?.booking_time ?? ""}`).getTime();
          return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
        });

        setData({
          stats: {
            totalBookings: bookings.length,
            activeCleaners: employees.length,
            pendingWeekendAssignments: weekendAssignments,
            completed,
            completionRate,
            bookingsThisWeek,
            bookingsLastWeek,
          },
          allBookings: bookings,
          recentBookings: sortedRecent.slice(0, 8),
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

  const stats = data?.stats ?? {
    totalBookings: 0,
    activeCleaners: 0,
    pendingWeekendAssignments: 0,
    completed: 0,
    completionRate: 0,
    bookingsThisWeek: 0,
    bookingsLastWeek: 0,
  };

  // ---- Derived series (all computed from real booking data) ----
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);
  const weekdayShort = (t: number) => new Date(t).toLocaleDateString("en-ZA", { weekday: "short" });

  const trend: { key: string; label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const t = now - i * DAY;
    trend.push({ key: dayKey(t), label: weekdayShort(t), value: 0 });
  }
  const trendIndex = new Map(trend.map((d, i) => [d.key, i]));
  (data?.allBookings ?? []).forEach((b: any) => {
    if (!b?.booking_date) return;
    const k = dayKey(new Date(b.booking_date).getTime());
    const idx = trendIndex.get(k);
    if (idx !== undefined) trend[idx].value += 1;
  });

  const statusCounts = new Map<string, number>();
  (data?.allBookings ?? []).forEach((b: any) => {
    const s = (b?.status ?? "unknown").toString().toLowerCase();
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
  });
  const STATUS_COLORS: Record<string, string> = {
    completed: "#10B981",
    pending: "#F59E0B",
    assigned: "#3B82F6",
    "in_progress": "#6366F1",
    cancelled: "#EF4444",
    unknown: "#94A3B8",
  };
  const donutSegments = Array.from(statusCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: STATUS_COLORS[label] || "#94A3B8" }));

  const wowDelta =
    stats.bookingsLastWeek > 0
      ? Math.round(((stats.bookingsThisWeek - stats.bookingsLastWeek) / stats.bookingsLastWeek) * 100)
      : stats.bookingsThisWeek > 0
      ? 100
      : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.reload()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Link href="/admin/onboarding">
            <Button size="sm" className="gap-2 bg-[#1E3A8A] hover:bg-[#1e3a8a]/90 text-white">
              <UserPlus className="h-3.5 w-3.5" />
              Onboard
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricTile label="Total Bookings" value={stats.totalBookings} icon={CalendarDays} loading={loading} />
        <MetricTile
          label="This Week"
          value={stats.bookingsThisWeek}
          icon={Activity}
          delta={wowDelta}
          deltaLabel="vs last wk"
          loading={loading}
        />
        <MetricTile
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          sub={`${stats.completionRate}% rate`}
          loading={loading}
        />
        <MetricTile label="Active Cleaners" value={stats.activeCleaners} icon={Wrench} loading={loading} />
        <MetricTile
          label="Weekend Pending"
          value={stats.pendingWeekendAssignments}
          icon={Clock}
          tone={stats.pendingWeekendAssignments > 5 ? "warn" : "default"}
          loading={loading}
        />
        <MetricTile
          label="Approvals"
          value={data?.pendingApprovals ?? 0}
          icon={ClipboardList}
          tone={(data?.pendingApprovals ?? 0) > 0 ? "warn" : "default"}
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" size="sm">
          <CardHeader className="pb-1 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">Bookings — last 14 days</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Daily booking volume by service date</p>
            </div>
            <DeltaChip delta={wowDelta} />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 bg-slate-100 rounded animate-pulse" />
            ) : (
              <BarChart data={trend} />
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold text-slate-900">Status breakdown</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">All bookings by state</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 bg-slate-100 rounded animate-pulse" />
            ) : donutSegments.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">No bookings yet</div>
            ) : (
              <Donut segments={donutSegments} total={stats.totalBookings} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lower row */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Recent bookings table */}
        <Card className="xl:col-span-2" size="sm">
          <CardHeader className="pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900">Recent Bookings</CardTitle>
            <Link href="/admin/services">
              <Button variant="ghost" size="xs" className="gap-1 text-[#1E3A8A]">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-0">
            {loading ? (
              <div className="space-y-2 px-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-9 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (data?.recentBookings.length ?? 0) === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">No bookings found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-2 font-medium">Client</th>
                      <th className="px-4 py-2 font-medium">Service</th>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data!.recentBookings.map((b: any) => (
                      <tr key={b.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">{b.client_name || "Unknown"}</td>
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap capitalize">{b.service_type || "—"}</td>
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{b.booking_date || "—"}</td>
                        <td className="px-4 py-2.5 text-right"><StatusBadge status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right stack */}
        <div className="space-y-4">
          {/* New joiners */}
          <Card size="sm">
            <CardHeader className="pb-1 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900">New Joiners</CardTitle>
              <Link href="/admin/onboarding">
                <Button variant="ghost" size="xs" className="gap-1 text-[#1E3A8A]">
                  Manage <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-9 bg-slate-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : (data?.recentJoiners.length ?? 0) === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">No pending joiners</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {data!.recentJoiners.map((j: any) => (
                    <div key={j.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{j.full_name || j.name || "Applicant"}</p>
                        <p className="text-xs text-slate-500 truncate">{j.position_applied_for || j.position || "Cleaner"}</p>
                      </div>
                      <span className="shrink-0 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System health */}
          <Card size="sm">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-semibold text-slate-900">System Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <HealthRow label="Database" status="operational" />
              <HealthRow label="Authentication" status="operational" />
              <HealthRow label="Email Service" status="operational" />
              <HealthRow label="Payment Gateway" status="degraded" />
              <HealthRow label="ERPNext" status={ERP_ENABLED ? "operational" : "paused"} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick actions bar */}
      <Card size="sm">
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <QuickAction href="/admin/employees" icon={Users} label="Employees" />
          <QuickAction href="/admin/services" icon={DollarSign} label="Services" />
          <QuickAction href="/admin/cleaners" icon={Wrench} label="Cleaners" />
          <QuickAction href="/admin/pools" icon={TrendingUp} label="Pools" />
          <QuickAction href="/admin/reviews" icon={CheckCircle2} label="Reviews" />
          <QuickAction href="/admin/security" icon={AlertCircle} label="Security" />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  sub,
  tone = "default",
  loading,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  delta?: number;
  deltaLabel?: string;
  sub?: string;
  tone?: "default" | "warn";
  loading?: boolean;
}) {
  return (
    <Card size="sm" className="relative">
      <CardContent className="px-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">{label}</span>
          <div className={cn("rounded-md p-1.5", tone === "warn" ? "bg-amber-50" : "bg-[#1E3A8A]/10")}>
            <Icon className={cn("h-3.5 w-3.5", tone === "warn" ? "text-amber-600" : "text-[#1E3A8A]")} />
          </div>
        </div>
        {loading ? (
          <div className="mt-2 h-7 w-14 bg-slate-100 rounded animate-pulse" />
        ) : (
          <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value.toLocaleString()}</div>
        )}
        <div className="mt-0.5 flex items-center gap-1.5">
          {typeof delta === "number" && !loading && <DeltaChip delta={delta} />}
          {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
          {deltaLabel && typeof delta === "number" && !loading && (
            <span className="text-[11px] text-slate-400">{deltaLabel}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  const up = delta >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
        up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      )}
    >
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}
      {delta}%
    </span>
  );
}

function BarChart({ data }: { data: { key: string; label: string; value: number }[] }) {
  const W = 700;
  const H = 160;
  const pad = { top: 12, right: 8, bottom: 22, left: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const gap = 6;
  const barW = (innerW - gap * (n - 1)) / n;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none" role="img" aria-label="Bookings last 14 days">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={pad.left}
          x2={W - pad.right}
          y1={pad.top + innerH * (1 - f)}
          y2={pad.top + innerH * (1 - f)}
          stroke="#F1F5F9"
          strokeWidth={1}
        />
      ))}
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = pad.left + i * (barW + gap);
        const y = pad.top + innerH - h;
        return (
          <g key={d.key}>
            <rect x={x} y={y} width={barW} height={Math.max(h, d.value > 0 ? 2 : 0)} rx={3} fill="#1E3A8A">
              <title>{`${d.key}: ${d.value} booking(s)`}</title>
            </rect>
            {i % 2 === 0 && (
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="#94A3B8">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Donut({ segments, total }: { segments: { label: string; value: number; color: string }[]; total: number }) {
  const size = 160;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = segments.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-32 w-32 shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
        {segments.map((s) => {
          const len = (s.value / sum) * c;
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="rotate-90" fontSize={26} fontWeight={700} fill="#0F172A" transform={`rotate(90 ${size / 2} ${size / 2})`}>
          {total}
        </text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="capitalize text-slate-600 truncate">{s.label.replace(/_/g, " ")}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-900">{s.value}</span>
            <span className="w-9 text-right tabular-nums text-slate-400">{Math.round((s.value / sum) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
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
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize", style.color, style.bg)}>
      <Icon className="h-3 w-3" />
      {status || "Unknown"}
    </span>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-[#1E3A8A]/30 hover:bg-slate-50 hover:text-[#1E3A8A] transition-colors"
    >
      <Icon className="h-4 w-4 text-slate-400" />
      {label}
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
