// Accounting.tsx
// Admin accounting panel for Zoho invoice and refund actions

import React, { useState } from "react";

export default function Accounting() {
  const [action, setAction] = useState("invoice");
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setResult("");
    try {
      const endpoint = action === "invoice" ? "/zoho/invoice" : "/zoho/refund";
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: userId, amount }),
      });
      const data = await res.json();
      if (res.ok) setResult(JSON.stringify(data));
      else setResult(data.detail || "Failed to process");
    } catch (err) {
      setResult("Error processing request");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="dashboard-container glass-panel">
      <h2>Accounting (Zoho)</h2>
      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2">
        <label>
          Action:
          <select value={action} onChange={e => setAction(e.target.value)} className="border rounded px-2 py-1 ml-2">
            <option value="invoice">Create Invoice</option>
            <option value="refund">Process Refund</option>
          </select>
        </label>
        <label>
          User ID:
          <input type="text" value={userId} onChange={e => setUserId(e.target.value)} className="border rounded px-2 py-1 ml-2" required />
        </label>
        <label>
          Amount:
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="border rounded px-2 py-1 ml-2" required />
        </label>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={processing}>
          {processing ? "Processing..." : "Submit"}
        </button>
      </form>
      {result && <div className="mt-2 text-green-700">{result}</div>}
    </div>
  );
}
