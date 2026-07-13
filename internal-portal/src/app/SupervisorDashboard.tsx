"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  DollarSign,
  CalendarDays,
  Loader2,
} from "lucide-react";

interface Job {
  id: string;
  client_name: string;
  property_address: string;
  property_type: string;
  scheduled_at: string;
  status: string;
  team_members: string[];
  payment_status: string;
}

interface DashboardData {
  date: string;
  jobs: {
    total: number;
    scheduled: number;
    assigned: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    paid: number;
    unpaid: number;
  };
  workforce: {
    active_cleaners: number;
  };
  quality: {
    overdue_checklists: number;
  };
  todays_jobs: Job[];
}

interface Cleaner {
  paysheet_code: string;
  first_name: string;
  last_name: string;
  status: string;
}

export default function SupervisorDashboard() {
  useSessionTimeout(true);
  useTokenRefresh();
  const [data, setData] = useState<DashboardData | null>(null);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const [dashRes, cleanersRes] = await Promise.all([
          fetch("/api/v2/supervisor/dashboard", { headers }),
          fetch("/api/v2/staff/cleaners", { headers }),
        ]);

        if (dashRes.ok) {
          const dashJson = await dashRes.json() as { success: boolean; data: DashboardData };
          if (dashJson.success) setData(dashJson.data);
        }

        if (cleanersRes.ok) {
          const cleanersJson = await cleanersRes.json() as { success: boolean; data?: Cleaner[] };
          if (cleanersJson.success) setCleaners(cleanersJson.data || []);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleAssign = async (jobId: string, cleanerIds: string[]) => {
    setAssigning(jobId);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      const res = await fetch(`/api/v2/supervisor/jobs/${jobId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cleaner_ids: cleanerIds }),
      });

      if (res.ok) {
        // Refresh data
        const dashRes = await fetch("/api/v2/supervisor/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (dashRes.ok) {
          const dashJson = await dashRes.json() as { success: boolean; data: DashboardData };
          if (dashJson.success) setData(dashJson.data);
        }
      } else {
        setError("Failed to assign cleaners");
      }
    } catch (err) {
      setError("Failed to assign cleaners");
    } finally {
      setAssigning(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      scheduled: "bg-[#F0E6D6] text-[#1C130D]",
      assigned: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      paid: "bg-green-100 text-green-800",
      pending: "bg-orange-100 text-orange-800",
    };
    return <Badge className={map[status] || "bg-stone-100 text-stone-800"}>{status.replace(/_/g, " ")}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout title="Supervisor Dashboard" role="staff">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card p-4">
                <div className="h-4 bg-white/30 rounded w-1/2 mb-3" />
                <div className="h-8 bg-white/30 rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Supervisor Dashboard" role="staff">
        <div className="error-msg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Supervisor Dashboard" role="staff">
      <div className="space-y-6">
        {/* ─── Stats Cards ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-600 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Today&apos;s Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-stone-900">{data?.jobs.total || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Active Cleaners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-stone-900">{data?.workforce.active_cleaners || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-stone-900">{data?.jobs.completed || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-600 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Overdue Checklists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-stone-900">{data?.quality.overdue_checklists || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* ─── Job Status Summary ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Job Status Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-[#F7F2EA] rounded-lg">
                <p className="text-2xl font-bold text-[#241811]">{data?.jobs.scheduled || 0}</p>
                <p className="text-sm text-[#2E1F16]">Scheduled</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700">{data?.jobs.assigned || 0}</p>
                <p className="text-sm text-yellow-600">Assigned</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-700">{data?.jobs.in_progress || 0}</p>
                <p className="text-sm text-purple-600">In Progress</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{data?.jobs.paid || 0}</p>
                <p className="text-sm text-green-600">Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Today's Jobs ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today&apos;s Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.todays_jobs && data.todays_jobs.length > 0 ? (
              <div className="space-y-3">
                {data.todays_jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    cleaners={cleaners}
                    assigning={assigning === job.id}
                    onAssign={(cleanerIds) => handleAssign(job.id, cleanerIds)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-stone-500 text-center py-8">No jobs scheduled for today.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function JobRow({
  job,
  cleaners,
  assigning,
  onAssign,
}: {
  job: Job;
  cleaners: Cleaner[];
  assigning: boolean;
  onAssign: (cleanerIds: string[]) => void;
}) {
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>(job.team_members || []);
  const [isEditing, setIsEditing] = useState(false);

  const scheduledTime = new Date(job.scheduled_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const toggleCleaner = (code: string) => {
    setSelectedCleaners((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-stone-900">{job.client_name}</span>
            {statusBadge(job.status)}
            {job.payment_status === "paid" && (
              <Badge className="bg-green-100 text-green-800">
                <DollarSign className="h-3 w-3 mr-1" />
                Paid
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-stone-600">
            <MapPin className="h-3.5 w-3.5" />
            {job.property_address}
          </div>
          <div className="text-sm text-stone-500 mt-1">
            {job.property_type.replace(/_/g, " ")} • {scheduledTime}
            {job.team_members && job.team_members.length > 0 && (
              <span className="ml-2 text-stone-700">
                • Team: {job.team_members.join(", ")}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1 max-w-md">
                {cleaners
                  .filter((c) => ["active", "idle"].includes(c.status))
                  .map((cleaner) => (
                    <button
                      key={cleaner.paysheet_code}
                      onClick={() => toggleCleaner(cleaner.paysheet_code)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        selectedCleaners.includes(cleaner.paysheet_code)
                          ? "bg-[#2E1F16] text-white border-[#2E1F16]"
                          : "bg-white text-stone-700 border-stone-300 hover:border-[#B08A5E]"
                      }`}
                    >
                      {cleaner.first_name} {cleaner.last_name?.charAt(0)}
                    </button>
                  ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={assigning}
                  onClick={() => {
                    onAssign(selectedCleaners);
                    setIsEditing(false);
                  }}
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              {job.team_members && job.team_members.length > 0 ? "Edit Team" : "Assign"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    scheduled: "bg-[#F0E6D6] text-[#1C130D]",
    assigned: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] || "bg-stone-100 text-stone-800"}>{status.replace(/_/g, " ")}</Badge>;
}
