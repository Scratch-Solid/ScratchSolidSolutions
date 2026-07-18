"use client";

import { useState, useEffect } from "react";
import { SkeletonDashboard } from "@/components/Skeleton";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import { useRequireRole } from "@/hooks/useRequireRole";
import DashboardLayout from "@/components/DashboardLayout";
import PasswordBanner from "./components/PasswordBanner";
import LeaveSection from "@/components/staff/LeaveSection";
import PayslipSection from "@/components/staff/PayslipSection";
import KpiSection from "@/components/staff/KpiSection";

export default function DigitalDashboard() {
  useSessionTimeout(true);
  useTokenRefresh();
  const { authorized } = useRequireRole(['digital']);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTile, setActiveTile] = useState("tasks");

  useEffect(() => {
    if (!authorized) return;
    async function fetchTasks() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        const res = await fetch('/api/admin/content?page=digital-tasks', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setTasks(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [authorized]);

  if (!authorized || loading) {
    return <DashboardLayout title="Digital Marketing Dashboard" role="digital"><SkeletonDashboard /></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Digital Marketing Dashboard" role="digital">
      <PasswordBanner />

      <div className="mb-6 flex space-x-2 border-b pb-2" style={{ borderColor: 'rgba(12, 37, 74, 0.12)' }}>
        <button
          onClick={() => setActiveTile("tasks")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "tasks" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "tasks" ? '#2E1F16' : '#6B5D52' }}
        >
          Tasks
        </button>
        <button
          onClick={() => setActiveTile("kpi")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "kpi" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "kpi" ? '#2E1F16' : '#6B5D52' }}
        >
          KPI
        </button>
        <button
          onClick={() => setActiveTile("payslips")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "payslips" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "payslips" ? '#2E1F16' : '#6B5D52' }}
        >
          Payslips
        </button>
        <button
          onClick={() => setActiveTile("leave")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "leave" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "leave" ? '#2E1F16' : '#6B5D52' }}
        >
          Leave
        </button>
      </div>

      {activeTile === "tasks" && (
        <div className="glass-card">
          <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Tasks</h3>
          <ul className="space-y-2">
            {tasks.map((task: any) => (
              <li key={task.id} className="glass-card">
                <div><b style={{ color: 'var(--text-h)' }}>Title:</b> <span style={{ color: 'var(--text)' }}>{task.title}</span></div>
                <div><b style={{ color: 'var(--text-h)' }}>Status:</b> <span className={`badge badge-info`}>{task.status}</span></div>
                <div><b style={{ color: 'var(--text-h)' }}>Priority:</b> <span className={`badge badge-warning`}>{task.priority}</span></div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTile === "kpi" && <KpiSection />}
      {activeTile === "payslips" && <PayslipSection />}
      {activeTile === "leave" && <LeaveSection />}
    </DashboardLayout>
  );
}
