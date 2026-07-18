"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/authFetch";
import { ArrowLeft, AlertCircle, Calendar, DollarSign, ClipboardCheck, Gauge } from "lucide-react";

type EmployeeDetail = {
  profile: {
    id: number; name: string; email: string; phone: string; role: string;
    onboarding_stage?: string; paysheet_code?: string; first_name?: string;
    last_name?: string; status?: string; department?: string;
  };
  leave: { id: number; type: string; start_date: string; end_date: string; days: number; status: string; reason?: string; created_at: string }[];
  payroll: { id: number; period_start: string; period_end: string; gross_pay: number; net_pay: number; status: string; created_at: string }[];
  tasksCompleted: { id: number; booking_id: number; assignment_date?: string; completed_at: string }[];
  tasksCompletedCount: number;
  kpi: {
    clientComponent: number; systemComponent: number; adminComponent: number;
    overall10pt: number; kpi5pt: number; kpi5ptRounded: number;
    bonusPercentage: number; increasePercentage: number;
  } | null;
};

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["approved", "paid", "processed", "active"].includes(status)) return "default";
  if (["rejected", "cancelled"].includes(status)) return "destructive";
  if (status === "pending") return "secondary";
  return "outline";
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`/api/admin/employees/${id}`);
        if (res.ok) setData(await res.json());
        else setError("Unable to load this employee's details.");
      } catch {
        setError("Unable to load this employee's details. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-sm text-stone-500 max-w-md">{error || "Employee not found."}</p>
        <Link href="/admin/employees" className="mt-6 text-sm text-[#8a6a45] hover:underline">← Back to Employees</Link>
      </div>
    );
  }

  const { profile, leave, payroll, tasksCompleted, tasksCompletedCount, kpi } = data;
  const displayName = profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unnamed";

  return (
    <div className="space-y-6">
      <Link href="/admin/employees" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800">
        <ArrowLeft className="h-4 w-4" /> Back to Employees
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{displayName}</h1>
          <p className="text-sm text-stone-500 mt-1">
            {profile.paysheet_code && <span className="font-mono">{profile.paysheet_code}</span>}
            {profile.department && <span> · {profile.department}</span>}
            {profile.email && <span> · {profile.email}</span>}
          </p>
        </div>
        {profile.status && <Badge variant={statusVariant(profile.status)}>{profile.status}</Badge>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-stone-500 text-xs uppercase tracking-wide mb-1">
              <Gauge className="h-3.5 w-3.5" /> KPI score
            </div>
            <div className="text-2xl font-bold text-stone-900">
              {kpi ? `${kpi.kpi5pt.toFixed(1)}/5` : "—"}
            </div>
            {kpi && (
              <p className="text-xs text-stone-500 mt-1">Est. bonus: {kpi.bonusPercentage}%</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-stone-500 text-xs uppercase tracking-wide mb-1">
              <ClipboardCheck className="h-3.5 w-3.5" /> Tasks completed
            </div>
            <div className="text-2xl font-bold text-stone-900">{tasksCompletedCount}</div>
            <p className="text-xs text-stone-500 mt-1">Most recent 30 shown below</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-stone-500 text-xs uppercase tracking-wide mb-1">
              <DollarSign className="h-3.5 w-3.5" /> Latest net pay
            </div>
            <div className="text-2xl font-bold text-stone-900">
              {payroll[0] ? `R${Number(payroll[0].net_pay).toLocaleString()}` : "—"}
            </div>
            <p className="text-xs text-stone-500 mt-1">{payroll[0]?.period_end || "No payroll history"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-stone-500 text-xs uppercase tracking-wide mb-1">
              <Calendar className="h-3.5 w-3.5" /> Leave requests
            </div>
            <div className="text-2xl font-bold text-stone-900">{leave.length}</div>
            <p className="text-xs text-stone-500 mt-1">
              {leave.filter(l => l.status === "pending").length} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {kpi && (
        <Card>
          <CardHeader><CardTitle>KPI breakdown</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-stone-500 text-xs uppercase tracking-wide">Client (50%)</p><p className="font-semibold">{kpi.clientComponent.toFixed(1)}/10</p></div>
            <div><p className="text-stone-500 text-xs uppercase tracking-wide">System (25%)</p><p className="font-semibold">{kpi.systemComponent.toFixed(1)}/10</p></div>
            <div><p className="text-stone-500 text-xs uppercase tracking-wide">Admin (25%)</p><p className="font-semibold">{kpi.adminComponent.toFixed(1)}/10</p></div>
            <div><p className="text-stone-500 text-xs uppercase tracking-wide">Overall</p><p className="font-semibold">{kpi.overall10pt.toFixed(1)}/10</p></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Payroll history</CardTitle></CardHeader>
        <CardContent>
          {payroll.length === 0 ? (
            <p className="text-sm text-stone-500">No payroll records yet.</p>
          ) : (
            <div className="space-y-2">
              {payroll.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border border-stone-200 px-3 py-2 text-sm">
                  <span className="text-stone-600">{p.period_start} → {p.period_end}</span>
                  <span className="font-medium">R{Number(p.net_pay).toLocaleString()} net</span>
                  <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Leave history</CardTitle></CardHeader>
        <CardContent>
          {leave.length === 0 ? (
            <p className="text-sm text-stone-500">No leave requests yet.</p>
          ) : (
            <div className="space-y-2">
              {leave.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-md border border-stone-200 px-3 py-2 text-sm">
                  <span className="text-stone-600">{l.type} · {l.start_date} → {l.end_date} ({l.days}d)</span>
                  <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Completed tasks</CardTitle></CardHeader>
        <CardContent>
          {tasksCompleted.length === 0 ? (
            <p className="text-sm text-stone-500">No completed tasks recorded yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {tasksCompleted.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border border-stone-200 px-3 py-2 text-sm">
                  <span className="text-stone-600">Booking #{t.booking_id}</span>
                  <span className="text-stone-500 text-xs">{t.completed_at}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
