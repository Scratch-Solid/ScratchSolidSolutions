// Payroll.tsx
// Next.js page/component for cleaner payroll view

import React, { useEffect, useState } from "react";

// For demo: hardcoded payrollId, replace with auth context in production
const PAYROLL_ID = 1;

export default function Payroll() {
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPayroll() {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/payroll/${PAYROLL_ID}`);
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

  if (loading) return <div>Loading payroll...</div>;
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
