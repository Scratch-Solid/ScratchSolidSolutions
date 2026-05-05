"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminOnboardingPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token || localStorage.getItem('userRole') !== 'admin') {
      router.push('/auth/login');
      return;
    }
    fetchContracts();
  }, [router]);

  const fetchContracts = async () => {
    const token = localStorage.getItem('authToken');
    const res = await fetch('/api/pending-contracts', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setContracts(await res.json());
    setLoading(false);
  };

  const updateStatus = async (id: number, status: string) => {
    const token = localStorage.getItem('authToken');
    await fetch(`/api/pending-contracts?id=${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchContracts();
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Onboarding</h1>
        <a href="/admin" className="text-purple-600">Back to Dashboard</a>
      </div>

      {contracts.length === 0 ? (
        <p className="text-gray-500">No pending contracts</p>
      ) : (
        <div className="space-y-4">
          {contracts.map((c) => (
            <div key={c.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
              <div>
                <p className="font-bold">{c.full_name}</p>
                <p className="text-sm text-gray-600">{c.position_applied_for} - {c.department}</p>
                <p className="text-sm text-gray-500">{c.contact_number}</p>
              </div>
              <div className="space-x-2">
                <button onClick={() => updateStatus(c.id, 'approved')} className="bg-green-500 text-white px-4 py-2 rounded">Approve</button>
                <button onClick={() => updateStatus(c.id, 'rejected')} className="bg-red-500 text-white px-4 py-2 rounded">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
