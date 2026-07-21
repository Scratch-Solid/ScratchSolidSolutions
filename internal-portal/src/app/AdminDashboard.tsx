// AdminDashboard.tsx
// Next.js page for admin dashboard (user, booking, contract, payroll management)

"use client";

import React, { useEffect, useState } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChartCard, DonutChartCard } from "@/components/charts/MiniCharts";
import ServicesManagement from "./AdminDashboard/services-management";
import CleanerVisibility from "./AdminDashboard/cleaner-visibility";
import TrainingLedger from "./AdminDashboard/training-ledger";
import ProxyObserver from "@/components/admin/ProxyObserver";
import PricingConfiguration from "@/components/admin/PricingConfiguration";
import ContentManagement from "@/components/admin/ContentManagement";
import StaffReviews from "@/components/admin/StaffReviews";
import AdminCleanerOverview from "@/components/admin/AdminCleanerOverview";
import AdminLeaveRequests from "@/components/admin/AdminLeaveRequests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Users, DollarSign, Wrench, FileText, Settings, Eye, UserCheck, GraduationCap, BarChart3, Shield, Monitor, ClipboardList, Lock, Star } from "lucide-react";

export default function AdminDashboard() {
  useSessionTimeout(true);
  useTokenRefresh();
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
  const [showCreateCleaner, setShowCreateCleaner] = useState(false);
  const [newCleanerForm, setNewCleanerForm] = useState({ fullName: '', idPassportNumber: '', contactNumber: '', positionAppliedFor: '' });
  // Shown when WhatsApp/email delivery of a newly approved cleaner's login
  // credentials didn't confirm - lets the admin share them manually instead
  // of the cleaner being silently stranded with no way to log in.
  const [credentialsBackup, setCredentialsBackup] = useState<{ name: string; paysheetCode: string; tempPassword: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t) setActiveTab(t);
    }
  }, []);

  useEffect(() => {
    async function fetchAdminData() {
      setLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        };

        const [employeesRes, newJoinersRes, usersRes, bookingsRes, contractsRes, paymentsRes, notificationsRes, servicesRes, bankingRes] = await Promise.allSettled([
          fetch("/api/employees", { headers }),
          fetch("/api/admin/new-joiners?status=pending", { headers }),
          fetch("/api/admin/users", { headers }),
          fetch("/api/admin/bookings", { headers }),
          fetch("/api/contracts", { headers }),
          fetch("/api/payroll", { headers }),
          fetch("/api/notifications", { headers }),
          fetch("/api/admin/services", { headers }),
          fetch("/api/admin/banking-details", { headers }),
        ]);

        if (newJoinersRes.status === 'fulfilled' && newJoinersRes.value.ok) {
          const data = await newJoinersRes.value.json();
          setNewJoiners(data.data || data);
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cleaner_id: cleanerId })
      });
      if (res.ok) {
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

  const handleApproveJoiner = async (joiner: any) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const response = await fetch(`/api/admin/new-joiners/${joiner.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const resData = await response.json() as { data?: { notificationsDelivered?: boolean; credentialsBackup?: { paysheetCode: string; tempPassword: string } } };
        setNewJoiners(prev => prev.filter((j: any) => j.id !== joiner.id));
        setSelectedJoiner(null);
        if (resData.data && !resData.data.notificationsDelivered && resData.data.credentialsBackup) {
          setCredentialsBackup({
            name: joiner.fullName,
            paysheetCode: resData.data.credentialsBackup.paysheetCode,
            tempPassword: resData.data.credentialsBackup.tempPassword,
          });
        }
      } else {
        const errorData = await response.json() as { error?: string };
        setError(errorData.error || 'Failed to approve application');
      }
    } catch (err) {
      console.error("Failed to approve joiner:", err);
      setError('Failed to approve application');
    }
  };

  const handleRejectJoiner = async (joiner: any, reason?: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const response = await fetch(`/api/admin/new-joiners/${joiner.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reason || '' }),
      });
      if (response.ok) {
        setNewJoiners(prev => prev.filter((j: any) => j.id !== joiner.id));
        setSelectedJoiner(null);
      } else {
        const errorData = await response.json() as { error?: string };
        setError(errorData.error || 'Failed to reject application');
      }
    } catch (err) {
      console.error("Failed to reject joiner:", err);
      setError('Failed to reject application');
    }
  };

  const handleCreateCleaner = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      const response = await fetch('/api/admin/new-joiners/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: newCleanerForm.fullName,
          idPassportNumber: newCleanerForm.idPassportNumber,
          contactNumber: newCleanerForm.contactNumber,
          positionAppliedFor: newCleanerForm.positionAppliedFor,
        }),
      });

      if (response.ok) {
        setShowCreateCleaner(false);
        setNewCleanerForm({ fullName: '', idPassportNumber: '', contactNumber: '', positionAppliedFor: '' });
        // Refresh new joiners list from canonical endpoint
        const newJoinersRes = await fetch("/api/admin/new-joiners?status=pending", { headers: { Authorization: `Bearer ${token}` } });
        if (newJoinersRes.ok) {
          const data = await newJoinersRes.json() as { data?: any[] };
          setNewJoiners(data.data || []);
        }
      } else {
        const errorData = await response.json() as { error?: { message?: string } };
        setError(errorData.error?.message || 'Failed to create cleaner');
      }
    } catch (err) {
      setError('Failed to create cleaner');
    }
  };

  if (loading) return <DashboardLayout title="Admin Dashboard" role="admin"><div className="animate-pulse space-y-6"><div className="responsive-grid">{[1,2,3,4].map(i=><div key={i} className="glass-card"><div className="h-4 bg-white/30 rounded w-1/2 mb-3"/><div className="h-8 bg-white/30 rounded w-3/4"/></div>)}</div></div></DashboardLayout>;
  if (error) return <DashboardLayout title="Admin Dashboard" role="admin"><div className="error-msg">{error}</div></DashboardLayout>;

  return (
    <DashboardLayout title="Admin Dashboard" role="admin">
      {credentialsBackup && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">
            Couldn&apos;t confirm WhatsApp/email delivery to {credentialsBackup.name}
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Share these login details with them directly (call, SMS, hand them over in person):
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-amber-700">Paysheet code (username): </span>
              <code className="rounded bg-amber-100 px-2 py-0.5 font-semibold">{credentialsBackup.paysheetCode}</code>
            </div>
            <div>
              <span className="text-amber-700">Temporary password: </span>
              <code className="rounded bg-amber-100 px-2 py-0.5 font-semibold">{credentialsBackup.tempPassword}</code>
            </div>
          </div>
          <button
            onClick={() => setCredentialsBackup(null)}
            className="mt-3 text-sm font-medium text-amber-700 underline hover:text-amber-900"
          >
            Dismiss
          </button>
        </div>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full h-auto overflow-x-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="overview" className="gap-2 whitespace-nowrap"><LayoutDashboard className="h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="employees" className="gap-2 whitespace-nowrap"><Users className="h-4 w-4" />Employees</TabsTrigger>
          <TabsTrigger value="services-banking" className="gap-2 whitespace-nowrap"><DollarSign className="h-4 w-4" />Services</TabsTrigger>
          <TabsTrigger value="cleaners" className="gap-2 whitespace-nowrap"><UserCheck className="h-4 w-4" />Cleaners</TabsTrigger>
          <TabsTrigger value="content" className="gap-2 whitespace-nowrap"><FileText className="h-4 w-4" />Content</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2 whitespace-nowrap"><Wrench className="h-4 w-4" />Pricing</TabsTrigger>
          <TabsTrigger value="proxy-observer" className="gap-2 whitespace-nowrap"><Eye className="h-4 w-4" />Proxy</TabsTrigger>
          <TabsTrigger value="staff-reviews" className="gap-2 whitespace-nowrap"><UserCheck className="h-4 w-4" />Reviews</TabsTrigger>
          <TabsTrigger value="training" className="gap-2 whitespace-nowrap"><GraduationCap className="h-4 w-4" />Training</TabsTrigger>
          <TabsTrigger value="cleaner-analytics" className="gap-2 whitespace-nowrap"><BarChart3 className="h-4 w-4" />Cleaner Analytics</TabsTrigger>
          <TabsTrigger value="leave" className="gap-2 whitespace-nowrap"><ClipboardList className="h-4 w-4" />Leave Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-stone-600">Total Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-stone-900">{stats.totalBookings}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-stone-600">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-stone-900">R{(stats.totalRevenue || 0).toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-stone-600">Active Cleaners</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-stone-900">{stats.activeCleaners}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-stone-600">Weekend Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-stone-900">{stats.pendingWeekendAssignments}</p>
                </CardContent>
              </Card>
            </div>

            <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2">
              <DonutChartCard
                title="Bookings by Status"
                centerLabel="bookings"
                data={Object.entries(
                  (bookings as any[]).reduce((acc: Record<string, number>, b: any) => {
                    const s = (b.status || 'unknown').toLowerCase();
                    acc[s] = (acc[s] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([label, value]) => ({ label, value: value as number }))}
              />
              <BarChartCard
                title="Key Metrics"
                data={[
                  { label: 'Bookings', value: stats.totalBookings },
                  { label: 'Cleaners', value: stats.activeCleaners },
                  { label: 'Weekend', value: stats.pendingWeekendAssignments },
                ]}
              />
            </div>

            {notifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending Weekend Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {notifications.map((notif: any) => (
                      <li key={notif.id} className="flex justify-between items-center p-3 bg-stone-50 rounded">
                        <div><b>Booking #{notif.booking_id}</b> - {notif.message}</div>
                        <button
                          onClick={() => assignCleaner(notif.booking_id, "")}
                          className="px-3 py-1 bg-[#B08A5E] text-white rounded hover:bg-[#2E1F16]"
                        >
                          Assign Cleaner
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-[#B08A5E]" />Admin Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  <a href="/admin/onboarding" className="flex flex-col items-center justify-center p-4 rounded-lg bg-stone-50 hover:bg-[#F7F2EA] hover:text-[#2E1F16] transition-colors border border-stone-200">
                    <ClipboardList className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">Onboarding</span>
                  </a>
                  <a href="/admin/security" className="flex flex-col items-center justify-center p-4 rounded-lg bg-stone-50 hover:bg-[#F7F2EA] hover:text-[#2E1F16] transition-colors border border-stone-200">
                    <Lock className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">Security</span>
                  </a>
                  <a href="/admin/roles" className="flex flex-col items-center justify-center p-4 rounded-lg bg-stone-50 hover:bg-[#F7F2EA] hover:text-[#2E1F16] transition-colors border border-stone-200">
                    <Users className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">Roles</span>
                  </a>
                  <a href="/admin/monitoring" className="flex flex-col items-center justify-center p-4 rounded-lg bg-stone-50 hover:bg-[#F7F2EA] hover:text-[#2E1F16] transition-colors border border-stone-200">
                    <Monitor className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">Monitoring</span>
                  </a>
                  <a href="/admin/reviews" className="flex flex-col items-center justify-center p-4 rounded-lg bg-stone-50 hover:bg-[#F7F2EA] hover:text-[#2E1F16] transition-colors border border-stone-200">
                    <Star className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">Gallery Reviews</span>
                  </a>
                  <a href="/admin/audit-logs" className="flex flex-col items-center justify-center p-4 rounded-lg bg-stone-50 hover:bg-[#F7F2EA] hover:text-[#2E1F16] transition-colors border border-stone-200">
                    <FileText className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">Audit Logs</span>
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {users.map((u: any) => (
                    <li key={u.id} className="flex justify-between p-2 bg-stone-50 rounded">
                      <span><b>{u.name}</b> ({u.role}) - {u.email}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {bookings.map((b: any) => (
                    <li key={b.id} className="flex justify-between p-2 bg-stone-50 rounded">
                      <span><b>{b.client_name}</b> - {b.booking_date} {b.booking_time}</span>
                      <Badge>{b.status}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees">
          <div className="space-y-4">
            <Tabs value={employeeSubTab} onValueChange={(v) => setEmployeeSubTab(v as 'new' | 'existing')}>
              <TabsList>
                <TabsTrigger value="new">New Joiners</TabsTrigger>
                <TabsTrigger value="existing">Employee Details</TabsTrigger>
              </TabsList>
              <TabsContent value="new">
                <Card>
                  <CardHeader>
                    <CardTitle>New Joiners - Pending Approval</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <button
                      onClick={() => setShowCreateCleaner(true)}
                      className="mb-4 px-4 py-2 bg-[#2E1F16] text-white rounded hover:bg-[#241811]"
                    >
                      + Add New Cleaner
                    </button>
                    {showCreateCleaner && (
                      <div className="mb-4 p-4 border rounded bg-stone-50">
                        <h3 className="font-bold mb-3">Create New Cleaner</h3>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={newCleanerForm.fullName}
                            onChange={(e) => setNewCleanerForm({...newCleanerForm, fullName: e.target.value})}
                            className="p-2 border rounded"
                          />
                          <input
                            type="text"
                            placeholder="ID/Passport Number"
                            value={newCleanerForm.idPassportNumber}
                            onChange={(e) => setNewCleanerForm({...newCleanerForm, idPassportNumber: e.target.value})}
                            className="p-2 border rounded"
                          />
                          <input
                            type="text"
                            placeholder="Contact Number"
                            value={newCleanerForm.contactNumber}
                            onChange={(e) => setNewCleanerForm({...newCleanerForm, contactNumber: e.target.value})}
                            className="p-2 border rounded"
                          />
                          <input
                            type="text"
                            placeholder="Position Applied For"
                            value={newCleanerForm.positionAppliedFor}
                            onChange={(e) => setNewCleanerForm({...newCleanerForm, positionAppliedFor: e.target.value})}
                            className="p-2 border rounded"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCreateCleaner}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Create
                          </button>
                          <button
                            onClick={() => setShowCreateCleaner(false)}
                            className="px-4 py-2 bg-stone-300 text-stone-700 rounded hover:bg-stone-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {newJoiners.length === 0 ? (
                      <p className="text-stone-500">No pending new joiners.</p>
                    ) : (
                      <div className="space-y-3">
                        {newJoiners.map((joiner: any) => (
                          <div key={joiner.id} className="p-4 border rounded">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-bold">{joiner.fullName}</p>
                                <p className="text-sm text-stone-600">ID/Passport: {joiner.idPassportNumber}</p>
                                <p className="text-sm text-stone-600">Contact: {joiner.contactNumber}</p>
                                <p className="text-sm text-stone-600">Position: {joiner.positionAppliedFor}</p>
                                <p className="text-sm text-stone-600">Username: {joiner.generatedUsername}</p>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => setSelectedJoiner(joiner)}
                                  className="px-3 py-1 bg-[#B08A5E] text-white rounded hover:bg-[#2E1F16]"
                                >
                                  View Consent
                                </button>
                                <button
                                  onClick={() => handleApproveJoiner(joiner)}
                                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = window.prompt('Rejection reason (optional):');
                                    handleRejectJoiner(joiner, reason || undefined);
                                  }}
                                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedJoiner && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                      <h3 className="font-bold text-xl mb-4">Consent Form Details</h3>
                      <div className="space-y-3 text-sm">
                        <p><b>Full Name:</b> {selectedJoiner.fullName}</p>
                        <p><b>ID/Passport:</b> {selectedJoiner.idPassportNumber}</p>
                        <p><b>Contact:</b> {selectedJoiner.contactNumber}</p>
                        <p><b>Position:</b> {selectedJoiner.positionAppliedFor}</p>
                        <p><b>Username:</b> {selectedJoiner.generatedUsername}</p>
                      </div>
                      <div className="flex gap-4 mt-6">
                        <button
                          onClick={() => handleApproveJoiner(selectedJoiner)}
                          className="flex-1 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectJoiner(selectedJoiner)}
                          className="flex-1 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => setSelectedJoiner(null)}
                          className="flex-1 py-2 bg-stone-500 text-white rounded hover:bg-stone-600"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="existing">
                <Card>
                  <CardHeader>
                    <CardTitle>Employee Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {employees.length === 0 ? (
                      <p className="text-stone-500">No employees found.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th className="text-left p-2">Name</th>
                              <th className="text-left p-2">Email</th>
                              <th className="text-left p-2">Role</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employees.map((emp: any) => (
                              <tr key={emp.id} className="border-t">
                                <td className="p-2">{emp.name}</td>
                                <td className="p-2">{emp.email}</td>
                                <td className="p-2"><Badge>{emp.role}</Badge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="services-banking">
          <ServicesManagement />
        </TabsContent>

        <TabsContent value="cleaners">
          <CleanerVisibility />
        </TabsContent>

        <TabsContent value="content">
          <ContentManagement />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingConfiguration />
        </TabsContent>

        <TabsContent value="proxy-observer">
          <ProxyObserver />
        </TabsContent>

        <TabsContent value="staff-reviews">
          <StaffReviews />
        </TabsContent>

        <TabsContent value="training">
          <TrainingLedger />
        </TabsContent>

        <TabsContent value="cleaner-analytics">
          <AdminCleanerOverview />
        </TabsContent>

        <TabsContent value="leave">
          <AdminLeaveRequests />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
