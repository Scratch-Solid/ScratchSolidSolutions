"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, FolderKanban, ChevronRight, Layers, Receipt, FileText, MessageSquare, Inbox } from "lucide-react";

type Project = {
  id: number;
  name: string;
  description: string;
  status: string;
  client_name?: string;
  client_email?: string;
  start_date?: string;
  end_date?: string;
};

type ProjectDetail = Project & {
  phases: { id: number; name: string; status: string; order_index: number }[];
  milestones: { id: number; name: string; status: string; billing_status: string; amount: number; due_date?: string }[];
  files: { id: number; file_name: string; file_url: string; file_type: string }[];
  updates: { id: number; message: string; created_at: string }[];
};

type IntakeRequest = {
  id: number;
  email: string;
  name: string;
  company_name: string;
  status: string;
  support_tier: string;
  support_monthly_rate: number;
  converted_project_id: number | null;
  created_at: string;
  total_price?: number;
  deposit_amount?: number;
  deposit_paid_at?: string | null;
};

type IntakeIteration = { id: number; iteration_number: number; prompt_text: string; generated_html: string; created_at: string };

type PageListItem = { type: string; label: string; included?: boolean };

type IntakeDetail = IntakeRequest & {
  who_target_users: string;
  what_description: string;
  why_description: string;
  when_timeline: string;
  where_context: string;
  how_description: string;
  backend_interaction_description: string;
  logo_file_url: string;
  color_theme: string;
  support_min_term_months: number;
  iterations: IntakeIteration[];
  page_list?: string;
  base_fee?: number;
  pages_subtotal?: number;
  promo_code?: string | null;
  discount_amount?: number;
  has_custom_items?: number;
  deposit_payment_ref?: string | null;
  final_amount?: number;
  final_paid_at?: string | null;
};

const SUPPORT_TIER_LABELS: Record<string, string> = {
  warranty: "Warranty only",
  standard: "Standard support",
  growth: "Growth support",
  partner: "Partner retainer",
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function intakeStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "confirmed") return "default";
  if (status === "converted") return "secondary";
  if (status === "abandoned") return "destructive";
  return "outline";
}

export default function DigitalProjectsPage() {
  const [activeTab, setActiveTab] = useState<"incoming" | "projects">("incoming");

  // ── Projects (existing) ──
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [projectForm, setProjectForm] = useState({ client_email: "", name: "", description: "" });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [phaseForm, setPhaseForm] = useState({ name: "" });
  const [milestoneForm, setMilestoneForm] = useState({ name: "", amount: "", due_date: "" });
  const [updateMessage, setUpdateMessage] = useState("");

  // ── Incoming intake requests (new) ──
  const [intakeRequests, setIntakeRequests] = useState<IntakeRequest[]>([]);
  const [intakeLoading, setIntakeLoading] = useState(true);
  const [intakeError, setIntakeError] = useState("");
  const [selectedIntakeId, setSelectedIntakeId] = useState<number | null>(null);
  const [intakeDetail, setIntakeDetail] = useState<IntakeDetail | null>(null);
  const [intakeDetailLoading, setIntakeDetailLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState("");

  async function loadProjects() {
    try {
      const res = await fetch("/api/admin/projects", { headers: authHeaders() });
      if (res.status === 401) {
        localStorage.removeItem("authToken");
        window.location.href = "/auth/login";
        return;
      }
      if (res.ok) setProjects(await res.json());
      else setError("Unable to load projects.");
    } catch {
      setError("Unable to load projects. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function loadIntakeRequests() {
    try {
      const res = await fetch("/api/admin/intake", { headers: authHeaders() });
      if (res.ok) setIntakeRequests(await res.json());
      else setIntakeError("Unable to load incoming requests.");
    } catch {
      setIntakeError("Unable to load incoming requests. Please check your connection and try again.");
    } finally {
      setIntakeLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
    loadIntakeRequests();
  }, []);

  async function loadDetail(id: number) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}`, { headers: authHeaders() });
      if (res.ok) setDetail(await res.json());
    } finally {
      setDetailLoading(false);
    }
  }

  function selectProject(id: number) {
    setSelectedId(id);
    setDetail(null);
    loadDetail(id);
  }

  async function loadIntakeDetail(id: number) {
    setIntakeDetailLoading(true);
    setConvertError("");
    try {
      const res = await fetch(`/api/admin/intake/${id}`, { headers: authHeaders() });
      if (res.ok) setIntakeDetail(await res.json());
    } finally {
      setIntakeDetailLoading(false);
    }
  }

  function selectIntake(id: number) {
    setSelectedIntakeId(id);
    setIntakeDetail(null);
    loadIntakeDetail(id);
  }

  async function convertIntake() {
    if (!selectedIntakeId) return;
    setConverting(true);
    setConvertError("");
    try {
      const res = await fetch(`/api/admin/intake/${selectedIntakeId}/convert`, {
        method: "POST",
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        await Promise.all([loadIntakeRequests(), loadProjects()]);
        loadIntakeDetail(selectedIntakeId);
        setActiveTab("projects");
      } else {
        setConvertError(body.error || "Could not convert this request.");
      }
    } catch {
      setConvertError("Network error while converting this request.");
    } finally {
      setConverting(false);
    }
  }

  async function addProject() {
    if (!projectForm.client_email || !projectForm.name) return;
    const res = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(projectForm),
    });
    if (res.ok) {
      await loadProjects();
      setShowAddProject(false);
      setProjectForm({ client_email: "", name: "", description: "" });
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Could not create project.");
    }
  }

  async function addPhase() {
    if (!selectedId || !phaseForm.name) return;
    const res = await fetch(`/api/admin/projects/${selectedId}/phases`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name: phaseForm.name, order_index: detail?.phases.length || 0 }),
    });
    if (res.ok) {
      setPhaseForm({ name: "" });
      loadDetail(selectedId);
    }
  }

  async function addMilestone() {
    if (!selectedId || !milestoneForm.name) return;
    const res = await fetch(`/api/admin/projects/${selectedId}/milestones`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        name: milestoneForm.name,
        amount: parseFloat(milestoneForm.amount) || 0,
        due_date: milestoneForm.due_date || null,
      }),
    });
    if (res.ok) {
      setMilestoneForm({ name: "", amount: "", due_date: "" });
      loadDetail(selectedId);
    }
  }

  async function setMilestoneBilling(milestoneId: number, billing_status: string) {
    if (!selectedId) return;
    const res = await fetch(`/api/admin/projects/${selectedId}/milestones`, {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ id: milestoneId, billing_status }),
    });
    if (res.ok) loadDetail(selectedId);
  }

  async function setPhaseStatus(phaseId: number, status: string) {
    if (!selectedId) return;
    const res = await fetch(`/api/admin/projects/${selectedId}/phases`, {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ id: phaseId, status }),
    });
    if (res.ok) loadDetail(selectedId);
  }

  async function postUpdate() {
    if (!selectedId || !updateMessage.trim()) return;
    const res = await fetch(`/api/admin/projects/${selectedId}/updates`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ message: updateMessage.trim() }),
    });
    if (res.ok) {
      setUpdateMessage("");
      loadDetail(selectedId);
    }
  }

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

  const pendingCount = intakeRequests.filter((r) => r.status === "awaiting_confirmation" || r.status === "confirmed" || r.status === "draft" || r.status === "generating").length;
  const latestIteration = intakeDetail?.iterations?.[intakeDetail.iterations.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Digital Projects</h1>
          <p className="text-sm text-stone-500 mt-1">
            Incoming client requests wait here until a staff member reviews the brief and mockup, then converts them into a real project.
          </p>
        </div>
        {activeTab === "projects" && (
          <Button onClick={() => setShowAddProject((v) => !v)} size="sm" className="bg-[#2E1F16] hover:bg-[#241811]">
            <Plus className="h-4 w-4 mr-1.5" /> New Project
          </Button>
        )}
      </div>

      <div className="inline-flex rounded-lg border border-stone-200 overflow-hidden">
        <button
          onClick={() => setActiveTab("incoming")}
          className={`px-4 py-2 text-sm font-semibold border-r border-stone-200 ${activeTab === "incoming" ? "bg-[#2E1F16] text-white" : "bg-white text-stone-500 hover:bg-stone-50"}`}
        >
          Incoming requests {!intakeLoading && <span className={`ml-1.5 rounded-full px-1.5 text-xs ${activeTab === "incoming" ? "bg-[#B08A5E] text-[#2E1F16]" : "bg-amber-100 text-amber-700"}`}>{pendingCount}</span>}
        </button>
        <button
          onClick={() => setActiveTab("projects")}
          className={`px-4 py-2 text-sm font-semibold ${activeTab === "projects" ? "bg-[#2E1F16] text-white" : "bg-white text-stone-500 hover:bg-stone-50"}`}
        >
          All projects
        </button>
      </div>

      {activeTab === "incoming" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr] items-start">
          <Card>
            <CardHeader><CardTitle>Requests{intakeLoading ? "" : ` (${intakeRequests.length})`}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {intakeLoading && <p className="text-sm text-stone-500">Loading…</p>}
              {intakeError && <p className="text-sm text-red-500">{intakeError}</p>}
              {!intakeLoading && !intakeError && intakeRequests.length === 0 && (
                <p className="text-sm text-stone-500">No project requests yet.</p>
              )}
              {intakeRequests.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectIntake(r.id)}
                  className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selectedIntakeId === r.id ? "border-[#B08A5E] bg-[#F7F2EA]" : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <Inbox className="h-4 w-4 text-[#8a6a45] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-stone-900 truncate">{r.company_name || r.name}</div>
                    <div className="text-xs text-stone-500 truncate">{r.email}</div>
                    {!!r.total_price && <div className="text-xs text-stone-400">R{r.total_price.toLocaleString()} build</div>}
                  </div>
                  <Badge variant={intakeStatusVariant(r.status)} className="shrink-0">{r.status.replace("_", " ")}</Badge>
                  {r.status === "confirmed" && (
                    <Badge className={`shrink-0 border-0 ${r.deposit_paid_at ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}`}>
                      {r.deposit_paid_at ? "Deposit paid" : "Awaiting deposit"}
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-stone-400 shrink-0" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{intakeDetail ? (intakeDetail.company_name || intakeDetail.name) : "Select a request"}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {!selectedIntakeId && <p className="text-sm text-stone-500">Pick a request from the list to see the full brief and confirmed mockup.</p>}
              {selectedIntakeId && intakeDetailLoading && <p className="text-sm text-stone-500">Loading…</p>}
              {intakeDetail && !intakeDetailLoading && (
                <>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm text-stone-500">{intakeDetail.email} · submitted {new Date(intakeDetail.created_at).toLocaleDateString()} · {intakeDetail.iterations.length} mockup round{intakeDetail.iterations.length === 1 ? "" : "s"}</p>
                    </div>
                    <Badge variant={intakeStatusVariant(intakeDetail.status)}>{intakeDetail.status.replace("_", " ")}</Badge>
                  </div>

                  {(intakeDetail.logo_file_url || intakeDetail.color_theme) && (
                    <div className="flex items-center gap-3 text-sm">
                      {intakeDetail.logo_file_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={intakeDetail.logo_file_url} alt="Client logo" className="h-8 w-8 rounded object-contain border border-stone-200 bg-white" />
                      )}
                      {intakeDetail.color_theme && (() => {
                        try {
                          const theme = JSON.parse(intakeDetail.color_theme) as { primary?: string; secondary?: string; accent?: string };
                          return (
                            <div className="flex items-center gap-1.5">
                              {[theme.primary, theme.secondary, theme.accent].filter(Boolean).map((c, i) => (
                                <span key={i} className="h-5 w-5 rounded border border-stone-300" style={{ background: c }} title={c} />
                              ))}
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  )}

                  {latestIteration && (
                    <div className="rounded-lg border border-stone-200 overflow-hidden">
                      <div className="bg-stone-50 border-b border-stone-200 px-3 py-1.5 text-xs text-stone-500">
                        Mockup preview (reference only — not code to build from)
                      </div>
                      <iframe title="Confirmed mockup" srcDoc={latestIteration.generated_html} className="w-full h-64 bg-white" sandbox="" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-stone-50 border border-stone-200 rounded-md p-2.5"><p className="text-[11px] font-semibold text-[#8a6a45] uppercase">Who</p><p className="text-stone-700">{intakeDetail.who_target_users || "—"}</p></div>
                    <div className="bg-stone-50 border border-stone-200 rounded-md p-2.5"><p className="text-[11px] font-semibold text-[#8a6a45] uppercase">What</p><p className="text-stone-700">{intakeDetail.what_description || "—"}</p></div>
                    <div className="bg-stone-50 border border-stone-200 rounded-md p-2.5"><p className="text-[11px] font-semibold text-[#8a6a45] uppercase">Why</p><p className="text-stone-700">{intakeDetail.why_description || "—"}</p></div>
                    <div className="bg-stone-50 border border-stone-200 rounded-md p-2.5"><p className="text-[11px] font-semibold text-[#8a6a45] uppercase">When</p><p className="text-stone-700">{intakeDetail.when_timeline || "—"}</p></div>
                    <div className="bg-stone-50 border border-stone-200 rounded-md p-2.5"><p className="text-[11px] font-semibold text-[#8a6a45] uppercase">Where</p><p className="text-stone-700">{intakeDetail.where_context || "—"}</p></div>
                    <div className="bg-stone-50 border border-stone-200 rounded-md p-2.5"><p className="text-[11px] font-semibold text-[#8a6a45] uppercase">How</p><p className="text-stone-700">{intakeDetail.how_description || "—"}</p></div>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-md p-2.5 text-sm">
                    <p className="text-[11px] font-semibold text-[#8a6a45] uppercase">Backend &amp; interactions</p>
                    <p className="text-stone-700">{intakeDetail.backend_interaction_description || "—"}</p>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-md p-2.5 text-sm flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-[11px] font-semibold text-[#8a6a45] uppercase">Support &amp; pricing selected</p>
                      <p className="text-stone-700">
                        <span className="font-semibold">{SUPPORT_TIER_LABELS[intakeDetail.support_tier] || intakeDetail.support_tier}</span>
                        {intakeDetail.support_monthly_rate > 0 && ` — R${intakeDetail.support_monthly_rate.toLocaleString()}/month`}
                        {intakeDetail.support_min_term_months > 0 && `, ${intakeDetail.support_min_term_months}-month minimum`}
                      </p>
                    </div>
                    <Badge variant="secondary">Client-confirmed pricing</Badge>
                  </div>

                  {(intakeDetail.total_price || 0) > 0 && (
                    <div className="bg-stone-50 border border-stone-200 rounded-md p-3 text-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-[#8a6a45] uppercase">Build price &amp; deposit</p>
                        <Badge className={`border-0 ${intakeDetail.deposit_paid_at ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}`}>
                          {intakeDetail.deposit_paid_at ? "Deposit paid" : "Awaiting deposit"}
                        </Badge>
                      </div>

                      {intakeDetail.page_list && (() => {
                        try {
                          const pages = JSON.parse(intakeDetail.page_list) as PageListItem[];
                          if (!pages.length) return null;
                          return (
                            <ul className="text-xs text-stone-600 space-y-0.5">
                              {pages.map((p, i) => (
                                <li key={i} className={p.included === false ? "line-through text-stone-400" : ""}>{p.label}</li>
                              ))}
                            </ul>
                          );
                        } catch {
                          return null;
                        }
                      })()}

                      {!!intakeDetail.has_custom_items && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">Includes a custom item flagged for manual quoting — client cannot pay a deposit until this is resolved.</p>
                      )}

                      <div className="grid grid-cols-2 gap-1.5 text-xs text-stone-600">
                        <div className="flex justify-between"><span>Total build price</span><span className="font-semibold text-stone-800">R{(intakeDetail.total_price || 0).toLocaleString()}</span></div>
                        {!!intakeDetail.promo_code && (
                          <div className="flex justify-between"><span>Promo &ldquo;{intakeDetail.promo_code}&rdquo;</span><span>&minus;R{(intakeDetail.discount_amount || 0).toLocaleString()}</span></div>
                        )}
                        <div className="flex justify-between"><span>Deposit (50%)</span><span className={intakeDetail.deposit_paid_at ? "text-emerald-700 font-semibold" : "font-semibold text-stone-800"}>R{(intakeDetail.deposit_amount || 0).toLocaleString()}{intakeDetail.deposit_paid_at ? " ✓ paid" : ""}</span></div>
                        <div className="flex justify-between"><span>Final balance</span><span className={intakeDetail.final_paid_at ? "text-emerald-700 font-semibold" : "text-stone-800"}>R{(intakeDetail.final_amount || 0).toLocaleString()}{intakeDetail.final_paid_at ? " ✓ paid" : ""}</span></div>
                      </div>
                      {intakeDetail.deposit_paid_at && (
                        <p className="text-[11px] text-stone-400">Deposit paid {new Date(intakeDetail.deposit_paid_at).toLocaleString()}{intakeDetail.deposit_payment_ref ? ` · ref ${intakeDetail.deposit_payment_ref}` : ""}</p>
                      )}
                    </div>
                  )}

                  {convertError && <p className="text-sm text-red-500">{convertError}</p>}

                  <div className="flex gap-2 flex-wrap">
                    {intakeDetail.status === "converted" ? (
                      <Badge variant="secondary">Already converted to project #{intakeDetail.converted_project_id}</Badge>
                    ) : (
                      <Button
                        onClick={convertIntake}
                        disabled={converting || intakeDetail.status !== "confirmed" || !intakeDetail.deposit_paid_at}
                        size="sm"
                        className="bg-[#2E1F16] hover:bg-[#241811]"
                        title={
                          intakeDetail.status !== "confirmed"
                            ? "Only a client-confirmed request can be converted"
                            : !intakeDetail.deposit_paid_at
                            ? "The client's 50% deposit hasn't been paid yet"
                            : undefined
                        }
                      >
                        {converting ? "Converting…" : "Convert to project"}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "projects" && (
        <>
          {showAddProject && (
            <Card>
              <CardHeader><CardTitle>New project</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <input
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                  placeholder="Client email (existing account)"
                  value={projectForm.client_email}
                  onChange={(e) => setProjectForm({ ...projectForm, client_email: e.target.value })}
                />
                <input
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                  placeholder="Project name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                />
                <textarea
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm sm:col-span-2"
                  placeholder="Description"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                />
                <div className="sm:col-span-2 flex gap-2">
                  <Button onClick={addProject} size="sm" className="bg-[#2E1F16] hover:bg-[#241811]">Create</Button>
                  <Button onClick={() => setShowAddProject(false)} size="sm" variant="outline">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr] items-start">
            <Card>
              <CardHeader><CardTitle>All projects{loading ? "" : ` (${projects.length})`}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {loading && <p className="text-sm text-stone-500">Loading…</p>}
                {!loading && projects.length === 0 && (
                  <p className="text-sm text-stone-500">No projects yet — create one above.</p>
                )}
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProject(p.id)}
                    className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      selectedId === p.id ? "border-[#B08A5E] bg-[#F7F2EA]" : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <FolderKanban className="h-4 w-4 text-[#8a6a45] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-stone-900 truncate">{p.name}</div>
                      <div className="text-xs text-stone-500 truncate">{p.client_name || p.client_email}</div>
                    </div>
                    <Badge variant={p.status === "active" ? "default" : "secondary"} className="shrink-0">{p.status}</Badge>
                    <ChevronRight className="h-4 w-4 text-stone-400 shrink-0" />
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{detail ? detail.name : "Select a project"}</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {!selectedId && <p className="text-sm text-stone-500">Pick a project from the list to manage its phases, milestones, files, and updates.</p>}
                {selectedId && detailLoading && <p className="text-sm text-stone-500">Loading…</p>}
                {detail && !detailLoading && (
                  <>
                    <section>
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-800 mb-2"><Layers className="h-4 w-4" /> Phases</h3>
                      <div className="space-y-1.5">
                        {detail.phases.map((ph) => (
                          <div key={ph.id} className="flex items-center justify-between gap-2 rounded-md border border-stone-200 px-2.5 py-1.5 text-sm">
                            <span>{ph.name}</span>
                            <select
                              value={ph.status}
                              onChange={(e) => setPhaseStatus(ph.id, e.target.value)}
                              className="rounded border border-stone-300 text-xs px-1.5 py-0.5"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input
                          className="flex-1 rounded-md border border-stone-300 px-2.5 py-1.5 text-sm"
                          placeholder="New phase name"
                          value={phaseForm.name}
                          onChange={(e) => setPhaseForm({ name: e.target.value })}
                        />
                        <Button onClick={addPhase} size="sm" variant="outline">Add</Button>
                      </div>
                    </section>

                    <section>
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-800 mb-2"><Receipt className="h-4 w-4" /> Milestones &amp; billing</h3>
                      <div className="space-y-1.5">
                        {detail.milestones.map((m) => (
                          <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border border-stone-200 px-2.5 py-1.5 text-sm">
                            <span className="flex-1">{m.name} — R{Number(m.amount).toLocaleString()}</span>
                            <select
                              value={m.billing_status}
                              onChange={(e) => setMilestoneBilling(m.id, e.target.value)}
                              className="rounded border border-stone-300 text-xs px-1.5 py-0.5"
                            >
                              <option value="not_invoiced">Not invoiced</option>
                              <option value="invoiced">Invoiced</option>
                              <option value="paid">Paid</option>
                            </select>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <input
                          className="rounded-md border border-stone-300 px-2.5 py-1.5 text-sm col-span-1"
                          placeholder="Milestone name"
                          value={milestoneForm.name}
                          onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                        />
                        <input
                          className="rounded-md border border-stone-300 px-2.5 py-1.5 text-sm"
                          placeholder="Amount"
                          type="number"
                          value={milestoneForm.amount}
                          onChange={(e) => setMilestoneForm({ ...milestoneForm, amount: e.target.value })}
                        />
                        <Button onClick={addMilestone} size="sm" variant="outline">Add</Button>
                      </div>
                    </section>

                    <section>
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-800 mb-2"><FileText className="h-4 w-4" /> Files</h3>
                      <div className="space-y-1.5">
                        {detail.files.length === 0 && <p className="text-xs text-stone-500">No files yet.</p>}
                        {detail.files.map((f) => (
                          <div key={f.id} className="text-sm text-stone-700">{f.file_name}</div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-800 mb-2"><MessageSquare className="h-4 w-4" /> Post an update</h3>
                      <div className="space-y-1.5 mb-2">
                        {detail.updates.map((u) => (
                          <div key={u.id} className="text-sm text-stone-700 border-l-2 border-[#E9E0D3] pl-2">{u.message}</div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 rounded-md border border-stone-300 px-2.5 py-1.5 text-sm"
                          placeholder="What changed?"
                          value={updateMessage}
                          onChange={(e) => setUpdateMessage(e.target.value)}
                        />
                        <Button onClick={postUpdate} size="sm" variant="outline">Post</Button>
                      </div>
                    </section>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
