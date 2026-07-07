"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Building2,
  Landmark,
  Plus,
  AlertCircle,
  Pencil,
  Trash2,
  Save,
  X,
} from "lucide-react";

export default function AdminServicesPage() {
  const [tab, setTab] = useState<"services" | "banking">("services");
  const [services, setServices] = useState<any[]>([]);
  const [banking, setBanking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingBanking, setEditingBanking] = useState(false);
  const [bankingForm, setBankingForm] = useState({
    bank_name: "",
    account_number: "",
    account_holder: "",
    branch_code: "",
    account_type: "current",
  });
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    base_price: "",
    duration_hours: "",
    category: "standard",
  });
  const [showAddService, setShowAddService] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("authToken");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [svcRes, bankRes] = await Promise.allSettled([
          fetch("/api/admin/services", { headers }),
          fetch("/api/admin/banking-details", { headers }),
        ]);
        const authError = [svcRes, bankRes].find(
          (r): r is PromiseFulfilledResult<Response> =>
            r.status === "fulfilled" && (r.value.status === 401 || r.value.status === 403)
        );
        if (authError) {
          localStorage.removeItem("authToken");
          window.location.href = "/auth/login";
          return;
        }
        if (svcRes.status === "fulfilled" && svcRes.value.ok) setServices(await svcRes.value.json());
        if (bankRes.status === "fulfilled" && bankRes.value.ok) {
          const b = await bankRes.value.json();
          setBanking(b);
          if (b) setBankingForm({
            bank_name: b.bank_name || "",
            account_number: b.account_number || "",
            account_holder: b.account_holder || "",
            branch_code: b.branch_code || "",
            account_type: b.account_type || "current",
          });
        }
      } catch {
        setError("Unable to load data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const saveBanking = async () => {
    const token = localStorage.getItem("authToken");
    const res = await fetch("/api/admin/banking-details", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(bankingForm),
    });
    if (res.ok) {
      setBanking(bankingForm);
      setEditingBanking(false);
    }
  };

  const addService = async () => {
    const token = localStorage.getItem("authToken");
    const res = await fetch("/api/admin/services", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(serviceForm),
    });
    if (res.ok) {
      const created = await res.json();
      setServices((prev) => [...prev, created]);
      setShowAddService(false);
      setServiceForm({ name: "", description: "", base_price: "", duration_hours: "", category: "standard" });
    }
  };

  const deleteService = async (id: number) => {
    if (!confirm("Delete this service?")) return;
    const token = localStorage.getItem("authToken");
    const res = await fetch(`/api/admin/services?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setServices((prev) => prev.filter((s) => s.id !== id));
  };

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Services & Banking</h1>
          <p className="text-sm text-slate-500 mt-1">Manage service offerings and company banking details.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="services" className="data-[state=active]:bg-[#1E3A8A] data-[state=active]:text-white">
            <DollarSign className="h-4 w-4 mr-1.5" /> Services
          </TabsTrigger>
          <TabsTrigger value="banking" className="data-[state=active]:bg-[#1E3A8A] data-[state=active]:text-white">
            <Landmark className="h-4 w-4 mr-1.5" /> Banking
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "services" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Service Catalog</CardTitle>
            <Button size="sm" className="gap-1 bg-[#1E3A8A] hover:bg-[#1e3a8a]/90" onClick={() => setShowAddService(true)}>
              <Plus className="h-4 w-4" /> Add Service
            </Button>
          </CardHeader>
          <CardContent>
            {showAddService && (
              <div className="mb-6 p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input placeholder="Service name" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]" />
                  <input placeholder="Base price (R)" value={serviceForm.base_price} onChange={(e) => setServiceForm({ ...serviceForm, base_price: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]" />
                  <input placeholder="Duration (hours)" value={serviceForm.duration_hours} onChange={(e) => setServiceForm({ ...serviceForm, duration_hours: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]" />
                </div>
                <textarea placeholder="Description" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]" rows={2} />
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={addService}>
                    <Save className="h-4 w-4" /> Save
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddService(false)}>
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              </div>
            )}
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No services found</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {services.map((s: any) => (
                  <div key={s.id} className="py-4 flex items-start sm:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{s.name}</p>
                        <Badge variant="outline" className="text-[10px] font-normal">{s.category || "standard"}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{s.description}</p>
                      <div className="flex gap-4 mt-1 text-xs text-slate-400">
                        <span>R{s.base_price}</span>
                        <span>{s.duration_hours}h</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteService(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "banking" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Banking Details</CardTitle>
            {!editingBanking && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditingBanking(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingBanking ? (
              <div className="space-y-3 max-w-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Bank Name</label>
                    <input value={bankingForm.bank_name} onChange={(e) => setBankingForm({ ...bankingForm, bank_name: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Account Number</label>
                    <input value={bankingForm.account_number} onChange={(e) => setBankingForm({ ...bankingForm, account_number: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Account Holder</label>
                    <input value={bankingForm.account_holder} onChange={(e) => setBankingForm({ ...bankingForm, account_holder: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Branch Code</label>
                    <input value={bankingForm.branch_code} onChange={(e) => setBankingForm({ ...bankingForm, branch_code: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1E3A8A]" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={saveBanking}>
                    <Save className="h-4 w-4" /> Save
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditingBanking(false)}>
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : !banking ? (
              <div className="py-12 text-center text-sm text-slate-400">No banking details configured</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                <Field label="Bank Name" value={banking.bank_name} />
                <Field label="Account Number" value={banking.account_number} />
                <Field label="Account Holder" value={banking.account_holder} />
                <Field label="Branch Code" value={banking.branch_code} />
                <Field label="Account Type" value={banking.account_type} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-0.5">{value || "—"}</p>
    </div>
  );
}
