"use client";

import { useEffect, useState } from "react";

interface LeaveBalance {
  leave_type: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
  year: number;
  cycle_start_date: string | null;
  cycle_end_date: string | null;
}

interface LeaveRequest {
  id: number;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  sick: "Sick Leave",
  annual: "Annual Leave",
  personal: "Personal Leave",
  other: "Other",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-warning",
  approved: "badge-success",
  rejected: "badge-error",
  cancelled: "badge-info",
};

export default function LeaveSection() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ type: "annual", start_date: "", end_date: "", reason: "" });

  const authHeaders = () => ({
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("authToken") : ""}`,
  });

  async function loadData() {
    setLoading(true);
    try {
      const [balanceRes, requestsRes] = await Promise.all([
        fetch("/api/staff/leave/balance", { headers: authHeaders() }),
        fetch("/api/staff/leave", { headers: authHeaders() }),
      ]);
      if (balanceRes.ok) {
        const data = await balanceRes.json() as { data?: LeaveBalance[] };
        setBalances(data.data || []);
      }
      if (requestsRes.ok) {
        const data = await requestsRes.json() as { data?: LeaveRequest[] };
        setRequests(data.data || []);
      }
    } catch {
      setError("Unable to load leave information. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/staff/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { error?: string };
      if (res.ok) {
        setMessage("Leave request submitted - awaiting admin approval.");
        setForm({ type: "annual", start_date: "", end_date: "", reason: "" });
        loadData();
      } else {
        setError(data.error || "Failed to submit leave request");
      }
    } catch {
      setError("Network error while submitting leave request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="glass-card p-6 text-center" style={{ color: "var(--text-light)" }}>Loading leave information...</div>;
  }

  return (
    <div className="space-y-6">
      {error && <div className="error-msg">{error}</div>}
      {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{message}</div>}

      <div className="glass-card p-6">
        <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-h)" }}>Leave Balance</h3>
        {balances.length === 0 ? (
          <div className="text-center py-4" style={{ color: "var(--text-light)" }}>No leave balance on record.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {balances.map((b) => (
              <div key={b.leave_type} className="bg-white/5 rounded-lg p-4" style={{ borderColor: "var(--border)" }}>
                <div className="font-semibold mb-2" style={{ color: "var(--text-h)" }}>
                  {LEAVE_TYPE_LABELS[b.leave_type] || b.leave_type}
                </div>
                <div className="text-sm space-y-1" style={{ color: "var(--text)" }}>
                  <div>Remaining: <strong>{b.remaining_days}</strong> of {b.total_days} days</div>
                  <div>Used: {b.used_days} days</div>
                  {b.cycle_start_date && b.cycle_end_date && (
                    <div className="text-xs" style={{ color: "var(--text-light)" }}>
                      Cycle: {b.cycle_start_date} to {b.cycle_end_date}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-h)" }}>Request Leave</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full"
              >
                <option value="annual">Annual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="personal">Personal Leave</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>Start Date</label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>End Date</label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                className="w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>Reason (optional)</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
              className="w-full"
              rows={2}
            />
          </div>
          <button type="submit" disabled={submitting} className="primary-button">
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-h)" }}>My Leave Requests</h3>
        {requests.length === 0 ? (
          <div className="text-center py-4" style={{ color: "var(--text-light)" }}>No leave requests yet.</div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="bg-white/5 rounded-lg p-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold" style={{ color: "var(--text-h)" }}>
                      {LEAVE_TYPE_LABELS[r.type] || r.type} - {r.days} day{r.days === 1 ? "" : "s"}
                    </div>
                    <div className="text-sm" style={{ color: "var(--text-light)" }}>
                      {r.start_date} to {r.end_date}
                    </div>
                    {r.reason && <div className="text-sm mt-1" style={{ color: "var(--text)" }}>{r.reason}</div>}
                    {r.status === "rejected" && r.rejection_reason && (
                      <div className="text-sm mt-1 text-red-600">Reason: {r.rejection_reason}</div>
                    )}
                  </div>
                  <span className={`badge ${STATUS_BADGE[r.status] || "badge-info"}`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
