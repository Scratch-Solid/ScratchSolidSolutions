// Payroll.tsx
// Next.js page/component for cleaner payroll view

"use client";

import React, { useEffect, useState } from "react";

// Payroll ID derived from auth token at runtime

export default function Payroll() {
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPayroll() {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch('/api/payroll', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch payroll");
        const data = await res.json();
        setPayroll(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchPayroll();
  }, []);

  if (loading) return <div className="dashboard-container glass-panel"><div className="animate-pulse space-y-3"><div className="h-4 bg-gray-200 rounded w-1/2"/><div className="h-4 bg-gray-200 rounded w-1/3"/><div className="h-4 bg-gray-200 rounded w-2/3"/></div></div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!payroll) return <div>No payroll data found.</div>;

  return (
    <div className="dashboard-container glass-panel">
      <h2>Payroll</h2>
      <div className="mb-2">Cycle: <b>{payroll.cycle_start} - {payroll.cycle_end}</b></div>
      <div className="mb-2">Base Rate: <b>R{payroll.base_rate?.toFixed(2) ?? "0.00"}</b></div>
      <div className="mb-2">Weekend Rate: <b>R{payroll.weekend_rate?.toFixed(2) ?? "0.00"}</b></div>
      <div className="mb-2">Deductions: <b>R{payroll.deductions?.toFixed(2) ?? "0.00"}</b></div>
      <div className="mb-2">Total: <b>R{payroll.total?.toFixed(2) ?? "0.00"}</b></div>
      <div className="text-zinc-700 mt-4">(Coming soon: payroll breakdown and download slip)</div>
    </div>
  );
}
