"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";

interface PendingApproval {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
  registration_ip: string;
}

function AdminApprovalsContent() {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const res = await fetch('/api/admin/pending-approvals', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to fetch pending approvals');
      }

      const data = await res.json() as { pendingApprovals: PendingApproval[] };
      setPendingApprovals(data.pendingApprovals);
    } catch (err) {
      setError('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    const notes = prompt('Enter approval notes (optional):');
    setProcessing(userId);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/approve-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, notes: notes || '' })
      });

      if (!res.ok) {
        throw new Error('Failed to approve admin');
      }

      setMessage('Admin approved successfully!');
      setPendingApprovals(prev => prev.filter(approval => approval.id !== userId));
    } catch (err) {
      setError('Failed to approve admin user');
    } finally {
      setProcessing(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleReject = async (userId: number) => {
    const notes = prompt('Enter rejection reason:');
    if (!notes) return;

    setProcessing(userId);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/reject-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, notes })
      });

      if (!res.ok) {
        throw new Error('Failed to reject admin');
      }

      setMessage('Admin rejected successfully!');
      setPendingApprovals(prev => prev.filter(approval => approval.id !== userId));
    } catch (err) {
      setError('Failed to reject admin user');
    } finally {
      setProcessing(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Approvals</h1>
          <p className="mt-2 text-gray-600">Review and approve pending admin registration requests</p>
        </div>

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {pendingApprovals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Approvals</h3>
            <p className="text-gray-500">All admin registration requests have been processed.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingApprovals.map((approval) => (
                  <tr key={approval.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{approval.name}</div>
                        <div className="text-sm text-gray-500">{approval.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {approval.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(approval.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {approval.registration_ip || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <button
                          onClick={() => handleApprove(approval.id)}
                          disabled={processing === approval.id}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                        >
                          {processing === approval.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(approval.id)}
                          disabled={processing === approval.id}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                        >
                          {processing === approval.id ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminApprovalsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AdminApprovalsContent />
    </Suspense>
  );
}
