// AdminDashboard.tsx
// Next.js page for admin dashboard (user, booking, contract, payroll management)

"use client";

import React, { useEffect, useState } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import DashboardLayout from "@/components/DashboardLayout";
import ServicesManagement from "./AdminDashboard/services-management";
import CleanerVisibility from "./AdminDashboard/cleaner-visibility";
import TrainingLedger from "./AdminDashboard/training-ledger";
import ProxyObserver from "@/components/admin/ProxyObserver";
import PricingConfiguration from "@/components/admin/PricingConfiguration";
import PoolManagement from "@/components/admin/PoolManagement";
import ContentManagement from "@/components/admin/ContentManagement";
import StaffReviews from "@/components/admin/StaffReviews";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Users, DollarSign, Wrench, FileText, Settings, Eye, UserCheck, GraduationCap } from "lucide-react";

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
      await fetch(`/api/pending-contracts?id=${joiner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      setNewJoiners(prev => prev.filter((j: any) => j.id !== joiner.id));
      setSelectedJoiner(null);
    } catch (err) {
      console.error("Failed to approve joiner:", err);
    }
  };

  const handleRejectJoiner = async (joiner: any) => {
    try {
      await fetch(`/api/pending-contracts?id=${joiner.id}`, {
        method: "DELETE",
      });
      setNewJoiners(prev => prev.filter((j: any) => j.id !== joiner.id));
      setSelectedJoiner(null);
    } catch (err) {
      console.error("Failed to reject joiner:", err);
    }
  };

  if (loading) return <DashboardLayout title="Admin Dashboard" role="admin"><div className="animate-pulse space-y-6"><div className="responsive-grid">{[1,2,3,4].map(i=><div key={i} className="glass-card"><div className="h-4 bg-white/30 rounded w-1/2 mb-3"/><div className="h-8 bg-white/30 rounded w-3/4"/></div>)}</div></div></DashboardLayout>;
  if (error) return <DashboardLayout title="Admin Dashboard" role="admin"><div className="error-msg">{error}</div></DashboardLayout>;

  return (
    <DashboardLayout title="Admin Dashboard" role="admin">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full h-auto overflow-x-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="overview" className="gap-2 whitespace-nowrap"><LayoutDashboard className="h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="employees" className="gap-2 whitespace-nowrap"><Users className="h-4 w-4" />Employees</TabsTrigger>
          <TabsTrigger value="services-banking" className="gap-2 whitespace-nowrap"><DollarSign className="h-4 w-4" />Services</TabsTrigger>
          <TabsTrigger value="cleaners" className="gap-2 whitespace-nowrap"><UserCheck className="h-4 w-4" />Cleaners</TabsTrigger>
          <TabsTrigger value="content" className="gap-2 whitespace-nowrap"><FileText className="h-4 w-4" />Content</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2 whitespace-nowrap"><Wrench className="h-4 w-4" />Pricing</TabsTrigger>
          <TabsTrigger value="proxy-observer" className="gap-2 whitespace-nowrap"><Eye className="h-4 w-4" />Proxy</TabsTrigger>
          <TabsTrigger value="pool-management" className="gap-2 whitespace-nowrap"><Settings className="h-4 w-4" />Pools</TabsTrigger>
          <TabsTrigger value="staff-reviews" className="gap-2 whitespace-nowrap"><UserCheck className="h-4 w-4" />Reviews</TabsTrigger>
          <TabsTrigger value="training" className="gap-2 whitespace-nowrap"><GraduationCap className="h-4 w-4" />Training</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalBookings}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-slate-900">R{(stats.totalRevenue || 0).toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Active Cleaners</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-slate-900">{stats.activeCleaners}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Weekend Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-slate-900">{stats.pendingWeekendAssignments}</p>
                </CardContent>
              </Card>
            </div>

            {notifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending Weekend Assignments</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {notifications.map((notif: any) => (
                      <li key={notif.id} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                        <div><b>Booking #{notif.booking_id}</b> - {notif.message}</div>
                        <button
                          onClick={() => assignCleaner(notif.booking_id, "")}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
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
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {users.map((u: any) => (
                    <li key={u.id} className="flex justify-between p-2 bg-slate-50 rounded">
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
                    <li key={b.id} className="flex justify-between p-2 bg-slate-50 rounded">
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
                    {newJoiners.length === 0 ? (
                      <p className="text-slate-500">No pending new joiners.</p>
                    ) : (
                      <div className="space-y-3">
                        {newJoiners.map((joiner: any) => (
                          <div key={joiner.id} className="p-4 border rounded">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-bold">{joiner.fullName}</p>
                                <p className="text-sm text-slate-600">ID/Passport: {joiner.idPassportNumber}</p>
                                <p className="text-sm text-slate-600">Contact: {joiner.contactNumber}</p>
                                <p className="text-sm text-slate-600">Position: {joiner.positionAppliedFor}</p>
                                <p className="text-sm text-slate-600">Username: {joiner.generatedUsername}</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setSelectedJoiner(joiner)}
                                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                  View Consent
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
                          className="flex-1 py-2 bg-slate-500 text-white rounded hover:bg-slate-600"
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
                      <p className="text-slate-500">No employees found.</p>
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

        <TabsContent value="pool-management">
          <PoolManagement />
        </TabsContent>

        <TabsContent value="staff-reviews">
          <StaffReviews />
        </TabsContent>

        <TabsContent value="training">
          <TrainingLedger />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
