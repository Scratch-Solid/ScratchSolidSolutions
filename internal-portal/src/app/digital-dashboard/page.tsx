"use client";

import { useState, useEffect } from "react";
import { SkeletonDashboard } from "@/components/Skeleton";

export default function DigitalDashboard() {
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
    return <div className="dashboard-container glass-panel"><SkeletonDashboard /></div>;
  }

  return (
    <div className="dashboard-container glass-panel">
      <h2>Digital Marketing Dashboard</h2>
      <div className="glass-card">
        <h3 className="font-bold text-lg mb-4">Tasks</h3>
        <ul className="space-y-2">
          {tasks.map((task: any) => (
            <li key={task.id} className="border rounded p-4 bg-white">
              <div><b>Title:</b> {task.title}</div>
              <div><b>Status:</b> {task.status}</div>
              <div><b>Priority:</b> {task.priority}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
