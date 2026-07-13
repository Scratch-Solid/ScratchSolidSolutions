"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

export default function AdminCleanersPage() {
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "blocked" | "idle">("all");

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
        setError("Unable to load cleaners. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = cleaners.filter((c: any) => {
    const q = search.toLowerCase();
    const name = (c.full_name || c.name || "").toLowerCase();
    const email = (c.email || "").toLowerCase();
    const matchSearch = name.includes(q) || email.includes(q);
    const matchFilter = filter === "all" || (c.status || "").toLowerCase() === filter || (filter === "blocked" && c.blocked);
    return matchSearch && matchFilter;
  });

  const toggleBlock = async (id: number, blocked: boolean) => {
    const token = localStorage.getItem("authToken");
    const res = await fetch(`/api/admin/cleaners/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ blocked: !blocked }),
    });
    if (res.ok) {
      setCleaners((prev) => prev.map((c) => (c.id === id ? { ...c, blocked: !blocked } : c)));
    }
  };

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
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Cleaners</h1>
          <p className="text-sm text-stone-500 mt-1">Workforce visibility and status management.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          {(["all", "active", "idle", "blocked"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-[#2E1F16] text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search cleaners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-[#2E1F16] focus:ring-1 focus:ring-[#2E1F16] transition-colors"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Cleaner Directory ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-stone-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-stone-400">No cleaners found</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filtered.map((c: any) => (
                <div key={c.id} className="py-4 flex items-start sm:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-900">{c.full_name || c.name || "Unnamed"}</p>
                      <CleanerStatusBadge status={c.status} blocked={c.blocked} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      {c.email && (
                        <span className="flex items-center gap-1 text-xs text-stone-500">
                          <Mail className="h-3 w-3" /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1 text-xs text-stone-500">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </span>
                      )}
                      {c.location && (
                        <span className="flex items-center gap-1 text-xs text-stone-500">
                          <MapPin className="h-3 w-3" /> {c.location}
                        </span>
                      )}
                    </div>
                    {c.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-stone-500">{c.rating}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className={c.blocked ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" : "text-red-600 border-red-200 hover:bg-red-50"}
                    onClick={() => toggleBlock(c.id, c.blocked)}
                  >
                    {c.blocked ? "Unblock" : "Block"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CleanerStatusBadge({ status, blocked }: { status?: string; blocked?: boolean }) {
  if (blocked) {
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-[10px]">
        <XCircle className="h-3 w-3 mr-0.5" /> Blocked
      </Badge>
    );
  }
  const s = (status || "").toLowerCase();
  if (s === "active" || s === "on_way" || s === "arrived") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px]">
        <CheckCircle2 className="h-3 w-3 mr-0.5" /> {status}
      </Badge>
    );
  }
  if (s === "idle") {
    return (
      <Badge className="bg-stone-100 text-stone-600 hover:bg-stone-100 border-0 text-[10px]">
        <Clock className="h-3 w-3 mr-0.5" /> Idle
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] font-normal">
      {status || "Unknown"}
    </Badge>
  );
}
