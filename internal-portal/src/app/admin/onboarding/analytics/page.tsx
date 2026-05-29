'use client';

import { useState, useEffect } from 'react';

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
}

interface StageDuration {
  stage: string;
  avg_duration_hours: number;
}

export default function OnboardingAnalytics() {
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [stageDurations, setStageDurations] = useState<StageDuration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/onboarding/analytics');
      const data = await response.json();
      setFunnelData(data.funnel || []);
      setStageDurations(data.stageDurations || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  const totalApplicants = funnelData.length > 0 ? funnelData[0].count : 0;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Onboarding Analytics</h1>

      {/* Funnel Visualization */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Conversion Funnel</h2>
        <div className="space-y-3">
          {funnelData.map((item, index) => (
            <div key={item.stage} className="flex items-center">
              <div className="w-40 text-sm text-gray-600">{item.stage.replace(/_/g, ' ')}</div>
              <div className="flex-1 mx-4">
                <div className="bg-gray-200 rounded-full h-8 relative">
                  <div
                    className="bg-blue-500 h-8 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${item.percentage}%` }}
                  >
                    <span className="text-white text-xs font-medium">{item.count}</span>
                  </div>
                </div>
              </div>
              <div className="w-20 text-sm text-gray-600">{item.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage Duration Analysis */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Average Stage Duration</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stageDurations.map((item) => (
            <div key={item.stage} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">{item.stage.replace(/_/g, ' ')}</div>
              <div className="text-xl font-bold">
                {item.avg_duration_hours < 24
                  ? `${item.avg_duration_hours.toFixed(1)}h`
                  : `${(item.avg_duration_hours / 24).toFixed(1)}d`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600">Total Applicants</div>
          <div className="text-2xl font-bold text-blue-900">{totalApplicants}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600">Completed Onboarding</div>
          <div className="text-2xl font-bold text-green-900">
            {funnelData.find(f => f.stage === 'active')?.count || 0}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600">Conversion Rate</div>
          <div className="text-2xl font-bold text-red-900">
            {totalApplicants > 0
              ? ((funnelData.find(f => f.stage === 'active')?.count || 0) / totalApplicants * 100).toFixed(1)
              : 0}%
          </div>
        </div>
      </div>
    </div>
  );
}
