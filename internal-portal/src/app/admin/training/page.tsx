"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Search,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
} from "lucide-react";

interface TrainingModule {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
  category: string;
}

interface TrainingProgress {
  user_id: number;
  user_name: string;
  module_id: number;
  module_title: string;
  status: "not_started" | "in_progress" | "completed";
  completed_at?: string;
  score?: number;
}

export default function AdminTrainingPage() {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<TrainingProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"modules" | "progress">("modules");

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("authToken");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        // These endpoints may be placeholder; gracefully handle missing ones
        const [modRes, progRes] = await Promise.allSettled([
          fetch("/api/admin/training/modules", { headers }),
          fetch("/api/admin/training/progress", { headers }),
        ]);
        const authError = [modRes, progRes].find(
          (r): r is PromiseFulfilledResult<Response> =>
            r.status === "fulfilled" && (r.value.status === 401 || r.value.status === 403)
        );
        if (authError) {
          localStorage.removeItem("authToken");
          window.location.href = "/auth/login";
          return;
        }
        if (modRes.status === "fulfilled" && modRes.value.ok) {
          const m = await modRes.value.json();
          setModules(Array.isArray(m) ? m : m.data || []);
        }
        if (progRes.status === "fulfilled" && progRes.value.ok) {
          const p = await progRes.value.json();
          setProgress(Array.isArray(p) ? p : p.data || []);
        }
      } catch {
        setError("Unable to load training data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredModules = modules.filter((m) => m.title.toLowerCase().includes(search.toLowerCase()));
  const filteredProgress = progress.filter((p) =>
    (p.user_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.module_title || "").toLowerCase().includes(search.toLowerCase())
  );

  const completionRate = progress.length > 0
    ? Math.round((progress.filter((p) => p.status === "completed").length / progress.length) * 100)
    : 0;

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Training</h1>
          <p className="text-sm text-slate-500 mt-1">Modules, completions, and progress tracking.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{modules.length}</div>
            <p className="text-xs text-slate-400 mt-1">Available for staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Enrolled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{progress.length}</div>
            <p className="text-xs text-slate-400 mt-1">Active learners</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{completionRate}%</div>
            <p className="text-xs text-slate-400 mt-1">Modules finished</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          {(["modules", "progress"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === t ? "bg-[#1E3A8A] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t === "modules" ? "Modules" : "Progress"}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === "modules" ? "Search modules..." : "Search learners..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] transition-colors"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {activeTab === "modules" ? `Training Modules (${filteredModules.length})` : `Learner Progress (${filteredProgress.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : activeTab === "modules" ? (
            filteredModules.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No training modules found</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredModules.map((m) => (
                  <div key={m.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{m.title}</p>
                        <Badge variant="outline" className="text-[10px] font-normal">{m.category || "General"}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                      <Clock className="h-3 w-3" /> {m.duration_minutes}m
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredProgress.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No progress records found</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredProgress.map((p) => (
                  <div key={`${p.user_id}-${p.module_id}`} className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{p.user_name || `User ${p.user_id}`}</p>
                      <p className="text-xs text-slate-500">{p.module_title || `Module ${p.module_id}`}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {p.score !== undefined && (
                        <span className="text-xs font-medium text-slate-600">{p.score}%</span>
                      )}
                      <TrainingStatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrainingStatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s === "completed") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px]">
        <CheckCircle2 className="h-3 w-3 mr-0.5" /> Completed
      </Badge>
    );
  }
  if (s === "in_progress") {
    return (
      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-[10px]">
        <TrendingUp className="h-3 w-3 mr-0.5" /> In Progress
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-0 text-[10px]">
      <BookOpen className="h-3 w-3 mr-0.5" /> Not Started
    </Badge>
  );
}
