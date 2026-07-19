"use client";

import { useEffect, useState } from "react";

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

export default function AdminLeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");

  const authHeaders = () => ({
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("authToken") : ""}`,
  });

  async function load() {
    setLoading(true);
    try {
      const url = statusFilter === "pending" ? "/api/admin/leave?status=pending" : "/api/admin/leave";
      const res = await fetch(url, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json() as { data?: LeaveRequest[] };
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleDecision = async (id: number, action: "approve" | "reject") => {
    if (action === "reject") {
      const reason = prompt("Reason for declining (optional):") || undefined;
      await processDecision(id, action, reason);
      return;
    }
    await processDecision(id, action);
  };

  const processDecision = async (id: number, action: "approve" | "reject", rejection_reason?: string) => {
    setProcessingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/leave/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action, rejection_reason }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error || "Failed to process leave request");
      }
    } catch {
      setError("Network error while processing leave request");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg" style={{ color: "var(--text-h)" }}>Leave Requests</h3>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "pending" | "all")}
          className="text-sm"
        >
          <option value="pending">Pending only</option>
          <option value="all">All requests</option>
        </select>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="text-center py-8" style={{ color: "var(--text-light)" }}>Loading...</div>
      ) : requests.length === 0 ? (
        <p className="text-stone-500 bg-white p-6 rounded-lg shadow">
          {statusFilter === "pending" ? "No pending leave requests." : "No leave requests found."}
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="glass-card p-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="font-semibold" style={{ color: "var(--text-h)" }}>
                    {r.staff_name} <span className="text-xs font-normal" style={{ color: "var(--text-light)" }}>({r.staff_role})</span>
                  </div>
                  <div className="text-sm" style={{ color: "var(--text)" }}>
                    {LEAVE_TYPE_LABELS[r.type] || r.type} - {r.start_date} to {r.end_date} ({r.days} day{r.days === 1 ? "" : "s"})
                  </div>
                  {r.reason && <div className="text-sm mt-1" style={{ color: "var(--text-light)" }}>&ldquo;{r.reason}&rdquo;</div>}
                  <div className="text-xs mt-1">
                    <span className={`badge ${r.status === "pending" ? "badge-warning" : r.status === "approved" ? "badge-success" : "badge-error"}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleDecision(r.id, "approve")}
                      disabled={processingId === r.id}
                      className="px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecision(r.id, "reject")}
                      disabled={processingId === r.id}
                      className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
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
