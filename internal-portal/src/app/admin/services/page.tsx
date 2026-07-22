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
  Tag,
  MapPin,
} from "lucide-react";

export default function AdminServicesPage() {
  const [tab, setTab] = useState<"services" | "pricing" | "banking" | "promo" | "areas">("services");
  const [services, setServices] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [banking, setBanking] = useState<any>(null);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
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
    icon: "",
    display_order: "",
  });
  const [showAddService, setShowAddService] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    service_id: "",
    min_quantity: "",
    max_quantity: "",
    price: "",
    unit: "",
    client_type: "all",
    special_price: "",
    special_label: "",
    special_valid_from: "",
    special_valid_until: "",
  });
  const [showAddPricing, setShowAddPricing] = useState(false);
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    min_amount: "",
    max_uses: "",
    valid_until: "",
    applies_to: "both",
  });
  const [showAddArea, setShowAddArea] = useState(false);
  const [areaForm, setAreaForm] = useState({ name: "", transport_fee: "" });

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("authToken");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [svcRes, pricingRes, bankRes, promoRes, areasRes] = await Promise.allSettled([
          fetch("/api/admin/services", { headers }),
          fetch("/api/admin/service-pricing", { headers }),
          fetch("/api/admin/banking-details", { headers }),
          fetch("/api/promo-codes", { headers }),
          fetch("/api/admin/areas", { headers }),
        ]);
        // Only a genuine 401 (invalid/expired token) logs the user out. A 403
        // means valid session, insufficient permission — never clear the token.
        const tokenInvalid = [svcRes, pricingRes, bankRes, promoRes, areasRes].every(
          (r): r is PromiseFulfilledResult<Response> =>
            r.status === "fulfilled" && r.value.status === 401
        );
        if (token && tokenInvalid) {
          localStorage.removeItem("authToken");
          window.location.href = "/auth/login";
          return;
        }
        if (svcRes.status === "fulfilled" && svcRes.value.ok) setServices(await svcRes.value.json());
        if (pricingRes.status === "fulfilled" && pricingRes.value.ok) setPricing(await pricingRes.value.json());
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
        if (promoRes.status === "fulfilled" && promoRes.value.ok) setPromoCodes(await promoRes.value.json());
        if (areasRes.status === "fulfilled" && areasRes.value.ok) {
          const a = await areasRes.value.json();
          setAreas(a.areas || []);
        }
      } catch {
        setError("Unable to load data. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const addPromo = async () => {
    const token = localStorage.getItem("authToken");
    const res = await fetch("/api/promo-codes", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...promoForm,
        discount_value: parseFloat(promoForm.discount_value) || 0,
        min_amount: promoForm.min_amount ? parseFloat(promoForm.min_amount) : null,
        max_uses: promoForm.max_uses ? parseInt(promoForm.max_uses) : null,
        valid_until: promoForm.valid_until || null,
      }),
    });
    if (res.ok) {
      const token2 = localStorage.getItem("authToken");
      const refreshed = await fetch("/api/promo-codes", { headers: { Authorization: `Bearer ${token2}` } });
      if (refreshed.ok) setPromoCodes(await refreshed.json());
      setShowAddPromo(false);
      setPromoForm({ code: "", description: "", discount_type: "percentage", discount_value: "", min_amount: "", max_uses: "", valid_until: "", applies_to: "both" });
    }
  };

  const togglePromoActive = async (promo: any) => {
    const token = localStorage.getItem("authToken");
    const res = await fetch("/api/promo-codes", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...promo, is_active: !promo.is_active }),
    });
    if (res.ok) setPromoCodes((prev) => prev.map((p) => (p.id === promo.id ? { ...p, is_active: !p.is_active } : p)));
  };

  const deletePromo = async (id: number) => {
    if (!confirm("Delete this promo code?")) return;
    const token = localStorage.getItem("authToken");
    const res = await fetch(`/api/promo-codes?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPromoCodes((prev) => prev.filter((p) => p.id !== id));
  };

  const addArea = async () => {
    const token = localStorage.getItem("authToken");
    const res = await fetch("/api/admin/areas", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: areaForm.name, transport_fee: parseFloat(areaForm.transport_fee) || 0 }),
    });
    if (res.ok) {
      const created = await res.json();
      setAreas((prev) => [...prev, created]);
      setShowAddArea(false);
      setAreaForm({ name: "", transport_fee: "" });
    }
  };

  const deleteArea = async (id: number) => {
    if (!confirm("Remove this service area? Existing bookings there are unaffected.")) return;
    const token = localStorage.getItem("authToken");
    const res = await fetch(`/api/admin/areas?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setAreas((prev) => prev.filter((a) => a.id !== id));
  };

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
      body: JSON.stringify({
        name: serviceForm.name,
        description: serviceForm.description,
        icon: serviceForm.icon || null,
        display_order: serviceForm.display_order ? parseInt(serviceForm.display_order) : 0,
      }),
    });
    if (res.ok) {
      const token2 = localStorage.getItem("authToken");
      const refreshed = await fetch("/api/admin/services", { headers: { Authorization: `Bearer ${token2}` } });
      if (refreshed.ok) setServices(await refreshed.json());
      setShowAddService(false);
      setServiceForm({ name: "", description: "", icon: "", display_order: "" });
    }
  };

  const deleteService = async (id: number) => {
    if (!confirm("Remove this service? Existing bookings referencing it are unaffected.")) return;
    const token = localStorage.getItem("authToken");
    const res = await fetch(`/api/admin/services?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const addPricing = async () => {
    if (!pricingForm.service_id || !pricingForm.price) return;
    const token = localStorage.getItem("authToken");
    const res = await fetch("/api/admin/service-pricing", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: parseInt(pricingForm.service_id),
        min_quantity: pricingForm.min_quantity ? parseInt(pricingForm.min_quantity) : null,
        max_quantity: pricingForm.max_quantity ? parseInt(pricingForm.max_quantity) : null,
        price: parseFloat(pricingForm.price),
        unit: pricingForm.unit || null,
        client_type: pricingForm.client_type,
        special_price: pricingForm.special_price ? parseFloat(pricingForm.special_price) : null,
        special_label: pricingForm.special_label || undefined,
        special_valid_from: pricingForm.special_valid_from || null,
        special_valid_until: pricingForm.special_valid_until || null,
      }),
    });
    if (res.ok) {
      const token2 = localStorage.getItem("authToken");
      const refreshed = await fetch("/api/admin/service-pricing", { headers: { Authorization: `Bearer ${token2}` } });
      if (refreshed.ok) setPricing(await refreshed.json());
      setShowAddPricing(false);
      setPricingForm({ service_id: "", min_quantity: "", max_quantity: "", price: "", unit: "", client_type: "all", special_price: "", special_label: "", special_valid_from: "", special_valid_until: "" });
    }
  };

  const deletePricing = async (id: number) => {
    if (!confirm("Delete this pricing tier?")) return;
    const token = localStorage.getItem("authToken");
    const res = await fetch(`/api/admin/service-pricing?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPricing((prev) => prev.filter((p) => p.id !== id));
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
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Services & Banking</h1>
          <p className="text-sm text-stone-500 mt-1">Manage service offerings and company banking details.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-white border border-stone-200">
          <TabsTrigger value="services" className="data-[state=active]:bg-[#2E1F16] data-[state=active]:text-white">
            <Building2 className="h-4 w-4 mr-1.5" /> Services
          </TabsTrigger>
          <TabsTrigger value="pricing" className="data-[state=active]:bg-[#2E1F16] data-[state=active]:text-white">
            <DollarSign className="h-4 w-4 mr-1.5" /> Pricing
          </TabsTrigger>
          <TabsTrigger value="banking" className="data-[state=active]:bg-[#2E1F16] data-[state=active]:text-white">
            <Landmark className="h-4 w-4 mr-1.5" /> Banking
          </TabsTrigger>
          <TabsTrigger value="promo" className="data-[state=active]:bg-[#2E1F16] data-[state=active]:text-white">
            <Tag className="h-4 w-4 mr-1.5" /> Promo Codes
          </TabsTrigger>
          <TabsTrigger value="areas" className="data-[state=active]:bg-[#2E1F16] data-[state=active]:text-white">
            <MapPin className="h-4 w-4 mr-1.5" /> Service Areas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "services" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Service Catalog</CardTitle>
            <Button size="sm" className="gap-1 bg-[#2E1F16] hover:bg-[#2e1f16]/90" onClick={() => setShowAddService(true)}>
              <Plus className="h-4 w-4" /> Add Service
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500 mb-4">
              What clients see listed on the booking form. Set pricing for a service in the Pricing tab.
            </p>
            {showAddService && (
              <div className="mb-6 p-4 rounded-lg border border-stone-200 bg-stone-50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input placeholder="Service name" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  <input placeholder="Icon (optional)" value={serviceForm.icon} onChange={(e) => setServiceForm({ ...serviceForm, icon: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  <input placeholder="Display order" value={serviceForm.display_order} onChange={(e) => setServiceForm({ ...serviceForm, display_order: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                </div>
                <textarea placeholder="Description" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" rows={2} />
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
                  <div key={i} className="h-16 bg-stone-100 rounded animate-pulse" />
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-400">No services found</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {services.map((s: any) => (
                  <div key={s.id} className="py-4 flex items-start sm:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-stone-900">{s.name}</p>
                        <Badge variant="outline" className="text-[10px] font-normal">order {s.display_order ?? 0}</Badge>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5 truncate">{s.description}</p>
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

      {tab === "pricing" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Service Pricing</CardTitle>
            <Button size="sm" className="gap-1 bg-[#2E1F16] hover:bg-[#2e1f16]/90" onClick={() => setShowAddPricing(true)} disabled={services.length === 0}>
              <Plus className="h-4 w-4" /> Add Pricing Tier
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500 mb-4">
              Tiered pricing per service by quantity and client type. Bookings pick the matching tier automatically at quote time.
            </p>
            {services.length === 0 && (
              <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
                Add a service in the Services tab first before creating pricing tiers.
              </div>
            )}
            {showAddPricing && (
              <div className="mb-6 p-4 rounded-lg border border-stone-200 bg-stone-50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={pricingForm.service_id} onChange={(e) => setPricingForm({ ...pricingForm, service_id: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]">
                    <option value="">Select service…</option>
                    {services.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <select value={pricingForm.client_type} onChange={(e) => setPricingForm({ ...pricingForm, client_type: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]">
                    <option value="all">All clients</option>
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                  </select>
                  <input placeholder="Price (R)" value={pricingForm.price} onChange={(e) => setPricingForm({ ...pricingForm, price: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input placeholder="Min quantity (optional)" value={pricingForm.min_quantity} onChange={(e) => setPricingForm({ ...pricingForm, min_quantity: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  <input placeholder="Max quantity (optional)" value={pricingForm.max_quantity} onChange={(e) => setPricingForm({ ...pricingForm, max_quantity: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  <input placeholder="Unit (e.g. per hour, per room)" value={pricingForm.unit} onChange={(e) => setPricingForm({ ...pricingForm, unit: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input placeholder="Special price (optional)" value={pricingForm.special_price} onChange={(e) => setPricingForm({ ...pricingForm, special_price: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  <input placeholder="Special label" value={pricingForm.special_label} onChange={(e) => setPricingForm({ ...pricingForm, special_label: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  <input type="date" value={pricingForm.special_valid_from} onChange={(e) => setPricingForm({ ...pricingForm, special_valid_from: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  <input type="date" value={pricingForm.special_valid_until} onChange={(e) => setPricingForm({ ...pricingForm, special_valid_until: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={addPricing}>
                    <Save className="h-4 w-4" /> Save
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddPricing(false)}>
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              </div>
            )}
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-stone-100 rounded animate-pulse" />
                ))}
              </div>
            ) : pricing.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-400">No pricing tiers configured</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {pricing.map((p: any) => (
                  <div key={p.id} className="py-4 flex items-start sm:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-stone-900">{p.service_name || `Service #${p.service_id}`}</p>
                        <Badge variant="outline" className="text-[10px] font-normal">{p.client_type}</Badge>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-stone-400">
                        <span>R{p.price}{p.unit ? ` ${p.unit}` : ""}</span>
                        {(p.min_quantity || p.max_quantity) && (
                          <span>qty {p.min_quantity ?? "0"}–{p.max_quantity ?? "∞"}</span>
                        )}
                        {p.special_price && <span className="text-emerald-600">special R{p.special_price} ({p.special_label})</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deletePricing(p.id)}>
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
                    <label className="block text-xs font-medium text-stone-500 mb-1">Bank Name</label>
                    <input value={bankingForm.bank_name} onChange={(e) => setBankingForm({ ...bankingForm, bank_name: e.target.value })} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1">Account Number</label>
                    <input value={bankingForm.account_number} onChange={(e) => setBankingForm({ ...bankingForm, account_number: e.target.value })} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1">Account Holder</label>
                    <input value={bankingForm.account_holder} onChange={(e) => setBankingForm({ ...bankingForm, account_holder: e.target.value })} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1">Branch Code</label>
                    <input value={bankingForm.branch_code} onChange={(e) => setBankingForm({ ...bankingForm, branch_code: e.target.value })} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
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
                  <div key={i} className="h-10 bg-stone-100 rounded animate-pulse" />
                ))}
              </div>
            ) : !banking ? (
              <div className="py-12 text-center text-sm text-stone-400">No banking details configured</div>
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

      {tab === "promo" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Promo Codes</CardTitle>
            <Button size="sm" className="gap-1 bg-[#2E1F16] hover:bg-[#2e1f16]/90" onClick={() => setShowAddPromo(true)}>
              <Plus className="h-4 w-4" /> Add Promo Code
            </Button>
          </CardHeader>
          <CardContent>
            {showAddPromo && (
              <div className="mb-6 p-4 rounded-lg border border-stone-200 bg-stone-50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input placeholder="Code (e.g. WELCOME10)" value={promoForm.code} onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  <select value={promoForm.discount_type} onChange={(e) => setPromoForm({ ...promoForm, discount_type: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]">
                    <option value="percentage">Percentage off</option>
                    <option value="fixed">Fixed amount off (R)</option>
                  </select>
                  <input placeholder={promoForm.discount_type === "percentage" ? "Discount %" : "Discount R"} value={promoForm.discount_value} onChange={(e) => setPromoForm({ ...promoForm, discount_value: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input placeholder="Min order amount (R, optional)" value={promoForm.min_amount} onChange={(e) => setPromoForm({ ...promoForm, min_amount: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  <input placeholder="Max uses (optional)" value={promoForm.max_uses} onChange={(e) => setPromoForm({ ...promoForm, max_uses: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  <input type="date" placeholder="Valid until (optional)" value={promoForm.valid_until} onChange={(e) => setPromoForm({ ...promoForm, valid_until: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={promoForm.applies_to} onChange={(e) => setPromoForm({ ...promoForm, applies_to: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]">
                    <option value="both">Applies to: Cleaning + Digital</option>
                    <option value="cleaning">Applies to: Cleaning only</option>
                    <option value="digital">Applies to: Digital only</option>
                  </select>
                </div>
                <textarea placeholder="Description" value={promoForm.description} onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" rows={2} />
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={addPromo}>
                    <Save className="h-4 w-4" /> Save
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddPromo(false)}>
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              </div>
            )}
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-stone-100 rounded animate-pulse" />
                ))}
              </div>
            ) : promoCodes.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-400">No promo codes yet</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {promoCodes.map((p: any) => (
                  <div key={p.id} className="py-4 flex items-start sm:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono font-semibold text-stone-900">{p.code}</p>
                        <Badge className={p.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0" : "bg-stone-100 text-stone-500 hover:bg-stone-100 border-0"}>
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {p.applies_to && p.applies_to !== "both" && (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 capitalize">{p.applies_to} only</Badge>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">{p.description}</p>
                      <div className="flex gap-4 mt-1 text-xs text-stone-400">
                        <span>{p.discount_type === "percentage" ? `${p.discount_value}% off` : `R${p.discount_value} off`}</span>
                        <span>{p.used_count || 0}{p.max_uses ? ` / ${p.max_uses}` : ""} used</span>
                        {p.valid_until && <span>Expires {p.valid_until}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => togglePromoActive(p)}>
                        {p.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deletePromo(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "areas" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Service Areas</CardTitle>
            <Button size="sm" className="gap-1 bg-[#2E1F16] hover:bg-[#2e1f16]/90" onClick={() => setShowAddArea(true)}>
              <Plus className="h-4 w-4" /> Add Area
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-stone-500 mb-4">
              Areas shown to clients when booking, each with a transport fee added to the quote.
              Adding an area here makes it available immediately — no deploy needed.
            </p>
            {showAddArea && (
              <div className="mb-6 p-4 rounded-lg border border-stone-200 bg-stone-50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Area / suburb name" value={areaForm.name} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                  <input placeholder="Transport fee (R)" value={areaForm.transport_fee} onChange={(e) => setAreaForm({ ...areaForm, transport_fee: e.target.value })} className="rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#2E1F16]" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={addArea}>
                    <Save className="h-4 w-4" /> Save
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddArea(false)}>
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              </div>
            )}
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-stone-100 rounded animate-pulse" />
                ))}
              </div>
            ) : areas.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-400">No service areas configured</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {areas.map((a: any) => (
                  <div key={a.id} className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{a.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">Transport fee: R{a.transport_fee}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteArea(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
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
      <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-stone-900 mt-0.5">{value || "—"}</p>
    </div>
  );
}
