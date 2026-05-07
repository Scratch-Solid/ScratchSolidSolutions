"use client";

import { useState, useEffect } from "react";
import { SkeletonDashboard } from "@/components/Skeleton";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import DashboardLayout from "@/components/DashboardLayout";

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

  if (loading) {
    return <DashboardLayout title="Transport Dashboard" role="transport"><SkeletonDashboard /></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Transport Dashboard" role="transport">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
        <h3 className="font-bold text-lg text-white mb-4">Deliveries</h3>
        <ul className="space-y-2">
          {deliveries.map((delivery: any) => (
            <li key={delivery.id} className="border border-white/10 rounded p-4 bg-white/5 text-white">
              <div><b className="text-white">Destination:</b> {delivery.destination}</div>
              <div><b className="text-white">Status:</b> {delivery.status}</div>
              <div><b className="text-white">Driver:</b> {delivery.driver}</div>
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}
