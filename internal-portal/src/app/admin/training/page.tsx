"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  quiz_questions: number;
}

interface Learner {
  user_id: number;
  name: string;
  paysheet_code: string;
  completion_percentage: number;
  completed: boolean;
  modules_completed: string[];
}

export default function AdminTrainingPage() {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"modules" | "progress">("modules");

  async function load() {
    try {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [modRes, learnerRes] = await Promise.allSettled([
        fetch("/api/admin/cleaners/training-modules", { headers, cache: 'no-store' }),
        fetch("/api/admin/cleaners/training-status", { headers, cache: 'no-store' }),
      ]);
      const tokenInvalid = [modRes, learnerRes].every(
        (r): r is PromiseFulfilledResult<Response> => r.status === "fulfilled" && r.value.status === 401
      );
      if (token && tokenInvalid) {
        localStorage.removeItem("authToken");
        window.location.href = "/auth/login";
        return;
      }
      if (modRes.status === "fulfilled" && modRes.value.ok) {
        const m = await modRes.value.json();
        setModules(m.modules || []);
      }
      if (learnerRes.status === "fulfilled" && learnerRes.value.ok) {
        const l = await learnerRes.value.json();
        setLearners(l.learners || []);
      }
    } catch {
      setError("Unable to load training data. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  const filteredModules = modules.filter((m) => m.title.toLowerCase().includes(search.toLowerCase()));
  const filteredLearners = learners.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()));

  const completionRate = learners.length > 0
    ? Math.round((learners.filter((l) => l.completed).length / learners.length) * 100)
    : 0;

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
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Training</h1>
          <p className="text-sm text-stone-500 mt-1">The 7-module onboarding curriculum and real per-cleaner completion.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Total Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">{modules.length}</div>
            <p className="text-xs text-stone-400 mt-1">Onboarding curriculum</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Cleaners in training</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">{learners.length}</div>
            <p className="text-xs text-stone-400 mt-1">Department: cleaning</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Fully Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-900">{completionRate}%</div>
            <p className="text-xs text-stone-400 mt-1">All 7 modules done</p>
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
                activeTab === t ? "bg-[#2E1F16] text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {t === "modules" ? "Modules" : "Cleaner Progress"}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder={activeTab === "modules" ? "Search modules..." : "Search cleaners..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-[#2E1F16] focus:ring-1 focus:ring-[#2E1F16] transition-colors"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {activeTab === "modules" ? `Training Modules (${filteredModules.length})` : `Cleaner Progress (${filteredLearners.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-stone-100 rounded animate-pulse" />
              ))}
            </div>
          ) : activeTab === "modules" ? (
            filteredModules.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-400">No training modules found</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {filteredModules.map((m) => (
                  <div key={m.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-900">{m.title}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{m.description}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-400 shrink-0">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {m.duration_minutes}m</span>
                      <span>{m.quiz_questions} quiz questions</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredLearners.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-400">No cleaners in training yet</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {filteredLearners.map((l) => (
                  <div key={l.user_id} className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-900">{l.name}</p>
                      <p className="text-xs text-stone-500">{l.paysheet_code} - {l.modules_completed.length}/{modules.length || 7} modules</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-medium text-stone-600">{l.completion_percentage}%</span>
                      {l.completed ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" /> Completed
                        </Badge>
                      ) : l.modules_completed.length > 0 ? (
                        <Badge className="bg-[#F0E6D6] text-[#241811] hover:bg-[#F0E6D6] border-0 text-[10px]">
                          <TrendingUp className="h-3 w-3 mr-0.5" /> In Progress
                        </Badge>
                      ) : (
                        <Badge className="bg-stone-100 text-stone-600 hover:bg-stone-100 border-0 text-[10px]">
                          <BookOpen className="h-3 w-3 mr-0.5" /> Not Started
                        </Badge>
                      )}
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
