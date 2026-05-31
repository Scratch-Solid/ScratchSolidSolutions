'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';

export default function AdminCleanerOverview() {
  const [overview, setOverview] = useState<any>(null);
  const [trainingGraph, setTrainingGraph] = useState<any>(null);
  const [onboardingFunnel, setOnboardingFunnel] = useState<any>(null);
  const [loginActivity, setLoginActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) return;

      try {
        const [overviewRes, trainingRes, funnelRes, loginRes] = await Promise.all([
          fetch('/api/admin/cleaners/overview', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/cleaners/training-graph', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/cleaners/onboarding-funnel', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/cleaners/login-activity', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (overviewRes.ok) {
          const data = await overviewRes.json() as { data?: any };
          setOverview(data.data || data);
        }
        if (trainingRes.ok) {
          const data = await trainingRes.json() as { data?: any };
          setTrainingGraph(data.data || data);
        }
        if (funnelRes.ok) {
          const data = await funnelRes.json() as { data?: any };
          setOnboardingFunnel(data.data || data);
        }
        if (loginRes.ok) {
          const data = await loginRes.json() as { data?: any };
          setLoginActivity(data.data || data);
        }
      } catch (err) {
        setError('Failed to fetch cleaner analytics');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-lg" />)}
    </div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Cleaners</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{overview?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{overview?.active || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Onboarding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{overview?.pending_onboarding || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Training Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{overview?.training_complete || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Training Completion Graph */}
      <Card>
        <CardHeader>
          <CardTitle>Training Completion</CardTitle>
          <CardDescription>Cleaners by training completion percentage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trainingGraph?.completion_ranges?.map((range: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 text-sm text-slate-600">{range.label}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${range.percentage}%` }}
                  />
                </div>
                <div className="w-16 text-sm font-medium text-slate-900">{range.count}</div>
              </div>
            )) || <div className="text-slate-500">No training data available</div>}
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Funnel</CardTitle>
          <CardDescription>Cleaners at each onboarding stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {onboardingFunnel?.stages?.map((stage: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 text-sm text-slate-600">{stage.stage}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all"
                    style={{ width: `${stage.percentage}%` }}
                  />
                </div>
                <div className="w-16 text-sm font-medium text-slate-900">{stage.count}</div>
              </div>
            )) || <div className="text-slate-500">No onboarding data available</div>}
          </div>
        </CardContent>
      </Card>

      {/* Login Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Login Activity (Last 7 Days)</CardTitle>
          <CardDescription>Daily login counts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loginActivity?.daily_logins?.map((day: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 text-sm text-slate-600">{day.date}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(day.count * 10, 100)}%` }}
                  />
                </div>
                <div className="w-16 text-sm font-medium text-slate-900">{day.count}</div>
              </div>
            )) || <div className="text-slate-500">No login activity data available</div>}
          </div>
        </CardContent>
      </Card>

      {/* Cleaner List */}
      <Card>
        <CardHeader>
          <CardTitle>Cleaner List</CardTitle>
          <CardDescription>All cleaners with their onboarding status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-600">Name</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-600">Status</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-600">Training</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-600">Onboarding</th>
                </tr>
              </thead>
              <tbody>
                {overview?.cleaners?.map((cleaner: any, idx: number) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-3 text-sm">{cleaner.name}</td>
                    <td className="py-2 px-3">
                      <Badge variant={cleaner.status === 'active' ? 'default' : 'secondary'}>
                        {cleaner.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-sm">{cleaner.training_completion || 0}%</td>
                    <td className="py-2 px-3 text-sm">{cleaner.onboarding_stage || 'N/A'}</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500">No cleaners found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
