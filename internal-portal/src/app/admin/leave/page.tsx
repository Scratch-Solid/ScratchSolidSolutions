"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface LeaveRequest {
  id: number;
  user_id: number;
  staff_name: string;
  staff_role: string;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  created_at: string;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  sick: "Sick Leave",
  annual: "Annual Leave",
  personal: "Personal Leave",
  other: "Other",
};

export default function AdminLeavePage() {
  const router = useRouter();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
    if (!token || role !== "admin") {
      router.push("/auth/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, statusFilter]);

  const authHeaders = () => ({
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("authToken") : ""}`,
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const url = statusFilter === "pending" ? "/api/admin/leave?status=pending" : "/api/admin/leave";
      const res = await fetch(url, { headers: authHeaders() });
      if (res.ok) {
        const data = (await res.json()) as { data?: LeaveRequest[] };
        setRequests(data.data || []);
      } else {
        setError("Failed to load leave requests");
      }
    } catch {
      setError("Network error while loading leave requests");
    } finally {
      setLoading(false);
    }
  }

  const handleDecision = async (id: number, action: "approve" | "reject") => {
    let rejection_reason: string | undefined;
    if (action === "reject") {
      rejection_reason = prompt("Reason for declining (optional):") || undefined;
    }
    setProcessingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/leave/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action, rejection_reason }),
      });
      if (res.ok) {
        await load();
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "Failed to process leave request");
      }
    } catch {
      setError("Network error while processing leave request");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  if (loading) return <div className="py-8 text-sm text-stone-400">Loading leave requests…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Leave Requests</h1>
        <p className="text-sm text-stone-500 mt-1">Review and approve or decline staff leave requests.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setStatusFilter("pending")}
          className={`px-5 py-2 rounded-lg font-medium transition-colors ${
            statusFilter === "pending"
              ? "bg-orange-600 text-white"
              : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          Pending{statusFilter === "pending" ? ` (${pendingCount})` : ""}
        </button>
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-5 py-2 rounded-lg font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-orange-600 text-white"
              : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          All requests
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <p className="text-stone-500 text-lg">
            {statusFilter === "pending" ? "No pending leave requests." : "No leave requests found."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {requests.map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-stone-900">{r.staff_name}</p>
                    <span className="text-xs text-stone-400 capitalize">({r.staff_role})</span>
                  </div>
                  <p className="text-sm text-stone-700 mt-1">
                    {LEAVE_TYPE_LABELS[r.type] || r.type} · {r.start_date} to {r.end_date} ({r.days} day{r.days === 1 ? "" : "s"})
                  </p>
                  {r.reason && <p className="text-sm text-stone-500 mt-1 italic">&ldquo;{r.reason}&rdquo;</p>}
                  <span
                    className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.status === "pending"
                        ? "bg-orange-50 text-orange-700"
                        : r.status === "approved"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                {r.status === "pending" && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleDecision(r.id, "approve")}
                      disabled={processingId === r.id}
                      className="px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {processingId === r.id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleDecision(r.id, "reject")}
                      disabled={processingId === r.id}
                      className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
