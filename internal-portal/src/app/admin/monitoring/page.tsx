'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: 'healthy' | 'unhealthy'; message: string };
    r2: { status: 'healthy' | 'unhealthy'; message: string };
    twilio: { status: 'healthy' | 'unhealthy'; message: string };
  };
}

export default function MonitoringDashboard() {
  const router = useRouter();
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthStatus(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    fetchHealthStatus();
    const interval = setInterval(fetchHealthStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-300';
      case 'degraded': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'unhealthy': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-stone-100 text-stone-800 border-stone-300';
    }
  };

  const getCheckIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✓';
      case 'unhealthy': return '✗';
      default: return '?';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">System Monitoring</h1>
        <p className="text-sm text-stone-500 mt-1">Real-time system health and performance metrics</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-stone-500">Loading monitoring data...</div>
        </div>
      ) : healthStatus ? (
        <>
          {/* Overall Status */}
          <div className={`mb-6 p-4 rounded-lg border-2 ${getStatusColor(healthStatus.status)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Overall System Status</h2>
                <p className="text-sm opacity-75">
                  Last updated: {lastUpdated?.toLocaleString()}
                </p>
              </div>
              <div className="text-3xl font-bold">{getCheckIcon(healthStatus.status)}</div>
            </div>
          </div>

          {/* Individual Checks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(healthStatus.checks).map(([key, check]) => (
              <div key={key} className={`p-4 rounded-lg border ${getStatusColor(check.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold capitalize">{key}</h3>
                  <span className="text-2xl">{getCheckIcon(check.status)}</span>
                </div>
                <p className="text-sm opacity-75">{check.message}</p>
              </div>
            ))}
          </div>

          {/* Metrics Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <h3 className="font-semibold mb-4">Performance Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-stone-600">Response Time</span>
                  <span className="font-medium">-- ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Error Rate</span>
                  <span className="font-medium">-- %</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Requests/min</span>
                  <span className="font-medium">--</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <h3 className="font-semibold mb-4">Alert Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-stone-600">Active Alerts</span>
                  <span className="font-medium text-green-600">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Warnings</span>
                  <span className="font-medium text-yellow-600">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Critical</span>
                  <span className="font-medium text-red-600">0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="mt-6">
            <button
              onClick={fetchHealthStatus}
              className="px-4 py-2 bg-[#2E1F16] text-white rounded-lg hover:bg-[#241811] transition-colors"
            >
              Refresh Status
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
          <p className="text-sm text-stone-600 mb-4">Unable to load health status. Please check your connection and try again.</p>
          <button
            onClick={fetchHealthStatus}
            className="px-4 py-2 bg-[#2E1F16] text-white rounded-lg hover:bg-[#241811] transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
