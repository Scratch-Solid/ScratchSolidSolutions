"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authFetch } from "@/lib/authFetch";
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Building2,
  AlertCircle,
  X,
} from "lucide-react";

const EMPTY_FORM = {
  name: "",
  id_number: "",
  email: "",
  phone: "",
  address: "",
  emergency_contact: "",
};

export default function AdminEmployeesPage() {
  const [tab, setTab] = useState<"new" | "existing">("new");
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [newJoiners, setNewJoiners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ paysheetCode: string; notificationsDelivered?: boolean; tempPassword?: string } | null>(null);
  const [actionError, setActionError] = useState("");
  const [actioningId, setActioningId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [cleanerRes, joinRes] = await Promise.allSettled([
        authFetch("/api/admin/cleaners"),
        authFetch("/api/admin/new-joiners?status=pending"),
      ]);
      const tokenInvalid = [cleanerRes, joinRes].every(
        (r): r is PromiseFulfilledResult<Response> =>
          r.status === "fulfilled" && r.value.status === 401
      );
      if (tokenInvalid) {
        window.location.href = "/auth/login";
        return;
      }
      if (cleanerRes.status === "fulfilled" && cleanerRes.value.ok) setCleaners(await cleanerRes.value.json());
      if (joinRes.status === "fulfilled" && joinRes.value.ok) {
        const j = await joinRes.value.json();
        setNewJoiners(j.data || j || []);
      }
    } catch {
      setError("Unable to load employees. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const existingRows = cleaners.map((c: any) => ({
    id: c.user_id,
    full_name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed",
    email: c.email,
    phone: c.cellphone,
    role: c.role,
    status: c.blocked ? "blocked" : (c.status || "active"),
    paysheet_code: c.paysheet_code,
  }));

  const filtered = (tab === "existing" ? existingRows : newJoiners).filter((e: any) => {
    const q = search.toLowerCase();
    const name = (e.full_name || e.fullName || e.name || "").toLowerCase();
    const email = (e.email || "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const handleApprove = async (id: number) => {
    setActionError("");
    setActioningId(id);
    try {
      const res = await authFetch(`/api/admin/new-joiners/${id}/approve`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data?.error?.message || data?.error || `Approval failed (${res.status})`);
        return;
      }
      setSuccessInfo({
        paysheetCode: data?.data?.paysheetCode || "",
        notificationsDelivered: data?.data?.notificationsDelivered,
        tempPassword: data?.data?.credentialsBackup?.tempPassword,
      });
      setNewJoiners((prev) => prev.filter((j) => j.id !== id));
      load();
    } catch {
      setActionError("Network error while approving. Please try again.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionError("");
    setActioningId(id);
    try {
      const res = await authFetch(`/api/admin/new-joiners/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: "Rejected by admin" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data?.error?.message || data?.error || `Rejection failed (${res.status})`);
        return;
      }
      setNewJoiners((prev) => prev.filter((j) => j.id !== id));
    } catch {
      setActionError("Network error while rejecting. Please try again.");
    } finally {
      setActioningId(null);
    }
  };

  const handleAddCleaner = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.id_number || !form.phone) {
      setFormError("Full name, ID/passport number, and phone are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch("/api/admin/employees/add", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error?.message || data.error || "Failed to create cleaner account");
        return;
      }
      setSuccessInfo({ paysheetCode: data.data.paysheetCode });
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      setTab("existing");
      load();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
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
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Employees</h1>
          <p className="text-sm text-stone-500 mt-1">Manage existing staff and review new applications.</p>
        </div>
        <Button onClick={() => { setSuccessInfo(null); setShowAddForm(true); }} className="gap-1.5 bg-[#2E1F16] hover:bg-[#2E1F16]/90">
          <Plus className="h-4 w-4" /> Add Cleaner
        </Button>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError("")} className="text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successInfo && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-center justify-between ${
          successInfo.notificationsDelivered === false
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-800"
        }`}>
          <span>
            {!successInfo.paysheetCode ? "Done." : successInfo.notificationsDelivered === false ? (
              <>
                Cleaner account active, but WhatsApp/email delivery didn&apos;t confirm - share these
                details directly: paysheet code (username) <strong>{successInfo.paysheetCode}</strong>,
                temporary password <strong>{successInfo.tempPassword}</strong>.
              </>
            ) : (
              <>Cleaner account active. Paysheet code (their login username): <strong>{successInfo.paysheetCode}</strong>. Login credentials were sent via WhatsApp/email where configured.</>
            )}
          </span>
          <button onClick={() => setSuccessInfo(null)} className={successInfo.notificationsDelivered === false ? "text-amber-700 hover:text-amber-900" : "text-emerald-600 hover:text-emerald-800"}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showAddForm && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Add Cleaner</CardTitle>
            <button onClick={() => setShowAddForm(false)} className="text-stone-400 hover:text-stone-600">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500 mb-4">
              Use this when you've already verified someone in person. It creates their account immediately -
              no separate application/approval step needed.
            </p>
            {formError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <form onSubmit={handleAddCleaner} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">ID / Passport Number *</label>
                <input
                  type="text"
                  required
                  value={form.id_number}
                  onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Address (optional)</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Emergency Contact (optional)</label>
                <input
                  type="text"
                  value={form.emergency_contact}
                  onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-[#B08A5E] focus:border-transparent"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-[#2E1F16] hover:bg-[#2E1F16]/90">
                  {submitting ? "Creating..." : "Create Cleaner Account"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="bg-white border border-stone-200">
            <TabsTrigger value="new" className="data-[state=active]:bg-[#2E1F16] data-[state=active]:text-white">
              New Joiners ({newJoiners.length})
            </TabsTrigger>
            <TabsTrigger value="existing" className="data-[state=active]:bg-[#2E1F16] data-[state=active]:text-white">
              Existing ({existingRows.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-[#2E1F16] focus:ring-1 focus:ring-[#2E1F16] transition-colors"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {tab === "new" ? "Pending Applications" : "Staff Directory"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-stone-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-stone-400">
              {tab === "new" ? "No pending applications" : "No employees found"}
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filtered.map((item: any) => (
                <div key={item.id} className="py-4 flex items-start sm:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-900">{item.full_name || item.fullName || item.name || "Unnamed"}</p>
                      {(item.role || item.paysheet_code) && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {item.role || item.paysheet_code}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      {item.email && (
                        <span className="flex items-center gap-1 text-xs text-stone-500">
                          <Mail className="h-3 w-3" /> {item.email}
                        </span>
                      )}
                      {item.phone && (
                        <span className="flex items-center gap-1 text-xs text-stone-500">
                          <Phone className="h-3 w-3" /> {item.phone}
                        </span>
                      )}
                      {item.positionAppliedFor && (
                        <span className="flex items-center gap-1 text-xs text-stone-500">
                          <Building2 className="h-3 w-3" /> {item.positionAppliedFor}
                        </span>
                      )}
                    </div>
                  </div>
                  {tab === "new" ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" disabled={actioningId === item.id} className="h-8 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleApprove(item.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> {actioningId === item.id ? "..." : "Approve"}
                      </Button>
                      <Button size="sm" variant="outline" disabled={actioningId === item.id} className="h-8 gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReject(item.id)}>
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  ) : (
                    <Badge className={item.status === "blocked" ? "bg-red-100 text-red-700 hover:bg-red-100" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"}>
                      {item.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
