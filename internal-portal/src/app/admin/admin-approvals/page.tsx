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

interface PendingInvite {
  id: number;
  user_id: number;
  email: string;
  name: string;
  invited_by_name: string | null;
  expires_at: string;
  created_at: string;
}

function AdminApprovalsContent() {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "" });
  const [inviting, setInviting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchPendingApprovals();
    fetchPendingInvites();
  }, []);

  const fetchPendingInvites = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch('/api/admin/invite', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) return;
      const data = await res.json() as PendingInvite[];
      setPendingInvites(data);
    } catch {
      // Non-fatal - the pending approvals list above still loads
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError("");
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      });
      const data = await res.json() as { error?: string; emailSent?: boolean };
      if (!res.ok) {
        setError(data.error || 'Failed to send invite');
        return;
      }
      setMessage(data.emailSent ? 'Invite sent!' : 'Invite created, but the email failed to send - share the link manually.');
      setInviteForm({ email: "", name: "" });
      setShowInviteForm(false);
      fetchPendingInvites();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setInviting(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleRevokeInvite = async (id: number) => {
    if (!confirm('Revoke this invite?')) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch(`/api/admin/invite?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setPendingInvites(prev => prev.filter(inv => inv.id !== id));
    } catch {
      setError('Failed to revoke invite');
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
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
        if (res.status === 401) {
          localStorage.removeItem('authToken');
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to fetch pending approvals');
      }

      const data = await res.json() as { pendingApprovals: PendingApproval[] };
      setPendingApprovals(data.pendingApprovals);
    } catch (err) {
      setError('Unable to load pending approvals. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    const notes = prompt('Enter approval notes (optional):');
    setProcessing(userId);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E1F16]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">Admin Approvals</h1>
            <p className="mt-2 text-stone-600">Review and approve pending admin registration requests</p>
          </div>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="bg-[#2E1F16] hover:bg-[#241811] text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          >
            {showInviteForm ? 'Cancel' : 'Invite Admin'}
          </button>
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

        {showInviteForm && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 border-b border-stone-200">
              <h3 className="text-lg font-medium text-stone-900">Invite New Admin</h3>
            </div>
            <form onSubmit={handleInvite} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                    placeholder="admin@example.com"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="submit"
                  disabled={inviting || !inviteForm.name || !inviteForm.email}
                  className="bg-[#2E1F16] hover:bg-[#241811] text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        )}

        {pendingInvites.length > 0 && (
          <div className="bg-white shadow overflow-hidden rounded-lg mb-8">
            <div className="px-4 py-5 border-b border-stone-200">
              <h3 className="text-lg font-medium text-stone-900">Pending Invites</h3>
            </div>
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Invitee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Invited By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {pendingInvites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-stone-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-stone-900">{invite.name}</div>
                      <div className="text-sm text-stone-500">{invite.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{invite.invited_by_name || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">{new Date(invite.expires_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRevokeInvite(invite.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pendingApprovals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mx-auto w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-stone-900 mb-2">No Pending Approvals</h3>
            <p className="text-stone-500">All admin registration requests have been processed.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Registration Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {pendingApprovals.map((approval) => (
                  <tr key={approval.id} className="hover:bg-stone-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-stone-900">{approval.name}</div>
                        <div className="text-sm text-stone-500">{approval.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#F0E6D6] text-[#1C130D]">
                        {approval.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {new Date(approval.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
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
