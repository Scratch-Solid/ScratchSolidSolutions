// AdminContractsPayroll.tsx
// Admin view for contracts and payroll management

"use client";

import React, { useEffect, useState } from "react";

export default function AdminContractsPayroll() {
  const [contracts, setContracts] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [contractsRes, payrollsRes] = await Promise.all([
          fetch('/api/contracts', { headers }),
          fetch('/api/payroll', { headers }),
        ]);

        if (contractsRes.ok) setContracts(await contractsRes.json());
        if (payrollsRes.ok) setPayrolls(await payrollsRes.json());
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="dashboard-container glass-panel"><div className="animate-pulse space-y-3"><div className="h-4 bg-gray-200 rounded w-1/2"/><div className="h-4 bg-gray-200 rounded w-1/3"/><div className="h-4 bg-gray-200 rounded w-2/3"/></div></div>;
  if (error) return <div className="error-msg">{error}</div>;

  return (
    <div className="dashboard-container glass-panel">
      <h2>Admin: Contracts & Payroll</h2>
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-2">Contracts</h3>
        <ul className="space-y-1">
          {contracts.map((c: any) => (
            <li key={c.id} className="border rounded p-2 bg-zinc-50">
              <b>Contract #{c.id}</b> | Business: {c.business_id} | Type: {c.contract_type} | Rate: R{c.rate} | Weekend: x{c.weekend_multiplier}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-bold text-lg mb-2">Payroll</h3>
        <ul className="space-y-1">
          {payrolls.map((p: any) => (
            <li key={p.id} className="border rounded p-2 bg-zinc-50">
              <b>Payroll #{p.id}</b> | Cleaner: {p.cleaner_id} | Cycle: {p.cycle_start} - {p.cycle_end} | Total: R{p.total}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
