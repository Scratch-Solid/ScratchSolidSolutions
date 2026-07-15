"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRightLeft,
  AlertCircle,
  Building2,
  User,
} from "lucide-react";

export default function AdminPoolsPage() {
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "AUTO" | "MANUAL">("all");

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("authToken");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch("/api/admin/cleaners", { headers });
        if (res.status === 401) {
          localStorage.removeItem("authToken");
          window.location.href = "/auth/login";
          return;
        }
        if (res.ok) setCleaners(await res.json());
      } catch {
        setError("Unable to load pool data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const togglePool = async (userId: number, currentPool: string) => {
    const newPool = currentPool === "AUTO" ? "MANUAL" : "AUTO";
    const token = localStorage.getItem("authToken");
    const res = await fetch(`/api/admin/cleaners`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cleaner_id: userId, assignment_pool: newPool }),
    });
    if (res.ok) {
      setCleaners((prev) => prev.map((c) => (c.user_id === userId ? { ...c, assignment_pool: newPool } : c)));
    }
  };

  const filtered = cleaners.filter((c: any) => {
    if (filter === "all") return true;
    return (c.assignment_pool || "AUTO") === filter;
  });

  const autoCount = cleaners.filter((c: any) => (c.assignment_pool || "AUTO") === "AUTO").length;
  const manualCount = cleaners.filter((c: any) => (c.assignment_pool || "AUTO") === "MANUAL").length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-stone-900 mb-2">Error</h2>
        <p className="text-sm text-stone-500 max-w-md">{error}</p>
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
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Pool Management</h1>
          <p className="text-sm text-stone-500 mt-1">
            AUTO-pool cleaners are assigned automatically to standard/maintenance jobs. MANUAL-pool
            cleaners are assigned by hand to bigger jobs (deep clean, commercial, move-in/move-out)
            that often need more than one person.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">AUTO Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">{autoCount}</div>
            <p className="text-xs text-stone-400 mt-1">Standard / maintenance cleans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">MANUAL Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">{manualCount}</div>
            <p className="text-xs text-stone-400 mt-1">Deep clean / commercial / move-in-out</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Total Cleaners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">{cleaners.length}</div>
            <p className="text-xs text-stone-400 mt-1">Across both pools</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        {(["all", "AUTO", "MANUAL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? "bg-[#2E1F16] text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
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
                <div key={i} className="h-14 bg-stone-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-stone-400">No cleaners found</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filtered.map((c: any) => (
                <div key={c.user_id} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-semibold text-xs">
                      {(c.first_name || c.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{`${c.first_name || ""} ${c.last_name || ""}`.trim() || c.name || "Unnamed"}</p>
                      <p className="text-xs text-stone-500">{c.email || c.cellphone || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className={c.assignment_pool === "MANUAL" ? "bg-[#F0E6D6] text-[#241811] hover:bg-[#F0E6D6] border-0" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0"}>
                      {c.assignment_pool === "MANUAL" ? (
                        <Building2 className="h-3 w-3 mr-0.5" />
                      ) : (
                        <User className="h-3 w-3 mr-0.5" />
                      )}
                      {c.assignment_pool || "AUTO"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => togglePool(c.user_id, c.assignment_pool || "AUTO")}
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
