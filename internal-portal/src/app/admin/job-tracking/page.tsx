"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";

interface JobRow {
  id: string;
  client_name: string;
  property_address: string;
  service_type: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  started_at: string | null;
  arrived_at: string | null;
  arrived_at_whatsapp: string | null;
  arrived_at_gps: string | null;
  completed_at: string | null;
  completed_at_whatsapp: string | null;
  completed_at_gps: string | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Backs the "guaranteed time on site" promise with an actual check: how long
// was the cleaner really there, against what was promised for this job. A
// 10-minute grace buffer avoids flagging normal WhatsApp-report lag as a
// short visit.
const SHORT_VISIT_GRACE_MINUTES = 10;

function getDurationCheck(job: JobRow): { actualMinutes: number; isShort: boolean } | null {
  if (!job.arrived_at || !job.completed_at) return null;
  const actualMinutes = (new Date(job.completed_at).getTime() - new Date(job.arrived_at).getTime()) / 60000;
  const isShort = actualMinutes < job.duration_minutes - SHORT_VISIT_GRACE_MINUTES;
  return { actualMinutes, isShort };
}

function ConfirmationBadge({ whatsapp, gps }: { whatsapp: string | null; gps: string | null }) {
  if (whatsapp && gps) {
    return <Badge className="bg-green-100 text-green-800">WhatsApp + GPS confirm</Badge>;
  }
  if (whatsapp && !gps) {
    return <Badge className="bg-amber-100 text-amber-800">WhatsApp only</Badge>;
  }
  if (!whatsapp && gps) {
    return <Badge className="bg-blue-100 text-blue-800">GPS only (backup used)</Badge>;
  }
  return <Badge className="bg-stone-100 text-stone-500">Not yet reported</Badge>;
}

export default function JobTrackingPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("authToken");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch(`/api/v2/supervisor/jobs?date=${today}`, { headers });
        if (res.status === 401) {
          localStorage.removeItem("authToken");
          window.location.href = "/auth/login";
          return;
        }
        if (res.ok) {
          const data = await res.json() as { data: JobRow[] };
          setJobs(data.data || []);
        } else {
          setError("Unable to load today's jobs.");
        }
      } catch {
        setError("Unable to load today's jobs. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="p-6 text-stone-500">Loading job tracking...</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Job tracking</h1>
        <p className="text-sm text-stone-500 mt-1">
          Today's jobs, with arrival and completion confirmed by WhatsApp, GPS, or both. GPS only fills a
          timestamp when WhatsApp never reports it, so "GPS only" means the backup already did its job.
        </p>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {jobs.length === 0 && !error && (
        <Card><CardContent className="p-6 text-stone-500 text-sm">No jobs scheduled for today.</CardContent></Card>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{job.client_name} — {job.property_address}</span>
                <span className="text-xs font-normal text-stone-500">{formatTime(job.scheduled_at)} · {job.service_type}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-stone-600 mb-1">Arrived</div>
                  <div className="text-sm text-stone-800 mb-1">
                    {formatTime(job.arrived_at)}
                    {job.arrived_at_whatsapp && <span className="text-xs text-stone-500"> · WhatsApp {formatTime(job.arrived_at_whatsapp)}</span>}
                    {job.arrived_at_gps && <span className="text-xs text-stone-500"> · GPS {formatTime(job.arrived_at_gps)}</span>}
                  </div>
                  <ConfirmationBadge whatsapp={job.arrived_at_whatsapp} gps={job.arrived_at_gps} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-600 mb-1">Completed</div>
                  <div className="text-sm text-stone-800 mb-1">
                    {formatTime(job.completed_at)}
                    {job.completed_at_whatsapp && <span className="text-xs text-stone-500"> · WhatsApp {formatTime(job.completed_at_whatsapp)}</span>}
                    {job.completed_at_gps && <span className="text-xs text-stone-500"> · GPS {formatTime(job.completed_at_gps)}</span>}
                  </div>
                  <ConfirmationBadge whatsapp={job.completed_at_whatsapp} gps={job.completed_at_gps} />
                </div>
              </div>
              {(() => {
                const durationCheck = getDurationCheck(job);
                return (
                  <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <div className="text-xs font-semibold text-stone-600">
                      Time on site <span className="font-normal text-stone-400">(promised {formatDuration(job.duration_minutes)})</span>
                    </div>
                    {durationCheck ? (
                      durationCheck.isShort ? (
                        <Badge className="bg-red-100 text-red-800">
                          Short visit — {formatDuration(durationCheck.actualMinutes)}
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">
                          {formatDuration(durationCheck.actualMinutes)} on site
                        </Badge>
                      )
                    ) : (
                      <Badge className="bg-stone-100 text-stone-500">Not completed yet</Badge>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
