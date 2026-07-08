"use client";

import { useState, useEffect } from "react";
import { SkeletonDashboard } from "@/components/Skeleton";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import DashboardLayout from "@/components/DashboardLayout";
import PasswordBanner from "./components/PasswordBanner";

export default function TransportDashboard() {
  useSessionTimeout(true);
  useTokenRefresh();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeliveries() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
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
      <PasswordBanner />
      <div className="glass-card">
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Deliveries</h3>
        <ul className="space-y-2">
          {deliveries.map((delivery: any) => (
            <li key={delivery.id} className="glass-card">
              <div><b style={{ color: 'var(--text-h)' }}>Destination:</b> <span style={{ color: 'var(--text)' }}>{delivery.destination}</span></div>
              <div><b style={{ color: 'var(--text-h)' }}>Status:</b> <span className={`badge badge-info`}>{delivery.status}</span></div>
              <div><b style={{ color: 'var(--text-h)' }}>Driver:</b> <span style={{ color: 'var(--text)' }}>{delivery.driver}</span></div>
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}
