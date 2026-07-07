"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Building2,
  AlertCircle,
} from "lucide-react";

export default function AdminEmployeesPage() {
  const [tab, setTab] = useState<"new" | "existing">("new");
  const [employees, setEmployees] = useState<any[]>([]);
  const [newJoiners, setNewJoiners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [empRes, joinRes] = await Promise.allSettled([
          fetch("/api/employees", { headers }),
          fetch("/api/admin/new-joiners", { headers }),
        ]);
        const authError = [empRes, joinRes].find(
          (r): r is PromiseFulfilledResult<Response> =>
            r.status === "fulfilled" && (r.value.status === 401 || r.value.status === 403)
        );
        if (authError) {
          localStorage.removeItem("authToken");
          window.location.href = "/auth/login";
          return;
        }
        if (empRes.status === "fulfilled" && empRes.value.ok) setEmployees(await empRes.value.json());
        if (joinRes.status === "fulfilled" && joinRes.value.ok) {
          const j = await joinRes.value.json();
          setNewJoiners(j.data || j || []);
        }
      } catch {
        setError("Unable to load employees. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = (tab === "existing" ? employees : newJoiners).filter((e: any) => {
    const q = search.toLowerCase();
    const name = (e.full_name || e.name || "").toLowerCase();
    const email = (e.email || "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const handleApprove = async (id: number) => {
    const token = localStorage.getItem("authToken");
    const res = await fetch(`/api/admin/new-joiners/${id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setNewJoiners((prev) => prev.filter((j) => j.id !== id));
  };

  const handleReject = async (id: number) => {
    const token = localStorage.getItem("authToken");
    const res = await fetch(`/api/admin/new-joiners/${id}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Rejected by admin" }),
    });
    if (res.ok) setNewJoiners((prev) => prev.filter((j) => j.id !== id));
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Error</h2>
        <p className="text-sm text-slate-500 max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-6" variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Employees</h1>
          <p className="text-sm text-slate-500 mt-1">Manage existing staff and review new applications.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="new" className="data-[state=active]:bg-[#1E3A8A] data-[state=active]:text-white">
              New Joiners ({newJoiners.length})
            </TabsTrigger>
            <TabsTrigger value="existing" className="data-[state=active]:bg-[#1E3A8A] data-[state=active]:text-white">
              Existing ({employees.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] transition-colors"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {tab === "new" ? "Pending Applications" : "Staff Directory"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              {tab === "new" ? "No pending applications" : "No employees found"}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((item: any) => (
                <div key={item.id} className="py-4 flex items-start sm:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{item.full_name || item.name || "Unnamed"}</p>
                      {item.role && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {item.role}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      {item.email && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Mail className="h-3 w-3" /> {item.email}
                        </span>
                      )}
                      {item.phone && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Phone className="h-3 w-3" /> {item.phone}
                        </span>
                      )}
                      {item.position_applied_for && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Building2 className="h-3 w-3" /> {item.position_applied_for}
                        </span>
                      )}
                    </div>
                  </div>
                  {tab === "new" ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleApprove(item.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReject(item.id)}>
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  ) : (
                    <Badge className={item.status === "active" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 hover:bg-slate-100"}>
                      {item.status || "Active"}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
