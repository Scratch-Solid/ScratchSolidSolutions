"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, FolderKanban, ChevronRight, Layers, Receipt, FileText, MessageSquare } from "lucide-react";

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

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function DigitalProjectsPage() {
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

  useEffect(() => {
    loadProjects();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Digital Projects</h1>
          <p className="text-sm text-stone-500 mt-1">
            Create and manage client web/app projects — phases, milestone billing, files, and updates shown on their Digital dashboard.
          </p>
        </div>
        <Button onClick={() => setShowAddProject((v) => !v)} size="sm" className="bg-[#2E1F16] hover:bg-[#241811]">
          <Plus className="h-4 w-4 mr-1.5" /> New Project
        </Button>
      </div>

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
    </div>
  );
}
