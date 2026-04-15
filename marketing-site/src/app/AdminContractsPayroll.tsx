// AdminContractsPayroll.tsx
// Admin view for contracts and payroll management

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
        // Fetch contracts (admin only, so fetch all contracts by iterating IDs or via a new endpoint in production)
        // For demo, try a range of IDs
        const contractResults = [];
        for (let id = 1; id <= 5; id++) {
          const res = await fetch(`http://localhost:8000/contracts/${id}`, { credentials: "include" });
          if (res.ok) contractResults.push(await res.json());
        }
        setContracts(contractResults);
        // Fetch payrolls (simulate, as no list endpoint is present)
        const payrollResults = [];
        for (let id = 1; id <= 5; id++) {
          const res = await fetch(`http://localhost:8000/payroll/${id}`, { credentials: "include" });
          if (res.ok) payrollResults.push(await res.json());
        }
        setPayrolls(payrollResults);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div>Loading contracts and payroll...</div>;
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
