// AdminDashboard.tsx
// Next.js page for admin dashboard (user, booking, contract, payroll management)

"use client";

import React, { useEffect, useState } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import DashboardLayout from "@/components/DashboardLayout";
import ServicesManagement from "./AdminDashboard/services-management";

export default function AdminDashboard() {
  useSessionTimeout(true);
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
  const [services, setServices] = useState<any[]>([]);
  const [bankingDetails, setBankingDetails] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', base_price: '', duration_hours: '', category: 'standard' });
  const [bankingForm, setBankingForm] = useState({ bank_name: '', account_number: '', account_holder: '', branch_code: '', account_type: 'current' });

  useEffect(() => {
    async function fetchAdminData() {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        };

        const [employeesRes, pendingContractsRes, usersRes, bookingsRes, contractsRes, paymentsRes, notificationsRes, servicesRes, bankingRes] = await Promise.allSettled([
          fetch("/api/employees", { headers }),
          fetch("/api/pending-contracts", { headers }),
          fetch("/api/admin/users", { headers }),
          fetch("/api/admin/bookings", { headers }),
          fetch("/api/admin/contracts", { headers }),
          fetch("/api/admin/payroll", { headers }),
          fetch("/api/notifications", { headers }),
          fetch("/api/admin/services", { headers }),
          fetch("/api/admin/banking-details", { headers }),
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
        if (servicesRes.status === 'fulfilled' && servicesRes.value.ok) {
          setServices(await servicesRes.value.json());
        }
        if (bankingRes.status === 'fulfilled' && bankingRes.value.ok) {
          const bankingData = await bankingRes.value.json() as any;
          setBankingDetails(bankingData);
          if (bankingData) {
            setBankingForm({
              bank_name: bankingData.bank_name || '',
              account_number: bankingData.account_number || '',
              account_holder: bankingData.account_holder || '',
              branch_code: bankingData.branch_code || '',
              account_type: bankingData.account_type || 'current'
            });
          }
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

  const handleAddService = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: serviceForm.name,
          description: serviceForm.description,
          base_price: parseFloat(serviceForm.base_price),
          duration_hours: parseInt(serviceForm.duration_hours),
          category: serviceForm.category
        })
      });
      if (res.ok) {
        const servicesRes = await fetch('/api/admin/services', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (servicesRes.ok) setServices(await servicesRes.json());
        setServiceForm({ name: '', description: '', base_price: '', duration_hours: '', category: 'standard' });
      }
    } catch (err) {
      console.error('Failed to add service:', err);
    }
  };

  const handleUpdateService = async (id: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/admin/services', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id,
          name: serviceForm.name,
          description: serviceForm.description,
          base_price: parseFloat(serviceForm.base_price),
          duration_hours: parseInt(serviceForm.duration_hours),
          category: serviceForm.category,
          is_active: true
        })
      });
      if (res.ok) {
        const servicesRes = await fetch('/api/admin/services', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (servicesRes.ok) setServices(await servicesRes.json());
        setServiceForm({ name: '', description: '', base_price: '', duration_hours: '', category: 'standard' });
      }
    } catch (err) {
      console.error('Failed to update service:', err);
    }
  };

  const handleDeleteService = async (id: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/admin/services?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setServices(prev => prev.filter((s: any) => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete service:', err);
    }
  };

  const handleUpdateBankingDetails = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/admin/banking-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bankingForm)
      });
      if (res.ok) {
        const bankingRes = await fetch('/api/admin/banking-details', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (bankingRes.ok) {
          const data = await bankingRes.json();
          setBankingDetails(data);
        }
        alert('Banking details updated successfully');
      }
    } catch (err) {
      console.error('Failed to update banking details:', err);
    }
  };

  if (loading) return <DashboardLayout title="Admin Dashboard" role="admin"><div className="animate-pulse space-y-6"><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="border rounded-lg p-6 bg-white/20"><div className="h-4 bg-white/30 rounded w-1/2 mb-3"/><div className="h-8 bg-white/30 rounded w-3/4"/></div>)}</div></div></DashboardLayout>;
  if (error) return <DashboardLayout title="Admin Dashboard" role="admin"><div className="error-msg">{error}</div></DashboardLayout>;

  return (
    <DashboardLayout title="Admin Dashboard" role="admin">
      {/* Tab Navigation */}
      <div className="mb-6 flex space-x-2 border-b border-white/20 pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "overview" ? "bg-white/20 text-white" : "bg-white/10 text-white/70 hover:bg-white/15"}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("new-joiners")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "new-joiners" ? "bg-white/20 text-white" : "bg-white/10 text-white/70 hover:bg-white/15"}`}
        >
          New Joiners
        </button>
        <button
          onClick={() => setActiveTab("employees")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "employees" ? "bg-white/20 text-white" : "bg-white/10 text-white/70 hover:bg-white/15"}`}
        >
          Employees
        </button>
        <button
          onClick={() => setActiveTab("services-banking")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "services-banking" ? "bg-white/20 text-white" : "bg-white/10 text-white/70 hover:bg-white/15"}`}
        >
          Services & Banking
        </button>
        <button
          onClick={() => setActiveTab("content")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "content" ? "bg-white/20 text-white" : "bg-white/10 text-white/70 hover:bg-white/15"}`}
        >
          Content
        </button>
      </div>

      {activeTab === "overview" ? (
        <>
          {/* Stats Widget */}
          <div className="mb-6 grid grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
              <h3 className="font-bold text-white">Total Bookings</h3>
              <p className="text-2xl text-white">{stats.totalBookings}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
              <h3 className="font-bold text-white">Total Revenue</h3>
              <p className="text-2xl text-white">R{stats.totalRevenue?.toFixed(2) ?? "0.00"}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
              <h3 className="font-bold text-white">Active Cleaners</h3>
              <p className="text-2xl text-white">{stats.activeCleaners}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
              <h3 className="font-bold text-white">Weekend Assignments</h3>
              <p className="text-2xl text-white">{stats.pendingWeekendAssignments}</p>
            </div>
          </div>

          {/* Weekend Assignment Notifications */}
          {notifications.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-6">
              <h3 className="font-bold text-lg text-white mb-2">Pending Weekend Assignments</h3>
              <ul className="space-y-2">
                {notifications.map((notif: any) => (
                  <li key={notif.id} className="border border-white/10 rounded p-2 bg-white/5">
                    <div className="text-white"><b className="text-white">Booking #{notif.booking_id}</b> - {notif.message}</div>
                    <button
                      onClick={() => assignCleaner(notif.booking_id, "")}
                      className="mt-2 bg-white/20 hover:bg-white/30 text-white px-2 py-1 text-sm rounded border border-white/30 transition-all"
                    >
                      Assign Cleaner
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Users Widget */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-6">
            <h3 className="font-bold text-lg text-white mb-2">Users</h3>
            <ul className="space-y-1">
              {users.map((u: any) => (
                <li key={u.id} className="border border-white/10 rounded p-2 bg-white/5 text-white">
                  <b>{u.name}</b> ({u.role}) - {u.email}
                </li>
              ))}
            </ul>
          </div>

          {/* Bookings Widget */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-6">
            <h3 className="font-bold text-lg text-white mb-2">Bookings</h3>
            <ul className="space-y-1">
              {bookings.map((b: any) => (
                <li key={b.id} className="border border-white/10 rounded p-2 bg-white/5 text-white">
                  <b>{b.client_name}</b> - {b.booking_date} {b.booking_time} - {b.status}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : activeTab === "new-joiners" ? (
        <>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
            <h3 className="font-bold text-lg text-white mb-4">New Joiners - Pending Approval</h3>
            {newJoiners.length === 0 ? (
              <p className="text-white/60">No pending new joiners.</p>
            ) : (
              <div className="space-y-3">
                {newJoiners.map((joiner: any) => (
                  <div key={joiner.id} className="border border-white/10 rounded p-4 bg-white/5">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-lg text-white">{joiner.fullName}</p>
                        <p className="text-sm text-white/60">ID/Passport: {joiner.idPassportNumber}</p>
                        <p className="text-sm text-white/60">Contact: {joiner.contactNumber}</p>
                        <p className="text-sm text-white/60">Position: {joiner.positionAppliedFor}</p>
                        <p className="text-sm text-white/60">Department: {joiner.department}</p>
                        <p className="text-sm text-white/60">Username: {joiner.generatedUsername}</p>
                        <p className="text-sm text-white/60">Submitted: {new Date(joiner.submittedAt).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedJoiner(joiner)}
                          className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 text-sm rounded border border-white/30 transition-all"
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
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
                <h3 className="font-bold text-xl text-white mb-4">Consent Form Details</h3>
                <div className="space-y-3 text-sm text-white/80">
                  <p><b className="text-white">Full Name:</b> {selectedJoiner.fullName}</p>
                  <p><b className="text-white">ID/Passport:</b> {selectedJoiner.idPassportNumber}</p>
                  <p><b className="text-white">Contact:</b> {selectedJoiner.contactNumber}</p>
                  <p><b className="text-white">Position:</b> {selectedJoiner.positionAppliedFor}</p>
                  <p><b className="text-white">Department:</b> {selectedJoiner.department}</p>
                  <p><b className="text-white">Username:</b> {selectedJoiner.generatedUsername}</p>
                  <p><b className="text-white">Submitted:</b> {new Date(selectedJoiner.submittedAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => handleApproveJoiner(selectedJoiner)}
                    className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-200 px-4 py-2 rounded-lg border border-green-500/30 transition-all"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectJoiner(selectedJoiner)}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded-lg border border-red-500/30 transition-all"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setSelectedJoiner(null)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg border border-white/30 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : activeTab === "employees" ? (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <h3 className="font-bold text-lg text-white mb-2">Employees</h3>
          {employees.length === 0 ? (
            <div className="text-white/60">No employees found.</div>
          ) : (
            <ul className="space-y-4">
              {employees.map((emp: any) => (
                <li key={emp.id} className="border border-white/10 rounded p-4 bg-white/5">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-white"><b className="text-white">Full Name:</b> {emp.fullName}</p>
                        <p className="text-white"><b className="text-white">Position Applied For:</b> {emp.positionAppliedFor}</p>
                        <p className="text-white"><b className="text-white">ID/Passport:</b> {emp.idPassportNumber}</p>
                        <p className="text-white"><b className="text-white">Username:</b> {emp.username}</p>
                        <p className="text-white"><b className="text-white">Department:</b> {emp.department}</p>
                      </div>
                      <div>
                        <p className="text-white"><b className="text-white">Contact Number:</b> {emp.contactNumber}</p>
                        <p className="text-white"><b className="text-white">Status:</b> {emp.status}</p>
                        <p className="text-white"><b className="text-white">Consent Date:</b> {new Date(emp.consentDate).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-sm text-white/60"><b className="text-white">Signature Confirmed:</b> {emp.applicantSignature ? "Yes" : "No"}</p>
                      <p className="text-sm text-white/60"><b className="text-white">Witness:</b> {emp.witnessRepresentative}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
      ) : activeTab === "services-banking" ? (
        <ServicesManagement />
      ) : activeTab === "content" ? (
        <ContentManagement />
      ) : null}
    </DashboardLayout>
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
