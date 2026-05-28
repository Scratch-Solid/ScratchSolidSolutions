"use client";

import { useState, useEffect } from "react";
import { SkeletonDashboard } from "@/components/Skeleton";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import DashboardLayout from "@/components/DashboardLayout";
import PasswordBanner from "./components/PasswordBanner";

export default function DigitalDashboard() {
  useSessionTimeout(true);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  if (loading) {
    return <DashboardLayout title="Digital Marketing Dashboard" role="digital"><SkeletonDashboard /></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Digital Marketing Dashboard" role="digital">
      <PasswordBanner />
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
    </DashboardLayout>
  );
}
