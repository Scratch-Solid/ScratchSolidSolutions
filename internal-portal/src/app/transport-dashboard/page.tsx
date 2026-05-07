"use client";

import { useState, useEffect } from "react";
import { SkeletonDashboard } from "@/components/Skeleton";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export default function TransportDashboard() {
  useSessionTimeout(true);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeliveries() {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch('/api/admin/bookings?type=transport', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setDeliveries(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch deliveries:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDeliveries();
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    window.location.href = '/auth/login';
  };

  if (loading) {
    return <div className="dashboard-container glass-panel"><SkeletonDashboard /></div>;
  }

  return (
    <div className="dashboard-container glass-panel">
      <div className="flex justify-between items-center mb-6">
        <h2>Transport Dashboard</h2>
        <button onClick={handleLogout} className="secondary-button text-red-600 hover:text-red-700">
          Logout
        </button>
      </div>
      <div className="glass-card">
        <h3 className="font-bold text-lg mb-4">Deliveries</h3>
        <ul className="space-y-2">
          {deliveries.map((delivery: any) => (
            <li key={delivery.id} className="border rounded p-4 bg-white">
              <div><b>Destination:</b> {delivery.destination}</div>
              <div><b>Status:</b> {delivery.status}</div>
              <div><b>Driver:</b> {delivery.driver}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
