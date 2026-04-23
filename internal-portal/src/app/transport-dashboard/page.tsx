"use client";

import { useState, useEffect } from "react";
import { SkeletonDashboard } from "@/components/Skeleton";

export default function TransportDashboard() {
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

  if (loading) {
    return <div className="dashboard-container glass-panel"><SkeletonDashboard /></div>;
  }

  return (
    <div className="dashboard-container glass-panel">
      <h2>Transport Dashboard</h2>
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
