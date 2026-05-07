"use client";

import { useState, useEffect } from "react";
import { SkeletonDashboard } from "@/components/Skeleton";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import DashboardLayout from "@/components/DashboardLayout";

export default function DigitalDashboard() {
  useSessionTimeout(true);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const token = localStorage.getItem('authToken');
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
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
        <h3 className="font-bold text-lg text-white mb-4">Tasks</h3>
        <ul className="space-y-2">
          {tasks.map((task: any) => (
            <li key={task.id} className="border border-white/10 rounded p-4 bg-white/5 text-white">
              <div><b className="text-white">Title:</b> {task.title}</div>
              <div><b className="text-white">Status:</b> {task.status}</div>
              <div><b className="text-white">Priority:</b> {task.priority}</div>
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}
