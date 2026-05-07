// AdminDashboard.tsx
// Next.js page for admin dashboard (user, booking, contract, payroll management)

"use client";

import React, { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [newJoiners, setNewJoiners] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ totalBookings: 0, totalRevenue: 0, activeCleaners: 0, pendingWeekendAssignments: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedJoiner, setSelectedJoiner] = useState<any>(null);

  useEffect(() => {
    async function fetchAdminData() {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        };

        const [employeesRes, pendingContractsRes, usersRes, bookingsRes, contractsRes, paymentsRes, notificationsRes] = await Promise.allSettled([
          fetch("/api/employees", { headers }),
          fetch("/api/pending-contracts", { headers }),
          fetch("/api/admin/users", { headers }),
          fetch("/api/admin/bookings", { headers }),
          fetch("/api/admin/contracts", { headers }),
          fetch("/api/admin/payroll", { headers }),
          fetch("/api/notifications", { headers }),
        ]);

        if (pendingContractsRes.status === 'fulfilled' && pendingContractsRes.value.ok) {
          setNewJoiners(await pendingContractsRes.value.json());
        }
        if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
          setUsers(await usersRes.value.json());
        }
        let resolvedBookings: any[] = [];
        let resolvedEmployees: any[] = [];

        if (bookingsRes.status === 'fulfilled' && bookingsRes.value.ok) {
          resolvedBookings = await bookingsRes.value.json();
          setBookings(resolvedBookings);
        }
        if (contractsRes.status === 'fulfilled' && contractsRes.value.ok) {
          setContracts(await contractsRes.value.json());
        }
        if (paymentsRes.status === 'fulfilled' && paymentsRes.value.ok) {
          setPayments(await paymentsRes.value.json());
        }
        if (notificationsRes.status === 'fulfilled' && notificationsRes.value.ok) {
          setNotifications(await notificationsRes.value.json());
        }
        if (employeesRes.status === 'fulfilled' && employeesRes.value.ok) {
          resolvedEmployees = await employeesRes.value.json();
          setEmployees(resolvedEmployees);
        }

        setStats({
          totalBookings: resolvedBookings.length,
          totalRevenue: 0,
          activeCleaners: resolvedEmployees.length,
          pendingWeekendAssignments: 0,
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchAdminData();
  }, []);

  const assignCleaner = async (bookingId: string, cleanerId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleaner_id: cleanerId })
      });
      if (res.ok) {
        // Refresh bookings
        const token = localStorage.getItem('authToken');
        const bookingsRes = await fetch("/api/admin/bookings", { headers: { 'Authorization': `Bearer ${token}` } });
        if (bookingsRes.ok) setBookings(await bookingsRes.json());
      }
    } catch (err) {
      console.error("Failed to assign cleaner:", err);
    }
  };

  const updateRate = async (contractId: string, rate: number) => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/rate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate })
      });
      if (res.ok) {
        // Refresh contracts
        const token = localStorage.getItem('authToken');
        const contractsRes = await fetch("/api/admin/contracts", { headers: { 'Authorization': `Bearer ${token}` } });
        if (contractsRes.ok) setContracts(await contractsRes.json());
      }
    } catch (err) {
      console.error("Failed to update rate:", err);
    }
  };

  const confirmPayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/confirm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        // Refresh payments
        const token = localStorage.getItem('authToken');
        const paymentsRes = await fetch("/api/admin/payroll", { headers: { 'Authorization': `Bearer ${token}` } });
        if (paymentsRes.ok) setPayments(await paymentsRes.json());
      }
    } catch (err) {
      console.error("Failed to confirm payment:", err);
    }
  };

  const handleApproveJoiner = async (joiner: any) => {
    try {
      // Update pending contract status to approved
      await fetch(`/api/pending-contracts?id=${joiner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      // Remove from new joiners (they can now access contract)
      setNewJoiners(prev => prev.filter((j: any) => j.id !== joiner.id));
      setSelectedJoiner(null);
    } catch (err) {
      console.error("Failed to approve joiner:", err);
    }
  };

  const handleRejectJoiner = async (joiner: any) => {
    try {
      // Delete from pending contracts API
      await fetch(`/api/pending-contracts?id=${joiner.id}`, {
        method: "DELETE",
      });

      // Remove from new joiners
      setNewJoiners(prev => prev.filter((j: any) => j.id !== joiner.id));
      setSelectedJoiner(null);
    } catch (err) {
      console.error("Failed to reject joiner:", err);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    window.location.href = '/auth/login';
  };

  if (loading) return <div className="dashboard-container glass-panel"><div className="animate-pulse space-y-6"><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="border rounded-lg p-6 bg-white"><div className="h-4 bg-gray-200 rounded w-1/2 mb-3"/><div className="h-8 bg-gray-200 rounded w-3/4"/></div>)}</div><div className="border rounded-lg p-6 bg-white"><div className="h-5 bg-gray-200 rounded w-1/3 mb-4"/><div className="space-y-3">{[1,2,3].map(i=><div key={i} className="flex gap-4"><div className="h-4 bg-gray-200 rounded w-1/4"/><div className="h-4 bg-gray-200 rounded w-1/3"/></div>)}</div></div></div></div>;
  if (error) return <div className="error-msg">{error}</div>;

  return (
    <div className="dashboard-container glass-panel">
      <div className="flex justify-between items-center mb-6">
        <h2>Admin Dashboard</h2>
        <button onClick={handleLogout} className="secondary-button text-red-600 hover:text-red-700">
          Logout
        </button>
      </div>
      
      {/* Tab Navigation */}
      <div className="mb-6 flex space-x-2 border-b pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded ${activeTab === "overview" ? "primary-button" : "secondary-button"}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("new-joiners")}
          className={`px-4 py-2 rounded ${activeTab === "new-joiners" ? "primary-button" : "secondary-button"}`}
        >
          New Joiners
        </button>
        <button
          onClick={() => setActiveTab("employees")}
          className={`px-4 py-2 rounded ${activeTab === "employees" ? "primary-button" : "secondary-button"}`}
        >
          Employees
        </button>
        <button
          onClick={() => setActiveTab("content")}
          className={`px-4 py-2 rounded ${activeTab === "content" ? "primary-button" : "secondary-button"}`}
        >
          Content
        </button>
      </div>

      {activeTab === "overview" ? (
        <>
          {/* Stats Widget */}
          <div className="mb-6 grid grid-cols-4 gap-4">
            <div className="glass-card">
              <h3 className="font-bold">Total Bookings</h3>
              <p className="text-2xl">{stats.totalBookings}</p>
            </div>
            <div className="glass-card">
              <h3 className="font-bold">Total Revenue</h3>
              <p className="text-2xl">R{stats.totalRevenue?.toFixed(2) ?? "0.00"}</p>
            </div>
            <div className="glass-card">
              <h3 className="font-bold">Active Cleaners</h3>
              <p className="text-2xl">{stats.activeCleaners}</p>
            </div>
            <div className="glass-card">
              <h3 className="font-bold">Weekend Assignments</h3>
              <p className="text-2xl">{stats.pendingWeekendAssignments}</p>
            </div>
          </div>

          {/* Weekend Assignment Notifications */}
          {notifications.length > 0 && (
            <div className="glass-card">
              <h3 className="font-bold text-lg mb-2">Pending Weekend Assignments</h3>
              <ul className="space-y-2">
                {notifications.map((notif: any) => (
                  <li key={notif.id} className="border rounded p-2 bg-white">
                    <div><b>Booking #{notif.booking_id}</b> - {notif.message}</div>
                    <button
                      onClick={() => assignCleaner(notif.booking_id, "")}
                      className="mt-2 primary-button px-2 py-1 text-sm"
                    >
                      Assign Cleaner
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Users Widget */}
          <div className="glass-card">
            <h3 className="font-bold text-lg mb-2">Users</h3>
            <ul className="space-y-1">
              {users.map((u: any) => (
                <li key={u.id} className="border rounded p-2 bg-white">
                  <b>{u.name}</b> ({u.role}) - {u.email}
                </li>
              ))}
            </ul>
          </div>

          {/* Bookings Widget */}
          <div className="glass-card">
            <h3 className="font-bold text-lg mb-2">Bookings</h3>
            <ul className="space-y-1">
              {bookings.map((b: any) => (
                <li key={b.id} className="border rounded p-2 bg-white">
                  <div><b>Booking #{b.id}</b> - Status: {b.status}</div>
                  <div>User: {b.user_id} | Cleaner: {b.cleaner_id ?? "-"}</div>
                  {!b.cleaner_id && (
                    <button
                      onClick={() => assignCleaner(b.id, "")}
                      className="mt-2 primary-button px-2 py-1 text-sm"
                    >
                      Assign Cleaner
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Contracts Widget */}
          <div className="glass-card">
            <h3 className="font-bold text-lg mb-2">Contracts</h3>
            <ul className="space-y-1">
              {contracts.map((c: any) => (
                <li key={c.id} className="border rounded p-2 bg-white">
                  <div><b>Contract #{c.id}</b> - {c.duration}</div>
                  <div>Rate: R{c.rate} | Status: {c.status}</div>
                  <button
                    onClick={() => updateRate(c.id, c.rate)}
                    className="mt-2 primary-button px-2 py-1 text-sm"
                  >
                    Update Rate
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Payments Widget */}
          <div className="glass-card">
            <h3 className="font-bold text-lg mb-2">Payments</h3>
            <ul className="space-y-1">
              {payments.map((p: any) => (
                <li key={p.id} className="border rounded p-2 bg-white">
                  <div><b>Payment #{p.id}</b> - R{p.amount}</div>
                  <div>Method: {p.payment_method} | Status: {p.status}</div>
                  {p.status === "pending" && (
                    <button
                      onClick={() => confirmPayment(p.id)}
                      className="mt-2 primary-button px-2 py-1 text-sm"
                    >
                      Confirm Payment
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Management Buttons */}
          <div className="mb-6 flex space-x-4">
            <button
              onClick={() => window.open(process.env.NEXT_PUBLIC_CLIENT_DASHBOARD_URL || 'https://scratchsolidsolutions.org/client-dashboard', '_blank')}
              className="primary-button"
            >
              View Client Dashboard
            </button>
            <button
              onClick={() => {
                const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://portal.scratchsolidsolutions.org';
                window.open(portalUrl + '/cleaner-dashboard', '_blank');
              }}
              className="primary-button"
            >
              View Cleaner Dashboard
            </button>
          </div>
        </>
      ) : activeTab === "new-joiners" ? (
        <>
          <div className="glass-card">
            <h3 className="font-bold text-lg mb-4">New Joiners - Pending Approval</h3>
            {newJoiners.length === 0 ? (
              <p className="text-gray-600">No pending new joiners.</p>
            ) : (
              <div className="space-y-3">
                {newJoiners.map((joiner: any) => (
                  <div key={joiner.id} className="border rounded p-4 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-lg">{joiner.fullName}</p>
                        <p className="text-sm text-gray-600">ID/Passport: {joiner.idPassportNumber}</p>
                        <p className="text-sm text-gray-600">Contact: {joiner.contactNumber}</p>
                        <p className="text-sm text-gray-600">Position: {joiner.positionAppliedFor}</p>
                        <p className="text-sm text-gray-600">Department: {joiner.department}</p>
                        <p className="text-sm text-gray-600">Username: {joiner.generatedUsername}</p>
                        <p className="text-sm text-gray-600">Submitted: {new Date(joiner.submittedAt).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedJoiner(joiner)}
                          className="primary-button px-3 py-1 text-sm"
                        >
                          View Consent
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Consent Form Modal */}
          {selectedJoiner && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="glass-panel max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
                <h3 className="font-bold text-xl mb-4">Consent Form Details</h3>
                <div className="space-y-3 text-sm">
                  <p><b>Full Name:</b> {selectedJoiner.fullName}</p>
                  <p><b>ID/Passport:</b> {selectedJoiner.idPassportNumber}</p>
                  <p><b>Contact:</b> {selectedJoiner.contactNumber}</p>
                  <p><b>Position:</b> {selectedJoiner.positionAppliedFor}</p>
                  <p><b>Department:</b> {selectedJoiner.department}</p>
                  <p><b>Username:</b> {selectedJoiner.generatedUsername}</p>
                  <p><b>Submitted:</b> {new Date(selectedJoiner.submittedAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => handleApproveJoiner(selectedJoiner)}
                    className="flex-1 primary-button"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectJoiner(selectedJoiner)}
                    className="flex-1 secondary-button"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setSelectedJoiner(null)}
                    className="flex-1 secondary-button"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : activeTab === "employees" ? (
        <div className="glass-card">
          <h3 className="font-bold text-lg mb-2">Employees</h3>
          {employees.length === 0 ? (
            <div>No employees found.</div>
          ) : (
            <ul className="space-y-4">
              {employees.map((emp: any) => (
                <li key={emp.id} className="border rounded p-4 bg-white">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p><b>Full Name:</b> {emp.fullName}</p>
                        <p><b>Position Applied For:</b> {emp.positionAppliedFor}</p>
                        <p><b>ID/Passport:</b> {emp.idPassportNumber}</p>
                        <p><b>Username:</b> {emp.username}</p>
                        <p><b>Department:</b> {emp.department}</p>
                      </div>
                      <div>
                        <p><b>Contact Number:</b> {emp.contactNumber}</p>
                        <p><b>Status:</b> {emp.status}</p>
                        <p><b>Consent Date:</b> {new Date(emp.consentDate).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-sm"><b>Signature Confirmed:</b> {emp.applicantSignature ? "Yes" : "No"}</p>
                      <p className="text-sm"><b>Witness:</b> {emp.witnessRepresentative}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
      ) : activeTab === "content" ? (
        <ContentManagement />
      ) : null}
    </div>
  );
}

function ContentManagement() {
  const [contentType, setContentType] = useState<'contact' | 'privacy' | 'terms' | 'services' | 'about' | 'indemnity' | 'consent-form' | 'contract'>('contact');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchContent();
  }, [contentType]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      if (contentType === 'consent-form') {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/consent-form', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setFormData(data || {});
        }
      } else if (contentType === 'contract') {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/contract-content', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setFormData(data || {});
        }
      } else {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://scratchsolidsolutions.org';
        const response = await fetch(`${apiUrl}/api/content?type=${contentType}`);
        if (response.ok) {
          const data = await response.json() as { content?: string };
          setContent(data.content || '');
        }
      }
    } catch (error) {
      setMessage('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (contentType === 'consent-form') {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/consent-form', {
          method: formData.id ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id: formData.id,
            title: formData.title,
            consent_text: formData.consent_text,
            background_checks: formData.background_checks,
            acknowledgments: formData.acknowledgments,
            witness_name: formData.witness_name
          })
        });
        if (response.ok) {
          setMessage('Consent form updated successfully');
          setTimeout(() => setMessage(''), 3000);
        } else {
          setMessage('Failed to update consent form');
        }
      } else if (contentType === 'contract') {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/contract-content', {
          method: formData.id ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id: formData.id,
            title: formData.title,
            contract_text: formData.contract_text,
            terms: formData.terms,
            company_name: formData.company_name
          })
        });
        if (response.ok) {
          setMessage('Contract updated successfully');
          setTimeout(() => setMessage(''), 3000);
        } else {
          setMessage('Failed to update contract');
        }
      } else {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://scratchsolidsolutions.org';
        const response = await fetch(`${apiUrl}/api/content?type=${contentType}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
        if (response.ok) {
          setMessage('Content updated successfully');
          setTimeout(() => setMessage(''), 3000);
        } else {
          setMessage('Failed to update content');
        }
      }
    } catch (error) {
      setMessage('Failed to update content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h3 className="font-bold text-lg mb-4">Content Management</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Content Type</label>
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value as any)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="contact">Contact Information</option>
          <option value="privacy">Privacy Policy</option>
          <option value="terms">Terms of Service</option>
          <option value="services">Services</option>
          <option value="about">About Us</option>
          <option value="indemnity">Indemnity Form</option>
          <option value="consent-form">Employee Consent Form</option>
          <option value="contract">Employment Contract</option>
        </select>
      </div>

      {contentType === 'consent-form' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Form Title</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Consent Text</label>
            <textarea
              value={formData.consent_text || ''}
              onChange={(e) => setFormData({...formData, consent_text: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Background Checks (one per line)</label>
            <textarea
              value={formData.background_checks || ''}
              onChange={(e) => setFormData({...formData, background_checks: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Acknowledgments (one per line)</label>
            <textarea
              value={formData.acknowledgments || ''}
              onChange={(e) => setFormData({...formData, acknowledgments: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Witness Name</label>
            <input
              type="text"
              value={formData.witness_name || ''}
              onChange={(e) => setFormData({...formData, witness_name: e.target.value})}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      ) : contentType === 'contract' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Contract Title</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Company Name</label>
            <input
              type="text"
              value={formData.company_name || ''}
              onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Contract Text</label>
            <textarea
              value={formData.contract_text || ''}
              onChange={(e) => setFormData({...formData, contract_text: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Terms (use \n for line breaks)</label>
            <textarea
              value={formData.terms || ''}
              onChange={(e) => setFormData({...formData, terms: e.target.value})}
              rows={15}
              className="w-full px-3 py-2 border rounded font-mono text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Content (Markdown supported)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            className="w-full px-3 py-2 border rounded font-mono text-sm"
            placeholder="Enter content here..."
          />
        </div>
      )}

      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={loading}
        className="primary-button px-4 py-2"
      >
        {loading ? 'Saving...' : 'Save Content'}
      </button>
    </div>
  );
}
