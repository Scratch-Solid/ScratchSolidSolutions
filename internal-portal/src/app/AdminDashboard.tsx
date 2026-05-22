// AdminDashboard.tsx
// Next.js page for admin dashboard (user, booking, contract, payroll management)

"use client";

import React, { useEffect, useState } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import DashboardLayout from "@/components/DashboardLayout";
import ServicesManagement from "./AdminDashboard/services-management";
import CleanerVisibility from "./AdminDashboard/cleaner-visibility";
import TrainingLedger from "./AdminDashboard/training-ledger";

function ProxyObserver() {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [targetUserRole, setTargetUserRole] = useState<'client' | 'cleaner' | 'business'>('client');
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSessionHistory();
  }, []);

  const fetchSessionHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/proxy-observer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'view' })
      });
      if (response.ok) {
        const data = await response.json();
        setSessionHistory(data.history || []);
      }
    } catch (error) {
      setMessage('Failed to fetch session history');
    }
  };

  const handleStartSession = async () => {
    if (!targetUserId) {
      setMessage('Please select a target user');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/proxy-observer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'start',
          targetUserId: parseInt(targetUserId)
        })
      });
      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
        setMessage('Proxy session started');
        fetchSessionHistory();
      } else {
        setMessage('Failed to start proxy session');
      }
    } catch (error) {
      setMessage('Failed to start proxy session');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/proxy-observer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'end',
          sessionId: activeSession.sessionId
        })
      });
      if (response.ok) {
        setActiveSession(null);
        setMessage('Proxy session ended');
        fetchSessionHistory();
      } else {
        setMessage('Failed to end proxy session');
      }
    } catch (error) {
      setMessage('Failed to end proxy session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Proxy Observer State Engine</h2>
        {message && (
          <div className={`px-4 py-2 rounded-lg ${message.includes('success') || message.includes('started') || message.includes('ended') ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
            {message}
          </div>
        )}
      </div>

      {/* Session Control Panel */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Dashboard Projection Matrix</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-white/80 text-sm mb-2">Target User Role</label>
            <select
              value={targetUserRole}
              onChange={(e) => setTargetUserRole(e.target.value as any)}
              className="w-full bg-white/20 border border-white/30 rounded px-3 py-2 text-white"
            >
              <option value="client">Client</option>
              <option value="business">Business</option>
              <option value="cleaner">Cleaner</option>
            </select>
          </div>
          <div>
            <label className="block text-white/80 text-sm mb-2">Target User ID</label>
            <input
              type="text"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="Enter user ID"
              className="w-full bg-white/20 border border-white/30 rounded px-3 py-2 text-white placeholder-white/50"
            />
          </div>
          <div className="flex items-end gap-2">
            {!activeSession ? (
              <button
                onClick={handleStartSession}
                disabled={loading || !targetUserId}
                className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 px-4 py-2 rounded-lg border border-blue-500/30 transition-all disabled:opacity-50"
              >
                {loading ? 'Starting...' : 'Start View As'}
              </button>
            ) : (
              <button
                onClick={handleEndSession}
                disabled={loading}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded-lg border border-red-500/30 transition-all disabled:opacity-50"
              >
                {loading ? 'Ending...' : 'End Session'}
              </button>
            )}
          </div>
        </div>

        {/* Active Session Display */}
        {activeSession && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-green-200 font-semibold">Active Session</span>
              <span className="text-green-200/60 text-sm">Started: {new Date(activeSession.startedAt).toLocaleString()}</span>
            </div>
            <div className="text-white/80 text-sm">
              Viewing as: {activeSession.targetUserId} ({targetUserRole})
            </div>
            <div className="mt-3 p-3 bg-white/5 rounded border border-white/10">
              <div className="text-white/60 text-xs mb-2">READ-ONLY VIEW</div>
              <div className="text-white/80 text-sm">
                This is a simulated view of the target user's dashboard. Actual dashboard rendering would require iframe integration.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session History */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Session History (Audit Log)</h3>
        {sessionHistory.length === 0 ? (
          <p className="text-white/60">No proxy sessions recorded.</p>
        ) : (
          <div className="space-y-2">
            {sessionHistory.map((session: any) => (
              <div key={session.id} className="border border-white/10 rounded p-3 bg-white/5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white font-semibold">Session ID: {session.sessionId}</div>
                    <div className="text-white/70 text-sm">Target: {session.targetUserId} ({session.targetRole})</div>
                    <div className="text-white/60 text-xs">Started: {new Date(session.startedAt).toLocaleString()}</div>
                    {session.endedAt && (
                      <div className="text-white/60 text-xs">Ended: {new Date(session.endedAt).toLocaleString()}</div>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${session.status === 'active' ? 'bg-green-500/20 text-green-200' : 'bg-white/10 text-white/60'}`}>
                    {session.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POPIA Compliance Notice */}
      <div className="bg-yellow-500/10 backdrop-blur-sm rounded-lg border border-yellow-500/30 p-4">
        <div className="flex items-start gap-3">
          <div className="text-yellow-200 text-2xl">⚠️</div>
          <div>
            <h4 className="text-yellow-200 font-semibold mb-1">POPIA Compliance Notice</h4>
            <p className="text-white/70 text-sm">
              All proxy observer sessions are logged for audit purposes. Access to user data through this feature is monitored and requires proper authorization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingConfiguration() {
  const [pricingMatrix, setPricingMatrix] = useState<any[]>([]);
  const [transportFees, setTransportFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v2/pricing/matrix', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPricingMatrix(data.pricing || []);
        setTransportFees(data.transport || []);
      }
    } catch (error) {
      setMessage('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const handleCellEdit = (id: string, field: string, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v2/pricing/matrix', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceType: editingCell.id,
          [editingCell.field]: parseFloat(editValue)
        })
      });
      if (response.ok) {
        setMessage('Pricing updated successfully');
        fetchPricingData();
      } else {
        setMessage('Failed to update pricing');
      }
    } catch (error) {
      setMessage('Failed to update pricing');
    } finally {
      setEditingCell(null);
      setEditValue('');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) return <div className="text-white animate-pulse">Loading pricing configuration...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Dynamic Pricing Matrix</h2>
        {message && (
          <div className={`px-4 py-2 rounded-lg ${message.includes('success') ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
            {message}
          </div>
        )}
      </div>

      {/* Pricing Configuration Grid */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Service Pricing Configuration</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-3 px-4">Service Type</th>
                <th className="text-left py-3 px-4">Base Price (R)</th>
                <th className="text-left py-3 px-4">Transport Fee (R)</th>
                <th className="text-left py-3 px-4">Weekend Surcharge (%)</th>
                <th className="text-left py-3 px-4">Holiday Surcharge (%)</th>
                <th className="text-left py-3 px-4">Rush Surcharge (%)</th>
                <th className="text-left py-3 px-4">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {pricingMatrix.map((item: any) => (
                <tr key={item.serviceType} className="border-b border-white/10 hover:bg-white/5">
                  <td className="py-3 px-4 font-semibold">{item.serviceType}</td>
                  <td className="py-3 px-4">
                    {editingCell?.id === item.serviceType && editingCell?.field === 'basePrice' ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        className="bg-white/20 border border-white/30 rounded px-2 py-1 w-24 text-white"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:text-blue-300"
                        onClick={() => handleCellEdit(item.serviceType, 'basePrice', item.basePrice?.toString() || '')}
                      >
                        R{item.basePrice?.toFixed(2) || '0.00'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingCell?.id === item.serviceType && editingCell?.field === 'transportFee' ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        className="bg-white/20 border border-white/30 rounded px-2 py-1 w-24 text-white"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:text-blue-300"
                        onClick={() => handleCellEdit(item.serviceType, 'transportFee', item.transportFee?.toString() || '')}
                      >
                        R{item.transportFee?.toFixed(2) || '0.00'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingCell?.id === item.serviceType && editingCell?.field === 'weekendSurcharge' ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        className="bg-white/20 border border-white/30 rounded px-2 py-1 w-20 text-white"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:text-blue-300"
                        onClick={() => handleCellEdit(item.serviceType, 'weekendSurcharge', item.weekendSurcharge?.toString() || '')}
                      >
                        {item.weekendSurcharge || 0}%
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingCell?.id === item.serviceType && editingCell?.field === 'holidaySurcharge' ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        className="bg-white/20 border border-white/30 rounded px-2 py-1 w-20 text-white"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:text-blue-300"
                        onClick={() => handleCellEdit(item.serviceType, 'holidaySurcharge', item.holidaySurcharge?.toString() || '')}
                      >
                        {item.holidaySurcharge || 0}%
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingCell?.id === item.serviceType && editingCell?.field === 'rushSurcharge' ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                        className="bg-white/20 border border-white/30 rounded px-2 py-1 w-20 text-white"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:text-blue-300"
                        onClick={() => handleCellEdit(item.serviceType, 'rushSurcharge', item.rushSurcharge?.toString() || '')}
                      >
                        {item.rushSurcharge || 0}%
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-white/60 text-sm">
                    {item.lastUpdated ? new Date(item.lastUpdated).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-white/60">
          Click on any value to edit. Changes are saved immediately and cached for 5 minutes.
        </div>
      </div>

      {/* Transport Fees Grid */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Suburb Transport Fees</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-3 px-4">Area Name</th>
                <th className="text-left py-3 px-4">Base Transport Fee (R)</th>
              </tr>
            </thead>
            <tbody>
              {transportFees.map((item: any) => (
                <tr key={item.areaName} className="border-b border-white/10 hover:bg-white/5">
                  <td className="py-3 px-4 font-semibold">{item.areaName}</td>
                  <td className="py-3 px-4">R{item.baseTransportFee?.toFixed(2) || '0.00'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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
  const [employeeSubTab, setEmployeeSubTab] = useState<'new' | 'existing'>('new');
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
          const pay = await paymentsRes.value.json();
          setPayments(pay as any[]);
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

        const totalRevenue = (payments || []).reduce((sum: number, p: any) => {
          const val = p?.amount ?? p?.total_amount ?? 0;
          return sum + (typeof val === 'number' ? val : parseFloat(val) || 0);
        }, 0);
        const weekendAssignments = resolvedBookings.filter((b: any) => {
          const d = b?.booking_date ? new Date(b.booking_date) : null;
          if (!d || isNaN(d.getTime())) return false;
          const day = d.getUTCDay();
          return (day === 0 || day === 6) && (b?.status ?? '').toLowerCase() !== 'completed';
        }).length;

        setStats({
          totalBookings: resolvedBookings.length,
          totalRevenue,
          activeCleaners: resolvedEmployees.length,
          pendingWeekendAssignments: weekendAssignments,
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
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cleaner_id: cleanerId })
      });
      if (res.ok) {
        // Refresh bookings
        const bookingsRes = await fetch("/api/admin/bookings", { headers: { 'Authorization': `Bearer ${token}` } });
        if (bookingsRes.ok) setBookings(await bookingsRes.json());
      } else {
        setError('Failed to assign cleaner');
      }
    } catch (err) {
      console.error("Failed to assign cleaner:", err);
      setError('Failed to assign cleaner');
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

  if (loading) return <DashboardLayout title="Admin Dashboard" role="admin"><div className="animate-pulse space-y-6"><div className="responsive-grid">{[1,2,3,4].map(i=><div key={i} className="glass-card"><div className="h-4 bg-white/30 rounded w-1/2 mb-3"/><div className="h-8 bg-white/30 rounded w-3/4"/></div>)}</div></div></DashboardLayout>;
  if (error) return <DashboardLayout title="Admin Dashboard" role="admin"><div className="error-msg">{error}</div></DashboardLayout>;

  return (
    <DashboardLayout title="Admin Dashboard" role="admin">
      {/* Tab Navigation */}
      <div className="tabs mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`tab ${activeTab === "overview" ? "active" : ""}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("employees")}
          className={`tab ${activeTab === "employees" ? "active" : ""}`}
        >
          Employees
        </button>
        <button
          onClick={() => setActiveTab("services-banking")}
          className={`tab ${activeTab === "services-banking" ? "active" : ""}`}
        >
          Services & Banking
        </button>
        <button
          onClick={() => setActiveTab("cleaners")}
          className={`tab ${activeTab === "cleaners" ? "active" : ""}`}
        >
          Cleaners
        </button>
        <button
          onClick={() => setActiveTab("content")}
          className={`tab ${activeTab === "content" ? "active" : ""}`}
        >
          Content
        </button>
        <button
          onClick={() => setActiveTab("pricing")}
          className={`tab ${activeTab === "pricing" ? "active" : ""}`}
        >
          Pricing
        </button>
        <button
          onClick={() => setActiveTab("proxy-observer")}
          className={`tab ${activeTab === "proxy-observer" ? "active" : ""}`}
        >
          Proxy Observer
        </button>
        <button
          onClick={() => setActiveTab("pool-management")}
          className={`tab ${activeTab === "pool-management" ? "active" : ""}`}
        >
          Pool Management
        </button>
        <button
          onClick={() => setActiveTab("staff-reviews")}
          className={`tab ${activeTab === "staff-reviews" ? "active" : ""}`}
        >
          Staff Reviews
        </button>
        <button
          onClick={() => setActiveTab("training")}
          className={`tab ${activeTab === "training" ? "active" : ""}`}
        >
          Training
        </button>
      </div>

      {activeTab === "overview" ? (
        <>
          {/* Stats Widget */}
          <div className="responsive-grid mb-6">
            <div className="stats-card">
              <div className="stats-value">{stats.totalBookings}</div>
              <div className="stats-label">Total Bookings</div>
            </div>
            <div className="stats-card">
              <div className="stats-value">R{(stats.totalRevenue || 0).toFixed(2)}</div>
              <div className="stats-label">Total Revenue</div>
            </div>
            <div className="stats-card">
              <div className="stats-value">{stats.activeCleaners}</div>
              <div className="stats-label">Active Cleaners</div>
            </div>
            <div className="stats-card">
              <div className="stats-value">{stats.pendingWeekendAssignments}</div>
              <div className="stats-label">Weekend Assignments</div>
            </div>
          </div>

          {/* Weekend Assignment Notifications */}
          {notifications.length > 0 && (
            <div className="glass-card mb-6">
              <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Pending Weekend Assignments</h3>
              <ul className="space-y-2">
                {notifications.map((notif: any) => (
                  <li key={notif.id} className="glass-card" style={{ marginBottom: '12px' }}>
                    <div style={{ color: 'var(--text)' }}><b style={{ color: 'var(--text-h)' }}>Booking #{notif.booking_id}</b> - {notif.message}</div>
                    <button
                      onClick={() => assignCleaner(notif.booking_id, "")}
                      className="secondary-button mt-2"
                      style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                    >
                      Assign Cleaner
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Users Widget */}
          <div className="glass-card mb-6">
            <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Users</h3>
            <ul className="space-y-2">
              {users.map((u: any) => (
                <li key={u.id} className="glass-card" style={{ marginBottom: '8px' }}>
                  <b style={{ color: 'var(--text-h)' }}>{u.name}</b> <span style={{ color: 'var(--text-secondary)' }}>({u.role})</span> - <span style={{ color: 'var(--text)' }}>{u.email}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bookings Widget */}
          <div className="glass-card mb-6">
            <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Bookings</h3>
            <ul className="space-y-2">
              {bookings.map((b: any) => (
                <li key={b.id} className="glass-card" style={{ marginBottom: '8px' }}>
                  <b style={{ color: 'var(--text-h)' }}>{b.client_name}</b> - <span style={{ color: 'var(--text)' }}>{b.booking_date} {b.booking_time}</span> - <span className={`badge badge-info`}>{b.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : activeTab === "employees" ? (
        <div className="space-y-4">
          <div className="tabs">
            <button onClick={() => setEmployeeSubTab('new')} className={`tab ${employeeSubTab === 'new' ? 'active' : ''}`}>New Joiners</button>
            <button onClick={() => setEmployeeSubTab('existing')} className={`tab ${employeeSubTab === 'existing' ? 'active' : ''}`}>Employee Details</button>
          </div>

          {employeeSubTab === 'new' ? (
            <>
              <div className="glass-card">
                <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>New Joiners - Pending Approval</h3>
                {newJoiners.length === 0 ? (
                  <p style={{ color: 'var(--text-light)' }}>No pending new joiners.</p>
                ) : (
                  <div className="space-y-3">
                    {newJoiners.map((joiner: any) => (
                      <div key={joiner.id} className="glass-card">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-lg" style={{ color: 'var(--text-h)' }}>{joiner.fullName}</p>
                            <p className="text-sm" style={{ color: 'var(--text-light)' }}>ID/Passport: {joiner.idPassportNumber}</p>
                            <p className="text-sm" style={{ color: 'var(--text-light)' }}>Contact: {joiner.contactNumber}</p>
                            <p className="text-sm" style={{ color: 'var(--text-light)' }}>Position: {joiner.positionAppliedFor}</p>
                            <p className="text-sm" style={{ color: 'var(--text-light)' }}>Department: {joiner.department}</p>
                            <p className="text-sm" style={{ color: 'var(--text-light)' }}>Username: {joiner.generatedUsername}</p>
                            <p className="text-sm" style={{ color: 'var(--text-light)' }}>Submitted: {new Date(joiner.submittedAt).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedJoiner(joiner)}
                              className="secondary-button"
                              style={{ padding: '8px 16px', fontSize: '0.875rem' }}
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

              {selectedJoiner && (
                <div className="glass-overlay">
                  <div className="glass-panel max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
                    <h3 className="font-bold text-xl mb-4" style={{ color: 'var(--text-h)' }}>Consent Form Details</h3>
                    <div className="space-y-3 text-sm" style={{ color: 'var(--text)' }}>
                      <p><b style={{ color: 'var(--text-h)' }}>Full Name:</b> {selectedJoiner.fullName}</p>
                      <p><b style={{ color: 'var(--text-h)' }}>ID/Passport:</b> {selectedJoiner.idPassportNumber}</p>
                      <p><b style={{ color: 'var(--text-h)' }}>Contact:</b> {selectedJoiner.contactNumber}</p>
                      <p><b style={{ color: 'var(--text-h)' }}>Position:</b> {selectedJoiner.positionAppliedFor}</p>
                      <p><b style={{ color: 'var(--text-h)' }}>Department:</b> {selectedJoiner.department}</p>
                      <p><b style={{ color: 'var(--text-h)' }}>Username:</b> {selectedJoiner.generatedUsername}</p>
                      <p><b style={{ color: 'var(--text-h)' }}>Submitted:</b> {new Date(selectedJoiner.submittedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-4 mt-6">
                      <button
                        onClick={() => handleApproveJoiner(selectedJoiner)}
                        className="primary-button flex-1"
                        style={{ background: 'var(--success)', border: 'none' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectJoiner(selectedJoiner)}
                        className="primary-button flex-1"
                        style={{ background: 'var(--error)', border: 'none' }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setSelectedJoiner(null)}
                        className="secondary-button flex-1"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="glass-card">
              <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Employee Details</h3>
              {employees.length === 0 ? (
                <p style={{ color: 'var(--text-light)' }}>No employees found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="glass-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp: any) => (
                        <tr key={emp.id}>
                          <td style={{ color: 'var(--text)' }}>{emp.name}</td>
                          <td style={{ color: 'var(--text)' }}>{emp.email}</td>
                          <td><span className={`badge badge-info`}>{emp.role}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : activeTab === "services-banking" ? (
        <ServicesManagement />
      ) : activeTab === "cleaners" ? (
        <CleanerVisibility />
      ) : activeTab === "content" ? (
        <ContentManagement />
      ) : activeTab === "pricing" ? (
        <PricingConfiguration />
      ) : activeTab === "proxy-observer" ? (
        <ProxyObserver />
      ) : activeTab === "pool-management" ? (
        <PoolManagement />
      ) : activeTab === "staff-reviews" ? (
        <StaffReviews />
      ) : activeTab === "training" ? (
        <TrainingLedger />
      ) : null}
    </DashboardLayout>
  );
}

function ContentManagement() {
  const [mode, setMode] = useState<'static' | 'leaders' | 'ai-bot' | 'backgrounds' | 'gallery' | 'reviews'>('static');
  const [contentType, setContentType] = useState<'contact' | 'privacy' | 'terms' | 'services' | 'about' | 'indemnity' | 'consent-form' | 'contract'>('contact');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState<any>({});

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://scratchsolidsolutions.org';
  const marketingProxy = (path: string) => `/api/marketing${path}`;

  const [leaders, setLeaders] = useState<any[]>([]);
  const [leaderForm, setLeaderForm] = useState<any>({ id: null, name: '', title: '', description: '', image_url: '', display_order: 0, active: true });

  const [aiItems, setAiItems] = useState<any[]>([]);
  const [aiForm, setAiForm] = useState<any>({ id: null, question: '', response: '', category: '' });

  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [backgroundPreview, setBackgroundPreview] = useState('');

  const [galleryImages, setGalleryImages] = useState<{ url: string; caption?: string }[]>([]);
  const [galleryCaption, setGalleryCaption] = useState('');

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewFilter, setReviewFilter] = useState<'approved' | 'pending' | 'rejected'>('pending');

  useEffect(() => {
    if (mode === 'static') fetchContent();
    if (mode === 'leaders') fetchLeaders();
    if (mode === 'ai-bot') fetchAi();
    if (mode === 'backgrounds') fetchBackground();
    if (mode === 'gallery') fetchGallery();
    if (mode === 'reviews') fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, mode, reviewFilter]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      if (mode !== 'static') return;
      const token = localStorage.getItem('authToken');
      if (contentType === 'consent-form') {
        const response = await fetch('/api/admin/consent-form', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json() as { title?: string; content?: string; id?: string };
          setFormData(data || {});
          setContent(data?.content || '');
        }
      } else if (contentType === 'contract') {
        const response = await fetch('/api/admin/contract-content', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json() as { title?: string; body?: string; version?: string; id?: string };
          setFormData(data || {});
          setContent(data?.body || '');
        }
      } else {
        if (!token) {
          setMessage('Authentication required to load content');
          return;
        }
        const response = await fetch(marketingProxy(`/content?type=${contentType}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json() as { content?: string };
          setContent(data.content || '');
        } else {
          setMessage('Failed to load content');
        }
      }
    } catch (error) {
      setMessage('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackground = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(marketingProxy('/content?type=background-image'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json() as { content?: string };
        setBackgroundUrl(data.content || '');
        setBackgroundPreview(data.content || '');
      }
    } catch (err) {
      setMessage('Failed to load background');
    } finally {
      setLoading(false);
    }
  };

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(marketingProxy('/content?type=gallery-images'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json() as { content?: string };
        if (data.content) {
          try {
            const json = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
            const arr = Array.isArray(json) ? json : json?.images || [];
            setGalleryImages(arr.filter((x: any) => x?.url));
          } catch (e) {
            setGalleryImages([]);
          }
        } else {
          setGalleryImages([]);
        }
      }
    } catch (err) {
      setMessage('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(marketingProxy(`/reviews?status=${reviewFilter}`), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setReviews((data as any)?.results || (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      setMessage('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const updateReviewStatus = async (id: number, status: string) => {
    const token = localStorage.getItem('authToken');
    await fetch(marketingProxy('/reviews'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status })
    });
    fetchReviews();
  };

  const deleteReview = async (id: number) => {
    const token = localStorage.getItem('authToken');
    await fetch(marketingProxy(`/reviews?id=${id}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchReviews();
  };

  const fetchLeaders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setMessage('Authentication required to load leaders');
        return;
      }
      const res = await fetch(marketingProxy('/leaders'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setLeaders(await res.json());
      } else {
        setMessage('Failed to load leaders');
      }
    } catch (err) {
      setMessage('Failed to load leaders');
    } finally {
      setLoading(false);
    }
  };

  const fetchAi = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setMessage('Authentication required to load bot content');
        return;
      }
      const res = await fetch(marketingProxy('/ai-responses'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAiItems(await res.json());
      else setMessage('Failed to load bot content');
    } catch (err) {
      setMessage('Failed to load bot content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (mode === 'static') {
        if (contentType === 'consent-form') {
          const token = localStorage.getItem('authToken');
          const response = await fetch('/api/admin/consent-form', {
            method: formData.id ? 'PUT' : 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              title: formData.title,
              content: formData.content
            })
          });
          if (response.ok) {
            setMessage('Saved');
            fetchContent();
          } else {
            setMessage('Save failed');
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
              title: formData.title,
              body: formData.body,
              version: formData.version || 'v1',
            })
          });
          if (response.ok) {
            setMessage('Saved');
            fetchContent();
          } else {
            setMessage('Save failed');
          }
        } else {
          const token = localStorage.getItem('authToken');
          if (!token) {
            setMessage('Authentication required to save content');
          } else {
            const response = await fetch(marketingProxy(`/content?type=${contentType}`), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ content })
            });
            if (response.ok) setMessage('Saved');
            else setMessage('Save failed');
          }
        }
      } else if (mode === 'leaders') {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setMessage('Authentication required to save leader');
          return;
        }
        const method = leaderForm.id ? 'PUT' : 'POST';
        const url = marketingProxy('/leaders');
        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            id: leaderForm.id,
            name: leaderForm.name,
            title: leaderForm.title,
            description: leaderForm.description,
            image_url: leaderForm.image_url,
            display_order: leaderForm.display_order ?? 0,
            active: leaderForm.active,
          })
        });
        if (res.ok) {
          setMessage('Leader saved');
          setLeaderForm({ id: null, name: '', title: '', description: '', image_url: '', display_order: 0, active: true });
          fetchLeaders();
        } else {
          setMessage('Leader save failed');
        }
      } else if (mode === 'ai-bot') {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setMessage('Authentication required to save bot content');
          return;
        }
        const method = aiForm.id ? 'PUT' : 'POST';
        const url = aiForm.id ? marketingProxy(`/ai-responses/${aiForm.id}`) : marketingProxy('/ai-responses');
        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            question: aiForm.question,
            response: aiForm.response,
            category: aiForm.category,
          })
        });
        if (res.ok) {
          setMessage('Saved');
          setAiForm({ id: null, question: '', response: '', category: '' });
          fetchAi();
        } else {
          setMessage('Save failed');
        }
      }
    } catch (error) {
      setMessage('Action failed');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 2500);
    }
  };

  const handleDeleteLeader = async (id: number) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setMessage('Authentication required to delete leader');
      return;
    }
    await fetch(marketingProxy(`/leaders?id=${id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchLeaders();
  };

  const handleDeleteAi = async (id: number) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setMessage('Authentication required to delete bot content');
      return;
    }
    await fetch(marketingProxy(`/ai-responses/${id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchAi();
  };

  const handleUpload = async (file: File) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setMessage('Authentication required to upload');
      return;
    }
    try {
      setLoading(true);
      const folder = mode === 'backgrounds' ? 'backgrounds' : mode === 'gallery' ? 'gallery' : 'leaders';

      // Upload file directly to marketing API (proxied)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const uploadRes = await fetch(marketingProxy('/upload'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error('Upload request failed:', uploadRes.status, errorText);
        setMessage(`Upload failed: ${uploadRes.status} - ${errorText}`);
        setLoading(false);
        return;
      }

      const uploadData = await uploadRes.json() as { publicUrl?: string; key?: string };
      if (!uploadData.publicUrl) {
        console.error('Public URL missing from response:', uploadData);
        setMessage('Upload failed: no URL returned');
        setLoading(false);
        return;
      }

      const finalUrl = uploadData.publicUrl;
      if (mode === 'leaders') {
        setLeaderForm((prev: any) => ({ ...prev, image_url: finalUrl }));
      } else if (mode === 'backgrounds') {
        setBackgroundUrl(finalUrl);
        setBackgroundPreview(finalUrl);
      } else if (mode === 'gallery') {
        setGalleryImages(prev => [...prev, { url: finalUrl, caption: galleryCaption }]);
        setGalleryCaption('');
      }
      setMessage('Image uploaded');
    } catch (err) {
      console.error('Upload error:', err);
      setMessage(`Upload failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div className="glass-card space-y-6">
      <div className="flex gap-2">
        <button className={`px-3 py-2 rounded ${mode === 'static' ? 'primary-button' : 'secondary-button'}`} onClick={() => setMode('static')}>Static Content</button>
        <button className={`px-3 py-2 rounded ${mode === 'leaders' ? 'primary-button' : 'secondary-button'}`} onClick={() => setMode('leaders')}>Leaders</button>
        <button className={`px-3 py-2 rounded ${mode === 'ai-bot' ? 'primary-button' : 'secondary-button'}`} onClick={() => setMode('ai-bot')}>AI Bot Content</button>
        <button className={`px-3 py-2 rounded ${mode === 'backgrounds' ? 'primary-button' : 'secondary-button'}`} onClick={() => setMode('backgrounds')}>Backgrounds</button>
        <button className={`px-3 py-2 rounded ${mode === 'gallery' ? 'primary-button' : 'secondary-button'}`} onClick={() => setMode('gallery')}>Gallery</button>
        <button className={`px-3 py-2 rounded ${mode === 'reviews' ? 'primary-button' : 'secondary-button'}`} onClick={() => setMode('reviews')}>Reviews</button>
      </div>

      {mode === 'static' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as any)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="contact">Contact Information</option>
              <option value="privacy">Privacy Policy</option>
              <option value="terms">Terms of Service</option>
              <option value="services">Services Page</option>
              <option value="about">About Page</option>
              <option value="indemnity">Indemnity</option>
              <option value="consent-form">Consent Form</option>
              <option value="contract">Contract Content</option>
            </select>
          </div>

          {contentType === 'consent-form' ? (
            <div className="space-y-3">
              <input type="text" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="Title" />
              <textarea value={formData.content || ''} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={10} className="w-full px-3 py-2 border rounded font-mono text-sm" placeholder="Enter consent text" />
            </div>
          ) : contentType === 'contract' ? (
            <div className="space-y-3">
              <input type="text" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="Title" />
              <input type="text" value={formData.version || ''} onChange={(e) => setFormData({ ...formData, version: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="Version" />
              <textarea value={formData.body || ''} onChange={(e) => setFormData({ ...formData, body: e.target.value })} rows={10} className="w-full px-3 py-2 border rounded font-mono text-sm" placeholder="Enter contract body" />
            </div>
          ) : (
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} className="w-full px-3 py-2 border rounded font-mono text-sm" />
          )}
        </div>
      )}

      {mode === 'leaders' && (
        <div className="space-y-4">
          <div className="border border-white/20 rounded-lg p-4 bg-white/5">
            <h3 className="text-lg font-semibold text-white mb-4">{leaderForm.id ? 'Edit Leader' : 'Add New Leader'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Name</label>
                <input
                  type="text"
                  value={leaderForm.name}
                  onChange={(e) => setLeaderForm({ ...leaderForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-white/10 text-white placeholder-white/50"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Title</label>
                <input
                  type="text"
                  value={leaderForm.title}
                  onChange={(e) => setLeaderForm({ ...leaderForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-white/10 text-white placeholder-white/50"
                  placeholder="Job title"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-white">Description</label>
                <textarea
                  value={leaderForm.description}
                  onChange={(e) => setLeaderForm({ ...leaderForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded bg-white/10 text-white placeholder-white/50"
                  placeholder="Brief description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Display Order</label>
                <input
                  type="number"
                  value={leaderForm.display_order}
                  onChange={(e) => setLeaderForm({ ...leaderForm, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded bg-white/10 text-white placeholder-white/50"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Image</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    className="flex-1 text-sm text-white"
                  />
                  {leaderForm.image_url && (
                    <img src={leaderForm.image_url} alt="Preview" className="w-12 h-12 rounded object-cover border border-white/20" />
                  )}
                </div>
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="leaderActive"
                  checked={leaderForm.active}
                  onChange={(e) => setLeaderForm({ ...leaderForm, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="leaderActive" className="text-sm text-white">Active</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSave}
                disabled={loading}
                className="primary-button px-4 py-2"
              >
                {loading ? 'Saving...' : (leaderForm.id ? 'Update' : 'Add')}
              </button>
              {leaderForm.id && (
                <button
                  onClick={() => setLeaderForm({ id: null, name: '', title: '', description: '', image_url: '', display_order: 0, active: true })}
                  className="secondary-button px-4 py-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="border border-white/20 rounded-lg p-4 bg-white/5">
            <h3 className="text-lg font-semibold text-white mb-4">Existing Leaders</h3>
            {leaders.length === 0 ? (
              <p className="text-white/60">No leaders found.</p>
            ) : (
              <div className="space-y-3">
                {leaders.map((leader: any) => (
                  <div key={leader.id} className="flex items-center gap-4 p-3 border border-white/10 rounded bg-white/5">
                    {leader.image_url && <img src={leader.image_url} alt={leader.name} className="w-12 h-12 rounded object-cover" />}
                    <div className="flex-1">
                      <div className="font-semibold text-white">{leader.name}</div>
                      <div className="text-sm text-white/70">{leader.title}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLeaderForm(leader)}
                        className="text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 px-3 py-1 rounded border border-blue-500/40"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLeader(leader.id)}
                        className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-1 rounded border border-red-500/40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'ai-bot' && (
        <div className="space-y-4">
          <div className="border border-white/20 rounded-lg p-4 bg-white/5">
            <h3 className="text-lg font-semibold text-white mb-4">{aiForm.id ? 'Edit Q&A' : 'Add New Q&A'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Question</label>
                <input
                  type="text"
                  value={aiForm.question}
                  onChange={(e) => setAiForm({ ...aiForm, question: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-white/10 text-white placeholder-white/50"
                  placeholder="Enter the question"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Response</label>
                <textarea
                  value={aiForm.response}
                  onChange={(e) => setAiForm({ ...aiForm, response: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border rounded bg-white/10 text-white placeholder-white/50"
                  placeholder="Enter the AI response"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Category</label>
                <input
                  type="text"
                  value={aiForm.category}
                  onChange={(e) => setAiForm({ ...aiForm, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-white/10 text-white placeholder-white/50"
                  placeholder="e.g., pricing, services, contact"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="primary-button px-4 py-2"
                >
                  {loading ? 'Saving...' : (aiForm.id ? 'Update' : 'Add')}
                </button>
                {aiForm.id && (
                  <button
                    onClick={() => setAiForm({ id: null, question: '', response: '', category: '' })}
                    className="secondary-button px-4 py-2"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border border-white/20 rounded-lg p-4 bg-white/5">
            <h3 className="text-lg font-semibold text-white mb-4">Existing Q&A</h3>
            {aiItems.length === 0 ? (
              <p className="text-white/60">No Q&A found.</p>
            ) : (
              <div className="space-y-3">
                {aiItems.map((item: any) => (
                  <div key={item.id} className="p-4 border border-white/10 rounded bg-white/5">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-white">{item.question}</div>
                        <div className="text-sm text-white/80 mt-1">{item.response}</div>
                        {item.category && <div className="text-xs text-white/50 mt-1">Category: {item.category}</div>}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setAiForm(item)}
                          className="text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 px-3 py-1 rounded border border-blue-500/40"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAi(item.id)}
                          className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-1 rounded border border-red-500/40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {message && <div className="text-sm text-white/80 bg-white/10 rounded px-3 py-2">{message}</div>}

      {mode === 'static' && (
        <button onClick={handleSave} disabled={loading} className="primary-button px-4 py-2">
          {loading ? 'Saving...' : 'Save'}
        </button>
      )}

      {mode === 'backgrounds' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            <button className="secondary-button" onClick={() => backgroundUrl && setBackgroundPreview(backgroundUrl)}>Preview</button>
          </div>
          {backgroundPreview && (
            <div className="rounded-xl overflow-hidden border border-white/20">
              <img src={backgroundPreview} alt="Background preview" className="w-full h-64 object-cover" />
            </div>
          )}
          <button
            className="primary-button"
            disabled={loading || !backgroundUrl}
            onClick={async () => {
              setLoading(true);
              try {
                const token = localStorage.getItem('authToken');
                await fetch(marketingProxy('/content?type=background-image'), {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ content: backgroundUrl })
                });
                setMessage('Saved');
              } catch (e) {
                setMessage('Save failed');
              } finally {
                setLoading(false);
                setTimeout(() => setMessage(''), 2000);
              }
            }}
          >Save Background</button>
        </div>
      )}

      {mode === 'gallery' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Caption (optional)</label>
              <input value={galleryCaption} onChange={(e) => setGalleryCaption(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="Sparkling kitchen transformation" />
            </div>
            <div>
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {galleryImages.map((img, idx) => (
              <div key={idx} className="relative rounded-lg overflow-hidden border border-white/10 bg-white/5">
                <img src={img.url} alt={img.caption || `Gallery ${idx + 1}`} className="w-full h-40 object-cover" />
                {img.caption && <div className="p-2 text-sm text-white/80">{img.caption}</div>}
                <button className="absolute top-2 right-2 text-xs bg-red-500/80 text-white px-2 py-1 rounded" onClick={() => setGalleryImages(prev => prev.filter((_, i) => i !== idx))}>Remove</button>
              </div>
            ))}
          </div>
          <button
            className="primary-button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const token = localStorage.getItem('authToken');
                await fetch(marketingProxy('/content?type=gallery-images'), {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ content: JSON.stringify(galleryImages) })
                });
                setMessage('Saved');
              } catch (e) {
                setMessage('Save failed');
              } finally {
                setLoading(false);
                setTimeout(() => setMessage(''), 2000);
              }
            }}
          >Save Gallery</button>
        </div>
      )}

      {mode === 'reviews' && (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <span className="text-white/80 text-sm">Filter:</span>
            {(['pending','approved','rejected'] as const).map(f => (
              <button key={f} onClick={() => setReviewFilter(f)} className={`px-3 py-1 rounded ${reviewFilter === f ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60 hover:bg-white/15'}`}>{f}</button>
            ))}
          </div>
          <div className="space-y-3">
            {reviews.map((rev: any) => (
              <div key={rev.id} className="border border-white/10 rounded p-4 bg-white/5 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{rev.user_name || 'Client'} • {rev.rating}★</div>
                    <div className="text-sm text-white/70">{rev.service_location || 'Verified Client'}</div>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button className="bg-green-500/20 px-3 py-1 rounded border border-green-500/40" onClick={() => updateReviewStatus(rev.id, 'approved')}>Approve</button>
                    <button className="bg-red-500/20 px-3 py-1 rounded border border-red-500/40" onClick={() => updateReviewStatus(rev.id, 'rejected')}>Reject</button>
                    <button className="bg-white/10 px-3 py-1 rounded border border-white/30" onClick={() => deleteReview(rev.id)}>Delete</button>
                  </div>
                </div>
                <p className="mt-2 text-white/90">{rev.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pool Management ─────────────────────────────────────────────────────────
function PoolManagement() {
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    fetch('/api/admin/cleaners', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then((data: any) => { setCleaners(Array.isArray(data) ? data : []); })
      .catch(() => setMessage('Failed to load cleaners'))
      .finally(() => setLoading(false));
  }, []);

  const togglePool = async (cleanerId: number, currentPool: string) => {
    const newPool = currentPool === 'INDIVIDUAL' ? 'BUSINESS' : 'INDIVIDUAL';
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch('/api/v2/staff/pool-transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ staff_id: cleanerId, new_pool: newPool, reason: 'Admin manual reassignment' }),
      });
      if (res.ok) {
        setCleaners(prev => prev.map(c => c.id === cleanerId ? { ...c, pool_type: newPool } : c));
        setMessage(`Cleaner moved to ${newPool} pool`);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to update pool');
      }
    } catch {
      setMessage('Network error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Pool Management</h2>
        {message && <div className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-200 text-sm">{message}</div>}
      </div>
      <p className="text-white/60 text-sm">Toggle cleaners between INDIVIDUAL (auto-assigned residential) and BUSINESS (manually allocated commercial) pools.</p>

      {loading ? <p className="text-white/60">Loading cleaners…</p> : (
        <div className="space-y-3">
          {cleaners.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-4">
              <div>
                <div className="font-semibold text-white">{c.first_name} {c.last_name}</div>
                <div className="text-sm text-white/60">{c.email || c.username}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  (c.pool_type || 'INDIVIDUAL') === 'INDIVIDUAL'
                    ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                    : 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                }`}>
                  {c.pool_type || 'INDIVIDUAL'}
                </span>
                <button
                  onClick={() => togglePool(c.id, c.pool_type || 'INDIVIDUAL')}
                  className="px-3 py-1 rounded bg-white/10 text-white/80 hover:bg-white/20 text-sm transition-all border border-white/20"
                >
                  Switch to {(c.pool_type || 'INDIVIDUAL') === 'INDIVIDUAL' ? 'BUSINESS' : 'INDIVIDUAL'}
                </button>
              </div>
            </div>
          ))}
          {cleaners.length === 0 && <p className="text-white/50 text-sm">No cleaners found.</p>}
        </div>
      )}

      <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="font-semibold text-blue-200 mb-1">Pool Definitions</div>
        <ul className="text-sm text-white/70 space-y-1">
          <li><b className="text-blue-200">INDIVIDUAL</b> — Residential bookings. Auto-assigned on booking creation.</li>
          <li><b className="text-purple-200">BUSINESS</b> — Commercial/office jobs. Requires manual allocation by admin.</li>
        </ul>
      </div>
    </div>
  );
}

// ── Staff Reviews (Monthly KPI Input) ────────────────────────────────────────
function StaffReviews() {
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState({ attendance_score: 5, company_values_score: 5, client_rating: 4, punctuality_score: 7, quality_score: 7, communication_score: 7, notes: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    fetch('/api/admin/cleaners', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then((data: any) => setCleaners(Array.isArray(data) ? data : []))
      .catch(() => setMessage('Failed to load staff'));
  }, []);

  const submitReview = async () => {
    if (!selected) return;
    setLoading(true);
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch('/api/admin/staff-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ staff_id: selected.id, ...form }),
      });
      if (res.ok) {
        setMessage(`Review submitted for ${selected.first_name}. KPI will be recalculated.`);
        // Trigger KPI sync
        await fetch(`/api/v2/staff/${selected.id}/sync-kpi`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        setForm({ attendance_score: 5, company_values_score: 5, client_rating: 4, punctuality_score: 7, quality_score: 7, communication_score: 7, notes: '' });
        setSelected(null);
        setTimeout(() => setMessage(''), 4000);
      } else {
        setMessage('Failed to submit review');
      }
    } catch {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  };

  const ScoreInput = ({ label, field, min = 0, max = 10 }: { label: string; field: keyof typeof form; min?: number; max?: number }) => (
    <div>
      <label className="block text-white/70 text-sm mb-1">{label} ({min}–{max})</label>
      <input
        type="number" min={min} max={max} step="0.5"
        value={form[field] as number}
        onChange={e => setForm(prev => ({ ...prev, [field]: parseFloat(e.target.value) }))}
        className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Monthly Staff Reviews</h2>
        {message && <div className="px-4 py-2 rounded-lg bg-green-500/20 text-green-200 text-sm">{message}</div>}
      </div>
      <p className="text-white/60 text-sm">Enter monthly scores for attendance, company values, and quality. Scores feed the KPI engine and determine 13th cheque eligibility.</p>

      {/* Staff selector */}
      <div>
        <label className="text-white/70 text-sm block mb-2">Select Staff Member</label>
        <select
          className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm"
          value={selected?.id || ''}
          onChange={e => setSelected(cleaners.find(c => c.id === parseInt(e.target.value)) || null)}
        >
          <option value="">— Choose a staff member —</option>
          {cleaners.map((c: any) => (
            <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4">
          <h3 className="text-white font-semibold">Review for {selected.first_name} {selected.last_name}</h3>
          <div className="grid grid-cols-2 gap-4">
            <ScoreInput label="Client Rating (1–5 stars)" field="client_rating" min={1} max={5} />
            <ScoreInput label="Attendance Score (0–10)" field="attendance_score" />
            <ScoreInput label="Company Values Score (0–10)" field="company_values_score" />
            <ScoreInput label="Punctuality Score (0–10)" field="punctuality_score" />
            <ScoreInput label="Quality Score (0–10)" field="quality_score" />
            <ScoreInput label="Communication Score (0–10)" field="communication_score" />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm"
              placeholder="Optional review notes…"
            />
          </div>
          <button
            onClick={submitReview}
            disabled={loading}
            className="w-full py-2 rounded bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 border border-blue-500/30 transition-all disabled:opacity-50"
          >
            {loading ? 'Submitting…' : 'Submit Review & Sync KPI'}
          </button>
        </div>
      )}
    </div>
  );
}
