"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Contract {
  id: number;
  full_name: string;
  position_applied_for: string;
  department: string;
  contact_number: string;
  status: string;
  rejection_reason?: string;
}

interface NewJoiner {
  id: number;
  fullName: string;
  idPassportNumber: string;
  contactNumber: string;
  email: string;
  positionAppliedFor: string;
  status: string;
  createdAt: string;
}

export default function AdminOnboardingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'contracts' | 'joiners'>('contracts');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [joiners, setJoiners] = useState<NewJoiner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Registration form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    idPassportNumber: '',
    contactNumber: '',
    positionAppliedFor: 'Cleaner',
  });
  const [formLoading, setFormLoading] = useState(false);

  // Processing state
  const [processingId, setProcessingId] = useState<number | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  useEffect(() => {
    if (!token) {
      router.push('/auth/login');
      return;
    }
    fetchContracts();
    fetchJoiners();
  }, [router, token]);

  const fetchContracts = async () => {
    try {
      const res = await fetch('/api/pending-contracts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as { data?: Contract[] };
        setContracts(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchJoiners = async () => {
    try {
      const res = await fetch('/api/admin/new-joiners', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as { data?: NewJoiner[] };
        setJoiners(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch joiners:', err);
    }
  };

  const updateContractStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/pending-contracts?id=${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setError(`Failed to ${status} contract`);
        return;
      }
      setMessage(`Contract ${status} successfully!`);
      fetchContracts();
    } catch (err) {
      setError(`Network error while ${status}ing contract`);
    }
  };

  const handleCreateJoiner = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/new-joiners/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('New cleaner registered successfully!');
        setFormData({ fullName: '', idPassportNumber: '', contactNumber: '', positionAppliedFor: 'Cleaner' });
        setShowForm(false);
        fetchJoiners();
      } else {
        setError(data.error?.message || 'Failed to register cleaner');
      }
    } catch (err) {
      setError('Network error while registering cleaner');
    } finally {
      setFormLoading(false);
    }
  };

  const handleApproveJoiner = async (id: number) => {
    setProcessingId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/new-joiners/${id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Application approved successfully!');
        fetchJoiners();
      } else {
        setError(data.error?.message || 'Failed to approve application');
      }
    } catch (err) {
      setError('Network error while approving application');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectJoiner = async (id: number) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    setProcessingId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/new-joiners/${id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Application rejected successfully!');
        fetchJoiners();
      } else {
        setError(data.error?.message || 'Failed to reject application');
      }
    } catch (err) {
      setError('Network error while rejecting application');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingContracts = contracts.filter(c => c.status === 'pending');
  const pendingJoiners = joiners.filter(j => j.status === 'pending');

  if (loading) return <div className="py-8 text-sm text-slate-400">Loading…</div>;

  return (
    <div className="space-y-6">

        {message && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => { setActiveTab('contracts'); setError(''); setMessage(''); }}
            className={`pb-2 px-4 font-medium ${activeTab === 'contracts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Pending Contracts ({pendingContracts.length})
          </button>
          <button
            onClick={() => { setActiveTab('joiners'); setError(''); setMessage(''); }}
            className={`pb-2 px-4 font-medium ${activeTab === 'joiners' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            New Joiner Applications ({pendingJoiners.length})
          </button>
        </div>

        {/* Register New Cleaner Button */}
        {activeTab === 'joiners' && (
          <div className="mb-6">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {showForm ? 'Cancel' : 'Register New Cleaner'}
            </button>
          </div>
        )}

        {/* Registration Form */}
        {showForm && activeTab === 'joiners' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Register New Cleaner</h2>
            <form onSubmit={handleCreateJoiner} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID / Passport Number *</label>
                <input
                  type="text"
                  required
                  value={formData.idPassportNumber}
                  onChange={(e) => setFormData({ ...formData, idPassportNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <input
                  type="text"
                  value={formData.positionAppliedFor}
                  onChange={(e) => setFormData({ ...formData, positionAppliedFor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {formLoading ? 'Registering...' : 'Register Cleaner'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Contracts Tab */}
        {activeTab === 'contracts' && (
          <div className="space-y-4">
            {pendingContracts.length === 0 ? (
              <p className="text-gray-500 bg-white p-6 rounded-lg shadow">No pending contracts</p>
            ) : (
              pendingContracts.map((c) => (
                <div key={c.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                  <div>
                    <p className="font-bold">{c.full_name}</p>
                    <p className="text-sm text-gray-600">{c.position_applied_for} - {c.department}</p>
                    <p className="text-sm text-gray-500">{c.contact_number}</p>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => updateContractStatus(c.id, 'approved')}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateContractStatus(c.id, 'rejected')}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Joiners Tab */}
        {activeTab === 'joiners' && (
          <div className="space-y-4">
            {pendingJoiners.length === 0 ? (
              <p className="text-gray-500 bg-white p-6 rounded-lg shadow">No pending new joiner applications</p>
            ) : (
              pendingJoiners.map((j) => (
                <div key={j.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                  <div>
                    <p className="font-bold">{j.fullName}</p>
                    <p className="text-sm text-gray-600">{j.positionAppliedFor}</p>
                    <p className="text-sm text-gray-500">{j.contactNumber} / {j.email}</p>
                    <p className="text-xs text-gray-400">ID: {j.idPassportNumber}</p>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleApproveJoiner(j.id)}
                      disabled={processingId === j.id}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      {processingId === j.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleRejectJoiner(j.id)}
                      disabled={processingId === j.id}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      {processingId === j.id ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
  );
}
