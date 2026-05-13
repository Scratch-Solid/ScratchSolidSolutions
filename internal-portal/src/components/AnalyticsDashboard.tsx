"use client";

import React, { useState, useEffect } from 'react';

interface AnalyticsData {
  scans: Array<{ date: string; scans: number; unique_visitors: number }>;
  distribution: Array<{ channel: string; distributions: number; total_recipients: number; last_distributed: string }>;
  shortUrls: Array<{ date: string; total_clicks: number }>;
  topPromos: Array<{ id: number; code: string; description: string; used_count: number; distribution_count: number; scan_count: number; click_count: number }>;
  geography: Array<{ location_country: string; scans: number }>;
  summary: {
    totalScans: number;
    totalDistributions: number;
    totalClicks: number;
    uniqueVisitors: number;
  };
}

interface AnalyticsDashboardProps {
  promoCodeId?: number;
}

export default function AnalyticsDashboard({ promoCodeId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, promoCodeId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const url = `/api/analytics?dateRange=${dateRange}${promoCodeId ? `&promoCodeId=${promoCodeId}` : ''}`;
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const result = await res.json() as { data: AnalyticsData };
        setData(result.data);
      } else {
        setError('Failed to fetch analytics');
      }
    } catch (err) {
      setError('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/20 rounded"></div>
          <div className="h-32 bg-white/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-sm rounded-lg border border-red-500/20 p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Analytics Dashboard</h2>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 border border-white/20 rounded bg-white/10 text-white"
        >
          <option value="7" className="text-black">Last 7 days</option>
          <option value="30" className="text-black">Last 30 days</option>
          <option value="90" className="text-black">Last 90 days</option>
          <option value="365" className="text-black">Last year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Scans"
          value={data.summary.totalScans}
          icon="📊"
        />
        <SummaryCard
          label="Total Distributions"
          value={data.summary.totalDistributions}
          icon="📤"
        />
        <SummaryCard
          label="Total Clicks"
          value={data.summary.totalClicks}
          icon="🖱️"
        />
        <SummaryCard
          label="Unique Visitors"
          value={data.summary.uniqueVisitors}
          icon="👥"
        />
      </div>

      {/* Top Performing Promo Codes */}
      {data.topPromos.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Top Performing Promo Codes</h3>
          <div className="space-y-3">
            {data.topPromos.map((promo) => (
              <div key={promo.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded">
                <div>
                  <p className="font-semibold text-white">{promo.code}</p>
                  <p className="text-sm text-white/60">{promo.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/80">Scans: <span className="font-bold text-green-400">{promo.scan_count}</span></p>
                  <p className="text-sm text-white/80">Clicks: <span className="font-bold text-blue-400">{promo.click_count}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distribution by Channel */}
      {data.distribution.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Distribution by Channel</h3>
          <div className="space-y-3">
            {data.distribution.map((dist) => (
              <div key={dist.channel} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded">
                <div>
                  <p className="font-semibold text-white capitalize">{dist.channel}</p>
                  <p className="text-sm text-white/60">Last distributed: {new Date(dist.last_distributed).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/80">Distributions: <span className="font-bold text-green-400">{dist.distributions}</span></p>
                  <p className="text-sm text-white/80">Recipients: <span className="font-bold text-blue-400">{dist.total_recipients}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geographic Distribution */}
      {data.geography.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Geographic Distribution</h3>
          <div className="space-y-3">
            {data.geography.map((geo) => (
              <div key={geo.location_country} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded">
                <p className="font-semibold text-white">{geo.location_country}</p>
                <p className="text-sm text-white/80">Scans: <span className="font-bold text-green-400">{geo.scans}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/60">{label}</p>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
