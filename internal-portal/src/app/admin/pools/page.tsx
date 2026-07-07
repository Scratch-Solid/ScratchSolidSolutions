"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  Building2,
  User,
} from "lucide-react";

export default function AdminPoolsPage() {
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "INDIVIDUAL" | "BUSINESS">("all");

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("authToken");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch("/api/admin/cleaners", { headers });
        if (res.ok) setCleaners(await res.json());
      } catch {
        setError("Failed to load cleaners");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const togglePool = async (id: number, currentPool: string) => {
    const newPool = currentPool === "INDIVIDUAL" ? "BUSINESS" : "INDIVIDUAL";
    const token = localStorage.getItem("authToken");
    const res = await fetch(`/api/admin/cleaners/${id}/pool`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pool: newPool }),
    });
    if (res.ok) {
      setCleaners((prev) => prev.map((c) => (c.id === id ? { ...c, pool_type: newPool } : c)));
    }
  };

  const filtered = cleaners.filter((c: any) => {
    if (filter === "all") return true;
    return (c.pool_type || "INDIVIDUAL") === filter;
  });

  const individualCount = cleaners.filter((c: any) => (c.pool_type || "INDIVIDUAL") === "INDIVIDUAL").length;
  const businessCount = cleaners.filter((c: any) => (c.pool_type || "INDIVIDUAL") === "BUSINESS").length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Error</h2>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pool Management</h1>
          <p className="text-sm text-slate-500 mt-1">Assign cleaners to Individual or Business pools.</p>
        </div>
      </div>

      {/* Pool stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Individual Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{individualCount}</div>
            <p className="text-xs text-slate-400 mt-1">Residential & LekkeSlaap</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Business Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{businessCount}</div>
            <p className="text-xs text-slate-400 mt-1">Commercial & Office</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Cleaners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{cleaners.length}</div>
            <p className="text-xs text-slate-400 mt-1">Across all pools</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        {(["all", "INDIVIDUAL", "BUSINESS"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? "bg-[#1E3A8A] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f === "all" ? "All Pools" : f}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Cleaner Pools ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No cleaners found</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((c: any) => (
                <div key={c.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-xs">
                      {(c.full_name || c.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{c.full_name || c.name || "Unnamed"}</p>
                      <p className="text-xs text-slate-500">{c.email || c.phone || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className={c.pool_type === "BUSINESS" ? "bg-blue-100 text-blue-700 hover:bg-blue-100 border-0" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0"}>
                      {c.pool_type === "BUSINESS" ? (
                        <Building2 className="h-3 w-3 mr-0.5" />
                      ) : (
                        <User className="h-3 w-3 mr-0.5" />
                      )}
                      {c.pool_type || "INDIVIDUAL"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => togglePool(c.id, c.pool_type || "INDIVIDUAL")}
                    >
                      <ArrowRightLeft className="h-3 w-3" /> Switch
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
